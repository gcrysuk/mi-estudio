"""
Scraper read-only para la MEV (Mesa de Entradas Virtual) del SCBA.
"""
import http.cookiejar
import logging
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

from bs4 import BeautifulSoup
from django.utils import timezone

logger = logging.getLogger(__name__)

MEV_BASE = 'https://mev.scba.gov.ar'
MEV_LOGIN_URL = f'{MEV_BASE}/loguin.asp?familiadepto='
ENCODING = 'latin-1'
_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'


def _get_session(usuario: str, clave: str, depto: str):
    """
    Abre sesión en la MEV usando un único cookie_jar compartido.
    Retorna cookie_jar o None si falla.
    """
    cookie_jar = http.cookiejar.CookieJar()

    class _NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    opener_login = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cookie_jar),
        _NoRedirect(),
    )
    opener_login.addheaders = [('User-Agent', _UA)]

    payload = urllib.parse.urlencode({
        'usuario': usuario,
        'clave': clave,
        'DeptoRegistrado': depto,
    }).encode(ENCODING)

    try:
        try:
            opener_login.open(MEV_LOGIN_URL, payload, timeout=30)
            return None
        except urllib.error.HTTPError as exc:
            if exc.code not in (301, 302):
                return None
            location = exc.headers.get('Location', '')
            if isinstance(location, bytes):
                location = location.decode(ENCODING)
            if not location.startswith('http'):
                location = f'{MEV_BASE}/{location.lstrip("/")}'
            # Login fallido si redirige al formulario de login
            if 'loguin' in location.lower() and 'pos' not in location.lower():
                return None
            # Login fallido si redirige a página de error de credenciales
            if 'aviso' in location.lower() or 'error' in location.lower():
                logger.warning('MEV credenciales incorrectas, redirect a: %s', location)
                return None
            # Seguir redirect manualmente
            try:
                opener_login.open(location, timeout=30)
            except Exception:
                pass
        return cookie_jar
    except Exception as exc:
        logger.error('MEV login error: %s', exc)
        return None


def _mev_get(cookie_jar, url: str) -> str:
    """
    GET a la MEV creando un opener fresco con las cookies del jar.
    Maneja redirects manualmente para evitar UnicodeDecodeError.
    """
    for _ in range(5):
        class _NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None

        opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(cookie_jar),
            _NoRedirect(),
        )
        opener.addheaders = [('User-Agent', _UA)]

        try:
            resp = opener.open(url, timeout=30)
            return resp.read().decode(ENCODING)
        except urllib.error.HTTPError as exc:
            if exc.code not in (301, 302):
                raise
            location = exc.headers.get('Location', '')
            if isinstance(location, bytes):
                location = location.decode(ENCODING)
            if not location.startswith('http'):
                location = f'{MEV_BASE}/{location.lstrip("/")}'
            url = location
        except Exception:
            raise

    raise RuntimeError(f'Demasiados redirects: {url}')


def _parse_estado_expediente(html: str) -> str:
    """
    Extrae el estado del expediente de la página de procesales.
    Busca: <td class="fondoceleste"><b>Estado:</b>&nbsp;&nbsp;VALOR</td>
    Retorna el estado como string o '' si no lo encuentra.
    """
    soup = BeautifulSoup(html, 'html.parser')
    for td in soup.find_all('td', class_='fondoceleste'):
        texto = td.get_text(strip=True)
        if texto.startswith('Estado:'):
            return texto.replace('Estado:', '').strip()[:100]
    return ''


def _parse_procesales(html: str) -> list[dict]:
    soup = BeautifulSoup(html, 'html.parser')
    movimientos = []

    target_table = None
    for table in soup.find_all('table'):
        if 'Fecha' in table.get_text() and 'Descripci' in table.get_text():
            target_table = table
            break

    if not target_table:
        return movimientos

    rows = target_table.find_all('tr')
    for row in rows[1:]:
        cells = row.find_all('td')
        if len(cells) < 4:
            continue

        fecha_text = cells[0].get_text(strip=True)
        fojas = cells[1].get_text(strip=True)
        desc_td = cells[3]
        descripcion = desc_td.get_text(strip=True)

        link_detalle = None
        a_tag = desc_td.find('a')
        if a_tag and a_tag.get('href'):
            href = a_tag['href']
            if not href.startswith('http'):
                href = f'{MEV_BASE}/{href.lstrip("/")}'
            link_detalle = href

        if not fecha_text or not descripcion:
            continue

        fecha = None
        for fmt in ('%d/%m/%Y %H:%M:%S', '%d/%m/%Y %H:%M', '%d/%m/%Y'):
            try:
                fecha = datetime.strptime(fecha_text, fmt)
                break
            except ValueError:
                continue

        if fecha is None:
            continue

        movimientos.append({
            'fecha': fecha,
            'titulo': descripcion[:200],
            'fojas': fojas,
            'link_detalle': link_detalle,
        })

    return movimientos


