# apps/carpetas/views.py
import logging

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Max
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Carpeta, CompartirCarpeta, EstadoCarpeta, TipoCarpeta, ObjetoCarpeta, ParticipanteCarpeta, HistorialEstadoMEV
from apps.organismos.models import Organismo
from .serializers import (
    CarpetaSerializer,
    CompartirCarpetaSerializer,
    EstadoCarpetaSerializer,
    TipoCarpetaSerializer,
    ObjetoCarpetaSerializer,
    OrganismoSerializer,
    ParticipanteSerializer,
    HistorialEstadoMEVSerializer,
)
from config.pagination import StandardPagination
from apps.movimientos.utils import crear_notificacion

User = get_user_model()
logger = logging.getLogger(__name__)


def _user_puede_editar_carpeta(user, carpeta):
    if carpeta.propietario_id == user.pk:
        return True
    return CompartirCarpeta.objects.filter(
        carpeta=carpeta, usuario=user, puede_editar=True
    ).exists()


class CarpetaViewSet(viewsets.ModelViewSet):
    serializer_class = CarpetaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    ordering_fields = ['nombre', 'numero_expediente', 'fecha_inicio', 'estado__nombre', 'tipo__nombre', 'objeto__nombre', 'organismo__nombre', 'persona__apellido', 'compartida_con__username', 'mev_estado', 'mev_fecha_estado']
    ordering = ['-fecha_inicio']
    filterset_fields = ['estado', 'tipo', 'objeto']
    search_fields = [
        'nombre',
        'numero_expediente',
        'persona__nombre',
        'persona__apellido',
        'contraparte',
        'estado__nombre',
        'tipo__nombre',
        'objeto__nombre',
        'organismo__nombre',
        'descripcion',
    ]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            queryset = Carpeta.objects.filter(activo=True).select_related('persona', 'propietario').prefetch_related('participantes', 'participantes__persona').distinct()
        else:
            queryset = Carpeta.objects.filter(
                Q(propietario=user) |
                Q(compartida_con=user) |
                Q(es_publico=True),
                activo=True,
            ).select_related('persona', 'propietario').prefetch_related('participantes', 'participantes__persona').distinct()

        compartida_con_param = self.request.query_params.get('compartida_con')
        if compartida_con_param:
            carpetas_ids = CompartirCarpeta.objects.filter(
                Q(usuario__username__icontains=compartida_con_param) |
                Q(usuario__first_name__icontains=compartida_con_param) |
                Q(usuario__last_name__icontains=compartida_con_param)
            ).values_list('carpeta_id', flat=True)
            queryset = queryset.filter(id__in=carpetas_ids)

        dias_sin_mov = self.request.query_params.get('dias_sin_movimiento')
        if dias_sin_mov:
            try:
                dias = int(dias_sin_mov)
                fecha_limite = timezone.now() - timezone.timedelta(days=dias)
                queryset = queryset.filter(
                    Q(movimientos__isnull=True) |
                    Q(movimientos__fecha_movimiento__lte=fecha_limite)
                ).distinct()
            except ValueError:
                pass

        mev_estado = self.request.query_params.get('mev_estado')
        if mev_estado:
            queryset = queryset.filter(mev_estado__icontains=mev_estado)

        return queryset

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.propietario_id != request.user.pk:
            from .utils import inicializar_carpeta_para_usuario
            inicializar_carpeta_para_usuario(instance, request.user)
        return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)

    def perform_update(self, serializer):
        if not _user_puede_editar_carpeta(self.request.user, serializer.instance):
            raise PermissionDenied('No tenés permiso de escritura en esta carpeta.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.propietario != self.request.user:
            raise PermissionDenied('Solo el propietario puede eliminar esta carpeta.')
        if CompartirCarpeta.objects.filter(carpeta=instance).exists():
            raise PermissionDenied('Debés quitar todos los colaboradores antes de eliminar la carpeta.')
        instance.activo = False
        instance.fecha_eliminacion = timezone.now()
        instance.save(update_fields=['activo', 'fecha_eliminacion'])

    @action(detail=False, methods=['get'], url_path='papelera')
    def papelera(self, request):
        carpetas = Carpeta.objects.filter(
            propietario=request.user,
            activo=False,
        ).select_related('persona', 'propietario')
        serializer = self.get_serializer(carpetas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='restaurar')
    def restaurar(self, request, pk=None):
        try:
            carpeta = Carpeta.objects.get(pk=pk, propietario=request.user, activo=False)
        except Carpeta.DoesNotExist:
            return Response({'error': 'Carpeta no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        carpeta.activo = True
        carpeta.fecha_eliminacion = None
        carpeta.save(update_fields=['activo', 'fecha_eliminacion'])
        return Response({'ok': True})

    @action(detail=True, methods=['delete'], url_path='eliminar_definitivo')
    def eliminar_definitivo(self, request, pk=None):
        if request.user.is_superuser:
            raise PermissionDenied('Acción no permitida')
        try:
            carpeta = Carpeta.objects.get(pk=pk, propietario=request.user, activo=False)
        except Carpeta.DoesNotExist:
            return Response({'error': 'Carpeta no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        carpeta.delete()
        return Response({'ok': True})

    # ── Participantes ─────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='agregar_participante')
    def agregar_participante(self, request, pk=None):
        carpeta = self.get_object()
        if not _user_puede_editar_carpeta(request.user, carpeta):
            raise PermissionDenied('No tenés permiso de escritura en esta carpeta.')

        tipo = request.data.get('tipo')
        persona_id = request.data.get('persona_id') or None
        nombre_manual = request.data.get('nombre_manual', '').strip()

        if tipo not in ('cliente', 'contraparte'):
            return Response({'error': 'Tipo inválido'}, status=status.HTTP_400_BAD_REQUEST)
        if not persona_id and not nombre_manual:
            return Response({'error': 'Persona o nombre manual requerido'}, status=status.HTTP_400_BAD_REQUEST)

        participante = ParticipanteCarpeta.objects.create(
            carpeta=carpeta,
            tipo=tipo,
            persona_id=persona_id,
            nombre_manual=nombre_manual,
        )
        return Response(ParticipanteSerializer(participante).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'quitar_participante/(?P<participante_id>\d+)')
    def quitar_participante(self, request, pk=None, participante_id=None):
        carpeta = self.get_object()
        if not _user_puede_editar_carpeta(request.user, carpeta):
            raise PermissionDenied('No tenés permiso de escritura en esta carpeta.')

        try:
            participante = ParticipanteCarpeta.objects.get(pk=participante_id, carpeta=carpeta)
            participante.delete()
            return Response({'ok': True})
        except ParticipanteCarpeta.DoesNotExist:
            return Response({'error': 'Participante no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    # ── Compartir ─────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='usuarios_compartidos')
    def usuarios_compartidos(self, request, pk=None):
        carpeta = self.get_object()
        compartidos = CompartirCarpeta.objects.filter(
            carpeta=carpeta
        ).select_related('usuario')
        data = [
            {
                'usuario_id': c.usuario.id,
                'username': c.usuario.username,
                'email': c.usuario.email,
                'puede_editar': c.puede_editar,
            }
            for c in compartidos
        ]
        return Response(data)

    @action(detail=True, methods=['post'], url_path='compartir')
    def compartir(self, request, pk=None):
        carpeta = self.get_object()

        if carpeta.propietario != request.user:
            return Response(
                {'error': 'Solo el propietario puede modificar los permisos de esta carpeta'},
                status=status.HTTP_403_FORBIDDEN,
            )

        usuario_id = request.data.get('usuario_id')
        puede_editar = request.data.get('puede_editar', False)

        if not usuario_id:
            return Response({'error': 'usuario_id requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            usuario = User.objects.get(pk=usuario_id)
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if carpeta.propietario == usuario:
            return Response({'error': 'No podés compartir con el propietario'}, status=status.HTTP_400_BAD_REQUEST)

        obj, created = CompartirCarpeta.objects.update_or_create(
            carpeta=carpeta,
            usuario=usuario,
            defaults={'puede_editar': puede_editar},
        )

        if created:
            actor = request.user
            acceso = 'edición' if puede_editar else 'solo lectura'
            crear_notificacion(
                usuario,
                'carpeta_compartida',
                actor=actor,
                movimiento=None,
                mensaje=f"{actor.get_full_name() or actor.username} te compartió la carpeta '{carpeta.nombre}' con acceso de {acceso}.",
            )

        return Response({'ok': True, 'created': created})

    @action(detail=True, methods=['post'], url_path='dejar_compartir')
    def dejar_compartir(self, request, pk=None):
        # Buscar la carpeta sin filtrar por activo para que funcione aunque esté eliminada
        try:
            carpeta = Carpeta.objects.get(pk=pk)
        except Carpeta.DoesNotExist:
            return Response({'error': 'Carpeta no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        if carpeta.propietario != request.user and not request.user.is_superuser:
            return Response(
                {'error': 'Solo el propietario puede modificar los permisos de esta carpeta'},
                status=status.HTTP_403_FORBIDDEN,
            )

        usuario_id = request.data.get('usuario_id')
        CompartirCarpeta.objects.filter(
            carpeta=carpeta, usuario_id=usuario_id
        ).delete()
        return Response({'ok': True})

    @action(detail=True, methods=['post'], url_path='transferir_propiedad')
    def transferir_propiedad(self, request, pk=None):
        carpeta = self.get_object()

        if carpeta.propietario != request.user:
            return Response(
                {'error': 'Solo el propietario puede transferir la carpeta'},
                status=status.HTTP_403_FORBIDDEN,
            )

        usuario_id = request.data.get('usuario_id')
        if not usuario_id:
            return Response({'error': 'usuario_id requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            nuevo_propietario = User.objects.get(pk=usuario_id)
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if nuevo_propietario == request.user:
            return Response({'error': 'Ya sos el propietario'}, status=status.HTTP_400_BAD_REQUEST)

        propietario_anterior = request.user

        # Cambiar propietario
        carpeta.propietario = nuevo_propietario
        carpeta.save(update_fields=['propietario'])

        # El propietario anterior pasa a ser colaborador con edición
        CompartirCarpeta.objects.update_or_create(
            carpeta=carpeta,
            usuario=propietario_anterior,
            defaults={'puede_editar': True},
        )

        # El nuevo propietario ya no es colaborador
        CompartirCarpeta.objects.filter(carpeta=carpeta, usuario=nuevo_propietario).delete()

        return Response({'ok': True})

    @action(detail=True, methods=['get'], url_path='reporte')
    def reporte(self, request, pk=None):
        from apps.movimientos.models import Movimiento
        from apps.movimientos.serializers import MovimientoSerializer

        carpeta = self.get_object()
        qs = Movimiento.objects.filter(
            carpeta=carpeta, activo=True
        ).select_related('tipo', 'estado', 'creado_por', 'responsable').order_by('-fecha_movimiento')

        filtros_aplicados = {}

        estado_id = request.query_params.get('estado')
        tipo_id = request.query_params.get('tipo')
        vencido = request.query_params.get('vencido')
        search = request.query_params.get('search', '').strip()
        filtro = request.query_params.get('filtro', '')

        if estado_id:
            qs = qs.filter(estado_id=estado_id)
            try:
                from apps.movimientos.models import EstadoMovimiento
                filtros_aplicados['estado'] = EstadoMovimiento.objects.get(pk=estado_id).nombre
            except Exception:
                pass

        if tipo_id:
            qs = qs.filter(tipo_id=tipo_id)
            try:
                from apps.movimientos.models import TipoMovimiento
                filtros_aplicados['tipo'] = TipoMovimiento.objects.get(pk=tipo_id).nombre
            except Exception:
                pass

        if vencido is not None:
            qs = qs.filter(vencido=(vencido.lower() == 'true'))
            filtros_aplicados['vencido'] = 'Sí' if vencido.lower() == 'true' else 'No'

        if filtro == 'proximos':
            en7 = timezone.now() + timezone.timedelta(days=7)
            qs = qs.filter(vencido=False, fecha_vencimiento__isnull=False, fecha_vencimiento__lte=en7)
            filtros_aplicados['filtro'] = 'Próximos 7 días'
        elif filtro == 'vencidos':
            qs = qs.filter(vencido=True)
            filtros_aplicados['filtro'] = 'Vencidos'

        if search:
            qs = qs.filter(Q(titulo__icontains=search) | Q(descripcion__icontains=search))
            filtros_aplicados['busqueda'] = search

        carpeta_serializer = self.get_serializer(carpeta)
        mov_serializer = MovimientoSerializer(qs[:500], many=True, context={'request': request})

        return Response({
            'carpeta': carpeta_serializer.data,
            'movimientos': mov_serializer.data,
            'total': qs.count(),
            'generado_en': timezone.now().isoformat(),
            'filtros_aplicados': filtros_aplicados,
        })

    @action(detail=False, methods=['get'], url_path='mev_stats')
    def mev_stats(self, request):
        from datetime import timedelta
        from django.db.models import OuterRef, Subquery, Q as _Q
        from apps.movimientos.models import Movimiento
        from .utils import qs_con_fecha_inicio_estado_mev

        user = request.user
        now = timezone.now()
        hace_90d = now - timedelta(days=90)
        hace_3m = now - timedelta(days=91)

        if user.is_superuser:
            carpetas_qs = Carpeta.objects.filter(activo=True)
        else:
            carpetas_qs = Carpeta.objects.filter(
                _Q(propietario=user) | _Q(compartida_con=user),
                activo=True,
            )

        carpetas_mev = qs_con_fecha_inicio_estado_mev(
            carpetas_qs.filter(mev_url__isnull=False).exclude(mev_url='')
        )

        despacho_qs = carpetas_mev.filter(
            mev_estado__iexact='A Despacho',
            fecha_inicio_estado__lt=hace_90d,
        ).order_by('fecha_inicio_estado').values(
            'id', 'nombre', 'numero_expediente', 'organismo__nombre', 'fecha_inicio_estado'
        )

        letra_qs = carpetas_mev.filter(
            mev_estado__iexact='En Letra',
            fecha_inicio_estado__lt=hace_90d,
        ).order_by('fecha_inicio_estado').values(
            'id', 'nombre', 'numero_expediente', 'organismo__nombre', 'fecha_inicio_estado'
        )

        ultimo_mov = (
            Movimiento.objects
            .filter(carpeta=OuterRef('pk'), activo=True)
            .order_by('-fecha_movimiento')
            .values('fecha_movimiento')[:1]
        )
        inactivas_qs = carpetas_qs.annotate(
            ultimo_movimiento=Subquery(ultimo_mov)
        ).filter(
            _Q(ultimo_movimiento__isnull=True) | _Q(ultimo_movimiento__lt=hace_3m)
        ).order_by('ultimo_movimiento').values(
            'id', 'nombre', 'numero_expediente', 'organismo__nombre', 'ultimo_movimiento'
        )

        def dias_desde(dt):
            if dt is None:
                return None
            d = dt.date() if hasattr(dt, 'date') else dt
            return (now.date() - d).days

        def serialize(rows, date_field):
            result = []
            for c in rows:
                fecha = c[date_field]
                result.append({
                    'id': c['id'],
                    'nombre': c['nombre'],
                    'numero_expediente': c['numero_expediente'] or '',
                    'organismo_nombre': c['organismo__nombre'] or '',
                    'fecha': fecha.isoformat() if fecha else None,
                    'dias': dias_desde(fecha),
                })
            return result

        despacho_list = serialize(despacho_qs, 'fecha_inicio_estado')
        letra_list = serialize(letra_qs, 'fecha_inicio_estado')
        inactivas_list = serialize(inactivas_qs, 'ultimo_movimiento')

        return Response({
            'a_despacho_90': len(despacho_list),
            'en_letra_90': len(letra_list),
            'inactivas_3m': len(inactivas_list),
            'despacho_list': despacho_list,
            'letra_list': letra_list,
            'inactivas_list': inactivas_list,
        })

    @action(detail=False, methods=['get'], url_path='informe_demora_organismos')
    def informe_demora_organismos(self, request):
        """
        Por organismo: transiciones cerradas A Despacho→En Letra, promedio,
        y pico (máximo período A Despacho, incluyendo abiertos).
        Ordenado por pico_dias DESC.
        """
        from collections import defaultdict
        from django.db.models import Q as _Q
        from .utils import qs_con_fecha_inicio_estado_mev

        user = request.user
        now = timezone.now()

        # ── Scope del usuario ──────────────────────────────────────────────
        if user.is_superuser:
            carpetas_qs = Carpeta.objects.filter(activo=True)
        else:
            carpetas_qs = Carpeta.objects.filter(
                _Q(propietario=user) | _Q(compartida_con=user),
                activo=True,
            ).distinct()

        # Solo carpetas con organismo
        carpetas_data = {
            c['id']: c
            for c in carpetas_qs.filter(organismo__isnull=False).values(
                'id', 'nombre', 'organismo_id', 'organismo__nombre', 'mev_primera_sync'
            )
        }
        if not carpetas_data:
            return Response([])

        # ── Historial completo, orden cronológico ──────────────────────────
        historial = list(
            HistorialEstadoMEV.objects
            .filter(carpeta_id__in=carpetas_data.keys())
            .order_by('carpeta_id', 'fecha_cambio')
            .values('carpeta_id', 'estado_anterior', 'estado_nuevo', 'fecha_cambio')
        )

        # ── Períodos cerrados (A Despacho → En Letra) ─────────────────────
        entry_despacho = {}   # carpeta_id → datetime de entrada
        closed_periods = []

        for h in historial:
            cid   = h['carpeta_id']
            nuevo = (h['estado_nuevo'] or '').strip().lower()
            ant   = (h['estado_anterior'] or '').strip().lower()
            fecha = h['fecha_cambio']

            if nuevo == 'a despacho':
                entry_despacho[cid] = fecha
            elif nuevo == 'en letra' and ant == 'a despacho':
                if cid in entry_despacho:
                    entrada = entry_despacho.pop(cid)
                else:
                    c = carpetas_data.get(cid, {})
                    if c.get('mev_primera_sync'):
                        entrada = c['mev_primera_sync']
                    else:
                        continue  # no hay fecha de entrada → descartar
                dias = max((fecha - entrada).days, 0)
                closed_periods.append({
                    'carpeta_id': cid,
                    'carpeta_nombre': carpetas_data[cid]['nombre'],
                    'dias': dias,
                    'fecha_inicio': entrada,
                    'abierto': False,
                })

        # ── Períodos abiertos (estado actual A Despacho) ───────────────────
        open_periods = []
        for c in qs_con_fecha_inicio_estado_mev(
            carpetas_qs.filter(mev_estado__iexact='A Despacho', organismo__isnull=False)
        ).values('id', 'nombre', 'organismo_id', 'organismo__nombre', 'fecha_inicio_estado'):
            if not c['fecha_inicio_estado']:
                continue
            open_periods.append({
                'carpeta_id': c['id'],
                'carpeta_nombre': c['nombre'],
                'organismo_id': c['organismo_id'],
                'organismo_nombre': c['organismo__nombre'] or '',
                'dias': max((now - c['fecha_inicio_estado']).days, 0),
                'fecha_inicio': c['fecha_inicio_estado'],
                'abierto': True,
            })

        # ── Agrupar por organismo ──────────────────────────────────────────
        by_org = defaultdict(lambda: {'nombre': '', 'cerrados': [], 'abiertos': []})

        for p in closed_periods:
            c = carpetas_data.get(p['carpeta_id'])
            if not c or not c['organismo_id']:
                continue
            oid = c['organismo_id']
            by_org[oid]['nombre'] = c['organismo__nombre'] or ''
            by_org[oid]['cerrados'].append(p)

        for p in open_periods:
            oid = p['organismo_id']
            by_org[oid]['nombre'] = p['organismo_nombre']
            by_org[oid]['abiertos'].append(p)

        # ── Métricas por organismo ─────────────────────────────────────────
        result = []
        for oid, data in by_org.items():
            cerrados  = data['cerrados']
            todos     = cerrados + data['abiertos']
            pico      = max(todos, key=lambda p: p['dias'])
            fi        = pico['fecha_inicio']
            result.append({
                'organismo_id':       oid,
                'organismo_nombre':   data['nombre'],
                'transiciones':       len(cerrados),
                'promedio_dias':      round(
                    sum(p['dias'] for p in cerrados) / len(cerrados), 1
                ) if cerrados else None,
                'pico_dias':          pico['dias'],
                'pico_fecha':         fi.isoformat() if fi else None,
                'pico_carpeta_id':    pico['carpeta_id'],
                'pico_carpeta_nombre': pico['carpeta_nombre'],
                'pico_abierto':       pico['abierto'],
            })

        result.sort(key=lambda r: r['pico_dias'], reverse=True)
        return Response(result)

    @action(detail=False, methods=['get'], url_path='informe_mev')
    def informe_mev(self, request):
        from django.db.models import Q as _Q
        qs = HistorialEstadoMEV.objects.filter(
            _Q(carpeta__propietario=request.user) |
            _Q(carpeta__compartidos__usuario=request.user)
        ).distinct().select_related('carpeta', 'carpeta__organismo')

        organismo = request.query_params.get('organismo')
        estado = request.query_params.get('estado')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        if organismo:
            qs = qs.filter(carpeta__organismo__nombre__icontains=organismo)
        if estado:
            qs = qs.filter(_Q(estado_anterior__icontains=estado) | _Q(estado_nuevo__icontains=estado))
        if fecha_desde:
            qs = qs.filter(fecha_cambio__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha_cambio__date__lte=fecha_hasta)

        qs = qs.order_by('carpeta__id', 'fecha_cambio')
        serializer = HistorialEstadoMEVSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='compartir_multiples')
    def compartir_multiples(self, request):
        carpetas_ids = request.data.get('carpetas', [])
        usuario_id = request.data.get('usuario_id')
        puede_editar = request.data.get('puede_editar', False)

        if not usuario_id or not carpetas_ids:
            return Response({'error': 'Faltan datos'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            usuario = User.objects.get(pk=usuario_id)
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        actor = request.user
        acceso = 'edición' if puede_editar else 'solo lectura'

        for carpeta_id in carpetas_ids:
            try:
                carpeta = Carpeta.objects.get(pk=carpeta_id, propietario=request.user)
                obj, created = CompartirCarpeta.objects.update_or_create(
                    carpeta=carpeta,
                    usuario=usuario,
                    defaults={'puede_editar': puede_editar},
                )
                if created:
                    crear_notificacion(
                        usuario,
                        'carpeta_compartida',
                        actor=actor,
                        movimiento=None,
                        mensaje=f"{actor.get_full_name() or actor.username} te compartió la carpeta '{carpeta.nombre}' con acceso de {acceso}.",
                    )
            except Carpeta.DoesNotExist:
                pass

        return Response({'ok': True})

    # ── Estados ───────────────────────────────────────────────────────────────

    @action(detail=False, methods=['get', 'post'], url_path='estados')
    def estados(self, request):
        if request.method == 'GET':
            queryset = EstadoCarpeta.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            return Response(EstadoCarpetaSerializer(queryset, many=True).data)

        serializer = EstadoCarpetaSerializer(data=request.data)
        if serializer.is_valid():
            ultimo = EstadoCarpeta.objects.aggregate(max_orden=Max('orden'))['max_orden'] or 0
            serializer.save(orden=ultimo + 1)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put', 'delete'], url_path='estados')
    def estado_detail(self, request, pk=None):
        try:
            estado = EstadoCarpeta.objects.get(pk=pk)
        except EstadoCarpeta.DoesNotExist:
            return Response({'error': 'Estado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'PUT':
            serializer = EstadoCarpetaSerializer(estado, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if estado.carpetas.exists():
            return Response(
                {'error': 'No se puede eliminar porque hay carpetas con este estado'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        estado.delete()
        return Response({'message': 'Estado eliminado'}, status=status.HTTP_200_OK)

    # ── Tipos ─────────────────────────────────────────────────────────────────

    @action(detail=False, methods=['get', 'post'], url_path='tipos')
    def tipos(self, request):
        if request.method == 'GET':
            queryset = TipoCarpeta.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            return Response(TipoCarpetaSerializer(queryset, many=True).data)

        serializer = TipoCarpetaSerializer(data=request.data)
        if serializer.is_valid():
            ultimo = TipoCarpeta.objects.aggregate(max_orden=Max('orden'))['max_orden'] or 0
            serializer.save(orden=ultimo + 1)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put', 'delete'], url_path='tipos')
    def tipo_detail(self, request, pk=None):
        try:
            tipo = TipoCarpeta.objects.get(pk=pk)
        except TipoCarpeta.DoesNotExist:
            return Response({'error': 'Tipo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'PUT':
            serializer = TipoCarpetaSerializer(tipo, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if tipo.carpetas.exists():
            return Response(
                {'error': 'No se puede eliminar porque hay carpetas con este tipo'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tipo.delete()
        return Response({'message': 'Tipo eliminado'}, status=status.HTTP_200_OK)

    # ── Objetos ───────────────────────────────────────────────────────────────

    @action(detail=False, methods=['get', 'post'], url_path='objetos')
    def objetos(self, request):
        if request.method == 'GET':
            queryset = ObjetoCarpeta.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            return Response(ObjetoCarpetaSerializer(queryset, many=True).data)

        serializer = ObjetoCarpetaSerializer(data=request.data)
        if serializer.is_valid():
            ultimo = ObjetoCarpeta.objects.aggregate(max_orden=Max('orden'))['max_orden'] or 0
            serializer.save(orden=ultimo + 1)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put', 'delete'], url_path='objetos')
    def objeto_detail(self, request, pk=None):
        try:
            objeto = ObjetoCarpeta.objects.get(pk=pk)
        except ObjetoCarpeta.DoesNotExist:
            return Response({'error': 'Objeto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'PUT':
            serializer = ObjetoCarpetaSerializer(objeto, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if objeto.carpetas.exists():
            return Response(
                {'error': 'No se puede eliminar porque hay carpetas con este objeto'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        objeto.delete()
        return Response({'message': 'Objeto eliminado'}, status=status.HTTP_200_OK)

    # ── Organismos ────────────────────────────────────────────────────────────

    @action(detail=False, methods=['get', 'post'], url_path='organismos')
    def organismos(self, request):
        if request.method == 'GET':
            queryset = Organismo.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            return Response(OrganismoSerializer(queryset, many=True).data)

        serializer = OrganismoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put', 'delete'], url_path='organismos')
    def organismo_detail(self, request, pk=None):
        try:
            organismo = Organismo.objects.get(pk=pk)
        except Organismo.DoesNotExist:
            return Response({'error': 'Organismo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'PUT':
            serializer = OrganismoSerializer(organismo, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if organismo.carpetas.exists():
            return Response(
                {'error': 'No se puede eliminar porque hay carpetas con este organismo'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        organismo.delete()
        return Response({'message': 'Organismo eliminado'}, status=status.HTTP_200_OK)
