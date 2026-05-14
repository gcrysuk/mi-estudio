from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('personas', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='persona',
            name='tipo_persona',
        ),
        migrations.DeleteModel(
            name='TipoPersona',
        ),
        migrations.AddField(
            model_name='persona',
            name='tipo_persona',
            field=models.CharField(
                blank=True,
                choices=[
                    ('fisica', 'Persona Física'),
                    ('juridica', 'Persona Jurídica'),
                    ('otro', 'Otro'),
                ],
                default='',
                max_length=20,
            ),
        ),
    ]
