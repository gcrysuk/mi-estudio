from django.urls import path

from . import views

urlpatterns = [
    path('suscripcion/iniciar/', views.IniciarSuscripcionView.as_view()),
    path('suscripcion/estado/', views.EstadoSuscripcionView.as_view()),
    path('webhook/mp/', views.WebhookMPView.as_view()),
]
