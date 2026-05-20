import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0007_movimiento_fecha_eliminacion'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificacionMovimiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateTimeField()),
                ('leida', models.BooleanField(default=False)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('movimiento', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notificaciones',
                    to='movimientos.movimiento',
                )),
            ],
            options={
                'verbose_name': 'Notificación de Movimiento',
                'ordering': ['fecha'],
            },
        ),
    ]
