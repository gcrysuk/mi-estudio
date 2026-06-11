import json
import os
import urllib.request
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Max, Case, When, IntegerField, Value, F
from django.utils import timezone
from .models import Movimiento, TipoMovimiento, EstadoMovimiento, NotificacionMovimiento, KanbanConfig, NotificacionSistema
from .serializers import MovimientoSerializer, TipoMovimientoSerializer, EstadoMovimientoSerializer, NotificacionSerializer, KanbanConfigSerializer, NotificacionSistemaSerializer
from .utils import crear_notificacion
from apps.carpetas.models import Carpeta, CompartirCarpeta
from config.pagination import StandardPagination


def _user_puede_editar_carpeta(user, carpeta):
    """True si el usuario es propietario o tiene puede_editar=True en la carpeta."""
    if carpeta is None:
        return True  # movimientos sin carpeta: cualquier autenticado puede operar
    if carpeta.propietario_id == user.pk:
        return True
    return CompartirCarpeta.objects.filter(
        carpeta=carpeta, usuario=user, puede_editar=True
    ).exists()


def _user_puede_editar_movimiento(user, movimiento):
    """True si es responsable del movimiento, o si puede editar la carpeta."""
    if movimiento.responsable_id == user.pk:
        return True
    return _user_puede_editar_carpeta(user, movimiento.carpeta)


