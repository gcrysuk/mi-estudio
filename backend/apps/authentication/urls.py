from django.urls import path
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView
from . import views


def ping_view(request):
    return JsonResponse({"message": "API funcionando!", "status": "ok"})


urlpatterns = [
    path('login/', views.LoginView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.LogoutView.as_view(), name='token_logout'),
    path('ping/', ping_view, name='ping'),
    path('profile/', views.ProfileView.as_view(), name='auth_profile'),
    path('registro/', views.RegistroView.as_view(), name='registro'),
    path('verificar-email/', views.VerificarEmailView.as_view(), name='verificar_email'),
    path('reenviar-verificacion/', views.ReenviarVerificacionView.as_view(), name='reenviar_verificacion'),
    path('verificar-username/', views.VerificarUsernameView.as_view(), name='verificar_username'),
    path('google/', views.GoogleAuthView.as_view(), name='google_auth'),
    path('google/completar_registro/', views.GoogleCompletarRegistroView.as_view(), name='google_completar_registro'),
]
