from rest_framework import serializers
from .models import Movimiento, TipoMovimiento, EstadoMovimiento, NotificacionMovimiento

class TipoMovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoMovimiento
        fields = '__all__'

class EstadoMovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoMovimiento
        fields = '__all__'

class MovimientoSerializer(serializers.ModelSerializer):
    carpeta_nombre = serializers.ReadOnlyField(source='carpeta.nombre')
    tipo_nombre = serializers.ReadOnlyField(source='tipo.nombre')
    estado_nombre = serializers.ReadOnlyField(source='estado.nombre')
    estado_color = serializers.ReadOnlyField(source='estado.color')
    creado_por_username = serializers.ReadOnlyField(source='creado_por.username')
    
    tiempo_trabajo_formateado = serializers.SerializerMethodField()
    proxima_notificacion = serializers.SerializerMethodField()

    class Meta:
        model = Movimiento
        fields = '__all__'
        read_only_fields = ['creado_por', 'fecha_creacion', 'ultima_actualizacion', 'vencido']
    
    def get_tiempo_trabajo_formateado(self, obj):
        if obj.tiempo_trabajo:
            horas = obj.tiempo_trabajo // 60
            minutos = obj.tiempo_trabajo % 60
            if horas > 0:
                return f"{horas}h {minutos}min"
            return f"{minutos}min"
        return None

    def get_proxima_notificacion(self, obj):
        from django.utils import timezone
        notif = obj.notificaciones.filter(
            leida=False,
            fecha__gte=timezone.now()
        ).order_by('fecha').first()
        return notif.fecha.isoformat() if notif else None


class NotificacionSerializer(serializers.ModelSerializer):
    movimiento_titulo = serializers.ReadOnlyField(source='movimiento.titulo')
    carpeta_nombre = serializers.ReadOnlyField(source='movimiento.carpeta.nombre')
    carpeta_id = serializers.ReadOnlyField(source='movimiento.carpeta_id')

    class Meta:
        model = NotificacionMovimiento
        fields = ['id', 'movimiento', 'movimiento_titulo', 'carpeta_nombre', 'carpeta_id', 'fecha', 'leida']
