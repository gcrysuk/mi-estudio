# apps/mev_ingest/parser.py
from datetime import datetime
from bs4 import BeautifulSoup

LABELS = {'Organismo','Carátula','Caratula','Nro de causa','Fecha',
          'Descripción','Descripcion','Estado'}

def parse_mail_mev(html: str) -> dict:
    """Parsea el HTML de una notificación MEV (original o reenviada).
    Tolerante al cascarón de reenvío de Gmail."""
    soup = BeautifulSoup(html, 'lxml')
    campos = {}
    for b in soup.find_all('b'):
        label = b.get_text(strip=True).rstrip(':').strip()
        if label not in LABELS:
            continue
        td_label = b.find_parent('td')
        if not td_label:
            continue
        td_val = td_label.find_next_sibling('td')
        if td_val:
            campos[label] = td_val.get_text(' ', strip=True)

    def g(*keys):
        for k in keys:
            if k in campos:
                return campos[k].strip()
        return ''

    fecha_str = g('Fecha')
    fecha_dt = None
    for fmt in ('%d/%m/%Y %H:%M:%S', '%d/%m/%Y'):
        try:
            fecha_dt = datetime.strptime(fecha_str, fmt)
            break
        except ValueError:
            pass

    tabla = soup.find('table')
    cuerpo = []
    if tabla:
        for el in tabla.find_all_next('p'):
            txt = el.get_text(' ', strip=True)
            if not txt:
                continue
            if 'Transcripci' in txt and 'novedad registrada' in txt:
                break
            cuerpo.append(txt)

    return {
        'organismo': g('Organismo'),
        'caratula': g('Carátula', 'Caratula').rstrip('- ').strip(),
        'nro_causa': g('Nro de causa'),
        'fecha': fecha_dt,
        'descripcion': g('Descripción', 'Descripcion'),
        'estado': g('Estado'),
        'cuerpo_proveido': '\n'.join(cuerpo),
    }
