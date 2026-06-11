from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0014_historial_estado_mev'),
    ]

    operations = [
        migrations.AddField(
            model_name='carpeta',
            name='mev_primera_sync',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Primera sincronización MEV'),
        ),
    ]
