from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class TipoPersona(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name = "Tipo de Persona"

    def __str__(self):
        return self.nombre


class Persona(models.Model):
    TIPO_DOCUMENTO_CHOICES = [
        ('DNI', 'DNI'),
        ('CUIT', 'CUIT'),
        ('CUIL', 'CUIL'),
        ('PAS', 'Pasaporte'),
    ]

    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    tipo_persona = models.ForeignKey(
        TipoPersona,
        on_delete=models.PROTECT,
        related_name='personas',
        null=True,
        blank=True
    )
    tipo_documento = models.CharField(
        max_length=4, 
        choices=TIPO_DOCUMENTO_CHOICES, 
        default='DNI',
        blank=True,
        null=True
    )
    numero_documento = models.CharField(
        max_length=20, 
        unique=False,
        blank=True,
        null=True
    )
    email = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True)
    direccion = models.CharField(max_length=200, blank=True)
    ciudad = models.CharField(max_length=100, blank=True)
    provincia = models.CharField(max_length=100, blank=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    
    propietario = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='personas',
        null=False,
        blank=False
    )

    class Meta:
        ordering = ['apellido', 'nombre']
        verbose_name = "Persona"
        verbose_name_plural = "Personas"

    def __str__(self):
        return f"{self.apellido}, {self.nombre}"
