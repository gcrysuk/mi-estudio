from django.db import models
from django.contrib.auth import get_user_model
from apps.carpetas.models import Carpeta

User = get_user_model()

class TipoMovimiento(models.Model):
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#4FC3F7')
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    propietario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tipos_movimiento',
    )

    class Meta:
        ordering = ['orden', 'nombre']
        unique_together = [['nombre', 'propietario']]
        verbose_name = "Tipo de Movimiento"

    def __str__(self):
        return self.nombre

class EstadoMovimiento(models.Model):
    """Modelo configurable para estados de movimiento"""
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#4FC3F7')
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    es_final = models.BooleanField(default=False)
    es_obligatorio = models.BooleanField(default=False)

    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name = "Estado de Movimiento"

    def __str__(self):
        return self.nombre

class Movimiento(models.Model):
    carpeta = models.ForeignKey(
        'carpetas.Carpeta',
        on_delete=models.CASCADE,
        related_name='movimientos',
        null=True,
        blank=True
    )
    tipo = models.ForeignKey(
        TipoMovimiento,
        on_delete=models.PROTECT,
        related_name='movimientos',
        null=True,
        blank=True
    )
    estado = models.ForeignKey(
        EstadoMovimiento,
        on_delete=models.PROTECT,
        related_name='movimientos',
        null=True,
        blank=True,
        verbose_name="Estado"
    )
    
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    
    # Fechas
    fecha_movimiento = models.DateTimeField()
    fecha_notificacion = models.DateTimeField(null=True, blank=True)
    fecha_vencimiento = models.DateTimeField(null=True, blank=True)
    fecha_cambio_estado = models.DateTimeField(auto_now=False, null=True, blank=True)
    
    # Tiempo de trabajo (en minutos)
    tiempo_trabajo = models.IntegerField(
        null=True, 
        blank=True,
        help_text="Tiempo de trabajo en minutos"
    )
    
    vencido = models.BooleanField(default=False)

    responsable = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_responsable',
    )

    transcripcion = models.TextField(
        blank=True,
        default='',
        verbose_name="Transcripción original",
    )

    # Tracking
    creado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='movimientos_creados'
    )
    modificado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_modificados',
        verbose_name="Último modificado por",
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    ultima_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-fecha_movimiento']
        verbose_name = "Movimiento"
        verbose_name_plural = "Movimientos"
    
    def __str__(self):
        carpeta_str = str(self.carpeta) if self.carpeta_id else 'Sin carpeta'
        return f"{carpeta_str} - {self.titulo[:50]}"
    
    def save(self, *args, **kwargs):
        from django.utils import timezone
        if self.fecha_vencimiento and self.fecha_vencimiento < timezone.now():
            self.vencido = True
        super().save(*args, **kwargs)


class KanbanConfig(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='kanban_config')
    estados_visibles = models.ManyToManyField(EstadoMovimiento, blank=True, related_name='kanban_configs')
    orden_columnas = models.JSONField(default=list)

    class Meta:
        verbose_name = "Configuración Kanban"

    def __str__(self):
        return f"KanbanConfig de {self.usuario}"


class NotificacionMovimiento(models.Model):
    movimiento = models.ForeignKey(
        Movimiento,
        on_delete=models.CASCADE,
        related_name='notificaciones'
    )
    fecha = models.DateTimeField()
    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha']
        verbose_name = "Notificación de Movimiento"

    def __str__(self):
        return f"{self.movimiento.titulo} - {self.fecha}"


class NotificacionSistema(models.Model):
    TIPO_CHOICES = [
        ('asignacion', 'Asignación de movimiento'),
        ('cambio_estado', 'Cambio de estado'),
        ('carpeta_compartida', 'Carpeta compartida'),
        ('mev_nuevo_movimiento', 'Nuevo movimiento MEV'),
        ('mev_cambio_estado', 'Cambio de estado MEV'),
        ('mev_error', 'Error de sincronización MEV'),
    ]
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notificaciones_sistema',
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notificaciones_generadas',
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    movimiento = models.ForeignKey(
        Movimiento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notificaciones_sistema',
    )
    carpeta = models.ForeignKey(
        'carpetas.Carpeta',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notificaciones_sistema',
    )
    mensaje = models.CharField(max_length=300)
    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_creacion']
        verbose_name = "Notificación de Sistema"

    def __str__(self):
        return f"{self.get_tipo_display()} → {self.usuario}"
