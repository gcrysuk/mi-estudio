from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from apps.carpetas.models import Carpeta
from config.pagination import StandardPagination
from .models import NotificacionMEVRecibida
from .serializers import NotificacionMEVRecibidaSerializer
from .services import aplicar_notificacion, buscar_carpeta_match

User = get_user_model()


class NotificacionMEVRecibidaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificacionMEVRecibidaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['estado_procesamiento']
    search_fields = ['caratula', 'nro_causa', 'organismo']
    ordering_fields = [
        'nro_causa', 'caratula', 'estado', 'fecha_proveido',
        'fecha_recepcion', 'estado_procesamiento', 'creado',
    ]
    ordering = ['-fecha_recepcion']

    def _es_admin(self, user):
        return user.is_staff or user.is_superuser

    def get_queryset(self):
        qs = NotificacionMEVRecibida.objects.select_related('carpeta', 'movimiento_creado', 'usuario')
        if self._es_admin(self.request.user):
            return qs
        # Privacidad entre abogados: la casilla es compartida pero cada
        # notificación pertenece a un único abogado (destinatario original
        # del mail). Las 'no_reconocido' (usuario=None) sólo las gestiona admin.
        return qs.filter(usuario=self.request.user)

    @action(detail=False, methods=['get'], url_path='pendientes_count')
    def pendientes_count(self, request):
        count = self.get_queryset().filter(
            estado_procesamiento__in=['sin_match', 'pendiente']
        ).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'])
    def asignar(self, request, pk=None):
        notif = self.get_object()
        if notif.estado_procesamiento == 'procesado':
            return Response({'detail': 'Ya fue procesada.'}, status=status.HTTP_400_BAD_REQUEST)

        carpeta_id = request.data.get('carpeta')
        if not carpeta_id:
            return Response({'detail': 'Falta el id de carpeta.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            carpeta = Carpeta.objects.get(pk=carpeta_id)
        except Carpeta.DoesNotExist:
            return Response({'detail': 'Carpeta no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        notif.carpeta = carpeta
        notif.estado_procesamiento = 'asignado'
        notif.save()

        aplicar_notificacion(notif)

        return Response(self.get_serializer(notif).data)

    @action(detail=True, methods=['post'], url_path='asignar_usuario')
    def asignar_usuario(self, request, pk=None):
        """Sólo admin: reasigna manualmente el abogado dueño de una
        notificación 'no_reconocido' (o cualquier otra) y reintenta el
        match de carpeta con ese usuario."""
        if not self._es_admin(request.user):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        notif = self.get_object()
        usuario_id = request.data.get('usuario')
        if not usuario_id:
            return Response({'detail': 'Falta el id de usuario.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            usuario = User.objects.get(pk=usuario_id)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        notif.usuario = usuario

        carpeta, candidatas_count = buscar_carpeta_match(notif.nro_causa, usuario)
        if carpeta:
            notif.carpeta = carpeta
            notif.estado_procesamiento = 'asignado'
            notif.carpetas_candidatas_count = 1
            notif.save()
            aplicar_notificacion(notif)
        else:
            notif.estado_procesamiento = 'sin_match'
            notif.carpetas_candidatas_count = candidatas_count
            notif.save()

        return Response(self.get_serializer(notif).data)

    @action(detail=True, methods=['post'])
    def descartar(self, request, pk=None):
        """Sólo admin: descarta (borra) una notificación, típicamente
        'no_reconocido' que no corresponde a ningún abogado del estudio."""
        if not self._es_admin(request.user):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        notif = self.get_object()
        notif.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
