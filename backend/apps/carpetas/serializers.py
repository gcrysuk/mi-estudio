from rest_framework import serializers
from .models import Carpeta, CompartirCarpeta, EstadoCarpeta, TipoCarpeta, ObjetoCarpeta, ParticipanteCarpeta
from apps.organismos.models import Organismo
from apps.personas.serializers import PersonaSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

# Serializers para modelos configurables
class EstadoCarpetaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoCarpeta
        fields = '__all__'
        read_only_fields = ['es_obligatorio']

class TipoCarpetaSerializer(serializers.ModelSerializer):
    es_propio = serializers.SerializerMethodField()

    class Meta:
        model = TipoCarpeta
        fields = '__all__'
        read_only_fields = ['propietario']

    def get_es_propio(self, obj):
        return obj.propietario_id is not None


class ObjetoCarpetaSerializer(serializers.ModelSerializer):
    es_propio = serializers.SerializerMethodField()

    class Meta:
        model = ObjetoCarpeta
        fields = '__all__'
        read_only_fields = ['propietario']

    def get_es_propio(self, obj):
        return obj.propietario_id is not None


class OrganismoSerializer(serializers.ModelSerializer):
    es_propio = serializers.SerializerMethodField()

    class Meta:
        model = Organismo
        fields = '__all__'
        read_only_fields = ['propietario']

    def get_es_propio(self, obj):
        return obj.propietario_id is not None

class ParticipanteSerializer(serializers.ModelSerializer):
    persona_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ParticipanteCarpeta
        fields = ['id', 'tipo', 'persona', 'persona_nombre', 'nombre_manual']

    def get_persona_nombre(self, obj):
        if obj.persona:
            return f"{obj.persona.apellido}, {obj.persona.nombre}"
        return obj.nombre_manual


# Serializer para Carpeta
class CarpetaSerializer(serializers.ModelSerializer):
    persona_nombre = serializers.SerializerMethodField()
    propietario_nombre = serializers.ReadOnlyField(source='propietario.username')
    persona_detalle = PersonaSerializer(source='persona', read_only=True)
    compartida_con_count = serializers.SerializerMethodField()
    estado_nombre = serializers.SerializerMethodField()
    tipo_nombre = serializers.SerializerMethodField()
    objeto_nombre = serializers.SerializerMethodField()
    organismo_nombre = serializers.SerializerMethodField()
    dias_sin_movimiento = serializers.SerializerMethodField()
    participantes = ParticipanteSerializer(many=True, read_only=True)
    
    class Meta:
        model = Carpeta
        fields = '__all__'
        read_only_fields = ['fecha_inicio', 'ultima_actualizacion', 'propietario', 'mev_ultimo_sync', 'mev_estado']
    
    def get_compartida_con_count(self, obj):
        return obj.compartidos.count()
    
    def get_persona_nombre(self, obj):
        return str(obj.persona) if obj.persona else None
    
    def get_estado_nombre(self, obj):
        return obj.estado.nombre if obj.estado else None
    
    def get_tipo_nombre(self, obj):
        return obj.tipo.nombre if obj.tipo else None
    
    def get_objeto_nombre(self, obj):
        return obj.objeto.nombre if obj.objeto else None
    
    def get_organismo_nombre(self, obj):
        return obj.organismo.nombre if obj.organismo else None

    def get_dias_sin_movimiento(self, obj):
        from django.utils import timezone
        ultimo = obj.movimientos.filter(activo=True).order_by('-fecha_movimiento').first()
        if not ultimo:
            return None
        delta = timezone.now() - ultimo.fecha_movimiento
        return delta.days

# Serializer para CompartirCarpeta
class CompartirCarpetaSerializer(serializers.ModelSerializer):
    usuario_username = serializers.ReadOnlyField(source='usuario.username')
    carpeta_nombre = serializers.SerializerMethodField()
    compartido_por_username = serializers.ReadOnlyField(source='compartido_por.username')
    
    class Meta:
        model = CompartirCarpeta
        fields = '__all__'
        read_only_fields = ['fecha_compartido']
    
    def get_carpeta_nombre(self, obj):
        return str(obj.carpeta) if obj.carpeta else None
