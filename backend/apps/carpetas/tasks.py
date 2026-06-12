import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, name='apps.carpetas.tasks.sync_mev_carpeta_task')
def sync_mev_carpeta_task(self, carpeta_id):
    """Sincroniza una carpeta individual desde la MEV."""
    from django.conf import settings
    from apps.carpetas.models import Carpeta
    from apps.carpetas.mev_scraper import mev_sync_carpeta
    from cryptography.fernet import Fernet

    try:
        carpeta = Carpeta.objects.select_related('propietario__perfil').get(pk=carpeta_id)
        perfil = carpeta.propietario.perfil

        if not perfil.mev_usuario or not perfil.mev_clave:
            return {'error': 'Sin credenciales MEV'}

        key = getattr(settings, 'MEV_ENCRYPTION_KEY', '')
        if not key:
            return {'error': 'MEV_ENCRYPTION_KEY no configurada'}

        fernet = Fernet(key.encode() if isinstance(key, str) else key)
        clave = fernet.decrypt(perfil.mev_clave.encode()).decode()

        resultado = mev_sync_carpeta(carpeta, perfil.mev_usuario, clave, perfil.mev_depto or 'aa')
        logger.info('MEV sync carpeta %s: %s', carpeta_id, resultado)

        if resultado.get('error'):
            from apps.movimientos.utils import crear_notificacion
            crear_notificacion(
                carpeta.propietario,
                'mev_error',
                movimiento=None,
                carpeta=carpeta,
                mensaje=f"Error al sincronizar MEV en '{carpeta.nombre}': {resultado['error']}",
            )

        return resultado

    except Exception as exc:
        logger.error('MEV sync error carpeta %s: %s', carpeta_id, exc)
        raise self.retry(exc=exc, countdown=60)


@shared_task(name='apps.carpetas.tasks.encolar_sync_mev')
def encolar_sync_mev():
    """
    Tarea maestra que corre cada hora.
    Encola carpetas que necesitan sincronización respetando rate limit.
    """
    from django.db.models import Q
    from django.utils import timezone
    from datetime import timedelta
    from apps.carpetas.models import Carpeta

    hace_24hs = timezone.now() - timedelta(hours=24)

    carpetas = (
        Carpeta.objects
        .filter(mev_url__isnull=False, activo=True)
        .exclude(mev_url='')
        .filter(
            Q(mev_ultimo_sync__isnull=True) |
            Q(mev_ultimo_sync__lt=hace_24hs)
        )
        .select_related('propietario__perfil')
        .order_by('mev_ultimo_sync')[:50]
    )

    encoladas = 0
    for i, carpeta in enumerate(carpetas):
        try:
            perfil = carpeta.propietario.perfil
        except Exception:
            continue
        if not perfil.mev_usuario or not perfil.mev_clave:
            continue
        sync_mev_carpeta_task.apply_async(
            args=[carpeta.id],
            countdown=i * 30,
        )
        encoladas += 1

    logger.info('MEV: %d carpetas encoladas para sync', encoladas)
    return {'encoladas': encoladas}


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
