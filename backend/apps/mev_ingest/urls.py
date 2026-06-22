from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificacionMEVRecibidaViewSet

router = DefaultRouter()
router.register(r'', NotificacionMEVRecibidaViewSet, basename='notificaciones-mev')

urlpatterns = [
    path('', include(router.urls)),
]
