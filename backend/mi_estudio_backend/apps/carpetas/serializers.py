# apps/carpetas/serializers.py
from rest_framework import serializers
from .models import Carpeta, CompartirCarpeta  # ← IMPORTAR CompartirCarpeta
from apps.personas.serializers import PersonaSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class CarpetaSerializer(serializers.ModelSerializer):
    persona_nombre = serializers.ReadOnlyField(source='persona.__str__')
    propietario_nombre = serializers.ReadOnlyField(source='propietario.username')
    persona_detalle = PersonaSerializer(source='persona', read_only=True)
    compartida_con_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Carpeta
        fields = '__all__'
        read_only_fields = ['fecha_inicio', 'ultima_actualizacion']
    
    def get_compartida_con_count(self, obj):
        return obj.compartidos.count()
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        return data


class CompartirCarpetaSerializer(serializers.ModelSerializer):
    usuario_username = serializers.ReadOnlyField(source='usuario.username')
    carpeta_nombre = serializers.ReadOnlyField(source='carpeta.__str__')
    compartido_por_username = serializers.ReadOnlyField(source='compartido_por.username')
    
    class Meta:
        model = CompartirCarpeta  # ← Ahora está definido
        fields = '__all__'
        read_only_fields = ['fecha_compartido']
