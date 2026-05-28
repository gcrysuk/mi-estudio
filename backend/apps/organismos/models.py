from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Materia(models.Model):
    nombre = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(default=0)
    propietario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='materias',
    )

    class Meta:
        ordering = ['orden', 'nombre']
        unique_together = [['nombre', 'propietario']]
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
        related_name='organismos',
    )
    activo = models.BooleanField(default=True)
    propietario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='organismos',
    )

    class Meta:
        ordering = ['nombre']
        verbose_name = "Organismo"
        verbose_name_plural = "Organismos"

    def __str__(self):
        return self.nombre
