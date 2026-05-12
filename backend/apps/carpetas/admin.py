from django.contrib import admin
from .models import Carpeta, CompartirCarpeta, EstadoCarpeta, TipoCarpeta, ObjetoCarpeta

@admin.register(EstadoCarpeta)
class EstadoCarpetaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'color', 'orden', 'activo']
    list_editable = ['orden', 'activo']
    list_filter = ['activo']
    search_fields = ['nombre']

@admin.register(TipoCarpeta)
class TipoCarpetaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'orden', 'activo']
    list_editable = ['orden', 'activo']
    list_filter = ['activo']
    search_fields = ['nombre']

@admin.register(ObjetoCarpeta)
class ObjetoCarpetaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'orden', 'activo']
    list_editable = ['orden', 'activo']
    list_filter = ['activo']
    search_fields = ['nombre']

@admin.register(Carpeta)
class CarpetaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'numero_expediente', 'persona', 'estado', 'tipo', 'activo']
    list_filter = ['estado', 'tipo', 'activo']
    search_fields = ['nombre', 'numero_expediente']
    readonly_fields = ['fecha_inicio', 'ultima_actualizacion']
    autocomplete_fields = ['persona', 'propietario', 'estado', 'tipo', 'objeto', 'organismo']
    
    fieldsets = (
        ('Información básica', {
            'fields': ('nombre', 'numero_expediente', 'persona', 'contraparte', 'parte')
        }),
        ('Clasificación', {
            'fields': ('estado', 'tipo', 'objeto', 'organismo')
        }),
        ('Descripción', {
            'fields': ('descripcion',)
        }),
        ('Fechas', {
            'fields': ('fecha_inicio', 'fecha_cierre', 'ultima_actualizacion')
        }),
        ('Propietario', {
            'fields': ('propietario', 'activo')
        }),
    )

@admin.register(CompartirCarpeta)
class CompartirCarpetaAdmin(admin.ModelAdmin):
    list_display = ['carpeta', 'usuario', 'compartido_por', 'fecha_compartido', 'puede_editar']
    list_filter = ['puede_editar']
    search_fields = ['carpeta__nombre', 'usuario__username']
