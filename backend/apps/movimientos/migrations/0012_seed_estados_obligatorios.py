from django.db import migrations

OBLIGATORIOS = [
    {'nombre': 'Pendiente',  'color': '#F59E0B', 'orden': 1, 'es_final': False},
    {'nombre': 'En Proceso', 'color': '#3B82F6', 'orden': 2, 'es_final': False},
    {'nombre': 'Borrador',   'color': '#7450F7', 'orden': 3, 'es_final': False},
    {'nombre': 'Completado', 'color': '#10B981', 'orden': 4, 'es_final': True},
]


def seed_forward(apps, schema_editor):
    EstadoMovimiento = apps.get_model('movimientos', 'EstadoMovimiento')
    for data in OBLIGATORIOS:
        EstadoMovimiento.objects.update_or_create(
            nombre=data['nombre'],
            defaults={
                'color': data['color'],
                'orden': data['orden'],
                'es_final': data['es_final'],
                'es_obligatorio': True,
                'activo': True,
            },
        )


def seed_reverse(apps, schema_editor):
    EstadoMovimiento = apps.get_model('movimientos', 'EstadoMovimiento')
    nombres = [d['nombre'] for d in OBLIGATORIOS]
    EstadoMovimiento.objects.filter(nombre__in=nombres).update(es_obligatorio=False, es_final=False)


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0011_estadomovimiento_es_obligatorio_kanbanconfig_related'),
    ]

    operations = [
        migrations.RunPython(seed_forward, seed_reverse),
    ]
