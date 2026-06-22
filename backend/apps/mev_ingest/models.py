from django.db import models


class NotificacionMEVRecibida(models.Model):
    ESTADO_PROCESAMIENTO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('asignado', 'Asignado'),
        ('sin_match', 'Sin match'),
        ('procesado', 'Procesado'),
        ('error', 'Error'),
    ]

    message_id = models.CharField(max_length=255, unique=True)
    remitente = models.CharField(max_length=255, blank=True)
    asunto = models.CharField(max_length=500, blank=True)
    fecha_recepcion = models.DateTimeField()

    organismo = models.CharField(max_length=255, blank=True)
    nro_causa = models.CharField(max_length=50, blank=True)
    caratula = models.CharField(max_length=500, blank=True)
    estado = models.CharField(max_length=100, blank=True)
    descripcion = models.TextField(blank=True)
    fecha_proveido = models.DateTimeField(null=True, blank=True)
    cuerpo_proveido = models.TextField(blank=True)

    carpeta = models.ForeignKey(
        'carpetas.Carpeta',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notificaciones_mev_recibidas',
    )

    estado_procesamiento = models.CharField(
        max_length=20,
        choices=ESTADO_PROCESAMIENTO_CHOICES,
        default='pendiente',
    )
    movimiento_creado = models.ForeignKey(
        'movimientos.Movimiento',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notificaciones_mev_origen',
    )

    carpetas_candidatas_count = models.PositiveSmallIntegerField(
        default=0,
        help_text="Cantidad de carpetas que coincidieron por número de expediente cuando quedó en sin_match (0 o 1 no es ambigüedad real, >1 sí).",
    )

    raw_html = models.TextField(blank=True)
    error_detalle = models.TextField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_recepcion']
        verbose_name = "Notificación MEV Recibida"
        verbose_name_plural = "Notificaciones MEV Recibidas"

    def __str__(self):
        return f"{self.nro_causa} | {self.estado} ({self.estado_procesamiento})"
