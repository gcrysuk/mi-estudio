from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0015_notificacionsistema'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='notificacionsistema',
            name='actor',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='notificaciones_generadas',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='notificacionsistema',
            name='movimiento',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='notificaciones_sistema',
                to='movimientos.movimiento',
            ),
        ),
        migrations.AlterField(
            model_name='notificacionsistema',
            name='tipo',
            field=models.CharField(
                choices=[
                    ('asignacion', 'Asignación de movimiento'),
                    ('cambio_estado', 'Cambio de estado'),
                    ('carpeta_compartida', 'Carpeta compartida'),
                ],
                max_length=20,
            ),
        ),
    ]
