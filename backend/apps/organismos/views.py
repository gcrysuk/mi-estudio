from rest_framework import viewsets, permissions
from .models import Organismo
from .serializers import OrganismoSerializer


class OrganismoViewSet(viewsets.ModelViewSet):
    serializer_class = OrganismoSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Organismo.objects.all()
    search_fields = ['nombre', 'descripcion', 'provincia', 'localidad']
    filterset_fields = ['activo', 'materia', 'provincia']
