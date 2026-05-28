from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0008_propietario_tipo_objeto'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CarpetaInicializada',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateTimeField(auto_now_add=True)),
                ('carpeta', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='inicializadas',
                    to='carpetas.carpeta',
                )),
                ('usuario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='carpetas_inicializadas',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'unique_together': {('carpeta', 'usuario')},
            },
        ),
    ]
