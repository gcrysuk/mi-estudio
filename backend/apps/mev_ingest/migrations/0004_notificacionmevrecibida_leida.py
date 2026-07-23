from django.db import migrations, models


def marcar_existentes_como_leidas(apps, schema_editor):
    NotificacionMEVRecibida = apps.get_model('mev_ingest', 'NotificacionMEVRecibida')
    NotificacionMEVRecibida.objects.filter(leida=False).update(leida=True)


class Migration(migrations.Migration):

    dependencies = [
        ('mev_ingest', '0003_notificacionmevrecibida_destinatario_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificacionmevrecibida',
            name='leida',
            field=models.BooleanField(
                default=False,
                help_text="Leída en la campanita de notificaciones (independiente de estado_procesamiento).",
            ),
        ),
        migrations.RunPython(marcar_existentes_como_leidas, migrations.RunPython.noop),
    ]
