from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0020_movimiento_modificado_por'),
    ]

    operations = [
        migrations.AddField(
            model_name='movimiento',
            name='transcripcion',
            field=models.TextField(blank=True, default='', verbose_name='Transcripción original'),
        ),
    ]
