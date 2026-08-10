from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificacionMEVRecibidaViewSet, salud_ingesta_mev

router = DefaultRouter()
router.register(r'', NotificacionMEVRecibidaViewSet, basename='notificaciones-mev')

urlpatterns = [
    path('health/', salud_ingesta_mev, name='mev-ingest-health'),
    path('', include(router.urls)),
]
