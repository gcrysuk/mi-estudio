from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0023_movimiento_complejidad'),
    ]

    operations = [
        migrations.AddField(
            model_name='movimiento',
            name='fecha_completado',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Fecha de completado'),
        ),
    ]
