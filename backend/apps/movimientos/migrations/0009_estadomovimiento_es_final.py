from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0008_notificacionmovimiento'),
    ]

    operations = [
        migrations.AddField(
            model_name='estadomovimiento',
            name='es_final',
            field=models.BooleanField(default=False),
        ),
    ]
