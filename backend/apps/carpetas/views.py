# apps/carpetas/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Carpeta, CompartirCarpeta, EstadoCarpeta, TipoCarpeta, ObjetoCarpeta
from apps.organismos.models import Organismo
from .serializers import (
    CarpetaSerializer, 
    CompartirCarpetaSerializer,
    EstadoCarpetaSerializer, 
    TipoCarpetaSerializer, 
    ObjetoCarpetaSerializer, 
    OrganismoSerializer
)

User = get_user_model()

class CarpetaViewSet(viewsets.ModelViewSet):
    serializer_class = CarpetaSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Carpeta.objects.filter(activo=True).select_related('persona', 'propietario')
        
        return Carpeta.objects.filter(
            Q(propietario=user) |
            Q(compartida_con=user),
            activo=True
        ).select_related('persona', 'propietario').distinct()
    
    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)
    
    # ============================================
    # ENDPOINTS PARA ESTADOS - VERSIÓN CORREGIDA
    # ============================================
    @action(detail=False, methods=['get', 'post'], url_path='estados')
    def estados(self, request):
        """Listar y crear estados"""
        if request.method == 'GET':
            queryset = EstadoCarpeta.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            serializer = EstadoCarpetaSerializer(queryset, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = EstadoCarpetaSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put', 'delete'], url_path='estados')
    def estado_detail(self, request, pk=None):
        """Actualizar y eliminar un estado específico"""
        try:
            estado = EstadoCarpeta.objects.get(pk=pk)
        except EstadoCarpeta.DoesNotExist:
            return Response({'error': 'Estado no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'PUT':
            serializer = EstadoCarpetaSerializer(estado, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            if estado.carpetas.exists():
                return Response(
                    {'error': 'No se puede eliminar porque hay carpetas con este estado'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            estado.delete()
            return Response({'message': 'Estado eliminado'}, status=status.HTTP_200_OK)
    
@action(detail=False, methods=['get'], url_path='estados/(?P<estado_id>\d+)/count')
def contar_carpetas_por_estado(self, request, estado_id=None):
    """Cuenta cuántas carpetas usan un estado específico"""
    count = Carpeta.objects.filter(estado_id=estado_id, activo=True).count()
    return Response({'count': count})

    # ============================================
    # ENDPOINTS PARA TIPOS - VERSIÓN CORREGIDA
    # ============================================
    @action(detail=False, methods=['get', 'post'], url_path='tipos')
    def tipos(self, request):
        """Listar y crear tipos"""
        if request.method == 'GET':
            queryset = TipoCarpeta.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            serializer = TipoCarpetaSerializer(queryset, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = TipoCarpetaSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put', 'delete'], url_path='tipos')
    def tipo_detail(self, request, pk=None):
        """Actualizar y eliminar un tipo específico"""
        try:
            tipo = TipoCarpeta.objects.get(pk=pk)
        except TipoCarpeta.DoesNotExist:
            return Response({'error': 'Tipo no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'PUT':
            serializer = TipoCarpetaSerializer(tipo, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            if tipo.carpetas.exists():
                return Response(
                    {'error': 'No se puede eliminar porque hay carpetas con este tipo'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            tipo.delete()
            return Response({'message': 'Tipo eliminado'}, status=status.HTTP_200_OK)
    
    # ============================================
    # ENDPOINTS PARA OBJETOS - VERSIÓN CORREGIDA
    # ============================================
    @action(detail=False, methods=['get', 'post'], url_path='objetos')
    def objetos(self, request):
        """Listar y crear objetos"""
        if request.method == 'GET':
            queryset = ObjetoCarpeta.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            serializer = ObjetoCarpetaSerializer(queryset, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = ObjetoCarpetaSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put', 'delete'], url_path='objetos')
    def objeto_detail(self, request, pk=None):
        """Actualizar y eliminar un objeto específico"""
        try:
            objeto = ObjetoCarpeta.objects.get(pk=pk)
        except ObjetoCarpeta.DoesNotExist:
            return Response({'error': 'Objeto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'PUT':
            serializer = ObjetoCarpetaSerializer(objeto, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            if objeto.carpetas.exists():
                return Response(
                    {'error': 'No se puede eliminar porque hay carpetas con este objeto'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            objeto.delete()
            return Response({'message': 'Objeto eliminado'}, status=status.HTTP_200_OK)
    
    # ============================================
    # ENDPOINTS PARA ORGANISMOS
    # ============================================
    @action(detail=False, methods=['get', 'post'], url_path='organismos')
    def organismos(self, request):
        """Listar y crear organismos"""
        if request.method == 'GET':
            queryset = Organismo.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            serializer = OrganismoSerializer(queryset, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = OrganismoSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put', 'delete'], url_path='organismos')
    def organismo_detail(self, request, pk=None):
        """Actualizar y eliminar un organismo específico"""
        try:
            organismo = Organismo.objects.get(pk=pk)
        except Organismo.DoesNotExist:
            return Response({'error': 'Organismo no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'PUT':
            serializer = OrganismoSerializer(organismo, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            if organismo.carpetas.exists():
                return Response(
                    {'error': 'No se puede eliminar porque hay carpetas con este organismo'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            organismo.delete()
            return Response({'message': 'Organismo eliminado'}, status=status.HTTP_200_OK)
