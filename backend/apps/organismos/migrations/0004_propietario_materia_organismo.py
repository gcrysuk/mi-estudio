from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def mark_global(apps, schema_editor):
    # Existing records get propietario=NULL (global) automatically via null=True.
    # This RunPython makes the intent explicit.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('organismos', '0003_materia_alter_organismo_materia'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Materia: remove unique on nombre
        migrations.AlterField(
            model_name='materia',
            name='nombre',
            field=models.CharField(max_length=100),
        ),
        # Materia: add propietario
        migrations.AddField(
            model_name='materia',
            name='propietario',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='materias',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Materia: compound unique
        migrations.AlterUniqueTogether(
            name='materia',
            unique_together={('nombre', 'propietario')},
        ),
        # Organismo: add propietario
        migrations.AddField(
            model_name='organismo',
            name='propietario',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='organismos',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(mark_global, migrations.RunPython.noop),
    ]
