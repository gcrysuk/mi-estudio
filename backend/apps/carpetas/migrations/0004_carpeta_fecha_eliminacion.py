from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0003_update_parte_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='carpeta',
            name='fecha_eliminacion',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
