from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Movimiento, TipoMovimiento, EstadoMovimiento, NotificacionMovimiento, KanbanConfig, NotificacionSistema

User = get_user_model()


class TipoMovimientoSerializer(serializers.ModelSerializer):
    es_propio = serializers.SerializerMethodField()

    class Meta:
        model = TipoMovimiento
        fields = '__all__'
        read_only_fields = ['propietario']

    def get_es_propio(self, obj):
        return obj.propietario_id is not None


class EstadoMovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoMovimiento
        fields = '__all__'
        read_only_fields = ['es_final', 'es_obligatorio']


class KanbanConfigSerializer(serializers.ModelSerializer):
    estados_visibles = EstadoMovimientoSerializer(many=True, read_only=True)
    estados_visibles_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=EstadoMovimiento.objects.all(),
        write_only=True,
        source='estados_visibles',
    )

    class Meta:
        model = KanbanConfig
        fields = ['id', 'estados_visibles', 'estados_visibles_ids', 'orden_columnas']


class MovimientoSerializer(serializers.ModelSerializer):
    carpeta_nombre = serializers.ReadOnlyField(source='carpeta.nombre')
    carpeta_propietario_id = serializers.ReadOnlyField(source='carpeta.propietario_id')
    tipo_nombre = serializers.ReadOnlyField(source='tipo.nombre')
    tipo_color = serializers.ReadOnlyField(source='tipo.color')
    estado_nombre = serializers.ReadOnlyField(source='estado.nombre')
    estado_color = serializers.ReadOnlyField(source='estado.color')
    creado_por_username = serializers.ReadOnlyField(source='creado_por.username')
    responsable_username = serializers.ReadOnlyField(source='responsable.username')
    es_responsable = serializers.SerializerMethodField()
    creado_por_nombre = serializers.SerializerMethodField()
    modificado_por_nombre = serializers.SerializerMethodField()
    responsable_nombre = serializers.SerializerMethodField()

    tiempo_trabajo_formateado = serializers.SerializerMethodField()
    proxima_notificacion = serializers.SerializerMethodField()

    class Meta:
        model = Movimiento
        fields = '__all__'
        read_only_fields = ['creado_por', 'fecha_creacion', 'ultima_actualizacion', 'vencido']

    def get_es_responsable(self, obj):
        request = self.context.get('request')
        if request and obj.responsable_id:
            return obj.responsable_id == request.user.pk
        return False

    def get_creado_por_nombre(self, obj):
        if obj.creado_por_id:
            nombre = f"{obj.creado_por.first_name} {obj.creado_por.last_name}".strip()
            return nombre or obj.creado_por.username
        return None

    def get_responsable_nombre(self, obj):
        if obj.responsable_id:
            nombre = f"{obj.responsable.first_name} {obj.responsable.last_name}".strip()
            return nombre or obj.responsable.username
        return None

    def get_modificado_por_nombre(self, obj):
        if obj.modificado_por_id:
            nombre = f"{obj.modificado_por.first_name} {obj.modificado_por.last_name}".strip()
            return nombre or obj.modificado_por.username
        return None

    def get_tiempo_trabajo_formateado(self, obj):
        if obj.tiempo_trabajo:
            horas = obj.tiempo_trabajo // 60
            minutos = obj.tiempo_trabajo % 60
            if horas > 0:
                return f"{horas}h {minutos}min"
            return f"{minutos}min"
        return None

    def get_proxima_notificacion(self, obj):
        from django.utils import timezone
        notif = obj.notificaciones.filter(
            leida=False,
            fecha__gte=timezone.now()
        ).order_by('fecha').first()
        return notif.fecha.isoformat() if notif else None


class NotificacionSerializer(serializers.ModelSerializer):
    movimiento_titulo = serializers.ReadOnlyField(source='movimiento.titulo')
    carpeta_nombre = serializers.ReadOnlyField(source='movimiento.carpeta.nombre')
    carpeta_id = serializers.ReadOnlyField(source='movimiento.carpeta_id')

    class Meta:
        model = NotificacionMovimiento
        fields = ['id', 'movimiento', 'movimiento_titulo', 'carpeta_nombre', 'carpeta_id', 'fecha', 'leida']


class _ActorSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'nombre_completo']

    def get_nombre_completo(self, obj):
        return obj.get_full_name() or obj.username


class NotificacionSistemaSerializer(serializers.ModelSerializer):
    actor_detalle = _ActorSerializer(source='actor', read_only=True)
    movimiento_titulo = serializers.SerializerMethodField()
    carpeta_nombre = serializers.SerializerMethodField()
    carpeta_id = serializers.SerializerMethodField()

    class Meta:
        model = NotificacionSistema
        fields = [
            'id', 'tipo', 'mensaje', 'leida', 'fecha_creacion',
            'movimiento', 'movimiento_titulo', 'carpeta_nombre', 'carpeta_id',
            'actor', 'actor_detalle',
        ]

    def get_movimiento_titulo(self, obj):
        return obj.movimiento.titulo if obj.movimiento_id else None

    def get_carpeta_nombre(self, obj):
        if obj.carpeta_id:
            return obj.carpeta.nombre
        if obj.movimiento_id and obj.movimiento.carpeta_id:
            return obj.movimiento.carpeta.nombre
        return None

    def get_carpeta_id(self, obj):
        if obj.carpeta_id:
            return obj.carpeta_id
        if obj.movimiento_id:
            return obj.movimiento.carpeta_id
        return None
