from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import Movimiento, TipoMovimiento, EstadoMovimiento
from .serializers import MovimientoSerializer, TipoMovimientoSerializer, EstadoMovimientoSerializer
from apps.carpetas.models import Carpeta

class MovimientoViewSet(viewsets.ModelViewSet):
    serializer_class = MovimientoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['carpeta', 'tipo', 'estado', 'vencido']
    search_fields = ['titulo', 'descripcion']
    
    def get_queryset(self):
        user = self.request.user
        
        carpetas_accesibles = Carpeta.objects.filter(
            Q(propietario=user) | Q(compartida_con=user)
        ).values_list('id', flat=True)
        
        queryset = Movimiento.objects.filter(
            carpeta_id__in=carpetas_accesibles,
            activo=True
        ).select_related('carpeta', 'tipo', 'estado', 'creado_por')
        
        carpeta_id = self.request.query_params.get('carpeta')
        if carpeta_id:
            queryset = queryset.filter(carpeta_id=carpeta_id)
            
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)
    
    @action(detail=False, methods=['get', 'post', 'put', 'delete'], url_path='tipos')
    def tipos_movimiento(self, request):
        """CRUD para tipos de movimiento"""
        if request.method == 'GET':
            queryset = TipoMovimiento.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            serializer = TipoMovimientoSerializer(queryset, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = TipoMovimientoSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'PUT':
            tipo_id = request.data.get('id')
            try:
                tipo = TipoMovimiento.objects.get(id=tipo_id)
                serializer = TipoMovimientoSerializer(tipo, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            except TipoMovimiento.DoesNotExist:
                return Response({'error': 'Tipo no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == 'DELETE':
            tipo_id = request.query_params.get('id')
            try:
                tipo = TipoMovimiento.objects.get(id=tipo_id)
                if tipo.movimientos.exists():
                    return Response({'error': 'El tipo tiene movimientos asociados'}, status=status.HTTP_400_BAD_REQUEST)
                tipo.delete()
                return Response({'message': 'Tipo eliminado'}, status=status.HTTP_200_OK)
            except TipoMovimiento.DoesNotExist:
                return Response({'error': 'Tipo no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({'error': 'Método no permitido'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    @action(detail=False, methods=['get', 'post', 'put', 'delete'], url_path='estados')
    def estados_movimiento(self, request):
        """CRUD para estados de movimiento"""
        if request.method == 'GET':
            queryset = EstadoMovimiento.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            serializer = EstadoMovimientoSerializer(queryset, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = EstadoMovimientoSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'PUT':
            estado_id = request.data.get('id')
            try:
                estado = EstadoMovimiento.objects.get(id=estado_id)
                serializer = EstadoMovimientoSerializer(estado, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            except EstadoMovimiento.DoesNotExist:
                return Response({'error': 'Estado no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == 'DELETE':
            estado_id = request.query_params.get('id')
            try:
                estado = EstadoMovimiento.objects.get(id=estado_id)
                if estado.movimientos.exists():
                    return Response({'error': 'El estado tiene movimientos asociados'}, status=status.HTTP_400_BAD_REQUEST)
                estado.delete()
                return Response({'message': 'Estado eliminado'}, status=status.HTTP_200_OK)
            except EstadoMovimiento.DoesNotExist:
                return Response({'error': 'Estado no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({'error': 'Método no permitido'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    @action(detail=False, methods=['get'])
    def vencidos(self, request):
        """Obtener movimientos vencidos"""
        queryset = self.get_queryset().filter(
            vencido=True,
            fecha_vencimiento__isnull=False
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def proximos_vencer(self, request):
        """Movimientos a vencer en los próximos días"""
        dias = int(request.query_params.get('dias', 7))
        fecha_limite = timezone.now() + timezone.timedelta(days=dias)
        
        queryset = self.get_queryset().filter(
            vencido=False,
            fecha_vencimiento__lte=fecha_limite,
            fecha_vencimiento__gte=timezone.now()
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
