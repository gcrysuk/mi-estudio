from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CarpetaViewSet
from .config_views import (
    EstadoCarpetaViewSet,
    TipoCarpetaViewSet,
    ObjetoCarpetaViewSet,
    OrganismoViewSet
)

router = DefaultRouter()
router.register(r'estados', EstadoCarpetaViewSet, basename='estados')
router.register(r'tipos', TipoCarpetaViewSet, basename='tipos')
router.register(r'objetos', ObjetoCarpetaViewSet, basename='objetos')
router.register(r'organismos', OrganismoViewSet, basename='organismos')
router.register(r'', CarpetaViewSet, basename='carpetas')

urlpatterns = [
    path('', include(router.urls)),
]
