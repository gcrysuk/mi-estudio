"""
Script de importación de datos desde export de Notion a mi-estudio.

Ejecutar desde el contenedor backend:
  docker exec mi_estudio_web_local python manage.py shell -c "exec(open('apps/utils/importar_notion.py').read())"

Para DRY RUN (simular sin guardar), cambiar DRY_RUN = True abajo.
"""

import csv
import io
import re
import zipfile
from datetime import datetime

from django.contrib.auth.models import User
from django.utils import timezone

# ── Configuración ─────────────────────────────────────────────────────────────

# El ZIP externo puede ser cualquiera de los dos; el script prueba ambos.
ZIP_PATHS = ['/tmp/mira2notion.zip', '/tmp/migranotion.zip']

USUARIO_USERNAME = 'gcrysuk'
DRY_RUN = False  # True = solo mostrar, no guardar

# Nombres de los CSVs dentro del ZIP interno
CSV_JUZGADOS  = 'Juzgados 1de76fce8dab8038b952d8c7d579d789.csv'
CSV_PERSONAS  = 'Personas 1de76fce8dab80418f6efaf5db8a7ddd.csv'
CSV_CARPETAS  = 'Carpetas 1de76fce8dab804ab77dd1be5050c953.csv'
CSV_TAREAS    = 'TAREAS 1de76fce8dab801788f2d70dd4e536dc.csv'

# ── Helpers ───────────────────────────────────────────────────────────────────

def limpiar_nombre(texto):
    """
    Extrae el nombre real antes del ID de Notion.
    Input:  "TTN 4 (TTN%204%2026176fce8dab80038ab3e39df970c6a3.csv)"
    Output: "TTN 4"
    """
    if not texto:
        return ''
    # Remover " (ANYTHING.csv)" al final
    resultado = re.sub(r'\s*\([^)]*\.csv\)\s*$', '', texto).strip()
    # También limpiar " (ANYTHING)" sin .csv (por si acaso)
    resultado = re.sub(r'\s*\([^)]*\)\s*$', '', resultado).strip()
    return resultado


def limpiar_emoji(texto):
    """Remueve emojis y caracteres no alfanuméricos al inicio."""
    if not texto:
        return ''
    # Quitar emojis y caracteres especiales Unicode fuera de rangos latinos
    resultado = re.sub(r'[^\w\s\-/.,áéíóúüñÁÉÍÓÚÜÑ()\']', '', texto).strip()
    return resultado


MESES = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
}


def parsear_fecha(texto):
    """
    Parsea fechas en los formatos de Notion:
      - "1 de septiembre de 2025 15:41"
      - "dd/mm/yyyy"
      - "yyyy-mm-dd"
    """
    if not texto or not texto.strip():
        return None
    texto = texto.strip()

    # "1 de septiembre de 2025 15:41" o "1 de septiembre de 2025"
    m = re.match(r'(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})(?:\s+(\d{2}:\d{2}))?', texto.lower())
    if m:
        dia, mes_str, anio, hora = m.groups()
        mes = MESES.get(mes_str)
        if mes:
            hora = hora or '00:00'
            try:
                fecha = datetime.strptime(f'{dia}/{mes}/{anio} {hora}', '%d/%m/%Y %H:%M')
                return timezone.make_aware(fecha)
            except ValueError:
                pass

    # "dd/mm/yyyy"
    try:
        return timezone.make_aware(datetime.strptime(texto, '%d/%m/%Y'))
    except ValueError:
        pass

    # "yyyy-mm-dd"
    try:
        return timezone.make_aware(datetime.strptime(texto, '%Y-%m-%d'))
    except ValueError:
        pass

    return None


def abrir_inner_zip(outer_path):
    """Abre el ZIP externo y retorna el ZIP interno como ZipFile."""
    outer = zipfile.ZipFile(outer_path)
    nombres = outer.namelist()
    inner_names = [n for n in nombres if n.endswith('.zip')]
    if not inner_names:
        raise ValueError(f'No se encontró ZIP interno en {outer_path}')
    inner_data = outer.read(inner_names[0])
    return zipfile.ZipFile(io.BytesIO(inner_data))


def leer_csv(inner_zip, nombre):
    """Lee un CSV del ZIP interno y retorna lista de dicts."""
    try:
        data = inner_zip.read(nombre).decode('utf-8-sig')
        return list(csv.DictReader(io.StringIO(data)))
    except KeyError:
        print(f'  ⚠ Archivo no encontrado en el ZIP: {nombre}')
        return []
    except Exception as e:
        print(f'  ⚠ Error leyendo {nombre}: {e}')
        return []


