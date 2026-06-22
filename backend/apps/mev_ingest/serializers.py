from rest_framework import serializers
from .models import NotificacionMEVRecibida


class NotificacionMEVRecibidaSerializer(serializers.ModelSerializer):
    carpeta_nombre = serializers.CharField(source='carpeta.nombre', read_only=True, default='')

    class Meta:
        model = NotificacionMEVRecibida
        fields = [
            'id', 'message_id', 'remitente', 'asunto', 'fecha_recepcion',
            'organismo', 'nro_causa', 'caratula', 'estado', 'descripcion',
            'fecha_proveido', 'carpeta', 'carpeta_nombre', 'estado_procesamiento',
            'carpetas_candidatas_count', 'movimiento_creado', 'error_detalle', 'creado',
        ]
        read_only_fields = [
            'id', 'message_id', 'remitente', 'asunto', 'fecha_recepcion',
            'organismo', 'nro_causa', 'caratula', 'estado', 'descripcion',
            'fecha_proveido', 'carpeta_nombre', 'estado_procesamiento',
            'carpetas_candidatas_count', 'movimiento_creado', 'error_detalle', 'creado',
        ]
