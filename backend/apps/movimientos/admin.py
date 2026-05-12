from django.contrib import admin
from .models import Movimiento, TipoMovimiento, EstadoMovimiento

@admin.register(TipoMovimiento)
class TipoMovimientoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'orden', 'activo']
    list_editable = ['orden', 'activo']
    search_fields = ['nombre']
    ordering = ['orden']

@admin.register(EstadoMovimiento)
class EstadoMovimientoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'color', 'orden', 'activo']
    list_editable = ['orden', 'activo']
    search_fields = ['nombre']
    ordering = ['orden']

@admin.register(Movimiento)
class MovimientoAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'carpeta',
        'titulo',
        'tipo',
        'estado',  # Cambiado de tipo_acto a estado
        'fecha_movimiento',
        'vencido',
        'creado_por'
    ]
    
    list_filter = [
        'tipo',
        'estado',  # Cambiado de tipo_acto a estado
        'vencido',
        'activo'
    ]
    
    readonly_fields = [
        'fecha_creacion',
        'ultima_actualizacion',
        'creado_por'
    ]
    
    search_fields = ['titulo', 'descripcion']
    autocomplete_fields = ['carpeta', 'tipo', 'estado']
    raw_id_fields = ['carpeta']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('carpeta', 'titulo', 'descripcion')
        }),
        ('Clasificación', {
            'fields': ('tipo', 'estado')
        }),
        ('Fechas', {
            'fields': ('fecha_movimiento', 'fecha_notificacion', 'fecha_vencimiento')
        }),
        ('Tiempo de Trabajo', {
            'fields': ('tiempo_trabajo',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('creado_por', 'fecha_creacion', 'ultima_actualizacion', 'activo', 'vencido'),
            'classes': ('collapse',)
        })
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        super().save_model(request, obj, form, change)
