# apps/carpetas/models.py
from django.db import models
from django.contrib.auth import get_user_model
from apps.personas.models import Persona

User = get_user_model()

class Carpeta(models.Model):
    ESTADO_CHOICES = [
        ('en_tramite', 'En trámite'),
        ('recurso', 'Recurso'),
        ('espera', 'Espera'),
        ('cerrado', 'Cerrado'),
    ]

    TIPO_CARPETA_CHOICES = [
        ('expediente', 'Expediente Judicial'),
        ('asesoria', 'Asesoría'),
        ('presupuesto', 'Presupuesto'),
        ('proyecto', 'Proyecto'),
        ('otro', 'Otro'),
    ]

    numero_expediente = models.CharField(max_length=50, unique=True)
    caratula = models.CharField(max_length=200)
    
    # Propietario (dueño de la carpeta)
    propietario = models.ForeignKey(
        User, 
        on_delete=models.PROTECT, 
        related_name='carpetas_propias'
    )
    
    # Persona asociada (cliente/contraparte)
    persona = models.ForeignKey(
        Persona, 
        on_delete=models.PROTECT, 
        related_name='carpetas'
    )
    
    # 👥 COMPARTIR - con through_fields para evitar ambigüedad
    compartida_con = models.ManyToManyField(
        User,
        through='CompartirCarpeta',
        through_fields=('carpeta', 'usuario'),  # Especificamos los campos
        related_name='carpetas_compartidas',
        blank=True,
        help_text="Usuarios con quienes se compartió esta carpeta"
    )
    
    es_publico = models.BooleanField(
        default=False,
        help_text="Si está marcado, TODOS los usuarios pueden verla"
    )
    
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='en_tramite')
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    juzgado = models.CharField(max_length=100, blank=True)
    jurisdiccion = models.CharField(max_length=100, blank=True)
    materia = models.CharField(max_length=100, blank=True)
    descripcion = models.TextField(blank=True)
    ultima_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)
    
    tipo_carpeta = models.CharField(
        max_length=50,
        default='expediente',
        choices=TIPO_CARPETA_CHOICES
    )

    class Meta:
        verbose_name = "Carpeta"
        verbose_name_plural = "Carpetas"
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['numero_expediente']),
            models.Index(fields=['estado']),
            models.Index(fields=['persona']),
        ]
        permissions = [
            ("ver_carpeta", "Puede ver carpetas"),
            ("crear_carpeta", "Puede crear carpetas"),
            ("editar_carpeta", "Puede editar carpetas"),
            ("eliminar_carpeta", "Puede eliminar carpetas"),
            ("compartir_carpeta", "Puede compartir carpetas con otros usuarios"),
        ]

    def __str__(self):
        return f"{self.numero_expediente} - {self.caratula}"


class CompartirCarpeta(models.Model):
    carpeta = models.ForeignKey(Carpeta, on_delete=models.CASCADE, related_name='compartidos')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='carpetas_recibidas')
    compartido_por = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='carpetas_compartidas_por'
    )
    fecha_compartido = models.DateTimeField(auto_now_add=True)
    puede_editar = models.BooleanField(default=False)
    es_responsable = models.BooleanField(default=False)

    class Meta:
        unique_together = ['carpeta', 'usuario']
        verbose_name = "Compartir Carpeta"
        verbose_name_plural = "Compartir Carpetas"

    def __str__(self):
        return f"{self.carpeta} → {self.usuario}"
