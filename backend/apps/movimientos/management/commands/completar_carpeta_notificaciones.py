import re

from django.core.management.base import BaseCommand

from apps.carpetas.models import Carpeta
from apps.movimientos.models import NotificacionSistema

PATRON_CARPETA = re.compile(r"la carpeta '(.*)' con acceso de ")


class Command(BaseCommand):
    help = (
        "Completa el campo carpeta en NotificacionSistema de tipo 'carpeta_compartida' "
        "que quedaron con carpeta=NULL (creadas antes del fix que lo guarda), extrayendo "
        "el nombre de la carpeta del mensaje y buscando el match exacto por nombre."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Muestra qué asignaría, sin guardar cambios.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        queryset = NotificacionSistema.objects.filter(tipo='carpeta_compartida', carpeta__isnull=True)

        total = 0
        completadas = 0
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

            if len(carpetas) == 1:
                carpeta = carpetas[0]
                if dry_run:
                    self.stdout.write(
                        f"[id={notif.id}] DRY-RUN asignaría carpeta id={carpeta.id} nombre={nombre_carpeta!r}"
                    )
                else:
                    notif.carpeta = carpeta
                    notif.save(update_fields=['carpeta'])
                    self.stdout.write(
                        f"[id={notif.id}] asignada carpeta id={carpeta.id} nombre={nombre_carpeta!r}"
                    )
                completadas += 1
            elif len(carpetas) == 0:
                sin_match += 1
                self.stdout.write(self.style.WARNING(
                    f"[id={notif.id}] sin match para nombre={nombre_carpeta!r}"
                ))
            else:
                ambiguas += 1
                self.stdout.write(self.style.WARNING(
                    f"[id={notif.id}] ambiguo (2 o más carpetas) para nombre={nombre_carpeta!r}"
                ))

        resumen = (
            f"total={total} completadas={completadas} sin_match={sin_match} "
            f"ambiguas={ambiguas} sin_patron={sin_patron}"
        )
        if dry_run:
            resumen += " (dry-run, no se guardó nada)"
        self.stdout.write(self.style.SUCCESS(resumen))