def encontrar_zip():
    """Retorna el primer ZIP de la lista que exista."""
    import os
    for path in ZIP_PATHS:
        if os.path.exists(path):
            return path
    raise FileNotFoundError(
        f'No se encontró ningún ZIP de importación. Rutas buscadas: {ZIP_PATHS}'
    )


# ── Importación principal ─────────────────────────────────────────────────────

def importar():
    from apps.organismos.models import Organismo
    from apps.personas.models import Persona
    from apps.carpetas.models import Carpeta, EstadoCarpeta, ObjetoCarpeta
    from apps.movimientos.models import Movimiento, EstadoMovimiento, TipoMovimiento

    try:
        usuario = User.objects.get(username=USUARIO_USERNAME)
    except User.DoesNotExist:
        print(f'✗ Usuario "{USUARIO_USERNAME}" no encontrado. Abortando.')
        return

    zip_path = encontrar_zip()
    print(f'Usando ZIP: {zip_path}')
    if DRY_RUN:
        print('*** DRY RUN — no se guardará nada ***\n')

    inner_zip = abrir_inner_zip(zip_path)

    stats = {'organismos': 0, 'personas': 0, 'carpetas': 0, 'movimientos': 0, 'errores': []}

    # ── 1. Juzgados → Organismo ───────────────────────────────────────────────
    print('=== 1/4  Juzgados → Organismos ===')
    juzgados = leer_csv(inner_zip, CSV_JUZGADOS)
    organismo_map = {}  # nombre_notion → Organismo

    for row in juzgados:
        nombre = (row.get('nombre') or '').strip()
        if not nombre:
            continue
        try:
            if not DRY_RUN:
                org, created = Organismo.objects.get_or_create(
                    nombre=nombre,
                    propietario=usuario,
                    defaults={
                        'direccion':    row.get('Dirección', '').strip(),
                        'jurisdiccion': row.get('Fuero', '').strip(),
                        'activo': True,
                    },
                )
                organismo_map[nombre] = org
                if created:
                    stats['organismos'] += 1
                    print(f'  ✓ {nombre}')
                else:
                    print(f'  ~ ya existe: {nombre}')
            else:
                organismo_map[nombre] = None
                print(f'  [DRY] {nombre}')
        except Exception as e:
            msg = f'Organismo "{nombre}": {e}'
            stats['errores'].append(msg)
            print(f'  ✗ {msg}')

    # ── 2. Personas ───────────────────────────────────────────────────────────
    print('\n=== 2/4  Personas ===')
    personas_rows = leer_csv(inner_zip, CSV_PERSONAS)
    persona_map = {}  # nombre_completo_notion → Persona

    for row in personas_rows:
        nombre_completo = (row.get('nombre') or '').strip()
        if not nombre_completo:
            continue

        # Detectar persona jurídica por nombre en mayúsculas o siglas conocidas
        es_juridica = (
            nombre_completo == nombre_completo.upper()
            or any(sig in nombre_completo.upper() for sig in ('S.A', 'SRL', 'S.R.L', 'ART ', 'SA ', ' ART'))
        )

        if es_juridica:
            tipo_persona = 'juridica'
            razon_social = nombre_completo
            nombre = ''
            apellido = ''
        else:
            tipo_persona = 'fisica'
            razon_social = ''
            # Split: el primer token puede ser el nombre o el apellido.
            # En Notion este estudio guardó "Nombre Apellido" (ej: "Lautaro Rojas").
            partes = nombre_completo.split()
            if len(partes) >= 2:
                nombre  = ' '.join(partes[:-1])
                apellido = partes[-1]
            else:
                nombre  = nombre_completo
                apellido = ''

        try:
            if not DRY_RUN:
                # Para físicas: buscar por nombre+apellido; para jurídicas: por razón social
                if es_juridica:
                    persona, created = Persona.objects.get_or_create(
                        tipo_persona='juridica',
                        razon_social=razon_social,
                        propietario=usuario,
                        defaults={
                            'nombre': '',
                            'apellido': '',
                            'numero_documento': row.get('dni', '').strip() or None,
                            'direccion': row.get('domicilio', '').strip(),
                            'telefono': row.get('telefono', '').strip(),
                            'activo': True,
                        },
                    )
                else:
                    persona, created = Persona.objects.get_or_create(
                        tipo_persona='fisica',
                        nombre=nombre,
                        apellido=apellido,
                        propietario=usuario,
                        defaults={
                            'numero_documento': row.get('dni', '').strip() or None,
                            'direccion': row.get('domicilio', '').strip(),
                            'telefono': row.get('telefono', '').strip(),
                            'activo': True,
                        },
                    )
                persona_map[nombre_completo] = persona
                if created:
                    stats['personas'] += 1
                    print(f'  ✓ {nombre_completo}')
                else:
                    print(f'  ~ ya existe: {nombre_completo}')
            else:
                persona_map[nombre_completo] = None
                print(f'  [DRY] {nombre_completo}')
        except Exception as e:
            msg = f'Persona "{nombre_completo}": {e}'
            stats['errores'].append(msg)
            print(f'  ✗ {msg}')

    # ── 3. Carpetas ───────────────────────────────────────────────────────────
    print('\n=== 3/4  Carpetas ===')
    carpetas_rows = leer_csv(inner_zip, CSV_CARPETAS)
    carpeta_map = {}  # caratula_notion → Carpeta

    # Estado "Activa" por defecto
    if not DRY_RUN:
        estado_activa, _ = EstadoCarpeta.objects.get_or_create(
            nombre='Activa',
            defaults={'color': '#22C55E', 'activo': True},
        )
    else:
        estado_activa = None

    PARTE_MAP = {'actor': 'actor', 'demandado': 'demandado'}

    for row in carpetas_rows:
        caratula = (row.get('caratula') or '').strip()
        if not caratula:
            continue

        # Organismo (juzgado)
        juzgado_raw  = limpiar_nombre(row.get('radicada_juzgado', ''))
        organismo    = organismo_map.get(juzgado_raw)

        # Persona (cliente)
        cliente_raw  = limpiar_nombre(row.get('Cliente', ''))
        persona      = persona_map.get(cliente_raw)
        if persona is None and cliente_raw:
            # Intentar búsqueda flexible
            partes = cliente_raw.split()
            if len(partes) >= 2 and not DRY_RUN:
                persona = Persona.objects.filter(
                    propietario=usuario,
                    apellido__iexact=partes[-1],
                    nombre__icontains=partes[0],
                ).first()

        # Objeto
        objeto_nombre = (row.get('objeto') or '').strip()
        objeto = None
        if objeto_nombre and not DRY_RUN:
            objeto, _ = ObjetoCarpeta.objects.get_or_create(
                nombre=objeto_nombre,
                propietario=usuario,
                defaults={'activo': True},
            )

        # Parte
        parte_raw = (row.get('parte') or '').strip().lower()
        parte     = PARTE_MAP.get(parte_raw, 'actor')

        # Contraparte (texto)
        contraparte = limpiar_nombre(row.get('contraparte', ''))

        # Número expediente
        nro = (row.get('Nro. expt.') or '').strip()

        # Algunas "carátulas" en Notion son URLs de la MEV — extraer URL y usar como nombre
        mev_url = ''
        nombre_carpeta = caratula
        if caratula.startswith('https://mev.scba.gov.ar'):
            mev_url = caratula
            # Intentar reconstruir nombre desde la contraparte + cliente, o usar URL corta
            nombre_carpeta = f'Expediente MEV {mev_url.split("nidCausa=")[-1].split("&")[0]}'

        try:
            if not DRY_RUN:
                carpeta, created = Carpeta.objects.get_or_create(
                    nombre=nombre_carpeta,
                    propietario=usuario,
                    defaults={
                        'numero_expediente': nro,
                        'organismo':   organismo,
                        'persona':     persona,
                        'objeto':      objeto,
                        'parte':       parte,
                        'contraparte': contraparte,
                        'estado':      estado_activa,
                        'mev_url':     mev_url,
                        'activo':      True,
                    },
                )
                # Si ya existía, actualizar mev_url si ahora lo tenemos
                if not created and mev_url and not carpeta.mev_url:
                    carpeta.mev_url = mev_url
                    carpeta.save(update_fields=['mev_url'])
                carpeta_map[caratula] = carpeta          # clave original (puede ser URL)
                carpeta_map[nombre_carpeta] = carpeta    # clave nombre limpio
                if created:
                    stats['carpetas'] += 1
                    print(f'  ✓ {nombre_carpeta[:70]}')
                else:
                    print(f'  ~ ya existe: {nombre_carpeta[:70]}')
            else:
                carpeta_map[caratula] = None
                org_str = juzgado_raw or '—'
                cli_str = cliente_raw or '—'
                print(f'  [DRY] {caratula[:60]} | Juzgado: {org_str} | Cliente: {cli_str}')
        except Exception as e:
            msg = f'Carpeta "{caratula[:50]}": {e}'
            stats['errores'].append(msg)
            print(f'  ✗ {msg}')

    # ── 4. Tareas → Movimientos ───────────────────────────────────────────────
    print('\n=== 4/4  Tareas → Movimientos ===')
    tareas = leer_csv(inner_zip, CSV_TAREAS)

    ESTADO_MAP = {
        'Pendiente':  'Pendiente',
        'En curso':   'En Proceso',
        'OK':         'Completado',
        'Borrador':   'Borrador',
        'No Aplica':  'Completado',
    }

    for row in tareas:
        descripcion = (row.get('Descripcion') or '').strip()
        if not descripcion:
            continue

        # Carpeta
        carpeta_raw = limpiar_nombre(row.get('Carpetas', ''))
        carpeta = carpeta_map.get(carpeta_raw)
        if carpeta is None and carpeta_raw and not DRY_RUN:
            # Búsqueda por inicio de nombre
            carpeta = Carpeta.objects.filter(
                propietario=usuario,
                nombre__icontains=carpeta_raw[:40],
                activo=True,
            ).first()

        # Fechas
        fecha = parsear_fecha(row.get('TimeStamp', ''))
        if not fecha:
            fecha = parsear_fecha(row.get('Carga', ''))
        if not fecha:
            fecha = timezone.now()

        fecha_venc = parsear_fecha(row.get('Vence', ''))

        # Estado
        estado_notion = (row.get('Estado') or 'Pendiente').strip()
        estado_nombre = ESTADO_MAP.get(estado_notion, 'Pendiente')
        estado = None
        if not DRY_RUN:
            estado = EstadoMovimiento.objects.filter(nombre=estado_nombre).first()

        # Tipo (Hito) — limpiar emojis
        hito_raw    = (row.get('Hito') or '').strip()
        hito_limpio = limpiar_emoji(hito_raw).strip()
        tipo = None
        if hito_limpio and not DRY_RUN:
            tipo, _ = TipoMovimiento.objects.get_or_create(
                nombre=hito_limpio[:50],
                propietario=usuario,
                defaults={'color': '#4FC3F7', 'activo': True},
            )

        # Tiempo de trabajo (minutos)
        tiempo_raw = (row.get('tiempo_trabajo') or '').strip()
        tiempo = None
        if tiempo_raw:
            try:
                tiempo = int(float(tiempo_raw))
            except ValueError:
                pass

        titulo = descripcion[:200]

        try:
            if not DRY_RUN:
                # Idempotencia: no duplicar si ya existe mismo título + carpeta + fecha
                existe = Movimiento.objects.filter(
                    carpeta=carpeta,
                    titulo=titulo,
                    fecha_movimiento__date=fecha.date(),
                ).exists()

                if not existe:
                    Movimiento.objects.create(
                        carpeta=carpeta,
                        titulo=titulo,
                        descripcion='',
                        fecha_movimiento=fecha,
                        fecha_vencimiento=fecha_venc,
                        estado=estado,
                        tipo=tipo,
                        tiempo_trabajo=tiempo,
                        creado_por=usuario,
                        activo=True,
                    )
                    stats['movimientos'] += 1
                    print(f'  ✓ {titulo[:60]}')
                else:
                    print(f'  ~ ya existe: {titulo[:60]}')
            else:
                carp_str = carpeta_raw[:40] if carpeta_raw else 'SIN CARPETA'
                print(f'  [DRY] {titulo[:55]} | Carpeta: {carp_str} | Fecha: {fecha.date()}')
        except Exception as e:
            msg = f'Movimiento "{titulo[:40]}": {e}'
            stats['errores'].append(msg)
            print(f'  ✗ {msg}')

    # ── Resumen ───────────────────────────────────────────────────────────────
    print('\n' + '=' * 50)
    print('RESUMEN DE IMPORTACIÓN')
    print('=' * 50)
    print(f'  Organismos creados : {stats["organismos"]}')
    print(f'  Personas creadas   : {stats["personas"]}')
    print(f'  Carpetas creadas   : {stats["carpetas"]}')
    print(f'  Movimientos creados: {stats["movimientos"]}')
    if stats['errores']:
        print(f'\n  Errores ({len(stats["errores"])}) :')
        for err in stats['errores']:
            print(f'    - {err}')
    else:
        print('\n  Sin errores.')
    if DRY_RUN:
        print('\n  *** DRY RUN: ningún dato fue guardado ***')


# ── Punto de entrada ──────────────────────────────────────────────────────────
importar()
