from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0009_estadomovimiento_es_final'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='KanbanConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('orden_columnas', models.JSONField(default=list)),
                ('usuario', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='kanban_config',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('estados_visibles', models.ManyToManyField(
                    blank=True,
                    to='movimientos.estadomovimiento',
                )),
            ],
            options={
                'verbose_name': 'Configuración Kanban',
            },
        ),
    ]
