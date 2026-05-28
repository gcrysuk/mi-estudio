# apps/movimientos/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MovimientoViewSet, NotificacionViewSet, NotificacionSistemaViewSet

router = DefaultRouter()
# Registrar primero los prefijos literales para evitar colisiones con el pk-capture de MovimientoViewSet
router.register('notificaciones_sistema', NotificacionSistemaViewSet, basename='notificacion_sistema')
router.register('notificaciones', NotificacionViewSet, basename='notificacion')
router.register(r'', MovimientoViewSet, basename='movimientos')

urlpatterns = [
    path('', include(router.urls)),
]
