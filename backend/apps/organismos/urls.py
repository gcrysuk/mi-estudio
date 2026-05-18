from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganismoViewSet, MateriaViewSet

router = DefaultRouter()
router.register(r'materias', MateriaViewSet, basename='materias')
router.register(r'', OrganismoViewSet, basename='organismos')

urlpatterns = [
    path('', include(router.urls)),
]
