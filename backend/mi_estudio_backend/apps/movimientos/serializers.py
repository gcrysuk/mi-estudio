# apps/movimientos/serializers.py
from rest_framework import serializers
from .models import TipoMovimiento, Movimiento, Organismo
from apps.carpetas.models import Carpeta

class TipoMovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoMovimiento
        fields = '__all__'
        read_only_fields = ['fecha_creacion']


class MovimientoSerializer(serializers.ModelSerializer):
    carpeta_numero = serializers.ReadOnlyField(source='carpeta.numero_expediente')
    carpeta_caratula = serializers.ReadOnlyField(source='carpeta.caratula')
    tipo_nombre = serializers.ReadOnlyField(source='tipo.nombre')
    responsable_username = serializers.ReadOnlyField(source='responsable.username')
    organismo_nombre = serializers.ReadOnlyField(source='organismo.nombre')
    
    class Meta:
        model = Movimiento
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'fecha_actualizacion']


class MovimientoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movimiento
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'fecha_actualizacion']
    
    def create(self, validated_data):
        # El responsable se asigna en la vista
        return super().create(validated_data)


class OrganismoSerializer(serializers.ModelSerializer):
    propietario_username = serializers.ReadOnlyField(source='propietario.username')
    compartido_con_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Organismo
        fields = '__all__'
        read_only_fields = ['propietario']
    
    def get_compartido_con_count(self, obj):
        return obj.compartidos.count() if hasattr(obj, 'compartidos') else 0
