from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0011_carpeta_mev_estado'),
    ]

    operations = [
        migrations.AddField(
            model_name='carpeta',
            name='mev_fecha_estado',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Fecha cambio estado MEV'),
        ),
    ]
