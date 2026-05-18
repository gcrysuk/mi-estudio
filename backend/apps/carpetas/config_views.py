# backend/apps/carpetas/config_views.py
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import EstadoCarpeta, TipoCarpeta, ObjetoCarpeta
from apps.organismos.models import Organismo
from .serializers import (
    EstadoCarpetaSerializer,
    TipoCarpetaSerializer,
    ObjetoCarpetaSerializer,
    OrganismoSerializer
)


class EstadoCarpetaViewSet(viewsets.ModelViewSet):
    queryset = EstadoCarpeta.objects.all()
    serializer_class = EstadoCarpetaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    search_fields = ['nombre']

    def get_queryset(self):
        return EstadoCarpeta.objects.filter(activo=True)

    def perform_destroy(self, instance):
        if instance.carpetas.exists():
            raise PermissionError("No se puede eliminar porque hay carpetas con este estado")
        instance.delete()


class TipoCarpetaViewSet(viewsets.ModelViewSet):
    queryset = TipoCarpeta.objects.all()
    serializer_class = TipoCarpetaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    search_fields = ['nombre']

    def get_queryset(self):
        return TipoCarpeta.objects.filter(activo=True)

    def perform_destroy(self, instance):
        if instance.carpetas.exists():
            raise PermissionError("No se puede eliminar porque hay carpetas con este tipo")
        instance.delete()


class ObjetoCarpetaViewSet(viewsets.ModelViewSet):
    queryset = ObjetoCarpeta.objects.all()
    serializer_class = ObjetoCarpetaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    search_fields = ['nombre']

    def get_queryset(self):
        return ObjetoCarpeta.objects.filter(activo=True)

    def perform_destroy(self, instance):
        if instance.carpetas.exists():
            raise PermissionError("No se puede eliminar porque hay carpetas con este objeto")
        instance.delete()


class OrganismoViewSet(viewsets.ModelViewSet):
    queryset = Organismo.objects.all()
    serializer_class = OrganismoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    search_fields = ['nombre']

    def get_queryset(self):
        return Organismo.objects.filter(activo=True)

    def perform_destroy(self, instance):
        if instance.carpetas.exists():
            raise PermissionError("No se puede eliminar porque hay carpetas con este organismo")
        instance.delete()
