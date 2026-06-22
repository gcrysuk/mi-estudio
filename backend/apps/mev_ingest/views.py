from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from apps.carpetas.models import Carpeta
from config.pagination import StandardPagination
from .models import NotificacionMEVRecibida
from .serializers import NotificacionMEVRecibidaSerializer
from .services import aplicar_notificacion


class NotificacionMEVRecibidaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NotificacionMEVRecibida.objects.select_related('carpeta', 'movimiento_creado').all()
    serializer_class = NotificacionMEVRecibidaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['estado_procesamiento']
    ordering_fields = ['fecha_recepcion', 'creado']
    ordering = ['-fecha_recepcion']

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
