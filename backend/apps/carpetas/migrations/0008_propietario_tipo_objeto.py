from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def mark_global(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0007_seed_estados_carpeta_obligatorios'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # TipoCarpeta: remove unique, add propietario, compound unique
        migrations.AlterField(
            model_name='tipocarpeta',
            name='nombre',
            field=models.CharField(max_length=50),
        ),
        migrations.AddField(
            model_name='tipocarpeta',
            name='propietario',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='tipos_carpeta',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterUniqueTogether(
            name='tipocarpeta',
            unique_together={('nombre', 'propietario')},
        ),
        # ObjetoCarpeta: remove unique, add propietario, compound unique
        migrations.AlterField(
            model_name='objetocarpeta',
            name='nombre',
            field=models.CharField(max_length=100),
        ),
        migrations.AddField(
            model_name='objetocarpeta',
            name='propietario',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='objetos_carpeta',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterUniqueTogether(
            name='objetocarpeta',
            unique_together={('nombre', 'propietario')},
        ),
        migrations.RunPython(mark_global, migrations.RunPython.noop),
    ]
