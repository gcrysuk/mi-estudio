from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0005_merge_0004'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='perfilusuario',
            name='mev_usuario',
        ),
        migrations.RemoveField(
            model_name='perfilusuario',
            name='mev_clave',
        ),
        migrations.RemoveField(
            model_name='perfilusuario',
            name='mev_depto',
        ),
    ]
