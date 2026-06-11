from .models import CarpetaInicializada, TipoCarpeta, ObjetoCarpeta


def qs_con_fecha_inicio_estado_mev(qs):
    """Anota un queryset de Carpeta con fecha_inicio_estado para contar días en estado MEV.
    Lógica: último HistorialEstadoMEV.fecha_cambio → mev_primera_sync → mev_ultimo_sync."""
    from django.db.models import OuterRef, Subquery
    from django.db.models.functions import Coalesce
    from .models import HistorialEstadoMEV

    ultimo_historial = (
        HistorialEstadoMEV.objects
        .filter(carpeta=OuterRef('pk'))
        .order_by('-fecha_cambio')
        .values('fecha_cambio')[:1]
    )
    return qs.annotate(
        fecha_inicio_estado=Coalesce(
            Subquery(ultimo_historial),
            'mev_primera_sync',
            'mev_ultimo_sync',
        )
    )


def inicializar_carpeta_para_usuario(carpeta, usuario):
    """
    Copia al usuario receptor los registros relacionados usados en la carpeta
    que él no tiene como propios ni son globales. Solo corre una vez por (carpeta, usuario).
    """
    if CarpetaInicializada.objects.filter(carpeta=carpeta, usuario=usuario).exists():
        return

    from apps.organismos.models import Organismo, Materia
    from apps.personas.models import Persona
    from apps.movimientos.models import TipoMovimiento

    # 1. Copiar Organismo (si tiene, no es global, no es del usuario)
    if carpeta.organismo and carpeta.organismo.propietario not in (None, usuario):
        org = carpeta.organismo

        # Copiar Materia del organismo si hace falta
        nueva_materia = org.materia
        if org.materia and org.materia.propietario not in (None, usuario):
            nueva_materia, _ = Materia.objects.get_or_create(
                nombre=org.materia.nombre,
                propietario=usuario,
                defaults={
                    'activo': org.materia.activo,
                    'orden': org.materia.orden,
                },
            )

        Organismo.objects.get_or_create(
            nombre=org.nombre,
            propietario=usuario,
            defaults={
                'descripcion': org.descripcion,
                'jurisdiccion': org.jurisdiccion,
                'direccion': org.direccion,
                'provincia': org.provincia,
                'localidad': org.localidad,
                'materia': nueva_materia,
                'activo': org.activo,
            },
        )

    # 2. Copiar Persona (si tiene y no es del usuario)
    if carpeta.persona and carpeta.persona.propietario != usuario:
        p = carpeta.persona
        Persona.objects.get_or_create(
            numero_documento=p.numero_documento,
            propietario=usuario,
            defaults={
                'nombre': p.nombre,
                'apellido': p.apellido,
                'tipo_persona': p.tipo_persona,
                'tipo_documento': p.tipo_documento,
                'email': p.email,
                'telefono': p.telefono,
                'direccion': p.direccion,
                'ciudad': p.ciudad,
                'provincia': p.provincia,
            },
        )

    # 3. Copiar TipoCarpeta (si tiene, no es global, no es del usuario)
    if carpeta.tipo and carpeta.tipo.propietario not in (None, usuario):
        TipoCarpeta.objects.get_or_create(
            nombre=carpeta.tipo.nombre,
            propietario=usuario,
            defaults={'activo': carpeta.tipo.activo},
        )

    # 4. Copiar ObjetoCarpeta (si tiene, no es global, no es del usuario)
    if carpeta.objeto and carpeta.objeto.propietario not in (None, usuario):
        ObjetoCarpeta.objects.get_or_create(
            nombre=carpeta.objeto.nombre,
            propietario=usuario,
            defaults={'activo': carpeta.objeto.activo},
        )

    # 5. Copiar TipoMovimiento de los movimientos de la carpeta
    tipos_ajenos = TipoMovimiento.objects.filter(
        movimientos__carpeta=carpeta,
        activo=True,
    ).exclude(
        propietario__in=[None, usuario]
    ).distinct()

    for tipo in tipos_ajenos:
        TipoMovimiento.objects.get_or_create(
            nombre=tipo.nombre,
            propietario=usuario,
            defaults={
                'descripcion': tipo.descripcion,
                'color': tipo.color,
                'activo': tipo.activo,
            },
        )

    CarpetaInicializada.objects.create(carpeta=carpeta, usuario=usuario)
