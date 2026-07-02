import email
import imaplib
import logging
import re
import unicodedata
from email.policy import default as email_default_policy
from email.utils import getaddresses, parseaddr, parsedate_to_datetime
from html import escape as escape_html

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.carpetas.models import Carpeta, HistorialEstadoMEV
from apps.movimientos.models import Movimiento, TipoMovimiento
from apps.movimientos.utils import crear_notificacion
from apps.organismos.models import Organismo

logger = logging.getLogger(__name__)

User = get_user_model()


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


def texto_plano_a_html(texto: str) -> str:
    """Convierte texto plano (líneas separadas por \\n) al HTML que produce
    Quill (getSemanticHTML) al editar un movimiento a mano: cada línea no
    vacía envuelta en <p>, sin separadores entre ellas. Replica exactamente
    textoAHtml() de frontend/src/pages/movimientos/MovimientoForm.jsx para que
    el movimiento se vea igual sin necesidad de editarlo. Escapa & < > para no
    romper el markup ni inyectar HTML del cuerpo del mail."""
    if not texto:
        return ''
    lineas = [linea for linea in texto.split('\n') if linea.strip()]
    return ''.join(f'<p>{escape_html(linea, quote=False)}</p>' for linea in lineas)


def _resolver_numero_expediente(actual: str, nuevo: str) -> str:
    """Decide qué valor guardar en carpeta.numero_expediente a partir del
    nro_causa del mail, sin degradar un valor ya guardado más específico
    (ej. carpeta '29948 - 07', mail '29948': se mantiene el de la carpeta,
    ya que el match sólo usa el prefijo numérico y no se pierde nada)."""
    if not nuevo:
        return actual
    if not actual:
        return nuevo
    mismo_expediente = normalizar_numero_expediente(actual) == normalizar_nro_causa(nuevo)
    if mismo_expediente and len(nuevo.strip()) < len(actual.strip()):
        return actual
    return nuevo


def buscar_carpeta_match(nro_causa: str, usuario):
    """Busca, entre las carpetas del abogado dado (propias o compartidas con
    él), la que coincide por número de expediente normalizado. El match está
    restringido a ese abogado para no cruzar expedientes duplicados entre
    distintos abogados de la misma casilla compartida. Retorna
    (carpeta, cantidad_candidatas): la carpeta es None si hay 0 o más de un
    match (queda para revisión manual), y cantidad_candidatas indica cuántas
    carpetas coincidieron."""
    nro_normalizado = normalizar_nro_causa(nro_causa)
    if not nro_normalizado or usuario is None:
        return None, 0

    carpetas_usuario = Carpeta.objects.filter(
        Q(propietario=usuario) | Q(compartida_con=usuario),
        activo=True,
    ).exclude(numero_expediente='').distinct()

    candidatas = []
    for carpeta in carpetas_usuario:
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

            # La MEV es la fuente de verdad: sincronizar nombre, expediente y
            # organismo de la carpeta con los datos del mail, aunque ya tengan
            # valor. Se aplica tanto en match automático como en asignación manual.
            campos_actualizados = []

            if notif.caratula and carpeta.nombre != notif.caratula:
                carpeta.nombre = notif.caratula
                campos_actualizados.append('nombre')

            if notif.nro_causa:
                nuevo_numero = _resolver_numero_expediente(carpeta.numero_expediente, notif.nro_causa)
                if nuevo_numero != carpeta.numero_expediente:
                    carpeta.numero_expediente = nuevo_numero
                    campos_actualizados.append('numero_expediente')

            if notif.organismo and notif.organismo.strip():
                organismo_obj = Organismo.objects.filter(
                    propietario=carpeta.propietario, nombre__iexact=notif.organismo
                ).first()
                if organismo_obj is None:
                    organismo_obj, _ = Organismo.objects.get_or_create(
                        nombre=notif.organismo,
                        propietario=carpeta.propietario,
                        defaults={'activo': True},
                    )
                if carpeta.organismo_id != organismo_obj.id:
                    carpeta.organismo = organismo_obj
                    campos_actualizados.append('organismo')

            if campos_actualizados:
                carpeta.save(update_fields=campos_actualizados)
                logger.info(
                    'aplicar_notificacion: carpeta %s actualizada desde MEV (campos: %s)',
                    carpeta.id, campos_actualizados,
                )

            tipo_mev, _ = TipoMovimiento.objects.get_or_create(
                nombre='MEV',
                propietario=None,
                defaults={'color': '#6366f1', 'orden': 99},
            )

            cuerpo_html = texto_plano_a_html(notif.cuerpo_proveido)
            movimiento = Movimiento.objects.create(
                carpeta=carpeta,
                tipo=tipo_mev,
                titulo=notif.descripcion or notif.estado or 'Notificación MEV',
                descripcion=cuerpo_html,
                transcripcion=cuerpo_html,
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


def _extraer_destinatario(msg) -> str:
    """Determina el email del abogado destinatario original de un mail MEV
    reenviado a través de la casilla recolectora compartida. Prioridad:
    1) 'To' si no es la casilla recolectora (reenvío automático de Gmail
       preserva el 'To' original). 2) Si 'To' es la casilla, 'Delivered-To'
       (reenvío manual). 3) Si no hay, el primer email de 'X-Forwarded-For'
       que no sea la casilla."""
    casilla = (settings.MEV_IMAP_USER or '').strip().lower()

    _, to_addr = parseaddr(msg.get('To', ''))
    to_addr = to_addr.strip().lower()
    if to_addr and to_addr != casilla:
        return to_addr

    _, delivered_addr = parseaddr(msg.get('Delivered-To', ''))
    delivered_addr = delivered_addr.strip().lower()
    if delivered_addr and delivered_addr != casilla:
        return delivered_addr

    for _, addr in getaddresses([msg.get('X-Forwarded-For', '')]):
        addr = addr.strip().lower()
        if addr and addr != casilla:
            return addr

    return ''


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

    destinatario = _extraer_destinatario(msg)
    usuario = User.objects.filter(email__iexact=destinatario).first() if destinatario else None

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
        destinatario=destinatario,
        usuario=usuario,
    )

    if usuario is None:
        notif.estado_procesamiento = 'no_reconocido'
        notif.save()
        contadores['no_reconocido'] += 1
        return notif

    if solo_leer:
        return notif

    carpeta, candidatas_count = buscar_carpeta_match(notif.nro_causa, usuario)
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


