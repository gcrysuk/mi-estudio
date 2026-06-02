# apps/usuarios/models.py
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class PerfilUsuario(models.Model):
    CONDICION_FISCAL_CHOICES = [
        ('monotributista', 'Monotributista'),
        ('responsable_inscripto', 'Responsable Inscripto'),
        ('exento', 'Exento'),
        ('consumidor_final', 'Consumidor Final'),
    ]
    
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    # Datos personales
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=50, blank=True)
    
    # Datos profesionales
    colegio_abogados = models.CharField(max_length=200, blank=True)
    matricula_tomo = models.CharField(max_length=50, blank=True, verbose_name="Tomo")
    matricula_folio = models.CharField(max_length=50, blank=True, verbose_name="Folio")
    matricula_numero = models.CharField(max_length=50, blank=True, verbose_name="Número de matrícula")
    numero_jubilacion = models.CharField(max_length=50, blank=True)
    
    # Datos fiscales
    cuil_cuit = models.CharField(max_length=20, blank=True)
    condicion_fiscal = models.CharField(max_length=30, choices=CONDICION_FISCAL_CHOICES, default='monotributista')
    
    # Domicilios
    domicilio_real = models.TextField(blank=True)
    domicilio_electronico = models.EmailField(blank=True)
    
    # Configuración
    firma_digital = models.FileField(upload_to='firmas/', blank=True, null=True)
    notificaciones_email = models.BooleanField(default=True)

    # Cuenta / acceso
    username_display = models.CharField(
        max_length=50, unique=True, blank=True, null=True,
        verbose_name="Nombre de usuario",
    )
    PLAN_CHOICES = [('free', 'Free'), ('pro', 'Pro'), ('enterprise', 'Enterprise')]
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    fecha_inicio_plan = models.DateTimeField(null=True, blank=True)
    fecha_fin_plan = models.DateTimeField(null=True, blank=True)

    # Verificación de email
    email_verificado = models.BooleanField(default=False)
    token_verificacion = models.CharField(max_length=64, blank=True)
    fecha_token = models.DateTimeField(null=True, blank=True)

    # Integración MEV (Mesa de Entradas Virtual - SCBA)
    mev_usuario = models.CharField(max_length=100, blank=True)
    mev_clave = models.TextField(blank=True, help_text="Clave encriptada con Fernet")
    mev_depto = models.CharField(max_length=100, blank=True)

    # Estado y auditoría
    activo = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    ultimo_acceso = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Perfil de Usuario"
        verbose_name_plural = "Perfiles de Usuario"
    
    def __str__(self):
        return f"{self.apellido}, {self.nombre}"

# Signal para crear perfil automáticamente al crear usuario
@receiver(post_save, sender=User)
def crear_perfil_usuario(sender, instance, created, **kwargs):
    if created:
        PerfilUsuario.objects.create(
            usuario=instance,
            nombre=instance.first_name,
            apellido=instance.last_name
        )
