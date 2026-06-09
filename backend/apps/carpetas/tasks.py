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
