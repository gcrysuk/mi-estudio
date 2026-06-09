from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0022_alter_notificacionsistema_tipo'),
    ]

    operations = [
        migrations.AddField(
            model_name='movimiento',
            name='complejidad',
            field=models.CharField(
                blank=True,
                choices=[('alto', 'Alto'), ('medio', 'Medio'), ('bajo', 'Bajo')],
                max_length=10,
                null=True,
                verbose_name='Complejidad',
            ),
        ),
    ]
