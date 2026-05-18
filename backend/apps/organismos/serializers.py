from rest_framework import serializers
from .models import Organismo, Materia


class MateriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Materia
        fields = ['id', 'nombre', 'activo', 'orden']


class OrganismoSerializer(serializers.ModelSerializer):
    materia_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Organismo
        fields = [
            'id', 'nombre', 'descripcion', 'jurisdiccion',
            'direccion', 'provincia', 'localidad', 'materia', 'materia_nombre',
            'activo',
        ]

    def get_materia_nombre(self, obj):
        return obj.materia.nombre if obj.materia else None
