from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0010_carpeta_mev_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='carpeta',
            name='mev_estado',
            field=models.CharField(blank=True, default='', max_length=100, verbose_name='Estado en MEV'),
        ),
    ]
