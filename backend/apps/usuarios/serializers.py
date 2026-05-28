from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'nombre_completo']

    def get_nombre_completo(self, obj):
        try:
            perfil = obj.perfil
            if perfil.nombre or perfil.apellido:
                parts = [p for p in [perfil.apellido, perfil.nombre] if p]
                return ', '.join(parts)
        except AttributeError:
            pass
        if obj.first_name or obj.last_name:
            parts = [p for p in [obj.last_name, obj.first_name] if p]
            return ', '.join(parts)
        return obj.username
