from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db.models import Q, Max, Case, When, IntegerField, Value
from .models import Organismo, Materia
from .serializers import OrganismoSerializer, MateriaSerializer


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


class MateriaViewSet(viewsets.ModelViewSet):
    serializer_class = MateriaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    search_fields = ['nombre']

    def get_queryset(self):
        user = self.request.user
        qs = Materia.objects.filter(
            Q(propietario=user) | Q(propietario__isnull=True),
            activo=True,
        )
        return _global_first(qs, 'orden', 'nombre')

    def perform_create(self, serializer):
        ultimo = Materia.objects.filter(propietario=self.request.user).aggregate(
            max_orden=Max('orden')
        )['max_orden'] or 0
        serializer.save(propietario=self.request.user, orden=ultimo + 1)

    def update(self, request, *args, **kwargs):
        err = _ownership_check(self.get_object(), request.user)
        return err or super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        err = _ownership_check(instance, request.user)
        return err or super().destroy(request, *args, **kwargs)


class OrganismoViewSet(viewsets.ModelViewSet):
    serializer_class = OrganismoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    search_fields = ['nombre', 'descripcion', 'provincia', 'localidad']
    filterset_fields = ['activo', 'materia', 'provincia']

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
