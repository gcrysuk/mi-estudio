from django.urls import path, include

urlpatterns = [
    path('auth/', include('apps.authentication.urls')),
    path('personas/', include('apps.personas.urls')),
    path('carpetas/', include('apps.carpetas.urls')),
    path('movimientos/', include('apps.movimientos.urls')),
    path('usuarios/', include('apps.usuarios.urls')),
    path('organismos/', include('apps.organismos.urls')),
]
