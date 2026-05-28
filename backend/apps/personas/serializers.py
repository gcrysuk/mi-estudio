from rest_framework import serializers
from .models import Persona


class PersonaSerializer(serializers.ModelSerializer):
    propietario_nombre = serializers.ReadOnlyField(source='propietario.username')

    class Meta:
        model = Persona
        fields = [
            'id', 'nombre', 'apellido', 'razon_social', 'tipo_persona',
            'tipo_documento', 'numero_documento', 'email', 'telefono',
            'direccion', 'ciudad', 'provincia', 'fecha_registro', 'activo',
            'fecha_eliminacion', 'propietario', 'propietario_nombre',
        ]
        read_only_fields = ['fecha_registro', 'propietario', 'propietario_nombre']

    def validate(self, data):
        tipo = data.get('tipo_persona', getattr(self.instance, 'tipo_persona', ''))
        if tipo == 'juridica':
            if not data.get('razon_social'):
                raise serializers.ValidationError(
                    {'razon_social': 'La razón social es obligatoria para personas jurídicas.'}
                )
        else:
            if not data.get('nombre'):
                raise serializers.ValidationError({'nombre': 'El nombre es obligatorio.'})
            if not data.get('apellido'):
                raise serializers.ValidationError({'apellido': 'El apellido es obligatorio.'})
        return data
