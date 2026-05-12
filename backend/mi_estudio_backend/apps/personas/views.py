# apps/personas/views.py
from rest_framework import viewsets, permissions
from django.db.models import Q
from .models import Persona
from .serializers import PersonaSerializer

class PersonaViewSet(viewsets.ModelViewSet):
    serializer_class = PersonaSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['nombre', 'apellido', 'numero_documento', 'email']
    filterset_fields = ['tipo_persona', 'activo', 'provincia']
    
    def get_queryset(self):
        user = self.request.user
        
        # Superuser ve todo
        if user.is_superuser:
            return Persona.objects.all()
        
        # Usuarios normales SOLO ven:
        # - Sus propias personas (propietario)
        # - Personas públicas
        return Persona.objects.filter(
            Q(propietario=user) | Q(es_publico=True)
        ).distinct()
    
    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)
