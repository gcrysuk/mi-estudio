from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.db import migrations


def backfill_suscripciones(apps, schema_editor):
    User = apps.get_model(settings.AUTH_USER_MODEL)
    Suscripcion = apps.get_model('billing', 'Suscripcion')
    precio = getattr(settings, 'PRECIO_MENSUAL', Decimal('28000'))

    usuarios_sin_suscripcion = User.objects.exclude(
        pk__in=Suscripcion.objects.values_list('usuario_id', flat=True)
    )
    for usuario in usuarios_sin_suscripcion:
        Suscripcion.objects.create(
            usuario=usuario,
            estado='trial',
            trial_hasta=date.today() + timedelta(days=90),
            monto_mensual=precio,
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(backfill_suscripciones, noop),
    ]
