from django.contrib import admin
from .models import Persona

@admin.register(Persona)
class PersonaAdmin(admin.ModelAdmin):
    list_display = ['apellido', 'nombre', 'tipo_documento', 'numero_documento',
                    'tipo_persona', 'email', 'propietario', 'activo']
    list_filter = ['activo', 'tipo_persona', 'tipo_documento']
    search_fields = ['apellido', 'nombre', 'numero_documento', 'email']
    list_editable = ['activo']
    readonly_fields = ['fecha_registro']

    fieldsets = (
        ('Información personal', {
            'fields': ('nombre', 'apellido', 'tipo_persona')
        }),
        ('Documento', {
            'fields': ('tipo_documento', 'numero_documento')
        }),
        ('Contacto', {
            'fields': ('email', 'telefono', 'direccion', 'ciudad', 'provincia')
        }),
        ('Privacidad', {
            'fields': ('propietario', 'activo'),
        }),
        ('Fechas', {
            'fields': ('fecha_registro',),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('propietario')
