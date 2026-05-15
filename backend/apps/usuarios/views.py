from rest_framework import viewsets, permissions
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

User = get_user_model()

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        from apps.carpetas.models import CompartirCarpeta

        user = self.request.user
        search = self.request.query_params.get('search', '').strip()

        if search:
            return User.objects.filter(username=search).exclude(id=user.id)

        conocidos_ids = CompartirCarpeta.objects.filter(
            carpeta__propietario=user
        ).values_list('usuario_id', flat=True).distinct()

        return User.objects.filter(id__in=conocidos_ids)
