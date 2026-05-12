from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Persona, TipoPersona
from .serializers import PersonaSerializer, TipoPersonaSerializer

class PersonaViewSet(viewsets.ModelViewSet):
    serializer_class = PersonaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Persona.objects.filter(propietario=user, activo=True)
        
        # Filtrado manual por search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(nombre__icontains=search) |
                Q(apellido__icontains=search) |
                Q(numero_documento__icontains=search) |
                Q(email__icontains=search)
            )
        
        return queryset

    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)

    @action(detail=False, methods=['get', 'post', 'put', 'delete'], url_path='tipos')
    def tipos(self, request):
        if request.method == 'GET':
            tipos = TipoPersona.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                tipos = tipos.filter(nombre__icontains=search)
            serializer = TipoPersonaSerializer(tipos, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = TipoPersonaSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'PUT':
            tipo_id = request.data.get('id')
            try:
                tipo = TipoPersona.objects.get(id=tipo_id)
                serializer = TipoPersonaSerializer(tipo, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            except TipoPersona.DoesNotExist:
                return Response({'error': 'Tipo no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == 'DELETE':
            tipo_id = request.query_params.get('id')
            try:
                tipo = TipoPersona.objects.get(id=tipo_id)
                if tipo.personas.exists():
                    return Response({'error': 'Tipo tiene personas asociadas'}, status=status.HTTP_400_BAD_REQUEST)
                tipo.delete()
                return Response({'message': 'Tipo eliminado'}, status=status.HTTP_200_OK)
            except TipoPersona.DoesNotExist:
                return Response({'error': 'Tipo no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({'error': 'Método no permitido'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
