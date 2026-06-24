import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone

from .models import Suscripcion

logger = logging.getLogger(__name__)


def _enviar_mail(usuario, asunto, mensaje):
    if not usuario.email:
        logger.warning('No se pudo enviar mail a usuario %s: no tiene email.', usuario.id)
        return
    try:
        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[usuario.email],
        )
    except Exception:
        logger.exception('Error enviando mail a %s (usuario %s)', usuario.email, usuario.id)


@shared_task(name='apps.billing.tasks.chequear_trials_vencidos')
def chequear_trials_vencidos():
    """Diaria: pasa a 'activo' o 'suspendido' los trials que ya vencieron, según tengan tarjeta cargada."""
    hoy = timezone.now().date()
    suscripciones = Suscripcion.objects.filter(estado='trial', trial_hasta__lt=hoy)

    for suscripcion in suscripciones:
        usuario = suscripcion.usuario

        if suscripcion.mp_preapproval_id:
            suscripcion.estado = 'activo'
            asunto = 'Tu período de prueba en Mi Estudio terminó'
            mensaje = (
                f'Hola {usuario.first_name or usuario.username},\n\n'
                'Tu período de prueba en Mi Estudio terminó. Como ya tenés una tarjeta '
                'cargada, Mercado Pago procesará el cobro de tu suscripción automáticamente.\n\n'
                'Gracias por confiar en Mi Estudio.'
            )
        else:
            suscripcion.estado = 'suspendido'
            asunto = 'Tu período de prueba en Mi Estudio venció'
            mensaje = (
                f'Hola {usuario.first_name or usuario.username},\n\n'
                'Tu período de prueba en Mi Estudio venció y no registramos una tarjeta '
                'cargada, por lo que tu cuenta fue suspendida. Ingresá a Mi Estudio y '
                'cargá tu método de pago para reactivarla.'
            )

        suscripcion.save(update_fields=['estado'])
        _enviar_mail(usuario, asunto, mensaje)
        logger.info('chequear_trials_vencidos: suscripcion %s -> %s', suscripcion.id, suscripcion.estado)


@shared_task(name='apps.billing.tasks.chequear_morosos')
def chequear_morosos():
    """Diaria: suspende las suscripciones en mora hace más de 30 días."""
    limite = timezone.now() - timedelta(days=30)
    suscripciones = Suscripcion.objects.filter(estado='moroso', updated_at__lt=limite)

    for suscripcion in suscripciones:
        suscripcion.estado = 'suspendido'
        suscripcion.save(update_fields=['estado'])

        usuario = suscripcion.usuario
        asunto = 'Tu cuenta de Mi Estudio fue suspendida'
        mensaje = (
            f'Hola {usuario.first_name or usuario.username},\n\n'
            'Tu suscripción a Mi Estudio estuvo en mora por más de 30 días, por lo que '
            'tu cuenta fue suspendida. Ingresá a Mi Estudio y actualizá tu método de pago '
            'para reactivarla.'
        )
        _enviar_mail(usuario, asunto, mensaje)
        logger.info('chequear_morosos: suscripcion %s -> suspendido', suscripcion.id)


@shared_task(name='apps.billing.tasks.avisar_trial_por_vencer')
def avisar_trial_por_vencer():
    """Diaria: avisa a los usuarios en trial que les quedan 15 o 1 día de prueba."""
    hoy = timezone.now().date()

    suscripciones = Suscripcion.objects.filter(
        Q(estado='trial'),
        Q(trial_hasta__gte=hoy + timedelta(days=15), trial_hasta__lt=hoy + timedelta(days=16)) |
        Q(trial_hasta__gte=hoy + timedelta(days=1), trial_hasta__lt=hoy + timedelta(days=2)),
    )

    for suscripcion in suscripciones:
        usuario = suscripcion.usuario
        dias_restantes = (suscripcion.trial_hasta - hoy).days
        plural = 's' if dias_restantes != 1 else ''

        asunto = f'Tu período de prueba en Mi Estudio vence en {dias_restantes} día{plural}'
        mensaje = (
            f'Hola {usuario.first_name or usuario.username},\n\n'
            f'Te quedan {dias_restantes} día{plural} de período de prueba en Mi Estudio. '
            'Cargá tu tarjeta para que tu suscripción continúe sin interrupciones.'
        )
        _enviar_mail(usuario, asunto, mensaje)
        logger.info(
            'avisar_trial_por_vencer: suscripcion %s, dias_restantes=%s', suscripcion.id, dias_restantes
        )
