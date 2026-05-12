# apps/personas/serializers.py
from rest_framework import serializers
from .models import Persona
from django.contrib.auth import get_user_model

User = get_user_model()

class PersonaSerializer(serializers.ModelSerializer):
    propietario_nombre = serializers.ReadOnlyField(source='propietario.username')
    nombre_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = Persona
        fields = '__all__'
        read_only_fields = ['fecha_registro']
    
    def get_nombre_completo(self, obj):
        return f"{obj.apellido}, {obj.nombre}"
