from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def mark_global(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0012_seed_estados_obligatorios'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='tipomovimiento',
            name='nombre',
            field=models.CharField(max_length=50),
        ),
        migrations.AddField(
            model_name='tipomovimiento',
            name='propietario',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='tipos_movimiento',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterUniqueTogether(
            name='tipomovimiento',
            unique_together={('nombre', 'propietario')},
        ),
        migrations.RunPython(mark_global, migrations.RunPython.noop),
    ]
