from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0005_participantecarpeta'),
    ]

    operations = [
        migrations.AddField(
            model_name='estadocarpeta',
            name='es_obligatorio',
            field=models.BooleanField(default=False),
        ),
    ]
