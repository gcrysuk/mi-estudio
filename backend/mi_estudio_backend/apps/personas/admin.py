# apps/personas/admin.py
from django.contrib import admin
from .models import Persona

@admin.register(Persona)
class PersonaAdmin(admin.ModelAdmin):
    list_display = ['apellido', 'nombre', 'tipo_persona', 'tipo_documento', 'numero_documento', 'email', 'propietario', 'activo', 'es_publico']
    list_filter = ['tipo_persona', 'activo', 'provincia', 'es_publico']
    search_fields = ['nombre', 'apellido', 'numero_documento', 'email']
    raw_id_fields = ['propietario']
    
    fieldsets = (
        ('Información personal', {
            'fields': ('nombre', 'apellido', 'tipo_persona')
        }),
        ('Documentación', {
            'fields': ('tipo_documento', 'numero_documento')
        }),
        ('Contacto', {
            'fields': ('email', 'telefono', 'direccion', 'ciudad', 'provincia', 'codigo_postal')
        }),
        ('Privacidad', {
            'fields': ('propietario', 'es_publico', 'activo'),
            'classes': ('collapse',)
        }),
        ('Observaciones', {
            'fields': ('observaciones',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('propietario')
