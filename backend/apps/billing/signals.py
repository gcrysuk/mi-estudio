from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def crear_suscripcion_inicial(sender, instance, created, **kwargs):
    if not created:
        return
    from .models import Suscripcion
    Suscripcion.objects.create(
        usuario=instance,
        estado='trial',
        trial_hasta=date.today() + timedelta(days=90),
        monto_mensual=getattr(settings, 'PRECIO_MENSUAL', Decimal('28000')),
    )
