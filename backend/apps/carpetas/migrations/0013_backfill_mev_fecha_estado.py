from django.db import migrations


def backfill(apps, schema_editor):
    Carpeta = apps.get_model('carpetas', 'Carpeta')
    carpetas = Carpeta.objects.filter(
        mev_estado__gt='',
        mev_fecha_estado__isnull=True,
        mev_ultimo_sync__isnull=False,
    )
    for carpeta in carpetas:
        carpeta.mev_fecha_estado = carpeta.mev_ultimo_sync
        carpeta.save(update_fields=['mev_fecha_estado'])


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0012_carpeta_mev_fecha_estado'),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
