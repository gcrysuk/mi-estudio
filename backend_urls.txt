# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.contrib.auth.decorators import login_required

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.api_urls')),
    
    # Frontend URLs
    path('', login_required(TemplateView.as_view(template_name='dashboard/index.html')), name='dashboard'),
    path('personas/', login_required(TemplateView.as_view(template_name='personas/list.html')), name='personas'),
    path('carpetas/', login_required(TemplateView.as_view(template_name='carpetas/list.html')), name='carpetas'),
    path('movimientos/', login_required(TemplateView.as_view(template_name='movimientos/list.html')), name='movimientos'),
    path('organismos/', login_required(TemplateView.as_view(template_name='organismos/list.html')), name='organismos'),
    path('tipos/', login_required(TemplateView.as_view(template_name='tipos/list.html')), name='tipos_movimiento'),
    path('calendario/', login_required(TemplateView.as_view(template_name='calendario/index.html')), name='calendario'),
    path('compartir/', login_required(TemplateView.as_view(template_name='compartir/compartir_carpetas.html')), name='compartir'),
    path('configuracion/', login_required(TemplateView.as_view(template_name='configuracion/index.html')), name='configuracion'),
    
    # Auth URLs
    path('login/', TemplateView.as_view(template_name='auth/login.html'), name='login'),
    path('logout/', TemplateView.as_view(template_name='auth/logout.html'), name='logout'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
