from rest_framework import serializers
from .models import Organismo, Materia


class MateriaSerializer(serializers.ModelSerializer):
    es_propio = serializers.SerializerMethodField()

    class Meta:
        model = Materia
        fields = ['id', 'nombre', 'activo', 'orden', 'propietario', 'es_propio']
        read_only_fields = ['propietario']

    def get_es_propio(self, obj):
        return obj.propietario_id is not None


class OrganismoSerializer(serializers.ModelSerializer):
    materia_nombre = serializers.SerializerMethodField()
    es_propio = serializers.SerializerMethodField()

    class Meta:
        model = Organismo
        fields = [
            'id', 'nombre', 'descripcion', 'jurisdiccion',
            'direccion', 'provincia', 'localidad', 'materia', 'materia_nombre',
            'activo', 'propietario', 'es_propio',
        ]
        read_only_fields = ['propietario']

    def get_materia_nombre(self, obj):
        return obj.materia.nombre if obj.materia else None

    def get_es_propio(self, obj):
        return obj.propietario_id is not None
