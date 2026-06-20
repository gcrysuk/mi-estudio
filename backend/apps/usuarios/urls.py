from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    AdminListaView,
    AdminUsuarioDetailView,
    AdminResetPasswordView,
    PerfilView,
    CambiarPasswordView,
)

router = DefaultRouter()
router.register('', UserViewSet, basename='usuarios')

urlpatterns = [
    path('admin/lista/', AdminListaView.as_view(), name='admin_lista'),
    path('admin/<int:pk>/', AdminUsuarioDetailView.as_view(), name='admin_detail'),
    path('admin/<int:pk>/resetear-password/', AdminResetPasswordView.as_view(), name='admin_reset_password'),
    path('perfil/', PerfilView.as_view(), name='perfil'),
    path('cambiar-password/', CambiarPasswordView.as_view(), name='cambiar_password'),
    path('', include(router.urls)),
]
