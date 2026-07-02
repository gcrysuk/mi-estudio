from django.contrib import admin
from .models import NotificacionMEVRecibida


@admin.register(NotificacionMEVRecibida)
class NotificacionMEVRecibidaAdmin(admin.ModelAdmin):
    list_display = (
        'nro_causa', 'caratula', 'estado', 'estado_procesamiento',
        'destinatario', 'usuario', 'carpeta', 'fecha_recepcion',
    )
    list_filter = ('estado_procesamiento',)
    search_fields = ('nro_causa', 'caratula', 'message_id', 'destinatario')
