from django.db import models


class Materia(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(default=0)

    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name = "Materia"
        verbose_name_plural = "Materias"

    def __str__(self):
        return self.nombre


class Organismo(models.Model):
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    jurisdiccion = models.CharField(max_length=100, blank=True)
    direccion = models.CharField(max_length=255, blank=True)
    provincia = models.CharField(max_length=100, blank=True)
    localidad = models.CharField(max_length=100, blank=True)
    materia = models.ForeignKey(
        Materia,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='organismos'
    )
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = "Organismo"
        verbose_name_plural = "Organismos"

    def __str__(self):
        return self.nombre
