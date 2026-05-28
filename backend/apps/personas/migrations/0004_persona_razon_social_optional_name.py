from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('personas', '0003_persona_fecha_eliminacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='persona',
            name='razon_social',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AlterField(
            model_name='persona',
            name='nombre',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='persona',
            name='apellido',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
