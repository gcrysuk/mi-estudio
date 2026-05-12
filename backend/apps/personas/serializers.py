from rest_framework import serializers
from .models import Persona, TipoPersona

class TipoPersonaSerializer(serializers.ModelSerializer):
    personas_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TipoPersona
        fields = ['id', 'nombre', 'descripcion', 'activo', 'orden', 'personas_count']
        read_only_fields = ['id']
    
    def get_personas_count(self, obj):
        return obj.personas.count()


class PersonaSerializer(serializers.ModelSerializer):
    propietario_nombre = serializers.ReadOnlyField(source='propietario.username')
    tipo_persona_nombre = serializers.ReadOnlyField(source='tipo_persona.nombre')
    
    class Meta:
        model = Persona
        fields = [
            'id', 'nombre', 'apellido', 'tipo_persona', 'tipo_persona_nombre',
            'tipo_documento', 'numero_documento', 'email', 'telefono',
            'direccion', 'ciudad', 'provincia', 'fecha_registro', 'activo',
            'propietario', 'propietario_nombre'
        ]
        read_only_fields = ['fecha_registro', 'propietario', 'propietario_nombre']
    
    def validate(self, data):
        if not data.get('nombre'):
            raise serializers.ValidationError({'nombre': 'El nombre es obligatorio'})
        if not data.get('apellido'):
            raise serializers.ValidationError({'apellido': 'El apellido es obligatorio'})
        return data
