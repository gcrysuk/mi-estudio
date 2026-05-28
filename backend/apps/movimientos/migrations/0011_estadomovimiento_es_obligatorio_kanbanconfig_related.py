from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0010_kanbanconfig'),
    ]

    operations = [
        migrations.AddField(
            model_name='estadomovimiento',
            name='es_obligatorio',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='kanbanconfig',
            name='estados_visibles',
            field=models.ManyToManyField(
                blank=True,
                related_name='kanban_configs',
                to='movimientos.estadomovimiento',
            ),
        ),
    ]
