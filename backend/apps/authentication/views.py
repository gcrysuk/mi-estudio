from django.shortcuts import render

# Create your views here.
# apps/authentication/views.py
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import generics
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Agregar datos adicionales del usuario
        data['username'] = self.user.username
        data['email'] = self.user.email
        data['user_id'] = self.user.id
        return data

class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

# DEBUG TEMP
import logging
logger = logging.getLogger(__name__)
