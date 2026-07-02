from rest_framework import serializers
from .models import NotificacionMEVRecibida


class NotificacionMEVRecibidaSerializer(serializers.ModelSerializer):
    carpeta_nombre = serializers.CharField(source='carpeta.nombre', read_only=True, default='')
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True, default='')

    class Meta:
        model = NotificacionMEVRecibida
        fields = [
            'id', 'message_id', 'remitente', 'asunto', 'fecha_recepcion',
            'organismo', 'nro_causa', 'caratula', 'estado', 'descripcion',
            'fecha_proveido', 'destinatario', 'usuario', 'usuario_nombre',
            'carpeta', 'carpeta_nombre', 'estado_procesamiento',
            'carpetas_candidatas_count', 'movimiento_creado', 'error_detalle', 'creado',
        ]
        read_only_fields = [
            'id', 'message_id', 'remitente', 'asunto', 'fecha_recepcion',
            'organismo', 'nro_causa', 'caratula', 'estado', 'descripcion',
            'fecha_proveido', 'destinatario', 'usuario', 'carpeta_nombre',
            'estado_procesamiento', 'carpetas_candidatas_count', 'movimiento_creado',
            'error_detalle', 'creado',
        ]
