import email
import imaplib
import logging
import re
import unicodedata
from email.policy import default as email_default_policy
from email.utils import parsedate_to_datetime

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.carpetas.models import Carpeta, HistorialEstadoMEV
from apps.movimientos.models import Movimiento, TipoMovimiento
from apps.movimientos.utils import crear_notificacion

logger = logging.getLogger(__name__)


def normalizar_nro_causa(valor: str) -> str:
    """Deja solo dígitos. Normaliza unicode antes (ej. \\xa0 -> espacio) para
    que un espacio duro no se confunda con un dígito pegado."""
    if not valor:
        return ''
    valor = unicodedata.normalize('NFKC', valor)
    return re.sub(r'\D', '', valor)


def normalizar_numero_expediente(valor: str) -> str:
    """Toma la parte numérica antes de guion/espacio/sufijo. Ej '29948 - 07' -> '29948'.
    Normaliza unicode antes (ej. '29948\\xa0-\\xa007' -> '29948 - 07') para que los
    espacios duros que vienen del MEV no rompan la extracción del prefijo numérico."""
    if not valor:
        return ''
    valor = unicodedata.normalize('NFKC', valor)
    match = re.match(r'\s*(\d+)', valor)
    return match.group(1) if match else ''


def buscar_carpeta_match(nro_causa: str):
    """Busca, en todas las carpetas del estudio, la que coincide por número de
    expediente normalizado. Retorna (carpeta, cantidad_candidatas): la carpeta
    es None si hay 0 o más de un match (queda para revisión manual), y
    cantidad_candidatas indica cuántas carpetas coincidieron."""
    nro_normalizado = normalizar_nro_causa(nro_causa)
    if not nro_normalizado:
        return None, 0

    candidatas = []
    for carpeta in Carpeta.objects.filter(activo=True).exclude(numero_expediente=''):
        if normalizar_numero_expediente(carpeta.numero_expediente) == nro_normalizado:
            candidatas.append(carpeta)

    if len(candidatas) == 1:
        return candidatas[0], 1
    return None, len(candidatas)


def aplicar_notificacion(notif):
    """Aplica una NotificacionMEVRecibida en estado 'asignado' a su carpeta:
    crea el movimiento, registra el cambio de estado MEV si corresponde y
    notifica al responsable. Idempotente: no vuelve a aplicar si ya está
    'procesado'."""
    if notif.estado_procesamiento == 'procesado':
        return

    try:
        with transaction.atomic():
            carpeta = notif.carpeta

            tipo_mev, _ = TipoMovimiento.objects.get_or_create(
                nombre='MEV',
                propietario=None,
                defaults={'color': '#6366f1', 'orden': 99},
            )

            movimiento = Movimiento.objects.create(
                carpeta=carpeta,
                tipo=tipo_mev,
                titulo=notif.descripcion or notif.estado or 'Notificación MEV',
                descripcion=notif.cuerpo_proveido,
                transcripcion=notif.cuerpo_proveido,
                fecha_movimiento=notif.fecha_proveido,
                creado_por=carpeta.propietario,
            )
            notif.movimiento_creado = movimiento

            estado_anterior = carpeta.mev_estado
            if notif.estado and notif.estado != estado_anterior:
                HistorialEstadoMEV.objects.create(
                    carpeta=carpeta,
                    estado_anterior=estado_anterior,
                    estado_nuevo=notif.estado,
                    fecha_cambio=notif.fecha_proveido,
                )
                carpeta.mev_estado = notif.estado
                carpeta.mev_fecha_estado = notif.fecha_proveido
                carpeta.save(update_fields=['mev_estado', 'mev_fecha_estado'])

                Movimiento.objects.create(
                    carpeta=carpeta,
                    tipo=tipo_mev,
                    titulo='Cambio de estado MEV',
                    descripcion=f"Cambio de estado MEV: {estado_anterior or '(sin estado)'} → {notif.estado}",
                    fecha_movimiento=notif.fecha_proveido,
                    creado_por=carpeta.propietario,
                )

                crear_notificacion(
                    carpeta.propietario, 'mev_cambio_estado',
                    movimiento=None, carpeta=carpeta,
                    mensaje=(
                        f"Cambio de estado MEV en '{carpeta.nombre}': "
                        f"{estado_anterior or '(sin estado)'} → {notif.estado}"
                    ),
                )

            notif.estado_procesamiento = 'procesado'
            notif.save()
    except Exception as exc:
        notif.estado_procesamiento = 'error'
        notif.error_detalle = str(exc)
        notif.save()


def _aware(dt):
    if dt is None:
        return None
    return timezone.make_aware(dt) if timezone.is_naive(dt) else dt


def _procesar_mensaje_mev(imap, num, dry_run, solo_leer, contadores):
    from apps.mev_ingest.models import NotificacionMEVRecibida
    from apps.mev_ingest.parser import parse_mail_mev

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


def ejecutar_ingesta_mev(dry_run=False, solo_leer=False):
    """Lee la casilla IMAP recolectora de notificaciones MEV, las parsea y
    aplica a la carpeta correspondiente. Función central usada tanto por el
    management command leer_mails_mev como por la tarea periódica de Celery,
    para no duplicar la lógica de ingesta."""
    contadores = {
        'leidos': 0, 'nuevos': 0, 'asignados': 0,
        'sin_match': 0, 'procesados': 0, 'error': 0,
    }

    try:
        imap = imaplib.IMAP4_SSL(settings.MEV_IMAP_HOST, settings.MEV_IMAP_PORT)
        imap.login(settings.MEV_IMAP_USER, settings.MEV_IMAP_PASS)
    except Exception as exc:
        logger.error('No se pudo conectar al IMAP: %s', exc)
        return contadores

    try:
        imap.select('INBOX')
        status, datos = imap.search(None, 'ALL')
        if status != 'OK':
            logger.error('No se pudo leer INBOX')
            return contadores

        for num in datos[0].split():
            contadores['leidos'] += 1
            try:
                _procesar_mensaje_mev(imap, num, dry_run, solo_leer, contadores)
            except Exception as exc:
                logger.error('Error procesando mensaje MEV: %s', exc)
    finally:
        try:
            imap.close()
        except Exception:
            pass
        imap.logout()

    logger.info('ejecutar_ingesta_mev: %s', contadores)
    return contadores
