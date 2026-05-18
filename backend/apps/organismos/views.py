from rest_framework import viewsets, permissions
from django.db.models import Max
from .models import Organismo, Materia
from .serializers import OrganismoSerializer, MateriaSerializer


class MateriaViewSet(viewsets.ModelViewSet):
    serializer_class = MateriaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    queryset = Materia.objects.all()
    search_fields = ['nombre']

    def perform_create(self, serializer):
        ultimo = Materia.objects.aggregate(max_orden=Max('orden'))['max_orden'] or 0
        serializer.save(orden=ultimo + 1)


class OrganismoViewSet(viewsets.ModelViewSet):
    serializer_class = OrganismoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    queryset = Organismo.objects.all()
    search_fields = ['nombre', 'descripcion', 'provincia', 'localidad']
    filterset_fields = ['activo', 'materia', 'provincia']
