from django.db import models
from django.contrib.auth import get_user_model
from apps.carpetas.models import Carpeta

User = get_user_model()

class TipoMovimiento(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#4FC3F7')
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['orden', 'nombre']
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
    
    # Tracking
    creado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='movimientos_creados'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    ultima_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)
    
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
