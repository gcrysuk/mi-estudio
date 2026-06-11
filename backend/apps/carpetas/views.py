# apps/carpetas/views.py
import logging
import urllib.parse
import urllib.request

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from django.db.models import Q, Max
from django.contrib.auth import get_user_model
from django.http import HttpResponse
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

MEV_HOSTS_PERMITIDOS = ('mev.scba.gov.ar', 'docs.scba.gov.ar')


def _user_puede_editar_carpeta(user, carpeta):
    if carpeta.propietario_id == user.pk:
        return True
    return CompartirCarpeta.objects.filter(
        carpeta=carpeta, usuario=user, puede_editar=True
    ).exists()


def _descifrar_clave_mev(perfil):
    """Descifra la clave MEV del perfil. Devuelve (clave, error_response)."""
    key = getattr(settings, 'MEV_ENCRYPTION_KEY', '')
    if not key:
        return None, Response(
            {'error': 'MEV_ENCRYPTION_KEY no configurada en el servidor'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    try:
        from cryptography.fernet import Fernet
        fernet = Fernet(key.encode() if isinstance(key, str) else key)
        return fernet.decrypt(perfil.mev_clave.encode()).decode(), None
    except Exception:
        return None, Response(
            {'error': 'Error al descifrar las credenciales MEV'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


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

    @action(detail=True, methods=['post'], url_path='sync_mev')
    def sync_mev(self, request, pk=None):
        carpeta = self.get_object()
        if not _user_puede_editar_carpeta(request.user, carpeta):
            return Response({'error': 'Sin permiso de edición'}, status=status.HTTP_403_FORBIDDEN)

        if not carpeta.mev_url:
            return Response({'error': 'Esta carpeta no tiene URL MEV configurada'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar credenciales MEV del usuario
        try:
            perfil = request.user.perfil
        except Exception:
            return Response({'error': 'Perfil de usuario no encontrado'}, status=status.HTTP_400_BAD_REQUEST)

        if not perfil.mev_usuario or not perfil.mev_clave:
            return Response({'error': 'Configurá tus credenciales MEV en el perfil'}, status=status.HTTP_400_BAD_REQUEST)

        clave_descifrada, error_response = _descifrar_clave_mev(perfil)
        if error_response:
            return error_response

        try:
            from apps.carpetas.tasks import sync_mev_carpeta_task
            sync_mev_carpeta_task.apply_async(args=[carpeta.id])
            return Response({'encolado': True, 'mensaje': 'Sincronización encolada'})
        except Exception:
            # Celery no disponible — ejecutar sincrónicamente
            from apps.carpetas.mev_scraper import mev_sync_carpeta
            resultado = mev_sync_carpeta(carpeta, perfil.mev_usuario, clave_descifrada, perfil.mev_depto)
            if resultado.get('error'):
                return Response({'ok': False, 'error': resultado['error']}, status=status.HTTP_400_BAD_REQUEST)
            return Response({
                'nuevos': resultado['nuevos'],
                'ultimo_sync': carpeta.mev_ultimo_sync,
            })

    @action(detail=False, methods=['get'], url_path='mev_proxy')
    def mev_proxy(self, request):
        """Proxy autenticado: descarga un documento de la MEV usando las credenciales MEV del usuario."""
        url = request.query_params.get('url', '')
        partes = urllib.parse.urlparse(url)
        if partes.scheme not in ('http', 'https') or partes.hostname not in MEV_HOSTS_PERMITIDOS:
            return Response({'error': 'URL no permitida'}, status=status.HTTP_403_FORBIDDEN)

        try:
            perfil = request.user.perfil
        except Exception:
            return Response({'error': 'Perfil de usuario no encontrado'}, status=status.HTTP_400_BAD_REQUEST)

        if not perfil.mev_usuario or not perfil.mev_clave:
            return Response({'error': 'Configurá tus credenciales MEV en el perfil'}, status=status.HTTP_400_BAD_REQUEST)

        clave_descifrada, error_response = _descifrar_clave_mev(perfil)
        if error_response:
            return error_response

        from apps.carpetas.mev_scraper import _get_session, _UA

        cookie_jar = _get_session(perfil.mev_usuario, clave_descifrada, perfil.mev_depto)
        if cookie_jar is None:
            return Response({'error': 'Credenciales MEV incorrectas o error de conexión'}, status=status.HTTP_403_FORBIDDEN)

        try:
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
            opener.addheaders = [('User-Agent', _UA)]
            with opener.open(url, timeout=30) as resp:
                content_type = resp.headers.get('Content-Type', 'application/octet-stream')
                contenido = resp.read()
        except Exception as exc:
            logger.error('MEV proxy error al descargar %s: %s', url, exc)
            return Response({'error': 'Error al descargar el documento de la MEV'}, status=status.HTTP_502_BAD_GATEWAY)

        return HttpResponse(contenido, content_type=content_type)

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
