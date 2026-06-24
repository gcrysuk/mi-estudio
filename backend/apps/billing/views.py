import hashlib
import hmac
import logging
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import mp_client
from .models import PagoHistorial, Suscripcion

logger = logging.getLogger(__name__)


# ── Iniciar suscripción ───────────────────────────────────────────────────────

class IniciarSuscripcionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            suscripcion = request.user.suscripcion
        except Suscripcion.DoesNotExist:
            return Response({'error': 'El usuario no tiene una suscripción.'}, status=404)

        if suscripcion.estado != 'trial':
            return Response(
                {'error': 'La suscripción no está en período de prueba.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        start_date = timezone.make_aware(
            datetime.combine(suscripcion.trial_hasta + timedelta(days=1), datetime.min.time())
        )
        back_url = f'{settings.FRONTEND_URL}/configuracion'

        try:
            preapproval_id, init_point = mp_client.crear_suscripcion(
                usuario_email=request.user.email,
                external_reference=request.user.id,
                start_date=start_date,
                monto=suscripcion.monto_mensual,
                back_url=back_url,
            )
        except requests.RequestException:
            logger.exception('Error al crear la suscripción en MP para usuario %s', request.user.id)
            return Response(
                {'error': 'No se pudo iniciar la suscripción con Mercado Pago.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        suscripcion.mp_preapproval_id = preapproval_id
        suscripcion.mp_payer_email = request.user.email
        suscripcion.save(update_fields=['mp_preapproval_id', 'mp_payer_email'])

        return Response({'init_point': init_point})


# ── Estado de la suscripción ──────────────────────────────────────────────────

class EstadoSuscripcionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            suscripcion = request.user.suscripcion
        except Suscripcion.DoesNotExist:
            return Response({'error': 'El usuario no tiene una suscripción.'}, status=404)

        return Response({
            'estado': suscripcion.estado,
            'trial_hasta': suscripcion.trial_hasta,
            'proximo_cobro': suscripcion.proximo_cobro,
            'ultimo_cobro': suscripcion.ultimo_cobro,
            'monto_mensual': suscripcion.monto_mensual,
            'tiene_mp': bool(suscripcion.mp_preapproval_id),
        })


# ── Webhook de Mercado Pago ───────────────────────────────────────────────────

ESTADOS_PREAPPROVAL = {
    'authorized': 'activo',
    'paused': 'moroso',
    'cancelled': 'cancelado',
}


def _verificar_firma(request):
    secret = settings.MP_WEBHOOK_SECRET
    if not secret:
        logger.warning('MP_WEBHOOK_SECRET no configurado, se omite la verificación de firma.')
        return True

    firma_header = request.headers.get('x-signature', '')
    if not firma_header:
        return False

    partes = dict(p.split('=', 1) for p in firma_header.split(',') if '=' in p)
    firma_recibida = partes.get('v1', firma_header)

    firma_calculada = hmac.new(
        secret.encode(), request.body, hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(firma_calculada, firma_recibida)


def _parsear_fecha(valor):
    fecha = parse_datetime(valor) if valor else None
    if fecha is None:
        return timezone.now()
    if timezone.is_naive(fecha):
        fecha = timezone.make_aware(fecha)
    return fecha


@method_decorator(csrf_exempt, name='dispatch')
class WebhookMPView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        logger.info('Webhook MP recibido: %s', request.data)

        if not _verificar_firma(request):
            logger.warning('Webhook MP con firma inválida, se descarta.')
            return Response(status=status.HTTP_200_OK)

        tipo = request.data.get('type') or request.data.get('topic')
        data_id = (request.data.get('data') or {}).get('id')

        try:
            if tipo == 'subscription_preapproval' and data_id:
                self._procesar_subscription_preapproval(data_id)
            elif tipo == 'payment' and data_id:
                self._procesar_payment(data_id)
        except Exception:
            logger.exception('Error procesando webhook MP (tipo=%s, data_id=%s)', tipo, data_id)

        return Response(status=status.HTTP_200_OK)

    def _procesar_subscription_preapproval(self, preapproval_id):
        info = mp_client.obtener_suscripcion(preapproval_id)
        external_reference = info.get('external_reference')
        nuevo_estado = ESTADOS_PREAPPROVAL.get(info.get('status'))
        if not external_reference or not nuevo_estado:
            return

        suscripcion = Suscripcion.objects.filter(usuario_id=external_reference).first()
        if not suscripcion:
            logger.warning('Webhook MP: no se encontró suscripción para external_reference=%s', external_reference)
            return

        suscripcion.estado = nuevo_estado
        suscripcion.save(update_fields=['estado'])

    def _procesar_payment(self, payment_id):
        info = mp_client.obtener_pago(payment_id)
        external_reference = info.get('external_reference')
        estado_pago = info.get('status')

        suscripcion = Suscripcion.objects.filter(usuario_id=external_reference).first()
        if not suscripcion:
            logger.warning('Webhook MP: no se encontró suscripción para external_reference=%s', external_reference)
            return

        fecha = _parsear_fecha(info.get('date_approved') or info.get('date_created'))
        monto = info.get('transaction_amount', suscripcion.monto_mensual)

        if estado_pago == 'approved':
            PagoHistorial.objects.update_or_create(
                mp_payment_id=str(payment_id),
                defaults={'suscripcion': suscripcion, 'estado': 'aprobado', 'monto': monto, 'fecha': fecha},
            )
            suscripcion.ultimo_cobro = fecha.date()
            suscripcion.proximo_cobro = fecha.date() + timedelta(days=30)
            suscripcion.save(update_fields=['ultimo_cobro', 'proximo_cobro'])

        elif estado_pago == 'rejected':
            PagoHistorial.objects.update_or_create(
                mp_payment_id=str(payment_id),
                defaults={'suscripcion': suscripcion, 'estado': 'rechazado', 'monto': monto, 'fecha': fecha},
            )
            rechazos_30d = PagoHistorial.objects.filter(
                suscripcion=suscripcion,
                estado='rechazado',
                fecha__gte=timezone.now() - timedelta(days=30),
            ).count()
            if rechazos_30d >= 3:
                suscripcion.estado = 'moroso'
                suscripcion.save(update_fields=['estado'])
