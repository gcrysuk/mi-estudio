# apps/movimientos/models.py
from django.db import models
from django.contrib.auth import get_user_model
from apps.carpetas.models import Carpeta

User = get_user_model()

class TipoMovimiento(models.Model):
    """Tipos de movimiento personalizables por el usuario"""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#3498db', 
                            help_text='Color en formato HEX (ej: #3498db)')
    icono = models.CharField(max_length=50, blank=True,
                            help_text='Nombre del icono (FontAwesome, Bootstrap Icons, etc)')
    requiere_vencimiento = models.BooleanField(default=False,
                                              help_text='¿Este tipo de movimiento suele tener vencimiento?')
    dias_aviso = models.IntegerField(default=0,
                                    help_text='Días antes para avisar (0 = no avisar)')
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name = 'Tipo de Movimiento'
        verbose_name_plural = 'Tipos de Movimiento'
    
    def __str__(self):
        return self.nombre


class Movimiento(models.Model):
    ESTADO_CHOICES = [
        ('no_aplica', 'No aplica'),
        ('dar_seguimiento', 'Dar seguimiento'),
        ('pendiente', 'Pendiente'),
        ('en_curso', 'En curso'),
        ('ok', 'OK'),
    ]

    carpeta = models.ForeignKey(
        Carpeta, 
        on_delete=models.CASCADE, 
        related_name='movimientos'
    )
    
    fecha = models.DateTimeField()
    tipo = models.ForeignKey(TipoMovimiento, on_delete=models.PROTECT, related_name='movimientos')
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    
    # 👤 Responsable (quien crea/ejecuta el movimiento)
    responsable = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='movimientos_responsable'
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    # Campos de seguimiento
    vencimiento = models.DateTimeField(null=True, blank=True)
    notificado = models.BooleanField(default=False)
    tiempo_trabajo = models.CharField(max_length=20, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    organismo = models.ForeignKey('Organismo', on_delete=models.SET_NULL, null=True, blank=True)
    fecha_notificacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-fecha', '-fecha_creacion']
        indexes = [
            models.Index(fields=['carpeta', 'fecha']),
            models.Index(fields=['tipo']),
            models.Index(fields=['vencimiento']),
            models.Index(fields=['estado']),
            models.Index(fields=['organismo']),
        ]
        verbose_name = 'Movimiento'
        verbose_name_plural = 'Movimientos'
        permissions = [
            ("ver_movimiento", "Puede ver movimientos"),
            ("crear_movimiento", "Puede crear movimientos"),
            ("editar_movimiento", "Puede editar movimientos propios"),
            ("eliminar_movimiento", "Puede eliminar movimientos"),
        ]

    def __str__(self):
        return f"{self.carpeta.numero_expediente} - {self.tipo.nombre}: {self.titulo}"


class Organismo(models.Model):
    nombre = models.CharField(max_length=200)
    domicilio = models.TextField(blank=True)
    localidad = models.CharField(max_length=100, blank=True)
    provincia = models.CharField(max_length=100, blank=True)
    juez = models.CharField(max_length=200, blank=True)
    secretaria = models.CharField(max_length=200, blank=True)
    telefono = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    observaciones = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    
    # 👑 Privacidad para organismos
    propietario = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='organismos_propios',
        help_text="Usuario dueño de este organismo"
    )
    
    # 👥 COMPARTIR - con through_fields para evitar ambigüedad
    compartida_con = models.ManyToManyField(
        User,
        through='CompartirOrganismo',
        through_fields=('organismo', 'usuario'),  # Especificamos los campos
        related_name='organismos_compartidos',
        blank=True
    )
    
    es_publico = models.BooleanField(
        default=False,
        help_text="Si está marcado, TODOS los usuarios pueden verlo"
    )

    class Meta:
        ordering = ['nombre']
        verbose_name = "Organismo"
        verbose_name_plural = "Organismos"
        permissions = [
            ("ver_organismo", "Puede ver organismos"),
            ("crear_organismo", "Puede crear organismos"),
            ("editar_organismo", "Puede editar organismos"),
            ("compartir_organismo", "Puede compartir organismos"),
        ]

    def __str__(self):
        return self.nombre


class CompartirOrganismo(models.Model):
    organismo = models.ForeignKey(Organismo, on_delete=models.CASCADE, related_name='compartidos')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organismos_recibidos')
    compartido_por = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='organismos_compartidos_por'
    )
    fecha_compartido = models.DateTimeField(auto_now_add=True)
    puede_editar = models.BooleanField(default=False)

    class Meta:
        unique_together = ['organismo', 'usuario']
        verbose_name = "Compartir Organismo"
        verbose_name_plural = "Compartir Organismos"

    def __str__(self):
        return f"{self.organismo} → {self.usuario}"
