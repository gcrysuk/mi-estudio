from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0016_notificacionsistema_actor_carpeta_compartida'),
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
                ],
                max_length=20,
            ),
        ),
    ]