def _parse_detalle(html: str) -> dict:
    soup = BeautifulSoup(html, 'html.parser')
    detalle = {}

    campos_buscar = [
        ('Despachado en', 'despachado_en'),
        ('Funcionario Firmante', 'funcionario_firmante'),
        ('Nro. Notificaci', 'nro_notificacion'),
        ('Trámite Despachado', 'tramite_despachado'),
        ('Fecha de Libramiento', 'fecha_libramiento'),
        ('Fecha de Notificaci', 'fecha_notificacion'),
        ('Notificado por', 'notificado_por'),
        ('Domic. Electrónico', 'domicilio_electronico'),
    ]

    texto_completo = soup.get_text(separator='\n')
    lineas = [l.strip() for l in texto_completo.split('\n') if l.strip()]

    for i, linea in enumerate(lineas):
        for label, key in campos_buscar:
            if label in linea and key not in detalle:
                valor = linea.replace(label, '').strip().lstrip(':').strip()
                if not valor and i + 1 < len(lineas):
                    valor = lineas[i + 1]
                if valor:
                    detalle[key] = valor[:500]

    # Extraer texto libre del proveído preservando links en formato markdown
    lineas_texto = []
    capturando = False
    for linea in lineas:
        if 'seleccione desde' in linea.lower():
            capturando = True
            continue
        if 'seleccione hasta' in linea.lower():
            break
        if capturando and linea:
            lineas_texto.append(linea)
    if lineas_texto:
        texto_base = ' '.join(lineas_texto)
        # Reemplazar textos de links con formato markdown [texto](url)
        for a in soup.find_all('a', href=True):
            link_text = a.get_text(strip=True)
            if link_text and link_text in texto_base:
                href = a['href']
                if not href.startswith('http'):
                    href = f'{MEV_BASE}/{href.lstrip("/")}'
                texto_base = texto_base.replace(link_text, f'[{link_text}]({href})', 1)
        detalle['texto_proveido'] = texto_base[:2000]

    # Buscar links a proveídos relacionados (segundo nivel)
    links_relacionados = []
    for a in soup.find_all('a', href=True):
        href = a['href']
        if 'proveido.asp' in href.lower():
            if not href.startswith('http'):
                href = f'{MEV_BASE}/{href.lstrip("/")}'
            links_relacionados.append(href)
    detalle['links_relacionados'] = links_relacionados

    return detalle


