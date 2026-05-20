# apps/movimientos/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MovimientoViewSet, NotificacionViewSet

router = DefaultRouter()
# notificaciones must be registered first so its literal prefix
# takes precedence over MovimientoViewSet's pk-capture pattern
router.register('notificaciones', NotificacionViewSet, basename='notificacion')
router.register(r'', MovimientoViewSet, basename='movimientos')

urlpatterns = [
    path('', include(router.urls)),
]
