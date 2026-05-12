from django.contrib import admin
from django.contrib import messages
from django.shortcuts import render, redirect
from django.urls import path
from django.contrib.auth import get_user_model
from .models import Carpeta, CompartirCarpeta

User = get_user_model()

class CompartirCarpetaInline(admin.TabularInline):
    model = CompartirCarpeta
    fk_name = 'carpeta'
    extra = 0
    raw_id_fields = ['usuario', 'compartido_por']
    fields = ['usuario', 'puede_editar', 'fecha_compartido']
    readonly_fields = ['fecha_compartido']

@admin.register(Carpeta)
class CarpetaAdmin(admin.ModelAdmin):
    list_display = ['numero_expediente', 'caratula', 'persona', 'propietario', 'estado', 'fecha_inicio']
    list_filter = ['estado', 'activo', 'tipo_carpeta']
    search_fields = ['numero_expediente', 'caratula', 'persona__nombre', 'persona__apellido']
    raw_id_fields = ['persona', 'propietario']
    inlines = [CompartirCarpetaInline]
    actions = ['compartir_seleccionadas']  # Acción masiva
    
    fieldsets = (
        ('Información básica', {
            'fields': ('numero_expediente', 'caratula', 'tipo_carpeta')
        }),
        ('Relaciones', {
            'fields': ('persona', 'propietario')
        }),
        ('Privacidad', {
            'fields': ('es_publico', 'activo')
        }),
        ('Estado', {
            'fields': ('estado', 'fecha_cierre')
        }),
        ('Datos judiciales', {
            'fields': ('juzgado', 'jurisdiccion', 'materia'),
            'classes': ('collapse',)
        }),
        ('Descripción', {
            'fields': ('descripcion',),
            'classes': ('collapse',)
        }),
    )
    
    def compartir_seleccionadas(self, request, queryset):
        """Acción para compartir múltiples carpetas"""
        if 'compartir' in request.POST:
            usuario_id = request.POST.get('usuario_id')
            puede_editar = request.POST.get('puede_editar') == 'on'
            
            try:
                usuario = User.objects.get(id=usuario_id)
                contador = 0
                for carpeta in queryset:
                    CompartirCarpeta.objects.get_or_create(
                        carpeta=carpeta,
                        usuario=usuario,
                        defaults={
                            'compartido_por': request.user,
                            'puede_editar': puede_editar
                        }
                    )
                    contador += 1
                
                self.message_user(
                    request, 
                    f"{contador} carpetas compartidas con {usuario.username}",
                    messages.SUCCESS
                )
                return redirect(request.get_full_path())
                
            except User.DoesNotExist:
                self.message_user(request, "Usuario no encontrado", messages.ERROR)
        
        # Mostrar formulario para seleccionar usuario
        from django.contrib.auth.models import User
        usuarios = User.objects.exclude(id=request.user.id).exclude(is_superuser=True)
        
        return render(
            request,
            'admin/compartir_carpetas.html',
            {
                'carpetas': queryset,
                'usuarios': usuarios,
                'title': 'Compartir carpetas seleccionadas'
            }
        )
    
    compartir_seleccionadas.short_description = "Compartir carpetas seleccionadas con un usuario"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('persona', 'propietario')
