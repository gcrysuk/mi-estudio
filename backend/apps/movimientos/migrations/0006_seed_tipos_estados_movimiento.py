from django.db import migrations


TIPOS = [
    ('Escrito',        0),
    ('Audiencia',      1),
    ('Notificación',   2),
    ('Pericia',        3),
    ('Resolución',     4),
    ('Vencimiento',    5),
    ('Otro',           6),
]

ESTADOS = [
    ('Pendiente',   '#F59E0B', 0),
    ('En Proceso',  '#3B82F6', 1),
    ('Completado',  '#10B981', 2),
    ('Vencido',     '#EF4444', 3),
    ('Cancelado',   '#6B7280', 4),
]


def seed_forward(apps, schema_editor):
    TipoMovimiento = apps.get_model('movimientos', 'TipoMovimiento')
    EstadoMovimiento = apps.get_model('movimientos', 'EstadoMovimiento')

    for nombre, orden in TIPOS:
        TipoMovimiento.objects.get_or_create(nombre=nombre, defaults={'orden': orden, 'activo': True})

    for nombre, color, orden in ESTADOS:
        EstadoMovimiento.objects.get_or_create(nombre=nombre, defaults={'color': color, 'orden': orden, 'activo': True})


def seed_reverse(apps, schema_editor):
    TipoMovimiento = apps.get_model('movimientos', 'TipoMovimiento')
    EstadoMovimiento = apps.get_model('movimientos', 'EstadoMovimiento')
    TipoMovimiento.objects.filter(nombre__in=[n for n, _ in TIPOS]).delete()
    EstadoMovimiento.objects.filter(nombre__in=[n for n, _, _ in ESTADOS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('movimientos', '0005_carpeta_nullable'),
    ]

    operations = [
        migrations.RunPython(seed_forward, seed_reverse),
    ]
