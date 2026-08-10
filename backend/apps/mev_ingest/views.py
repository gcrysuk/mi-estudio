from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from apps.carpetas.models import Carpeta
from config.pagination import StandardPagination
from .models import NotificacionMEVRecibida
from .serializers import NotificacionMEVRecibidaSerializer
from .services import aplicar_notificacion, buscar_carpeta_match
from .tasks import antiguedad_ultima_notificacion_mev

User = get_user_model()


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def salud_ingesta_mev(request):
    """
    Healthcheck público de la ingesta MEV, pensado para ser monitoreado
    desde afuera de la aplicación (cron del sistema, servicio de uptime
    externo). A diferencia de la tarea de Celery `verificar_salud_ingesta_mev`,
    este endpoint no depende de que Celery esté vivo: cualquier proceso
    externo que pueda hacer un GET HTTP detecta acá si la ingesta MEV dejó
    de recibir notificaciones, incluso si Celery entero está caído.

    Responde 503 cuando la última notificación está más vieja que el
    umbral, para que un chequeo simple tipo `curl -f` alcance para detectar
    el corte.
    """
    ultima, antiguedad_horas, antiguedad_horas_habiles = antiguedad_ultima_notificacion_mev()
    umbral = settings.MEV_HEALTHCHECK_UMBRAL_HORAS

    if ultima is None:
        return Response(
            {'ok': False, 'motivo': 'sin_notificaciones', 'ultima_notificacion': None},
            status=status.HTTP_200_OK,
        )

    ok = antiguedad_horas_habiles <= umbral
    return Response(
        {
            'ok': ok,
            'ultima_notificacion': ultima.fecha_recepcion,
            'antiguedad_horas': round(antiguedad_horas, 1),
            'antiguedad_horas_habiles': round(antiguedad_horas_habiles, 1),
            'umbral_horas': umbral,
        },
        status=status.HTTP_200_OK if ok else status.HTTP_503_SERVICE_UNAVAILABLE,
    )


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
