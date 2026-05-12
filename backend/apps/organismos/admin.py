from django.contrib import admin
from .models import Organismo

@admin.register(Organismo)
class OrganismoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'jurisdiccion', 'activo']
    list_filter = ['activo']
    search_fields = ['nombre']
