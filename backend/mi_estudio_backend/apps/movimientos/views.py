# apps/movimientos/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from apps.carpetas.models import Carpeta
from .models import TipoMovimiento, Movimiento, Organismo
from .serializers import TipoMovimientoSerializer, MovimientoSerializer, MovimientoCreateSerializer, OrganismoSerializer

class TipoMovimientoViewSet(viewsets.ModelViewSet):
    """CRUD para tipos de movimiento configurables"""
    permission_classes = [permissions.IsAuthenticated]
    queryset = TipoMovimiento.objects.filter(activo=True)
    serializer_class = TipoMovimientoSerializer
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['orden', 'nombre']
    
    @action(detail=False, methods=['get'])
    def opciones(self, request):
        """Endpoint para obtener opciones para selects/dropdowns"""
        tipos = self.get_queryset().values('id', 'nombre', 'color', 'icono')
        return Response(tipos)


class MovimientoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Superuser ve todo
        if user.is_superuser:
            return Movimiento.objects.select_related('carpeta', 'tipo', 'responsable', 'organismo')
        
        # Usuarios normales SOLO ven movimientos de carpetas que pueden ver
        carpetas_visibles = Carpeta.objects.filter(
            Q(propietario=user) | 
            Q(compartida_con__usuario=user) | 
            Q(es_publico=True)
        ).values_list('id', flat=True)
        
        queryset = Movimiento.objects.filter(
            carpeta_id__in=carpetas_visibles
        ).select_related('carpeta', 'tipo', 'responsable', 'organismo')
        
        # Filtros adicionales por query params
        carpeta_id = self.request.query_params.get('carpeta', None)
        tipo_id = self.request.query_params.get('tipo', None)
        estado = self.request.query_params.get('estado', None)
        
        if carpeta_id:
            queryset = queryset.filter(carpeta_id=carpeta_id)
        if tipo_id:
            queryset = queryset.filter(tipo_id=tipo_id)
        if estado:
            queryset = queryset.filter(estado=estado)
            
        return queryset
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MovimientoCreateSerializer
        return MovimientoSerializer
    
    def perform_create(self, serializer):
        serializer.save(responsable=self.request.user)
    
    @action(detail=False, methods=['get'])
    def vencimientos_proximos(self, request):
        """Endpoint para obtener los próximos vencimientos"""
        dias = int(request.query_params.get('dias', 7))
        fecha_limite = timezone.now() + timezone.timedelta(days=dias)
        
        movimientos = self.get_queryset().filter(
            vencimiento__isnull=False,
            vencimiento__gte=timezone.now(),
            vencimiento__lte=fecha_limite
        ).order_by('vencimiento')
        
        page = self.paginate_queryset(movimientos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(movimientos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def marcar_notificado(self, request, pk=None):
        movimiento = self.get_object()
        movimiento.notificado = True
        movimiento.save()
        return Response({'status': 'marcado como notificado'})


class OrganismoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrganismoSerializer
    search_fields = ['nombre', 'juez', 'secretaria']
    filterset_fields = ['activo', 'provincia']
    
    def get_queryset(self):
        user = self.request.user
        
        # Superuser ve todo
        if user.is_superuser:
            return Organismo.objects.all()
        
        # Usuarios normales SOLO ven:
        # - Sus propios organismos
        # - Organismos compartidos
        # - Organismos públicos
        return Organismo.objects.filter(
            Q(propietario=user) | 
            Q(compartida_con__usuario=user) | 
            Q(es_publico=True)
        ).distinct()
    
    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)
    
    @action(detail=True, methods=['post'])
    def compartir(self, request, pk=None):
        """Compartir un organismo con un usuario"""
        organismo = self.get_object()
        
        if organismo.propietario != request.user and not request.user.is_superuser:
            return Response(
                {"error": "Solo el propietario puede compartir este organismo"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .models import CompartirOrganismo
        usuario_id = request.data.get('usuario_id')
        puede_editar = request.data.get('puede_editar', False)
        
        try:
            usuario = User.objects.get(id=usuario_id)
            
            compartido, created = CompartirOrganismo.objects.update_or_create(
                organismo=organismo,
                usuario=usuario,
                defaults={
                    'compartido_por': request.user,
                    'puede_editar': puede_editar
                }
            )
            
            return Response({
                'mensaje': f"Organismo compartido con {usuario.username}",
                'created': created
            })
            
        except User.DoesNotExist:
            return Response(
                {"error": "Usuario no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