class MovimientoViewSet(viewsets.ModelViewSet):
    serializer_class = MovimientoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    ordering_fields = ['titulo', 'fecha_movimiento', 'fecha_vencimiento', 'fecha_creacion', 'tiempo_trabajo', 'estado__nombre', 'tipo__nombre', 'carpeta__nombre', 'responsable__username', 'creado_por__username', 'modificado_por__username', 'complejidad']
    ordering = ['-fecha_movimiento']
    filterset_fields = ['carpeta', 'tipo', 'estado', 'vencido']
    search_fields = [
        'titulo',
        'descripcion',
        'carpeta__nombre',
        'carpeta__numero_expediente',
        'tipo__nombre',
        'estado__nombre',
    ]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            return Movimiento.objects.filter(activo=True).select_related(
                'carpeta', 'tipo', 'estado', 'creado_por'
            )

        carpetas_accesibles = Carpeta.objects.filter(
            Q(propietario=user) | Q(compartida_con=user) | Q(es_publico=True),
            activo=True,
        ).values_list('id', flat=True)

        queryset = Movimiento.objects.filter(
            Q(carpeta_id__in=carpetas_accesibles) |
            Q(carpeta__isnull=True, creado_por=user) |
            Q(responsable=user),
            activo=True,
        ).select_related('carpeta', 'tipo', 'estado', 'creado_por', 'responsable', 'modificado_por')

        carpeta_id = self.request.query_params.get('carpeta')
        if carpeta_id:
            queryset = queryset.filter(carpeta_id=carpeta_id)

        complejidad = self.request.query_params.get('complejidad')
        if complejidad:
            queryset = queryset.filter(complejidad=complejidad)

        estado_nombre = self.request.query_params.get('estado_nombre')
        if estado_nombre:
            queryset = queryset.filter(estado__nombre__iexact=estado_nombre)

        vence_hoy = self.request.query_params.get('vence_hoy')
        if vence_hoy:
            hoy = timezone.now().date()
            queryset = queryset.filter(fecha_vencimiento__date=hoy)

        proximos_dias = self.request.query_params.get('proximos_dias')
        if proximos_dias:
            hoy = timezone.now().date()
            hasta = hoy + timezone.timedelta(days=int(proximos_dias))
            queryset = queryset.filter(
                fecha_vencimiento__date__gte=hoy,
                fecha_vencimiento__date__lte=hasta,
            )

        return queryset

    def filter_queryset(self, queryset):
        estado_nombre = self.request.query_params.get('estado_nombre')
        result = super().filter_queryset(queryset)
        if estado_nombre:
            result = result.order_by(F('fecha_vencimiento').asc(nulls_last=True))
        return result

    def perform_create(self, serializer):
        carpeta = serializer.validated_data.get('carpeta')
        if not _user_puede_editar_carpeta(self.request.user, carpeta):
            raise PermissionDenied('No tenés permiso de escritura en esta carpeta.')
        movimiento = serializer.save(creado_por=self.request.user)

        # Si se asignó responsable al crear, compartir carpeta y notificar
        if movimiento.responsable_id and carpeta:
            actor = self.request.user
            actor_nombre = actor.get_full_name() or actor.username
            CompartirCarpeta.objects.get_or_create(
                carpeta=carpeta,
                usuario=movimiento.responsable,
                defaults={'puede_editar': False, 'compartido_por': actor},
            )
            if movimiento.responsable_id != actor.pk:
                crear_notificacion(
                    movimiento.responsable,
                    'asignacion',
                    actor=actor,
                    movimiento=movimiento,
                    mensaje=f"{actor_nombre} te asignó el movimiento '{movimiento.titulo}' en '{carpeta.nombre}'",
                )

    def perform_update(self, serializer):
        if not _user_puede_editar_movimiento(self.request.user, serializer.instance):
            raise PermissionDenied('No tenés permiso de escritura en este movimiento.')

        estado_anterior = serializer.instance.estado
        complejidad_anterior = serializer.instance.complejidad

        extra = {}
        nuevo_estado = serializer.validated_data.get('estado')
        if nuevo_estado is not None:
            extra['fecha_completado'] = timezone.now() if nuevo_estado.es_final else None
        movimiento = serializer.save(modificado_por=self.request.user, **extra)

        carpeta = movimiento.carpeta
        actor = self.request.user
        if carpeta:
            actor_nombre = actor.get_full_name() or actor.username

            cambios = []
            if estado_anterior != movimiento.estado and movimiento.estado:
                cambios.append(f"estado → {movimiento.estado.nombre}")
            if complejidad_anterior != movimiento.complejidad and movimiento.complejidad:
                cambios.append(f"complejidad → {movimiento.get_complejidad_display()}")

            detalle = f": {', '.join(cambios)}" if cambios else ""
            mensaje = f"{actor_nombre} modificó '{movimiento.titulo}' en '{carpeta.nombre}'{detalle}"
            notificados = set()

            if carpeta.propietario_id != actor.pk:
                crear_notificacion(
                    carpeta.propietario,
                    'cambio_estado',
                    actor=actor, movimiento=movimiento, carpeta=carpeta,
                    mensaje=mensaje,
                )
                notificados.add(carpeta.propietario_id)

            if (movimiento.responsable_id
                    and movimiento.responsable_id != actor.pk
                    and movimiento.responsable_id not in notificados):
                crear_notificacion(
                    movimiento.responsable,
                    'cambio_estado',
                    actor=actor, movimiento=movimiento, carpeta=carpeta,
                    mensaje=mensaje,
                )

    def perform_destroy(self, instance):
        if not _user_puede_editar_movimiento(self.request.user, instance):
            raise PermissionDenied('No tenés permiso de escritura en este movimiento.')
        instance.activo = False
        instance.fecha_eliminacion = timezone.now()
        instance.save(update_fields=['activo', 'fecha_eliminacion'])

    @action(detail=False, methods=['get'], url_path='papelera')
    def papelera(self, request):
        movimientos = Movimiento.objects.filter(
            creado_por=request.user,
            activo=False,
        ).select_related('carpeta', 'tipo', 'estado', 'creado_por')
        serializer = self.get_serializer(movimientos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='restaurar')
    def restaurar(self, request, pk=None):
        try:
            movimiento = Movimiento.objects.get(pk=pk, creado_por=request.user, activo=False)
        except Movimiento.DoesNotExist:
            return Response({'error': 'Movimiento no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        movimiento.activo = True
        movimiento.fecha_eliminacion = None
        movimiento.save(update_fields=['activo', 'fecha_eliminacion'])
        return Response({'ok': True})

    @action(detail=True, methods=['delete'], url_path='eliminar_definitivo')
    def eliminar_definitivo(self, request, pk=None):
        try:
            movimiento = Movimiento.objects.get(pk=pk, creado_por=request.user, activo=False)
        except Movimiento.DoesNotExist:
            return Response({'error': 'Movimiento no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        movimiento.delete()
        return Response({'ok': True})
    
    @action(detail=False, methods=['get', 'post', 'put', 'delete'], url_path='tipos')
    def tipos_movimiento(self, request):
        """CRUD para tipos de movimiento"""
        user = request.user

        if request.method == 'GET':
            queryset = TipoMovimiento.objects.filter(
                Q(propietario=user) | Q(propietario__isnull=True),
                activo=True,
            ).annotate(
                _es_global=Case(
                    When(propietario__isnull=True, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            ).order_by('_es_global', 'orden', 'nombre')
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            return Response(TipoMovimientoSerializer(queryset, many=True).data)

        elif request.method == 'POST':
            serializer = TipoMovimientoSerializer(data=request.data)
            if serializer.is_valid():
                ultimo = TipoMovimiento.objects.filter(propietario=user).aggregate(
                    max_orden=Max('orden')
                )['max_orden'] or 0
                serializer.save(propietario=user, orden=ultimo + 1)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'PUT':
            tipo_id = request.data.get('id')
            try:
                tipo = TipoMovimiento.objects.get(id=tipo_id)
            except TipoMovimiento.DoesNotExist:
                return Response({'error': 'Tipo no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            if tipo.propietario is None:
                return Response({'error': 'Registro global no modificable'}, status=status.HTTP_403_FORBIDDEN)
            if tipo.propietario_id != user.pk:
                return Response({'error': 'No tenés permiso para modificar este tipo'}, status=status.HTTP_403_FORBIDDEN)
            serializer = TipoMovimientoSerializer(tipo, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'DELETE':
            tipo_id = request.query_params.get('id')
            try:
                tipo = TipoMovimiento.objects.get(id=tipo_id)
            except TipoMovimiento.DoesNotExist:
                return Response({'error': 'Tipo no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            if tipo.propietario is None:
                return Response({'error': 'Registro global no eliminable'}, status=status.HTTP_403_FORBIDDEN)
            if tipo.propietario_id != user.pk:
                return Response({'error': 'No tenés permiso para eliminar este tipo'}, status=status.HTTP_403_FORBIDDEN)
            if tipo.movimientos.exists():
                return Response({'error': 'El tipo tiene movimientos asociados'}, status=status.HTTP_400_BAD_REQUEST)
            tipo.delete()
            return Response({'message': 'Tipo eliminado'}, status=status.HTTP_200_OK)

        return Response({'error': 'Método no permitido'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    @action(detail=False, methods=['get', 'post', 'put', 'delete'], url_path='estados')
    def estados_movimiento(self, request):
        """CRUD para estados de movimiento"""
        if request.method == 'GET':
            queryset = EstadoMovimiento.objects.filter(activo=True)
            search = request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(nombre__icontains=search)
            serializer = EstadoMovimientoSerializer(queryset, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = EstadoMovimientoSerializer(data=request.data)
            if serializer.is_valid():
                ultimo = EstadoMovimiento.objects.aggregate(max_orden=Max('orden'))['max_orden'] or 0
                serializer.save(orden=ultimo + 1)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'PUT':
            estado_id = request.data.get('id')
            try:
                estado = EstadoMovimiento.objects.get(id=estado_id)
                if estado.es_obligatorio:
                    return Response(
                        {'error': 'Este estado es obligatorio y no puede modificarse'},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                serializer = EstadoMovimientoSerializer(estado, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            except EstadoMovimiento.DoesNotExist:
                return Response({'error': 'Estado no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        elif request.method == 'DELETE':
            estado_id = request.query_params.get('id')
            try:
                estado = EstadoMovimiento.objects.get(id=estado_id)
                if estado.es_obligatorio:
                    return Response(
                        {'error': 'Este estado es obligatorio y no puede eliminarse'},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                if estado.movimientos.exists():
                    return Response({'error': 'El estado tiene movimientos asociados'}, status=status.HTTP_400_BAD_REQUEST)
                estado.delete()
                return Response({'message': 'Estado eliminado'}, status=status.HTTP_200_OK)
            except EstadoMovimiento.DoesNotExist:
                return Response({'error': 'Estado no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({'error': 'Método no permitido'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    @action(detail=False, methods=['get'])
    def vencidos(self, request):
        queryset = self.get_queryset().filter(
            vencido=True,
            fecha_vencimiento__isnull=False
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'post'], url_path='kanban/config')
    def kanban_config(self, request):
        config, _ = KanbanConfig.objects.get_or_create(usuario=request.user)

        if request.method == 'GET':
            if not config.estados_visibles.exists():
                estados_activos = EstadoMovimiento.objects.filter(activo=True)
                config.estados_visibles.set(estados_activos)
                config.orden_columnas = list(estados_activos.values_list('id', flat=True))
                config.save(update_fields=['orden_columnas'])
            serializer = KanbanConfigSerializer(config)
            return Response(serializer.data)

        serializer = KanbanConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='kanban/board')
    def kanban_board(self, request):
        config, _ = KanbanConfig.objects.get_or_create(usuario=request.user)
        if not config.estados_visibles.exists():
            estados_activos = EstadoMovimiento.objects.filter(activo=True)
            config.estados_visibles.set(estados_activos)
            config.orden_columnas = list(estados_activos.values_list('id', flat=True))
            config.save(update_fields=['orden_columnas'])

        estados_ids = config.estados_visibles.values_list('id', flat=True)
        orden = config.orden_columnas
        estados_map = {e.id: e for e in config.estados_visibles.all()}

        if orden:
            estados_ordenados = [estados_map[i] for i in orden if i in estados_map]
            resto = [e for e in estados_map.values() if e.id not in orden]
            estados_ordenados += resto
        else:
            estados_ordenados = list(estados_map.values())

        base_qs = self.get_queryset().filter(estado_id__in=estados_ids)
        columnas = []
        for estado in estados_ordenados:
            qs = base_qs.filter(estado=estado)
            total = qs.count()
            if estado.es_final:
                movimientos = qs.order_by('-fecha_cambio_estado', '-fecha_movimiento')
            else:
                movimientos = qs.order_by('-fecha_movimiento')
            serializer = self.get_serializer(movimientos, many=True)
            columnas.append({
                'estado': EstadoMovimientoSerializer(estado).data,
                'movimientos': serializer.data,
                'total': total,
            })

        return Response({'columnas': columnas})

    @action(detail=False, methods=['get'], url_path='vencen_hoy')
    def vencen_hoy(self, request):
        now = timezone.now()
        now_local = timezone.localtime(now)
        hoy_inicio = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        hoy_fin = now_local.replace(hour=23, minute=59, second=59, microsecond=999999)
        queryset = self.get_queryset().filter(
            fecha_vencimiento__gte=hoy_inicio,
            fecha_vencimiento__lte=hoy_fin,
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pendientes')
    def pendientes(self, request):
        queryset = self.get_queryset().filter(estado__nombre__iexact='pendiente')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='dashboard_stats')
    def dashboard_stats(self, request):
        user = request.user
        now = timezone.now()
        now_local = timezone.localtime(now)
        hoy_inicio = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        hoy_fin = now_local.replace(hour=23, minute=59, second=59, microsecond=999999)
        en_7_dias = hoy_inicio + timezone.timedelta(days=7)

        carpetas_ids = Carpeta.objects.filter(
            Q(propietario=user) | Q(compartida_con=user),
            activo=True,
        ).values_list('id', flat=True)

        movs = Movimiento.objects.filter(
            carpeta_id__in=carpetas_ids,
            activo=True,
        )

        return Response({
            'vencen_hoy': movs.filter(
                fecha_vencimiento__gte=hoy_inicio,
                fecha_vencimiento__lte=hoy_fin,
            ).count(),
            'vencen_semana': movs.filter(
                fecha_vencimiento__gte=hoy_fin,
                fecha_vencimiento__lte=en_7_dias,
            ).count(),
            'carpetas_activas': Carpeta.objects.filter(
                Q(propietario=user) | Q(compartida_con=user),
                activo=True,
                estado__nombre__iexact='activa',
            ).count(),
            'pendientes': movs.filter(
                estado__nombre__iexact='pendiente',
            ).count(),
        })

    @action(detail=False, methods=['get'], url_path='proximos_vencer')
    def proximos_vencer(self, request):
        dias = int(request.query_params.get('dias', 7))
        now = timezone.now()
        fecha_limite = now + timezone.timedelta(days=dias)
        queryset = self.get_queryset().filter(
            fecha_vencimiento__isnull=False,
            fecha_vencimiento__gte=now,
            fecha_vencimiento__lte=fecha_limite,
        ).order_by('fecha_vencimiento')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='reporte')
    def reporte(self, request):
        queryset = self.get_queryset()
        filtros_aplicados = {}
        now = timezone.now()

        estado_id = request.query_params.get('estado')
        tipo_id = request.query_params.get('tipo')
        carpeta_id = request.query_params.get('carpeta')
        vencido = request.query_params.get('vencido')
        search = request.query_params.get('search', '').strip()
        filtro = request.query_params.get('filtro', '')

        if carpeta_id:
            queryset = queryset.filter(carpeta_id=carpeta_id)
        if estado_id:
            queryset = queryset.filter(estado_id=estado_id)
            try:
                filtros_aplicados['estado'] = EstadoMovimiento.objects.get(pk=estado_id).nombre
            except Exception:
                pass
        if tipo_id:
            queryset = queryset.filter(tipo_id=tipo_id)
            try:
                filtros_aplicados['tipo'] = TipoMovimiento.objects.get(pk=tipo_id).nombre
            except Exception:
                pass
        if vencido is not None:
            queryset = queryset.filter(vencido=(vencido.lower() == 'true'))
            filtros_aplicados['vencido'] = 'Sí' if vencido.lower() == 'true' else 'No'
        if search:
            queryset = queryset.filter(Q(titulo__icontains=search) | Q(descripcion__icontains=search))
            filtros_aplicados['busqueda'] = search

        now_local = timezone.localtime(now)
        if filtro == 'vencidos_hoy':
            inicio = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
            fin = now_local.replace(hour=23, minute=59, second=59, microsecond=999999)
            queryset = queryset.filter(fecha_vencimiento__gte=inicio, fecha_vencimiento__lte=fin)
            filtros_aplicados['filtro'] = 'Vencen hoy'
        elif filtro == 'proximos':
            en7 = now + timezone.timedelta(days=7)
            queryset = queryset.filter(vencido=False, fecha_vencimiento__gte=now, fecha_vencimiento__lte=en7)
            filtros_aplicados['filtro'] = 'Próximos 7 días'
        elif filtro == 'vencidos':
            queryset = queryset.filter(vencido=True)
            filtros_aplicados['filtro'] = 'Vencidos'
        elif filtro == 'pendientes':
            queryset = queryset.filter(estado__nombre__iexact='pendiente')
            filtros_aplicados['filtro'] = 'Pendientes'

        total = queryset.count()
        serializer = self.get_serializer(queryset[:500], many=True)
        return Response({
            'movimientos': serializer.data,
            'total': total,
            'generado_en': now.isoformat(),
            'filtros_aplicados': filtros_aplicados,
        })

    @action(detail=False, methods=['get'], url_path='calendario')
    def calendario(self, request):
        """Retorna todos los movimientos con fecha_vencimiento. Sin paginación."""
        queryset = self.get_queryset().filter(
            fecha_vencimiento__isnull=False
        ).select_related('carpeta', 'tipo', 'estado')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='resumen')
    def resumen(self, request):
        from django.db.models import OuterRef, Subquery, F
        user = request.user

        if user.is_superuser:
            carpetas_accesibles = Carpeta.objects.filter(
                activo=True
            ).values_list('id', flat=True)
        else:
            carpetas_accesibles = Carpeta.objects.filter(
                Q(propietario=user) | Q(compartida_con=user) | Q(es_publico=True),
                activo=True,
            ).values_list('id', flat=True)

        # Para cada carpeta: el movimiento más reciente por fecha_creacion (una sola query)
        latest_in_carpeta = Movimiento.objects.filter(
            carpeta_id=OuterRef('carpeta_id'),
            activo=True,
        ).order_by('-fecha_creacion').values('id')[:1]

        qs_con_carpeta = list(
            Movimiento.objects.filter(
                carpeta_id__in=carpetas_accesibles,
                activo=True,
            ).annotate(
                _latest_id=Subquery(latest_in_carpeta)
            ).filter(
                id=F('_latest_id')
            ).select_related('carpeta', 'tipo', 'estado', 'creado_por', 'responsable')
        )

        # El movimiento más reciente sin carpeta creado por este usuario
        mov_sin_carpeta = (
            Movimiento.objects.filter(
                carpeta__isnull=True,
                creado_por=user,
                activo=True,
            ).order_by('-fecha_creacion')
            .select_related('tipo', 'estado', 'creado_por', 'responsable')
            .first()
        )

        result = sorted(
            qs_con_carpeta + ([mov_sin_carpeta] if mov_sin_carpeta else []),
            key=lambda m: (m.carpeta.nombre.lower() if m.carpeta else ''),
        )

        serializer = self.get_serializer(result, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='cambiar_estado')
    def cambiar_estado(self, request, pk=None):
        movimiento = self.get_object()
        if not _user_puede_editar_movimiento(request.user, movimiento):
            raise PermissionDenied('No tenés permiso de escritura en este movimiento.')
        estado_id = request.data.get('estado_id')
        if not estado_id:
            return Response({'error': 'estado_id requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            estado = EstadoMovimiento.objects.get(pk=estado_id)
        except EstadoMovimiento.DoesNotExist:
            return Response({'error': 'Estado no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        movimiento.estado = estado
        movimiento.fecha_cambio_estado = timezone.now()
        movimiento.modificado_por = request.user
        movimiento.fecha_completado = timezone.now() if estado.es_final else None
        movimiento.save(update_fields=['estado', 'fecha_cambio_estado', 'modificado_por', 'fecha_completado'])

        carpeta = movimiento.carpeta
        actor = request.user
        actor_nombre = actor.get_full_name() or actor.username
        if carpeta:
            mensaje = f"{actor_nombre} cambió el estado de '{movimiento.titulo}' a '{estado.nombre}' en '{carpeta.nombre}'"
            notificados = set()

            if carpeta.propietario_id != actor.pk:
                crear_notificacion(
                    carpeta.propietario,
                    'cambio_estado',
                    actor=actor, movimiento=movimiento, carpeta=carpeta,
                    mensaje=mensaje,
                )
                notificados.add(carpeta.propietario_id)

            if (movimiento.responsable_id
                    and movimiento.responsable_id != actor.pk
                    and movimiento.responsable_id not in notificados):
                crear_notificacion(
                    movimiento.responsable,
                    'cambio_estado',
                    actor=actor, movimiento=movimiento, carpeta=carpeta,
                    mensaje=mensaje,
                )

        serializer = self.get_serializer(movimiento)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='asignar_responsable')
    def asignar_responsable(self, request, pk=None):
        movimiento = self.get_object()
        carpeta = movimiento.carpeta
        if carpeta is None or carpeta.propietario_id != request.user.pk:
            return Response(
                {'error': 'Solo el propietario de la carpeta puede asignar responsables'},
                status=status.HTTP_403_FORBIDDEN,
            )
        usuario_id = request.data.get('usuario_id')
        if not usuario_id:
            return Response({'error': 'usuario_id requerido'}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            usuario = User.objects.get(pk=usuario_id)
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        puede_editar_carpeta = bool(request.data.get('puede_editar_carpeta', False))
        CompartirCarpeta.objects.get_or_create(
            carpeta=carpeta,
            usuario=usuario,
            defaults={'puede_editar': puede_editar_carpeta, 'compartido_por': request.user},
        )

        movimiento.responsable = usuario
        movimiento.save(update_fields=['responsable'])

        actor = request.user
        actor_nombre = actor.get_full_name() or actor.username
        crear_notificacion(
            usuario,
            'asignacion',
            actor=actor,
            movimiento=movimiento,
            mensaje=f"{actor_nombre} te asignó el movimiento '{movimiento.titulo}' en la carpeta '{carpeta.nombre}'",
        )

        serializer = self.get_serializer(movimiento)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='generar_minuta')
    def generar_minuta(self, request):
        texto = request.data.get('texto', '')
        if not texto:
            return Response({'error': 'Texto requerido'}, status=status.HTTP_400_BAD_REQUEST)

        api_key = os.environ.get('ANTHROPIC_API_KEY', '')
        if not api_key:
            return Response({'error': 'ANTHROPIC_API_KEY no configurada'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        payload = json.dumps({
            'model': 'claude-haiku-4-5-20251001',
            'max_tokens': 1000,
            'messages': [{
                'role': 'user',
                'content': (
                    'Sos un asistente legal argentino. Generá una minuta profesional y estructurada '
                    'en español de la siguiente transcripción de una entrevista con un cliente. '
                    'Incluí: temas tratados, acuerdos y próximos pasos.\n\n'
                    f'Transcripción: {texto}'
                )
            }]
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://api.anthropic.com/v1/messages',
            data=payload,
            headers={
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            method='POST',
        )

        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))

        minuta = data.get('content', [{}])[0].get('text', '')

        if movimiento_id := request.data.get('movimiento_id'):
            try:
                mov = Movimiento.objects.get(pk=movimiento_id)
                mov.transcripcion = texto
                mov.save(update_fields=['transcripcion'])
            except Movimiento.DoesNotExist:
                pass

        return Response({'minuta': minuta})


class NotificacionSistemaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificacionSistemaSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        return NotificacionSistema.objects.filter(
            usuario=self.request.user
        ).select_related('actor', 'movimiento', 'movimiento__carpeta')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        if request.query_params.get('no_leidas') == 'true':
            queryset = queryset.filter(leida=False)
        count = self.get_queryset().filter(leida=False).count()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'count': count, 'results': serializer.data})

    @action(detail=False, methods=['get'], url_path='todas')
    def todas(self, request):
        queryset = self.get_queryset()
        tipo = request.query_params.get('tipo')
        leida = request.query_params.get('leida')
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        if leida is not None:
            queryset = queryset.filter(leida=(leida.lower() == 'true'))
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='marcar_leida')
    def marcar_leida(self, request, pk=None):
        notif = self.get_object()
        notif.leida = True
        notif.save(update_fields=['leida'])
        return Response({'ok': True})

    @action(detail=True, methods=['patch'], url_path='marcar_no_leida')
    def marcar_no_leida(self, request, pk=None):
        notif = self.get_object()
        notif.leida = False
        notif.save(update_fields=['leida'])
        return Response({'ok': True})

    @action(detail=False, methods=['patch'], url_path='marcar_todas_leidas')
    def marcar_todas_leidas(self, request):
        self.get_queryset().filter(leida=False).update(leida=True)
        return Response({'ok': True})

    @action(detail=True, methods=['delete'], url_path='eliminar')
    def eliminar(self, request, pk=None):
        notif = self.get_object()
        notif.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['delete'], url_path='eliminar_todas')
    def eliminar_todas(self, request):
        self.get_queryset().filter(leida=True).delete()
        return Response({'ok': True})


class NotificacionViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['movimiento', 'leida']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return NotificacionMovimiento.objects.all().select_related(
                'movimiento', 'movimiento__carpeta'
            )
        carpetas_accesibles = Carpeta.objects.filter(
            Q(propietario=user) | Q(compartida_con=user) | Q(es_publico=True),
            activo=True,
        ).values_list('id', flat=True)
        return NotificacionMovimiento.objects.filter(
            Q(movimiento__carpeta_id__in=carpetas_accesibles) |
            Q(movimiento__carpeta__isnull=True, movimiento__creado_por=user),
            movimiento__activo=True,
        ).select_related('movimiento', 'movimiento__carpeta')

    @action(detail=False, methods=['get'], url_path='pendientes')
    def pendientes(self, request):
        queryset = self.get_queryset().filter(
            fecha__lte=timezone.now(),
            leida=False,
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='marcar_leida')
    def marcar_leida(self, request, pk=None):
        notificacion = self.get_object()
        notificacion.leida = True
        notificacion.save(update_fields=['leida'])
        return Response({'ok': True})

    @action(detail=False, methods=['get'])
    def proximos_vencer(self, request):
        dias = int(request.query_params.get('dias', 7))
        fecha_limite = timezone.now() + timezone.timedelta(days=dias)
        queryset = self.get_queryset().filter(
            vencido=False,
            fecha_vencimiento__lte=fecha_limite,
            fecha_vencimiento__gte=timezone.now()
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
