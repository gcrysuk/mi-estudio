from django.db import migrations

OBLIGATORIOS = [
    {'nombre': 'Activa',    'color': '#6CF750', 'orden': 1},
    {'nombre': 'Archivada', 'color': '#F75060', 'orden': 2},
]


def seed_forward(apps, schema_editor):
    EstadoCarpeta = apps.get_model('carpetas', 'EstadoCarpeta')
    for data in OBLIGATORIOS:
        EstadoCarpeta.objects.update_or_create(
            nombre=data['nombre'],
            defaults={
                'color': data['color'],
                'orden': data['orden'],
                'es_obligatorio': True,
                'activo': True,
            },
        )


def seed_reverse(apps, schema_editor):
    EstadoCarpeta = apps.get_model('carpetas', 'EstadoCarpeta')
    nombres = [d['nombre'] for d in OBLIGATORIOS]
    EstadoCarpeta.objects.filter(nombre__in=nombres).update(es_obligatorio=False)


class Migration(migrations.Migration):

    dependencies = [
        ('carpetas', '0006_estadocarpeta_es_obligatorio'),
    ]

    operations = [
        migrations.RunPython(seed_forward, seed_reverse),
    ]