def mev_sync_carpeta(carpeta, usuario: str, clave: str, depto: str) -> dict:
    from apps.movimientos.models import Movimiento, TipoMovimiento, NotificacionSistema
    import time

    if not carpeta.mev_url:
        return {'nuevos': 0, 'error': 'Sin URL MEV configurada'}

    cookie_jar = _get_session(usuario, clave, depto)
    if cookie_jar is None:
        return {'nuevos': 0, 'error': 'Credenciales MEV incorrectas o error de conexión'}

    try:
        html = _mev_get(cookie_jar, carpeta.mev_url)
    except Exception as exc:
        logger.error('MEV fetch error carpeta %s: %s', carpeta.id, exc)
        return {'nuevos': 0, 'error': f'Error al acceder a la MEV: {str(exc)[:100]}'}

    # ── Detectar cambio de estado del expediente ─────────────────────────────
    estado_mev_actual = _parse_estado_expediente(html)
    if estado_mev_actual and estado_mev_actual != carpeta.mev_estado:
        estado_anterior = carpeta.mev_estado or 'Sin estado'
        carpeta.mev_estado = estado_mev_actual
        NotificacionSistema.objects.create(
            usuario=carpeta.propietario,
            tipo='mev_cambio_estado',
            movimiento=None,
            carpeta=carpeta,
            mensaje=f"La carpeta '{carpeta.nombre}' cambió de estado en la MEV: {estado_anterior} → {estado_mev_actual}",
        )

    try:
        procesales = _parse_procesales(html)
    except Exception as exc:
        logger.error('MEV parse error carpeta %s: %s', carpeta.id, exc)
        return {'nuevos': 0, 'error': 'Error al interpretar la respuesta de la MEV'}

    if not procesales:
        carpeta.mev_ultimo_sync = timezone.now()
        carpeta.save(update_fields=['mev_ultimo_sync', 'mev_estado'])
        return {'nuevos': 0, 'error': None}

    tipo_mev, _ = TipoMovimiento.objects.get_or_create(
        nombre='MEV',
        propietario=None,
        defaults={'color': '#6366f1', 'orden': 99},
    )

    nuevos = 0
    for proc in procesales:
        existe = Movimiento.objects.filter(
            carpeta=carpeta,
            titulo=proc['titulo'],
            activo=True,
        ).filter(fecha_movimiento__date=proc['fecha'].date()).exists()

        if existe:
            continue

        descripcion_parts = []
        if proc.get('fojas'):
            descripcion_parts.append(f"Fojas: {proc['fojas']}")

        if proc.get('link_detalle'):
            try:
                time.sleep(0.3)
                html_detalle = _mev_get(cookie_jar, proc['link_detalle'])
                detalle = _parse_detalle(html_detalle)
                if detalle.get('funcionario_firmante'):
                    descripcion_parts.append(f"Firmante: {detalle['funcionario_firmante']}")
                if detalle.get('despachado_en'):
                    descripcion_parts.append(f"Despachado en: {detalle['despachado_en']}")
                if detalle.get('tramite_despachado'):
                    descripcion_parts.append(f"Trámite: {detalle['tramite_despachado']}")
                if detalle.get('fecha_libramiento'):
                    descripcion_parts.append(f"Libramiento: {detalle['fecha_libramiento']}")
                if detalle.get('fecha_notificacion'):
                    descripcion_parts.append(f"Notificación: {detalle['fecha_notificacion']}")
                if detalle.get('notificado_por'):
                    descripcion_parts.append(f"Notificado por: {detalle['notificado_por']}")
                if detalle.get('nro_notificacion'):
                    descripcion_parts.append(f"Nro. Notificación: {detalle['nro_notificacion']}")
                if detalle.get('texto_proveido'):
                    descripcion_parts.append(f"Texto: {detalle['texto_proveido']}")

                # Segundo nivel: proveídos relacionados
                for link2 in detalle.get('links_relacionados', [])[:2]:
                    try:
                        time.sleep(0.3)
                        html_detalle2 = _mev_get(cookie_jar, link2)
                        detalle2 = _parse_detalle(html_detalle2)
                        descripcion_parts.append('--- Movimiento relacionado ---')
                        if detalle2.get('funcionario_firmante'):
                            descripcion_parts.append(f"Firmante: {detalle2['funcionario_firmante']}")
                        if detalle2.get('despachado_en'):
                            descripcion_parts.append(f"Despachado en: {detalle2['despachado_en']}")
                        if detalle2.get('tramite_despachado'):
                            descripcion_parts.append(f"Trámite: {detalle2['tramite_despachado']}")
                        if detalle2.get('texto_proveido'):
                            descripcion_parts.append(f"Texto relacionado: {detalle2['texto_proveido']}")
                    except Exception:
                        pass

            except Exception as exc:
                logger.warning('MEV detalle error: %s', exc)

        descripcion_final = '\n'.join(descripcion_parts) if descripcion_parts else proc['titulo']

        fecha_aware = timezone.make_aware(proc['fecha']) if timezone.is_naive(proc['fecha']) else proc['fecha']

        Movimiento.objects.create(
            carpeta=carpeta,
            titulo=proc['titulo'],
            descripcion=descripcion_final,
            fecha_movimiento=fecha_aware,
            tipo=tipo_mev,
            creado_por=carpeta.propietario,
        )
        nuevos += 1

    carpeta.mev_ultimo_sync = timezone.now()
    carpeta.save(update_fields=['mev_ultimo_sync', 'mev_estado'])

    if nuevos > 0:
        mov_label = 'movimiento' if nuevos == 1 else 'movimientos'
        NotificacionSistema.objects.create(
            usuario=carpeta.propietario,
            tipo='mev_nuevo_movimiento',
            movimiento=None,
            carpeta=carpeta,
            mensaje=f"MEV: {nuevos} {mov_label} nuevo{'s' if nuevos != 1 else ''} en '{carpeta.nombre}'",
        )

    return {'nuevos': nuevos, 'error': None}

def debug_proveido(url, usuario, clave, depto):
    """Función de debug para ver el HTML crudo del proveído"""
    cookie_jar = _get_session(usuario, clave, depto)
    html = _mev_get(cookie_jar, url)
    soup = BeautifulSoup(html, 'html.parser')
    texto = soup.get_text(separator='\n')
    lineas = [l.strip() for l in texto.split('\n') if l.strip()]
    for i, l in enumerate(lineas):
        print(f"{i}: {l[:100]}")
