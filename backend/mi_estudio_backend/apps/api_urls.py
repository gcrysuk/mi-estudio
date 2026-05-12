# apps/api_urls.py
from django.urls import path, include
from django.contrib.auth import views as auth_views
urlpatterns = [
    path('auth/', include('apps.authentication.urls')),
    path('personas/', include('apps.personas.urls')),
    path('carpetas/', include('apps.carpetas.urls')),  # Cambiado
    path('movimientos/', include('apps.movimientos.urls')),
    # path('documents/', include('apps.documents.urls')),
    # path('events/', include('apps.events.urls')),
    # path('dashboard/', include('apps.dashboard.urls')),
    path('ping/', include('apps.authentication.urls')),
    # Password reset URLs
    path('password-reset/', include('django.contrib.auth.urls')),
]
