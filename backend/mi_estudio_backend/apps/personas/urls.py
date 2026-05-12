# apps/clients/urls.py
from rest_framework.routers import DefaultRouter
from .views import PersonaViewSet

router = DefaultRouter()
router.register('', PersonaViewSet, basename='persona')

urlpatterns = router.urls
