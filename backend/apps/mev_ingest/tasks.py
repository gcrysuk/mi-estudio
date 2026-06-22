import logging

from celery import shared_task

from apps.mev_ingest.services import ejecutar_ingesta_mev

logger = logging.getLogger(__name__)


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
