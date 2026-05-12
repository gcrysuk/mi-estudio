from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganismoViewSet

router = DefaultRouter()
router.register(r'', OrganismoViewSet, basename='organismos')

urlpatterns = [
    path('', include(router.urls)),
]
