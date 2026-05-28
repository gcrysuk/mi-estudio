from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import Persona
from .serializers import PersonaSerializer


class PersonaViewSet(viewsets.ModelViewSet):
    serializer_class = PersonaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Persona.objects.filter(propietario=user, activo=True)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(nombre__icontains=search) |
                Q(apellido__icontains=search) |
                Q(razon_social__icontains=search) |
                Q(numero_documento__icontains=search) |
                Q(email__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)

    def perform_destroy(self, instance):
        if instance.propietario != self.request.user:
            raise PermissionDenied('Solo el propietario puede eliminar esta persona.')
        instance.activo = False
        instance.fecha_eliminacion = timezone.now()
        instance.save(update_fields=['activo', 'fecha_eliminacion'])

    @action(detail=False, methods=['get'], url_path='papelera')
    def papelera(self, request):
        personas = Persona.objects.filter(propietario=request.user, activo=False)
        serializer = self.get_serializer(personas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='restaurar')
    def restaurar(self, request, pk=None):
        try:
            persona = Persona.objects.get(pk=pk, propietario=request.user, activo=False)
        except Persona.DoesNotExist:
            return Response({'error': 'Persona no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        persona.activo = True
        persona.fecha_eliminacion = None
        persona.save(update_fields=['activo', 'fecha_eliminacion'])
        return Response({'ok': True})

    @action(detail=True, methods=['delete'], url_path='eliminar_definitivo')
    def eliminar_definitivo(self, request, pk=None):
        try:
            persona = Persona.objects.get(pk=pk, propietario=request.user, activo=False)
        except Persona.DoesNotExist:
            return Response({'error': 'Persona no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        persona.delete()
        return Response({'ok': True})
