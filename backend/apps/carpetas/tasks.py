import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='apps.carpetas.tasks.notificar_mev_estados')
def notificar_mev_estados():
    """
    Tarea diaria: notifica sobre carpetas con mucho tiempo en estado MEV.
    Ventanas amplias (10 días) para tolerar días sin ejecución de Beat:
      - A Despacho : ventana 80–90 días  (umbral 90)
      - En Letra   : ventana 80–90 días  (umbral 90, 3 meses)
      - En Letra   : ventana 170–180 días (umbral 180, 6 meses)
    Anti-duplicado: omite si ya existe notificación del mismo umbral
    para esa carpeta en los últimos 30 días.
    """
    from datetime import timedelta
    from django.utils import timezone
    from apps.carpetas.models import Carpeta
    from apps.carpetas.utils import qs_con_fecha_inicio_estado_mev
    from apps.movimientos.models import NotificacionSistema
    from apps.movimientos.utils import crear_notificacion

    now     = timezone.now()
    hace_80  = now - timedelta(days=80)
    hace_90  = now - timedelta(days=90)
    hace_170 = now - timedelta(days=170)
    hace_180 = now - timedelta(days=180)
    hace_30  = now - timedelta(days=30)

    carpetas_mev = qs_con_fecha_inicio_estado_mev(
        Carpeta.objects
        .filter(mev_url__isnull=False, activo=True)
        .exclude(mev_url='')
        .select_related('propietario')
    )

    def ya_notificado(carpeta, usuario, umbral_str):
        return NotificacionSistema.objects.filter(
            usuario=usuario,
            tipo='mev_cambio_estado',
            carpeta=carpeta,
            mensaje__contains=umbral_str,
            fecha_creacion__gte=hace_30,
        ).exists()

    contadores = {'despacho_90': 0, 'letra_90': 0, 'letra_180': 0, 'skip_duplicados': 0}

    # A Despacho → umbral 90 días (ventana 80–90)
    for c in carpetas_mev.filter(
        mev_estado__iexact='A Despacho',
        fecha_inicio_estado__lte=hace_80,
        fecha_inicio_estado__gt=hace_90,
    ):
        if ya_notificado(c, c.propietario, 'A Despacho, se cumplen 90'):
            contadores['skip_duplicados'] += 1
            continue
        dias = (now - c.fecha_inicio_estado).days
        crear_notificacion(
            c.propietario, 'mev_cambio_estado',
            movimiento=None, carpeta=c,
            mensaje=(
                f"⏰ {c.nombre}: lleva {dias} días A Despacho, "
                f"se cumplen 90 en {90 - dias} días"
            ),
        )
        contadores['despacho_90'] += 1

    # En Letra → umbral 90 días (ventana 80–90)
    for c in carpetas_mev.filter(
        mev_estado__iexact='En Letra',
        fecha_inicio_estado__lte=hace_80,
        fecha_inicio_estado__gt=hace_90,
    ):
        if ya_notificado(c, c.propietario, 'En Letra, se cumplen 90'):
            contadores['skip_duplicados'] += 1
            continue
        dias = (now - c.fecha_inicio_estado).days
        crear_notificacion(
            c.propietario, 'mev_cambio_estado',
            movimiento=None, carpeta=c,
            mensaje=(
                f"⏰ {c.nombre}: lleva {dias} días En Letra, "
                f"se cumplen 90 en {90 - dias} días (vencimiento 3 meses)"
            ),
        )
        contadores['letra_90'] += 1

    # En Letra → umbral 180 días (ventana 170–180)
    for c in carpetas_mev.filter(
        mev_estado__iexact='En Letra',
        fecha_inicio_estado__lte=hace_170,
        fecha_inicio_estado__gt=hace_180,
    ):
        if ya_notificado(c, c.propietario, 'se cumplen 180'):
            contadores['skip_duplicados'] += 1
            continue
        dias = (now - c.fecha_inicio_estado).days
        crear_notificacion(
            c.propietario, 'mev_cambio_estado',
            movimiento=None, carpeta=c,
            mensaje=(
                f"⏰ {c.nombre}: lleva {dias} días En Letra, "
                f"se cumplen 180 en {180 - dias} días (vencimiento 6 meses)"
            ),
        )
        contadores['letra_180'] += 1

    logger.info('notificar_mev_estados: %s', contadores)
    return contadores
