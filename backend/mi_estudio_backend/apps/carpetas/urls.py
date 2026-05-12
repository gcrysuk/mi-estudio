# apps/carpetas/urls.py
from rest_framework.routers import DefaultRouter
from .views import CarpetaViewSet

router = DefaultRouter()
router.register('', CarpetaViewSet, basename='carpeta')

urlpatterns = router.urls
