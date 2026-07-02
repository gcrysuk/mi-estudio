from django.core.management.base import BaseCommand

from apps.mev_ingest.services import ejecutar_ingesta_mev


class Command(BaseCommand):
    help = "Lee la casilla IMAP recolectora de notificaciones MEV, las parsea y aplica a la carpeta correspondiente."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Parsea y matchea pero no aplica (no crea movimientos ni cambia estados).',
        )
        parser.add_argument(
            '--solo-leer', action='store_true',
            help='Solo guarda los registros (sin matchear ni aplicar).',
        )

    def handle(self, *args, **options):
        contadores = ejecutar_ingesta_mev(dry_run=options['dry_run'], solo_leer=options['solo_leer'])
        self.stdout.write(self.style.SUCCESS(
            "leidos={leidos} nuevos={nuevos} asignados={asignados} "
            "sin_match={sin_match} procesados={procesados} error={error} "
            "rematcheados={rematcheados} no_reconocido={no_reconocido}".format(**contadores)
        ))
