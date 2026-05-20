from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('personas', '0002_tipopersona_to_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='persona',
            name='fecha_eliminacion',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
