# apps/carpetas/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Carpeta, CompartirCarpeta
from .serializers import CarpetaSerializer, CompartirCarpetaSerializer

User = get_user_model()

class CarpetaViewSet(viewsets.ModelViewSet):
    serializer_class = CarpetaSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['numero_expediente', 'caratula', 'persona__nombre', 'persona__apellido']
    filterset_fields = ['estado', 'persona', 'activo', 'tipo_carpeta']
    
    def get_queryset(self):
        user = self.request.user
        
        # Superuser ve todo
        if user.is_superuser:
            return Carpeta.objects.filter(activo=True).select_related('persona', 'propietario')
        
        # Usuarios normales SOLO ven:
        # - Sus propias carpetas (propietario)
        # - Carpetas compartidas con ellos
        # - Carpetas públicas
        return Carpeta.objects.filter(
            Q(propietario=user) |
            Q(compartida_con__usuario=user) |
            Q(es_publico=True),
            activo=True
        ).select_related('persona', 'propietario').distinct()
    
    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)
    
    @action(detail=False, methods=['post'])
    def compartir_multiples(self, request):
        """
        Compartir múltiples carpetas con un usuario
        POST: { "carpetas": [1,2,3], "usuario_id": 5, "puede_editar": false }
        """
        carpeta_ids = request.data.get('carpetas', [])
        usuario_id = request.data.get('usuario_id')
        puede_editar = request.data.get('puede_editar', False)
        
        if not carpeta_ids or not usuario_id:
            return Response(
                {"error": "Debe especificar 'carpetas' y 'usuario_id'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            usuario = User.objects.get(id=usuario_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Usuario no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que el usuario actual es propietario de todas las carpetas
        carpetas = Carpeta.objects.filter(
            id__in=carpeta_ids,
            propietario=request.user
        )
        
        if carpetas.count() != len(carpeta_ids):
            return Response(
                {"error": "No tienes permiso para compartir algunas carpetas"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        resultados = []
        for carpeta in carpetas:
            compartido, created = CompartirCarpeta.objects.get_or_create(
                carpeta=carpeta,
                usuario=usuario,
                defaults={
                    'compartido_por': request.user,
                    'puede_editar': puede_editar
                }
            )
            resultados.append({
                'carpeta_id': carpeta.id,
                'carpeta': str(carpeta),
                'compartido': not created,
                'mensaje': 'Ya estaba compartido' if not created else 'Compartido exitosamente'
            })
        
        return Response({
            'mensaje': f'Procesadas {len(resultados)} carpetas',
            'resultados': resultados
        })
    
    @action(detail=True, methods=['post'])
    def compartir(self, request, pk=None):
        """Compartir una carpeta específica con un usuario"""
        carpeta = self.get_object()
        
        # Solo el propietario puede compartir
        if carpeta.propietario != request.user and not request.user.is_superuser:
            return Response(
                {"error": "Solo el propietario puede compartir esta carpeta"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        usuario_id = request.data.get('usuario_id')
        puede_editar = request.data.get('puede_editar', False)
        
        try:
            usuario = User.objects.get(id=usuario_id)
            
            if usuario == request.user:
                return Response(
                    {"error": "No puedes compartir una carpeta contigo mismo"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            compartido, created = CompartirCarpeta.objects.update_or_create(
                carpeta=carpeta,
                usuario=usuario,
                defaults={
                    'compartido_por': request.user,
                    'puede_editar': puede_editar
                }
            )
            
            return Response({
                'mensaje': f"Carpeta compartida con {usuario.username}",
                'created': created
            })
            
        except User.DoesNotExist:
            return Response(
                {"error": "Usuario no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def usuarios_compartidos(self, request, pk=None):
        """Listar usuarios con quienes se compartió esta carpeta"""
        carpeta = self.get_object()
        
        if carpeta.propietario != request.user and not request.user.is_superuser:
            return Response(
                {"error": "No tienes permiso para ver esta información"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        compartidos = carpeta.compartidos.all()
        data = [{
            'usuario_id': c.usuario.id,
            'username': c.usuario.username,
            'email': c.usuario.email,
            'puede_editar': c.puede_editar,
            'fecha_compartido': c.fecha_compartido
        } for c in compartidos]
        
        return Response(data)
    
    @action(detail=True, methods=['post'])
    def dejar_compartir(self, request, pk=None):
        """Dejar de compartir una carpeta con un usuario"""
        carpeta = self.get_object()
        
        if carpeta.propietario != request.user and not request.user.is_superuser:
            return Response(
                {"error": "Solo el propietario puede modificar los permisos"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        usuario_id = request.data.get('usuario_id')
        
        try:
            compartido = CompartirCarpeta.objects.get(
                carpeta=carpeta,
                usuario_id=usuario_id
            )
            compartido.delete()
            return Response({"mensaje": "Compartido eliminado"})
        except CompartirCarpeta.DoesNotExist:
            return Response(
                {"error": "La carpeta no estaba compartida con ese usuario"},
                status=status.HTTP_404_NOT_FOUND
            )
