# backend/apps/carpetas/config_views.py
from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db.models import Q, Max, Case, When, IntegerField, Value
from .models import EstadoCarpeta, TipoCarpeta, ObjetoCarpeta
from apps.organismos.models import Organismo
from .serializers import (
    EstadoCarpetaSerializer,
    TipoCarpetaSerializer,
    ObjetoCarpetaSerializer,
    OrganismoSerializer,
)


def _global_first(qs, *order_fields):
    return qs.annotate(
        _es_global=Case(
            When(propietario__isnull=True, then=Value(0)),
            default=Value(1),
            output_field=IntegerField(),
        )
    ).order_by('_es_global', *order_fields)


def _ownership_check(instance, user):
    if instance.propietario is None:
        return Response({'error': 'Registro global no modificable'}, status=status.HTTP_403_FORBIDDEN)
    if instance.propietario_id != user.pk:
        return Response({'error': 'No tenés permiso para modificar este registro'}, status=status.HTTP_403_FORBIDDEN)
    return None


class EstadoCarpetaViewSet(viewsets.ModelViewSet):
    queryset = EstadoCarpeta.objects.all()
    serializer_class = EstadoCarpetaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    search_fields = ['nombre']

    def get_queryset(self):
        return EstadoCarpeta.objects.filter(activo=True)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.es_obligatorio:
            return Response(
                {'error': 'Este estado es obligatorio y no puede modificarse'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        if instance.es_obligatorio:
            raise PermissionDenied('Este estado es obligatorio y no puede eliminarse')
        if instance.carpetas.exists():
            raise PermissionDenied('No se puede eliminar porque hay carpetas con este estado')
        instance.delete()


class TipoCarpetaViewSet(viewsets.ModelViewSet):
    serializer_class = TipoCarpetaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    search_fields = ['nombre']

    def get_queryset(self):
        user = self.request.user
        qs = TipoCarpeta.objects.filter(
            Q(propietario=user) | Q(propietario__isnull=True),
            activo=True,
        )
        return _global_first(qs, 'orden', 'nombre')

    def perform_create(self, serializer):
        ultimo = TipoCarpeta.objects.filter(propietario=self.request.user).aggregate(
            max_orden=Max('orden')
        )['max_orden'] or 0
        serializer.save(propietario=self.request.user, orden=ultimo + 1)

    def update(self, request, *args, **kwargs):
        err = _ownership_check(self.get_object(), request.user)
        return err or super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        err = _ownership_check(instance, request.user)
        if err:
            return err
        if instance.carpetas.exists():
            return Response(
                {'error': 'No se puede eliminar porque hay carpetas con este tipo'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class ObjetoCarpetaViewSet(viewsets.ModelViewSet):
    serializer_class = ObjetoCarpetaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    search_fields = ['nombre']

    def get_queryset(self):
        user = self.request.user
        qs = ObjetoCarpeta.objects.filter(
            Q(propietario=user) | Q(propietario__isnull=True),
            activo=True,
        )
        return _global_first(qs, 'orden', 'nombre')

    def perform_create(self, serializer):
        ultimo = ObjetoCarpeta.objects.filter(propietario=self.request.user).aggregate(
            max_orden=Max('orden')
        )['max_orden'] or 0
        serializer.save(propietario=self.request.user, orden=ultimo + 1)

    def update(self, request, *args, **kwargs):
        err = _ownership_check(self.get_object(), request.user)
        return err or super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        err = _ownership_check(instance, request.user)
        if err:
            return err
        if instance.carpetas.exists():
            return Response(
                {'error': 'No se puede eliminar porque hay carpetas con este objeto'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class OrganismoViewSet(viewsets.ModelViewSet):
    serializer_class = OrganismoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    search_fields = ['nombre']

    def get_queryset(self):
        user = self.request.user
        qs = Organismo.objects.filter(
            Q(propietario=user) | Q(propietario__isnull=True),
            activo=True,
        )
        return _global_first(qs, 'nombre')

    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)

    def update(self, request, *args, **kwargs):
        err = _ownership_check(self.get_object(), request.user)
        return err or super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        err = _ownership_check(instance, request.user)
        if err:
            return err
        if instance.carpetas.exists():
            return Response(
                {'error': 'No se puede eliminar porque hay carpetas con este organismo'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
