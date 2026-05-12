# apps/movimientos/admin.py
from django.contrib import admin
from .models import TipoMovimiento, Movimiento, Organismo

@admin.register(TipoMovimiento)
class TipoMovimientoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'color', 'icono', 'requiere_vencimiento', 'dias_aviso', 'activo', 'orden']
    list_filter = ['activo', 'requiere_vencimiento']
    search_fields = ['nombre', 'descripcion']
    list_editable = ['orden', 'activo']
    
    fieldsets = (
        ('Información básica', {
            'fields': ('nombre', 'descripcion', 'activo')
        }),
        ('Personalización visual', {
            'fields': ('color', 'icono', 'orden'),
        }),
        ('Comportamiento', {
            'fields': ('requiere_vencimiento', 'dias_aviso'),
        }),
    )

@admin.register(Movimiento)
class MovimientoAdmin(admin.ModelAdmin):
    def get_responsable(self, obj):
        return obj.responsable.username if obj.responsable else '-'
    get_responsable.short_description = 'Responsable'
    
    list_display = ['carpeta', 'fecha', 'tipo', 'titulo', 'estado', 'get_responsable', 'vencimiento']
    list_filter = ['tipo', 'estado', 'notificado', 'organismo']
    search_fields = ['carpeta__numero_expediente', 'carpeta__caratula', 'titulo', 'descripcion']
    raw_id_fields = ['carpeta', 'responsable', 'organismo']  # Cambiado usuario → responsable
    autocomplete_fields = ['carpeta', 'responsable', 'organismo']  # Cambiado usuario → responsable
    date_hierarchy = 'fecha'
    list_editable = ['estado']
    
    fieldsets = (
        ('Información básica', {
            'fields': ('carpeta', 'fecha', 'tipo', 'titulo', 'descripcion')
        }),
        ('Estado y seguimiento', {
            'fields': ('estado', 'vencimiento', 'notificado', 'fecha_notificacion')
        }),
        ('Responsable', {
            'fields': ('responsable', 'tiempo_trabajo')  # Cambiado usuario → responsable
        }),
        ('Organismo', {
            'fields': ('organismo',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('carpeta', 'tipo', 'responsable', 'organismo')

@admin.register(Organismo)
class OrganismoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'juez', 'secretaria', 'telefono', 'email', 'activo']
    list_filter = ['activo', 'provincia']
    search_fields = ['nombre', 'juez', 'secretaria']
    fieldsets = (
        ('Información básica', {
            'fields': ('nombre', 'activo')
        }),
        ('Ubicación', {
            'fields': ('domicilio', 'localidad', 'provincia'),
            'classes': ('collapse',)
        }),
        ('Autoridades', {
            'fields': ('juez', 'secretaria'),
            'classes': ('collapse',)
        }),
        ('Contacto', {
            'fields': ('telefono', 'email'),
            'classes': ('collapse',)
        }),
        ('Observaciones', {
            'fields': ('observaciones',),
            'classes': ('collapse',)
        }),
    )
