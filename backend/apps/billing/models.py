from django.conf import settings
from django.db import models


class Suscripcion(models.Model):
    ESTADOS = [
        ('trial', 'Trial'),
        ('activo', 'Activo'),
        ('moroso', 'Moroso'),
        ('suspendido', 'Suspendido'),
        ('cancelado', 'Cancelado'),
    ]
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='suscripcion'
    )
    estado = models.CharField(max_length=20, choices=ESTADOS, default='trial')
    trial_hasta = models.DateField()
    mp_preapproval_id = models.CharField(max_length=100, blank=True)
    mp_payer_email = models.EmailField(blank=True)
    proximo_cobro = models.DateField(null=True, blank=True)
    ultimo_cobro = models.DateField(null=True, blank=True)
    monto_mensual = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def esta_en_periodo_activo(self):
        from django.utils import timezone
        hoy = timezone.now().date()
        if self.estado == 'trial':
            return hoy <= self.trial_hasta
        return self.estado == 'activo'

    def __str__(self):
        return f"{self.usuario.username} - {self.estado}"


class PagoHistorial(models.Model):
    ESTADOS = [
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
        ('pendiente', 'Pendiente'),
    ]
    suscripcion = models.ForeignKey(
        Suscripcion,
        on_delete=models.CASCADE,
        related_name='pagos'
    )
    mp_payment_id = models.CharField(max_length=100, unique=True)
    estado = models.CharField(max_length=20, choices=ESTADOS)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    fecha = models.DateTimeField()
    afip_cae = models.CharField(max_length=50, blank=True)
    afip_cae_vto = models.DateField(null=True, blank=True)
    factura_numero = models.CharField(max_length=20, blank=True)
    factura_pdf_url = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"Pago {self.mp_payment_id} - {self.estado}"


class DatosFacturacion(models.Model):
    CONDICIONES_IVA = [
        ('RI', 'Responsable Inscripto'),
        ('monotributo', 'Monotributista'),
        ('consumidor_final', 'Consumidor Final'),
        ('exento', 'Exento'),
    ]
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='datos_facturacion'
    )
    razon_social = models.CharField(max_length=200)
    cuit = models.CharField(max_length=13, blank=True)
    condicion_iva = models.CharField(
        max_length=20,
        choices=CONDICIONES_IVA,
        default='consumidor_final'
    )
    domicilio = models.CharField(max_length=300, blank=True)
    email_facturacion = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.razon_social} ({self.cuit})"
