import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils import timezone

from apps.mev_ingest.models import NotificacionMEVRecibida
from apps.mev_ingest.services import ejecutar_ingesta_mev

logger = logging.getLogger(__name__)

CACHE_KEY_ULTIMA_ALERTADA = 'mev_healthcheck:ultima_notificacion_alertada'


@shared_task(name='apps.mev_ingest.tasks.leer_mails_mev_task')
def leer_mails_mev_task():
    """
    Tarea periódica: lee la casilla IMAP recolectora de notificaciones MEV,
    las parsea y aplica (crea movimientos, cambios de estado) a la carpeta
    correspondiente. Misma lógica que el management command leer_mails_mev,
    sin dry-run ni solo-leer.
    """
    contadores = ejecutar_ingesta_mev(dry_run=False, solo_leer=False)
    logger.info('leer_mails_mev_task: %s', contadores)
    return contadores


def _horas_habiles_transcurridas(desde, hasta):
    """
    Antigüedad en horas entre `desde` y `hasta`, descontando los fines de
    semana completos comprendidos en el rango. Evita falsas alarmas por la
    ausencia normal de notificaciones entre el viernes y el lunes (la
    casilla MEV sólo recibe notificaciones en días hábiles).
    """
    horas_totales = (hasta - desde).total_seconds() / 3600
    horas_fin_de_semana = 0
    dia = desde.date()
    while dia <= hasta.date():
        if dia.weekday() in (5, 6):  # sábado, domingo
            horas_fin_de_semana += 24
        dia += timedelta(days=1)
    return horas_totales - horas_fin_de_semana


def antiguedad_ultima_notificacion_mev():
    """
    Devuelve (ultima, antiguedad_horas, antiguedad_horas_habiles) de la
    NotificacionMEVRecibida más reciente, o (None, None, None) si todavía
    no entró ninguna. `antiguedad_horas_habiles` descuenta fines de semana
    completos, ver `_horas_habiles_transcurridas`.
    """
    ultima = NotificacionMEVRecibida.objects.order_by('-fecha_recepcion').first()
    if not ultima:
        return None, None, None

    ahora = timezone.now()
    antiguedad_horas = (ahora - ultima.fecha_recepcion).total_seconds() / 3600
    antiguedad_horas_habiles = _horas_habiles_transcurridas(ultima.fecha_recepcion, ahora)
    return ultima, antiguedad_horas, antiguedad_horas_habiles


@shared_task(name='apps.mev_ingest.tasks.verificar_salud_ingesta_mev')
def verificar_salud_ingesta_mev():
    """
    Healthcheck: si hace más de MEV_HEALTHCHECK_UMBRAL_HORAS horas hábiles
    (descontando fines de semana) que no entra ninguna notificación MEV
    nueva, avisa por mail a MEV_HEALTHCHECK_ADMIN_EMAIL. Pensada para
    correr cada 1-2 horas vía Celery beat.

    Manda un solo mail por corte (no reenvía en cada corrida mientras siga
    la misma notificación más reciente) y se resetea sola apenas entra una
    notificación nueva.

    OJO: esta tarea corre en el mismo Celery que la ingesta. Si Celery
    entero está caído, esta tarea tampoco corre y no va a avisar nada. Para
    detectar esa falla de fondo hace falta un chequeo externo a Celery, ver
    el endpoint /api/v1/mev-ingest/health/ (pensado para un cron del
    sistema o un servicio de uptime externo).
    """
    ultima, antiguedad_horas, antiguedad_horas_habiles = antiguedad_ultima_notificacion_mev()

    if ultima is None:
        logger.warning('verificar_salud_ingesta_mev: no hay ninguna NotificacionMEVRecibida registrada.')
        return {'alerta_enviada': False, 'motivo': 'sin_notificaciones'}

    umbral = settings.MEV_HEALTHCHECK_UMBRAL_HORAS

    if antiguedad_horas_habiles <= umbral:
        cache.delete(CACHE_KEY_ULTIMA_ALERTADA)
        return {
            'alerta_enviada': False,
            'antiguedad_horas': round(antiguedad_horas, 1),
            'antiguedad_horas_habiles': round(antiguedad_horas_habiles, 1),
        }

    marca_notificacion = ultima.fecha_recepcion.isoformat()
    if cache.get(CACHE_KEY_ULTIMA_ALERTADA) == marca_notificacion:
        return {'alerta_enviada': False, 'motivo': 'ya_alertado'}

    asunto = 'Alerta: la ingesta MEV no recibe notificaciones nuevas'
    mensaje = (
        f'La ingesta MEV no registra notificaciones nuevas desde '
        f'{timezone.localtime(ultima.fecha_recepcion):%d/%m/%Y %H:%M}. '
        'Revisar que Celery y la casilla estén funcionando.'
    )
    try:
        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.MEV_HEALTHCHECK_ADMIN_EMAIL],
        )
        cache.set(CACHE_KEY_ULTIMA_ALERTADA, marca_notificacion, timeout=60 * 60 * 24 * 7)
    except Exception:
        logger.exception('verificar_salud_ingesta_mev: error enviando alerta.')

    logger.warning(
        'verificar_salud_ingesta_mev: alerta enviada, última notificación hace %.1fh (%.1fh hábiles).',
        antiguedad_horas, antiguedad_horas_habiles,
    )
    return {
        'alerta_enviada': True,
        'antiguedad_horas': round(antiguedad_horas, 1),
        'antiguedad_horas_habiles': round(antiguedad_horas_habiles, 1),
    }
