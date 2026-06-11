from django.db import migrations


def backfill_mev_primera_sync(apps, schema_editor):
    Carpeta = apps.get_model('carpetas', 'Carpeta')
    Movimiento = apps.get_model('movimientos', 'Movimiento')

    carpetas = Carpeta.objects.filter(
        mev_primera_sync__isnull=True,
        mev_url__isnull=False,
    ).exclude(mev_url='')

    for carpeta in carpetas:
        mov = (
            Movimiento.objects
            .filter(carpeta=carpeta, tipo__nombre='MEV')
            .order_by('fecha_movimiento')
            .values('fecha_movimiento')
            .first()
        )
        if mov:
            carpeta.mev_primera_sync = mov['fecha_movimiento']
        elif carpeta.mev_ultimo_sync:
            carpeta.mev_primera_sync = carpeta.mev_ultimo_sync
        else:
            continue
        carpeta.save(update_fields=['mev_primera_sync'])


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0015_carpeta_mev_primera_sync'),
        ('movimientos', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(backfill_mev_primera_sync, migrations.RunPython.noop),
    ]
