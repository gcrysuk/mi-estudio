from rest_framework import viewsets, permissions
from django.db.models import Q
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
                Q(numero_documento__icontains=search) |
                Q(email__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)
