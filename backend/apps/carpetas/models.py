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
    es_obligatorio = models.BooleanField(default=False)

    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name = "Estado de Carpeta"
    
    def __str__(self):
        return self.nombre


class TipoCarpeta(models.Model):
    """Modelo configurable para tipos de carpeta"""
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField(blank=True)
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    propietario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tipos_carpeta',
    )

    class Meta:
        ordering = ['orden', 'nombre']
        unique_together = [['nombre', 'propietario']]
        verbose_name = "Tipo de Carpeta"

    def __str__(self):
        return self.nombre


class ObjetoCarpeta(models.Model):
    """Modelo configurable para objetos/materias"""
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    propietario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='objetos_carpeta',
    )

    class Meta:
        ordering = ['orden', 'nombre']
        unique_together = [['nombre', 'propietario']]
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

    # Integración MEV (Mesa de Entradas Virtual - SCBA)
    mev_url = models.URLField(max_length=500, blank=True, help_text="URL del expediente en la MEV")
    mev_ultimo_sync = models.DateTimeField(null=True, blank=True)
    mev_estado = models.CharField(max_length=100, blank=True, default='', verbose_name="Estado en MEV")

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


class ParticipanteCarpeta(models.Model):
    TIPO_CHOICES = [
        ('cliente', 'Cliente/Parte'),
        ('contraparte', 'Contraparte'),
    ]
    carpeta = models.ForeignKey(
        Carpeta, on_delete=models.CASCADE,
        related_name='participantes'
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    persona = models.ForeignKey(
        'personas.Persona', on_delete=models.PROTECT,
        null=True, blank=True
    )
    nombre_manual = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['tipo', 'id']

    def __str__(self):
        if self.persona:
            return f"{self.persona} ({self.get_tipo_display()})"
        return f"{self.nombre_manual} ({self.get_tipo_display()})"


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


class CarpetaInicializada(models.Model):
    carpeta = models.ForeignKey(Carpeta, on_delete=models.CASCADE, related_name='inicializadas')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='carpetas_inicializadas')
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['carpeta', 'usuario']]

    def __str__(self):
        return f"{self.carpeta} init para {self.usuario}"
