# apps/movimientos/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MovimientoViewSet

router = DefaultRouter()
router.register(r'', MovimientoViewSet, basename='movimientos')

urlpatterns = [
    path('', include(router.urls)),
]
