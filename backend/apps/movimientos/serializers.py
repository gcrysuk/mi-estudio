from rest_framework import serializers
from .models import Movimiento, TipoMovimiento, EstadoMovimiento

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
    
    # Formatear tiempo de trabajo para mostrar
    tiempo_trabajo_formateado = serializers.SerializerMethodField()
    
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
