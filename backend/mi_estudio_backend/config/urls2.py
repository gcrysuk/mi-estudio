# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.api_urls')),  # Crearemos esto después
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def home_view(request):
    return JsonResponse({
        "message": "Bienvenido a MI ESTUDIO API",
        "endpoints": {
            "admin": "/admin/",
            "api": "/api/v1/",
            "ping": "/api/v1/ping/",
            "docs": "próximamente"
        }
    })

urlpatterns = [
    path('', home_view, name='home'),
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.api_urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
