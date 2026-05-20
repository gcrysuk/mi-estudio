from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0006_seed_tipos_estados_movimiento'),
    ]

    operations = [
        migrations.AddField(
            model_name='movimiento',
            name='fecha_eliminacion',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
