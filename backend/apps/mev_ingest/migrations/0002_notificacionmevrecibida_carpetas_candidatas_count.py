from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mev_ingest', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificacionmevrecibida',
            name='carpetas_candidatas_count',
            field=models.PositiveSmallIntegerField(default=0, help_text='Cantidad de carpetas que coincidieron por número de expediente cuando quedó en sin_match (0 o 1 no es ambigüedad real, >1 sí).'),
        ),
    ]
