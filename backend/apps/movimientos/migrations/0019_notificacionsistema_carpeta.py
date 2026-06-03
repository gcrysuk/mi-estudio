from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0001_initial'),
        ('movimientos', '0018_notificacionsistema_mev_cambio_estado'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificacionsistema',
            name='carpeta',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='notificaciones_sistema',
                to='carpetas.carpeta',
            ),
        ),
    ]
