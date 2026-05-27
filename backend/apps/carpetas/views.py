# apps/carpetas/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Max
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Carpeta, CompartirCarpeta, EstadoCarpeta, TipoCarpeta, ObjetoCarpeta, ParticipanteCarpeta
from apps.organismos.models import Organismo
from .serializers import (
    CarpetaSerializer,
    CompartirCarpetaSerializer,
    EstadoCarpetaSerializer,
    TipoCarpetaSerializer,
    ObjetoCarpetaSerializer,
    OrganismoSerializer,
    ParticipanteSerializer,
)
from config.pagination import StandardPagination

User = get_user_model()


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
    filter_backends = [SearchFilter, DjangoFilterBackend]
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
            queryset = Carpeta.objects.filter(activo=True).select_related('persona', 'propietario').prefetch_related('participantes', 'participantes__persona')
        else:
            queryset = Carpeta.objects.filter(
                Q(propietario=user) |
                Q(compartida_con=user) |
                Q(es_publico=True),
                activo=True,
            ).select_related('persona', 'propietario').prefetch_related('participantes', 'participantes__persona').distinct()

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

        return queryset

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

        for carpeta_id in carpetas_ids:
            try:
                carpeta = Carpeta.objects.get(pk=carpeta_id, propietario=request.user)
                CompartirCarpeta.objects.update_or_create(
                    carpeta=carpeta,
                    usuario=usuario,
                    defaults={'puede_editar': puede_editar},
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
