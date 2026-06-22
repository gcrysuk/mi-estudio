import re
import unicodedata

from django.db import transaction

from apps.carpetas.models import Carpeta, HistorialEstadoMEV
from apps.movimientos.models import Movimiento, TipoMovimiento
from apps.movimientos.utils import crear_notificacion


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
