import re

from django.core.management.base import BaseCommand

from apps.carpetas.models import Carpeta
from apps.movimientos.models import NotificacionSistema

PATRON_CARPETA = re.compile(r"la carpeta '(.*)' con acceso de ")


def _normalizar_nombre(nombre):
    """Quita el sufijo ' -' que deja el pisado de datos de la MEV y colapsa
    espacios dobles internos, para poder matchear carpetas renombradas."""
    nombre = nombre.rstrip(' -')
    return re.sub(r' {2,}', ' ', nombre)


class Command(BaseCommand):
    help = (
        "Completa el campo carpeta en NotificacionSistema de tipo 'carpeta_compartida' "
        "que quedaron con carpeta=NULL (creadas antes del fix que lo guarda), extrayendo "
        "el nombre de la carpeta del mensaje. Prueba primero un match exacto por nombre "
        "y, si falla, un match por nombre normalizado (para carpetas renombradas por el "
        "pisado de datos de la MEV)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Muestra qué asignaría, sin guardar cambios.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        queryset = NotificacionSistema.objects.filter(tipo='carpeta_compartida', carpeta__isnull=True)

        carpetas_por_nombre_normalizado = {}
        for carpeta_id, nombre in Carpeta.objects.values_list('id', 'nombre'):
            clave = _normalizar_nombre(nombre)
            carpetas_por_nombre_normalizado.setdefault(clave, []).append(carpeta_id)

        total = 0
        completadas = 0
        completadas_normalizado = 0
        sin_match = 0
        ambiguas = 0
        sin_patron = 0

        for notif in queryset.iterator():
            total += 1
            match = PATRON_CARPETA.search(notif.mensaje)
            if not match:
                sin_patron += 1
                self.stdout.write(self.style.WARNING(
                    f"[id={notif.id}] el mensaje no matchea el patrón esperado: {notif.mensaje!r}"
                ))
                continue

            nombre_carpeta = match.group(1)
            carpetas = list(Carpeta.objects.filter(nombre=nombre_carpeta)[:2])

            carpeta_id_resuelta = None
            via_normalizado = False

            if len(carpetas) == 1:
                carpeta_id_resuelta = carpetas[0].id
            elif len(carpetas) > 1:
                ambiguas += 1
                self.stdout.write(self.style.WARNING(
                    f"[id={notif.id}] ambiguo (2 o más carpetas) para nombre exacto={nombre_carpeta!r}"
                ))
                continue
            else:
                candidatos = carpetas_por_nombre_normalizado.get(_normalizar_nombre(nombre_carpeta), [])
                if len(candidatos) == 1:
                    carpeta_id_resuelta = candidatos[0]
                    via_normalizado = True
                elif len(candidatos) == 0:
                    sin_match += 1
                    self.stdout.write(self.style.WARNING(
                        f"[id={notif.id}] sin match (ni exacto ni normalizado) para nombre={nombre_carpeta!r}"
                    ))
                    continue
                else:
                    ambiguas += 1
                    self.stdout.write(self.style.WARNING(
                        f"[id={notif.id}] ambiguo por normalizado ({len(candidatos)} carpetas) "
                        f"para nombre={nombre_carpeta!r}"
                    ))
                    continue

            etiqueta = 'normalizado' if via_normalizado else 'exacto'
            if dry_run:
                self.stdout.write(
                    f"[id={notif.id}] DRY-RUN asignaría carpeta id={carpeta_id_resuelta} "
                    f"nombre={nombre_carpeta!r} (match {etiqueta})"
                )
            else:
                notif.carpeta_id = carpeta_id_resuelta
                notif.save(update_fields=['carpeta'])
                self.stdout.write(
                    f"[id={notif.id}] asignada carpeta id={carpeta_id_resuelta} "
                    f"nombre={nombre_carpeta!r} (match {etiqueta})"
                )
            completadas += 1
            if via_normalizado:
                completadas_normalizado += 1

        resumen = (
            f"total={total} completadas={completadas} "
            f"(exacto={completadas - completadas_normalizado} normalizado={completadas_normalizado}) "
            f"sin_match={sin_match} ambiguas={ambiguas} sin_patron={sin_patron}"
        )
        if dry_run:
            resumen += " (dry-run, no se guardó nada)"
        self.stdout.write(self.style.SUCCESS(resumen))
