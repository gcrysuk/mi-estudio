import email
import imaplib
import logging
from email.policy import default as email_default_policy
from email.utils import parsedate_to_datetime

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.mev_ingest.models import NotificacionMEVRecibida
from apps.mev_ingest.parser import parse_mail_mev
from apps.mev_ingest.services import aplicar_notificacion, buscar_carpeta_match

logger = logging.getLogger(__name__)


def _aware(dt):
    if dt is None:
        return None
    return timezone.make_aware(dt) if timezone.is_naive(dt) else dt


class Command(BaseCommand):
    help = "Lee la casilla IMAP recolectora de notificaciones MEV, las parsea y aplica a la carpeta correspondiente."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Parsea y matchea pero no aplica (no crea movimientos ni cambia estados).',
        )
        parser.add_argument(
            '--solo-leer', action='store_true',
            help='Solo guarda los registros (sin matchear ni aplicar).',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        solo_leer = options['solo_leer']

        contadores = {
            'leidos': 0, 'nuevos': 0, 'asignados': 0,
            'sin_match': 0, 'procesados': 0, 'error': 0,
        }

        try:
            imap = imaplib.IMAP4_SSL(settings.MEV_IMAP_HOST, settings.MEV_IMAP_PORT)
            imap.login(settings.MEV_IMAP_USER, settings.MEV_IMAP_PASS)
        except Exception as exc:
            self.stderr.write(f"No se pudo conectar al IMAP: {exc}")
            return

        try:
            imap.select('INBOX')
            status, datos = imap.search(None, 'ALL')
            if status != 'OK':
                self.stderr.write("No se pudo leer INBOX")
                return

            for num in datos[0].split():
                contadores['leidos'] += 1
                try:
                    notif = self._procesar_mensaje(imap, num, dry_run, solo_leer, contadores)
                except Exception as exc:
                    logger.error('Error procesando mensaje MEV: %s', exc)
        finally:
            try:
                imap.close()
            except Exception:
                pass
            imap.logout()

        self.stdout.write(self.style.SUCCESS(
            "leidos={leidos} nuevos={nuevos} asignados={asignados} "
            "sin_match={sin_match} procesados={procesados} error={error}".format(**contadores)
        ))

    def _procesar_mensaje(self, imap, num, dry_run, solo_leer, contadores):
        status, datos_msg = imap.fetch(num, '(RFC822)')
        if status != 'OK' or not datos_msg or not datos_msg[0]:
            return None

        raw = datos_msg[0][1]
        msg = email.message_from_bytes(raw, policy=email_default_policy)

        message_id = (msg.get('Message-ID') or '').strip()
        if message_id and NotificacionMEVRecibida.objects.filter(message_id=message_id).exists():
            return None

        body_part = msg.get_body(preferencelist=('html',))
        if body_part is None:
            return None
        html = body_part.get_content()

        datos = parse_mail_mev(html)
        if not datos.get('nro_causa'):
            return None

        contadores['nuevos'] += 1

        fecha_header = msg.get('Date')
        try:
            fecha_recepcion = _aware(parsedate_to_datetime(fecha_header)) if fecha_header else timezone.now()
        except (TypeError, ValueError):
            fecha_recepcion = timezone.now()

        notif = NotificacionMEVRecibida.objects.create(
            message_id=message_id or f'sin-message-id-{timezone.now().timestamp()}',
            remitente=msg.get('From', ''),
            asunto=msg.get('Subject', ''),
            fecha_recepcion=fecha_recepcion,
            organismo=datos['organismo'],
            nro_causa=datos['nro_causa'],
            caratula=datos['caratula'],
            estado=datos['estado'],
            descripcion=datos['descripcion'],
            fecha_proveido=_aware(datos['fecha']),
            cuerpo_proveido=datos['cuerpo_proveido'],
            raw_html=html,
        )

        if solo_leer:
            return notif

        carpeta, candidatas_count = buscar_carpeta_match(notif.nro_causa)
        if carpeta:
            notif.carpeta = carpeta
            notif.estado_procesamiento = 'asignado'
            contadores['asignados'] += 1
        else:
            notif.estado_procesamiento = 'sin_match'
            notif.carpetas_candidatas_count = candidatas_count
            contadores['sin_match'] += 1
        notif.save()

        if notif.estado_procesamiento == 'asignado' and not dry_run:
            aplicar_notificacion(notif)
            if notif.estado_procesamiento == 'procesado':
                contadores['procesados'] += 1
            elif notif.estado_procesamiento == 'error':
                contadores['error'] += 1

        return notif
