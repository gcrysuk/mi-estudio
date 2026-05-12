# apps/authentication/urls.py
from django.urls import path
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView
from . import views  # Importamos las vistas locales

def ping_view(request):
    return JsonResponse({"message": "API funcionando!", "status": "ok"})

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('ping/', ping_view, name='ping'),  # Movemos ping aquí también
]
