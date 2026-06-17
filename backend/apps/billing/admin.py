from django.contrib import admin
from .models import Suscripcion, PagoHistorial, DatosFacturacion

admin.site.register(Suscripcion)
admin.site.register(PagoHistorial)
admin.site.register(DatosFacturacion)
