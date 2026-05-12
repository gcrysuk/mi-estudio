from rest_framework import serializers
from .models import Organismo


class OrganismoSerializer(serializers.ModelSerializer):
    materia_display = serializers.CharField(source='get_materia_display', read_only=True)

    class Meta:
        model = Organismo
        fields = [
            'id', 'nombre', 'descripcion', 'jurisdiccion',
            'direccion', 'provincia', 'localidad', 'materia', 'materia_display',
            'activo',
        ]
