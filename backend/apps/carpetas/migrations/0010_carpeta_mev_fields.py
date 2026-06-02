from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0009_carpetainicializada'),
    ]

    operations = [
        migrations.AddField(
            model_name='carpeta',
            name='mev_url',
            field=models.URLField(blank=True, help_text='URL del expediente en la MEV', max_length=500),
        ),
        migrations.AddField(
            model_name='carpeta',
            name='mev_ultimo_sync',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
