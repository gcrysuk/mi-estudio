# apps/personas/models.py
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
        ('cliente', 'Cliente'),
        ('contraparte', 'Contraparte'),
        ('proveedor', 'Proveedor'),
        ('otro', 'Otro'),
    ]

    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    tipo_persona = models.CharField(
        max_length=20,
        choices=TIPO_PERSONA_CHOICES,
        default='cliente',
        help_text="Rol de la persona en el sistema"
    )
    tipo_documento = models.CharField(
        max_length=4, 
        choices=TIPO_DOCUMENTO_CHOICES, 
        default='DNI'
    )
    numero_documento = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True)
    direccion = models.CharField(max_length=200, blank=True)
    ciudad = models.CharField(max_length=100, blank=True)
    provincia = models.CharField(max_length=100, blank=True)
    codigo_postal = models.CharField(max_length=10, blank=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    observaciones = models.TextField(blank=True)

    # 👑 SOLO propietario (sin compartir)
    propietario = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='personas_propias',
        null=True,
        blank=True,
        help_text="Usuario que creó y es dueño de esta persona"
    )
    
    # 📢 Público (opcional)
    es_publico = models.BooleanField(
        default=False,
        help_text="Si está marcado, todos los usuarios pueden verlo"
    )

    class Meta:
        verbose_name = "Persona"
        verbose_name_plural = "Personas"
        ordering = ['apellido', 'nombre']
        permissions = [
            ("ver_persona", "Puede ver personas"),
            ("crear_persona", "Puede crear personas"),
            ("editar_persona", "Puede editar personas"),
            ("eliminar_persona", "Puede eliminar personas"),
        ]

    def __str__(self):
        return f"{self.apellido}, {self.nombre} - {self.tipo_documento}: {self.numero_documento}"


# ❌ ELIMINAMOS COMPARTIRPERSONA COMPLETAMENTE
# (Borrar toda la clase CompartirPersona)
