from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0017_notificacionsistema_mev_tipo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notificacionsistema',
            name='tipo',
            field=models.CharField(
                choices=[
                    ('asignacion', 'Asignación de movimiento'),
                    ('cambio_estado', 'Cambio de estado'),
                    ('carpeta_compartida', 'Carpeta compartida'),
                    ('mev_nuevo_movimiento', 'Nuevo movimiento MEV'),
                    ('mev_cambio_estado', 'Cambio de estado MEV'),
                ],
                max_length=20,
            ),
        ),
    ]
