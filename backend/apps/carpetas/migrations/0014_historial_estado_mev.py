from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0013_backfill_mev_fecha_estado'),
    ]

    operations = [
        migrations.CreateModel(
            name='HistorialEstadoMEV',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('estado_anterior', models.CharField(blank=True, max_length=100, null=True)),
                ('estado_nuevo', models.CharField(max_length=100)),
                ('fecha_cambio', models.DateTimeField(default=django.utils.timezone.now)),
                ('carpeta', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='historial_estado_mev', to='carpetas.carpeta')),
            ],
            options={
                'verbose_name': 'Historial Estado MEV',
                'ordering': ['-fecha_cambio'],
            },
        ),
    ]
