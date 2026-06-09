from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0003_perfilusuario_mev_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='perfilusuario',
            name='notificacion_config',
            field=models.JSONField(
                blank=True,
                default=dict,
                verbose_name='Configuración de notificaciones',
            ),
        ),
    ]
