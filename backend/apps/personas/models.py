from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Persona(models.Model):
    TIPO_DOCUMENTO_CHOICES = [
        ('DNI', 'DNI'),
        ('CUIT', 'CUIT'),
        ('CUIL', 'CUIL'),
        ('PAS', 'Pasaporte'),
    ]

    TIPO_PERSONA_CHOICES = [
        ('fisica',   'Persona Física'),
        ('juridica', 'Persona Jurídica'),
        ('otro',     'Otro'),
    ]

    nombre = models.CharField(max_length=100, blank=True, null=True)
    apellido = models.CharField(max_length=100, blank=True, null=True)
    razon_social = models.CharField(max_length=200, blank=True, null=True)
    tipo_persona = models.CharField(
        max_length=20,
        choices=TIPO_PERSONA_CHOICES,
        blank=True,
        default='',
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
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)

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
        if self.tipo_persona == 'juridica':
            return self.razon_social or 'Sin razón social'
        return f"{self.apellido or ''}, {self.nombre or ''}".strip(', ')
