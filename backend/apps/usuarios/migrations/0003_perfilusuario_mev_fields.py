from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0002_perfilusuario_nuevos_campos'),
    ]

    operations = [
        migrations.AddField(
            model_name='perfilusuario',
            name='mev_usuario',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='mev_clave',
            field=models.TextField(blank=True, help_text='Clave encriptada con Fernet'),
        ),
        migrations.AddField(
            model_name='perfilusuario',
            name='mev_depto',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
