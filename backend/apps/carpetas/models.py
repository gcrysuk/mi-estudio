# apps/carpetas/models.py
from django.db import models
from django.contrib.auth import get_user_model
from apps.personas.models import Persona
from apps.organismos.models import Organismo

User = get_user_model()

class EstadoCarpeta(models.Model):
    """Modelo configurable para estados de carpeta"""
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#4FC3F7', help_text='Color en HEX')
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name = "Estado de Carpeta"
    
    def __str__(self):
        return self.nombre


class TipoCarpeta(models.Model):
    """Modelo configurable para tipos de carpeta"""
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name = "Tipo de Carpeta"
    
    def __str__(self):
        return self.nombre


class ObjetoCarpeta(models.Model):
    """Modelo configurable para objetos/materias"""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name = "Objeto de Carpeta"
    
    def __str__(self):
        return self.nombre


class Carpeta(models.Model):
    PARTE_CHOICES = [
        ('actor', 'Actor'),
        ('demandado', 'Demandado'),
        ('otro', 'Otro'),
    ]

    nombre = models.CharField(max_length=200, help_text="Nombre de la carpeta")
    caratula_generada = models.BooleanField(default=False, help_text="Si se generó automáticamente")
    
    # Propietario
    propietario = models.ForeignKey(
        User, 
        on_delete=models.PROTECT, 
        related_name='carpetas_propias'
    )
    
    # Persona asociada (principal)
    persona = models.ForeignKey(
        Persona, 
        on_delete=models.PROTECT, 
        related_name='carpetas',
        null=True,
        blank=True
    )
    
    # Parte (cliente/contraparte/otro)
    parte = models.CharField(max_length=20, choices=PARTE_CHOICES, default='actor')
    
    # Contraparte (texto libre por ahora, luego podría ser otra persona)
    contraparte = models.CharField(max_length=200, blank=True)
    
    # Campos configurables
    estado = models.ForeignKey(
        EstadoCarpeta,
        on_delete=models.PROTECT,
        related_name='carpetas',
        null=True,
        blank=True
    )
    tipo = models.ForeignKey(
        TipoCarpeta,
        on_delete=models.PROTECT,
        related_name='carpetas',
        null=True,
        blank=True
    )
    objeto = models.ForeignKey(
        ObjetoCarpeta,
        on_delete=models.PROTECT,
        related_name='carpetas',
        null=True,
        blank=True
    )
    
    # Organismo
    organismo = models.ForeignKey(
        Organismo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Datos adicionales
    numero_expediente = models.CharField(max_length=50, blank=True)
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    descripcion = models.TextField(blank=True)
    
    # Compartir
    compartida_con = models.ManyToManyField(
        User,
        through='CompartirCarpeta',
        through_fields=('carpeta', 'usuario'),
        related_name='carpetas_compartidas',
        blank=True
    )
    
    es_publico = models.BooleanField(default=False, help_text="Visible para todos los usuarios autenticados")
    activo = models.BooleanField(default=True)
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)
    ultima_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Carpeta"
        verbose_name_plural = "Carpetas"
        ordering = ['-fecha_inicio']

    def __str__(self):
        return self.nombre
    
    def generar_caratula(self):
        """Genera carátula automática si no existe"""
        partes = []
        if self.persona:
            partes.append(str(self.persona))
        if self.contraparte:
            partes.append(f"c/ {self.contraparte}")
        if self.objeto:
            partes.append(f"s/ {self.objeto.nombre}")
        
        if partes:
            return " ".join(partes)
        return self.nombre


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

    class Meta:
        unique_together = ['carpeta', 'usuario']

    def __str__(self):
        return f"{self.carpeta} → {self.usuario}"