def reintentar_sin_match(dry_run, contadores):
    """Recorre las notificaciones que quedaron en estado 'sin_match' en
    corridas anteriores y reintenta el match: si ahora existe la carpeta
    correspondiente (ej. llegó el mail antes de que se cargara la carpeta),
    la asigna y aplica. Si sigue sin match único, sólo actualiza el conteo
    de candidatas. Sólo se reintentan las que ya tienen un abogado
    identificado (usuario no nulo); las 'no_reconocido' quedan para revisión
    de admin."""
    from apps.mev_ingest.models import NotificacionMEVRecibida

    pendientes = NotificacionMEVRecibida.objects.filter(
        estado_procesamiento='sin_match', usuario__isnull=False,
    )
    for notif in pendientes:
        carpeta, candidatas_count = buscar_carpeta_match(notif.nro_causa, notif.usuario)
        if carpeta:
            notif.carpeta = carpeta
            notif.estado_procesamiento = 'asignado'
            notif.carpetas_candidatas_count = candidatas_count
            notif.save()
            contadores['rematcheados'] += 1
            contadores['asignados'] += 1

            if not dry_run:
                aplicar_notificacion(notif)
                if notif.estado_procesamiento == 'procesado':
                    contadores['procesados'] += 1
                elif notif.estado_procesamiento == 'error':
                    contadores['error'] += 1
        elif candidatas_count != notif.carpetas_candidatas_count:
            notif.carpetas_candidatas_count = candidatas_count
            notif.save(update_fields=['carpetas_candidatas_count'])


def ejecutar_ingesta_mev(dry_run=False, solo_leer=False):
    """Lee la casilla IMAP recolectora de notificaciones MEV, las parsea y
    aplica a la carpeta correspondiente. Función central usada tanto por el
    management command leer_mails_mev como por la tarea periódica de Celery,
    para no duplicar la lógica de ingesta."""
    contadores = {
        'leidos': 0, 'nuevos': 0, 'asignados': 0,
        'sin_match': 0, 'procesados': 0, 'error': 0, 'rematcheados': 0,
        'no_reconocido': 0,
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

        if not solo_leer:
            try:
                reintentar_sin_match(dry_run, contadores)
            except Exception as exc:
                logger.error('Error reintentando sin_match: %s', exc)
    finally:
        try:
            imap.close()
        except Exception:
            pass
        imap.logout()

    logger.info('ejecutar_ingesta_mev: %s', contadores)
    return contadores
