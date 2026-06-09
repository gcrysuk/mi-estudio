from apps.movimientos.models import NotificacionSistema


def crear_notificacion(usuario, tipo, **kwargs):
    """Crea una NotificacionSistema solo si el usuario tiene ese tipo activado."""
    try:
        config = usuario.perfil.notificacion_config or {}
    except Exception:
        config = {}

    if config.get(tipo, True) is False:
        return None

    return NotificacionSistema.objects.create(usuario=usuario, tipo=tipo, **kwargs)
