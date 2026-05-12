from django.db import models

class Organismo(models.Model):
    MATERIA_CHOICES = [
        ('civil_comercial', 'Civil y Comercial'),
        ('laboral', 'Laboral'),
        ('familia', 'Familia'),
        ('penal', 'Penal'),
    ]

    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    jurisdiccion = models.CharField(max_length=100, blank=True)
    direccion = models.CharField(max_length=255, blank=True)
    provincia = models.CharField(max_length=100, blank=True)
    localidad = models.CharField(max_length=100, blank=True)
    materia = models.CharField(max_length=50, choices=MATERIA_CHOICES, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = "Organismo"
        verbose_name_plural = "Organismos"

    def __str__(self):
        return self.nombre
