# apps/movimientos/urls.py
from rest_framework.routers import DefaultRouter
from .views import TipoMovimientoViewSet, MovimientoViewSet

router = DefaultRouter()
router.register('tipos', TipoMovimientoViewSet, basename='tipomovimiento')
router.register('', MovimientoViewSet, basename='movimiento')

urlpatterns = router.urls
