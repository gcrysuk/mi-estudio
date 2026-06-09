import secrets
import string

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import PerfilUsuario
from .serializers import UserSerializer

User = get_user_model()


# ── Para asignar responsable (readonly viewset) ───────────────────────────────

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        from apps.carpetas.models import CompartirCarpeta, Carpeta
        user = self.request.user
        search = self.request.query_params.get('search', '').strip()
        carpeta_id = self.request.query_params.get('carpeta_id', '').strip()

        if carpeta_id:
            try:
                carpeta = Carpeta.objects.get(pk=carpeta_id)
                compartidos = CompartirCarpeta.objects.filter(
                    carpeta=carpeta
                ).values_list('usuario_id', flat=True)
                qs = User.objects.filter(
                    Q(id__in=compartidos) | Q(id=carpeta.propietario_id)
                ).exclude(id=user.id)
                if search:
                    qs = qs.filter(
                        Q(username__icontains=search) |
                        Q(first_name__icontains=search) |
                        Q(last_name__icontains=search) |
                        Q(email__icontains=search)
                    )
                return qs
            except Carpeta.DoesNotExist:
                return User.objects.none()

        if search:
            return User.objects.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            ).exclude(id=user.id)[:20]

        from apps.carpetas.models import CompartirCarpeta
        compartidos_por_mi = CompartirCarpeta.objects.filter(
            carpeta__propietario=user
        ).values_list('usuario_id', flat=True)
        propietarios_que_comparten = CompartirCarpeta.objects.filter(
            usuario=user
        ).values_list('carpeta__propietario_id', flat=True)
        conocidos_ids = set(list(compartidos_por_mi) + list(propietarios_que_comparten))
        return User.objects.filter(id__in=conocidos_ids).exclude(id=user.id)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _perfil_data(user):
    try:
        p = user.perfil
        return {
            'id': user.id,
            'username': user.username,
            'nombre': p.nombre,
            'apellido': p.apellido,
            'email': user.email,
            'plan': p.plan,
            'activo': p.activo and user.is_active,
            'email_verificado': p.email_verificado,
            'fecha_registro': p.fecha_registro,
            'ultimo_acceso': p.ultimo_acceso,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        }
    except PerfilUsuario.DoesNotExist:
        return {
            'id': user.id,
            'username': user.username,
            'nombre': user.first_name,
            'apellido': user.last_name,
            'email': user.email,
            'plan': 'free',
            'activo': user.is_active,
            'email_verificado': False,
            'fecha_registro': user.date_joined,
            'ultimo_acceso': None,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        }


def _require_superuser(request):
    if not request.user.is_superuser:
        return Response({'error': 'Acceso denegado.'}, status=status.HTTP_403_FORBIDDEN)
    return None


# ── Admin: lista de usuarios ──────────────────────────────────────────────────

class AdminListaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        err = _require_superuser(request)
        if err:
            return err

        qs = User.objects.select_related('perfil').order_by('-date_joined')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(perfil__nombre__icontains=search) |
                Q(perfil__apellido__icontains=search)
            )

        filtro_plan = request.query_params.get('plan', '')
        if filtro_plan:
            qs = qs.filter(perfil__plan=filtro_plan)

        filtro_estado = request.query_params.get('estado', '')
        if filtro_estado == 'activo':
            qs = qs.filter(is_active=True, perfil__activo=True)
        elif filtro_estado == 'inactivo':
            qs = qs.filter(Q(is_active=False) | Q(perfil__activo=False))
        elif filtro_estado == 'no_verificado':
            qs = qs.filter(is_active=False, perfil__email_verificado=False)

        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(50, max(1, int(request.query_params.get('page_size', 20))))
        total = qs.count()
        usuarios = qs[(page - 1) * page_size: page * page_size]

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': [_perfil_data(u) for u in usuarios],
        })


# ── Admin: detalle + modificación + baja ─────────────────────────────────────

class AdminUsuarioDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def patch(self, request, pk):
        err = _require_superuser(request)
        if err:
            return err
        user = self._get_user(pk)
        if not user:
            return Response({'error': 'Usuario no encontrado.'}, status=404)

        data = request.data
        try:
            perfil = user.perfil
        except PerfilUsuario.DoesNotExist:
            return Response({'error': 'Perfil no encontrado.'}, status=404)

        update_user = []
        update_perfil = []

        if 'activo' in data:
            val = bool(data['activo'])
            user.is_active = val
            perfil.activo = val
            update_user.append('is_active')
            update_perfil.append('activo')

        if 'plan' in data and data['plan'] in ('free', 'pro', 'enterprise'):
            perfil.plan = data['plan']
            update_perfil.append('plan')

        if 'is_staff' in data:
            user.is_staff = bool(data['is_staff'])
            update_user.append('is_staff')

        if update_user:
            user.save(update_fields=update_user)
        if update_perfil:
            perfil.save(update_fields=update_perfil)

        return Response({'ok': True, 'usuario': _perfil_data(user)})

    def delete(self, request, pk):
        err = _require_superuser(request)
        if err:
            return err
        if int(pk) == request.user.pk:
            return Response({'error': 'No podés desactivar tu propia cuenta.'}, status=400)
        user = self._get_user(pk)
        if not user:
            return Response({'error': 'Usuario no encontrado.'}, status=404)

        if user.is_superuser:
            superadmin_count = User.objects.filter(is_superuser=True, is_active=True).count()
            if superadmin_count <= 1:
                return Response(
                    {'error': 'No podés eliminar al único superadmin del sistema.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        from apps.carpetas.models import Carpeta, CompartirCarpeta
        from apps.movimientos.models import Movimiento, TipoMovimiento

        now = timezone.now()
        carpetas_desactivadas = 0
        carpetas_transferidas = 0
        movimientos_desactivados = 0

        for carpeta in Carpeta.objects.filter(propietario=user, activo=True):
            compartidos = CompartirCarpeta.objects.filter(carpeta=carpeta).order_by('id')
            if not compartidos.exists():
                count = Movimiento.objects.filter(carpeta=carpeta, activo=True).update(
                    activo=False, fecha_eliminacion=now
                )
                movimientos_desactivados += count
                carpeta.activo = False
                carpeta.fecha_eliminacion = now
                carpeta.save(update_fields=['activo', 'fecha_eliminacion'])
                carpetas_desactivadas += 1
            else:
                nuevo_propietario = compartidos.first()
                carpeta.propietario = nuevo_propietario.usuario
                carpeta.save(update_fields=['propietario'])
                nuevo_propietario.delete()
                carpetas_transferidas += 1

        count_sc = Movimiento.objects.filter(
            carpeta__isnull=True, creado_por=user, activo=True
        ).update(activo=False, fecha_eliminacion=now)
        movimientos_desactivados += count_sc

        TipoMovimiento.objects.filter(propietario=user).update(propietario=None)

        try:
            from apps.personas.models import Persona
            Persona.objects.filter(propietario=user).update(propietario=None)
        except Exception:
            pass

        try:
            from apps.organismos.models import Organismo
            Organismo.objects.filter(propietario=user).update(propietario=None)
        except Exception:
            pass

        user.is_active = False
        user.save(update_fields=['is_active'])
        try:
            user.perfil.activo = False
            user.perfil.save(update_fields=['activo'])
        except PerfilUsuario.DoesNotExist:
            pass

        return Response({
            'ok': True,
            'mensaje': 'Usuario movido a papelera',
            'carpetas_desactivadas': carpetas_desactivadas,
            'carpetas_transferidas': carpetas_transferidas,
            'movimientos_desactivados': movimientos_desactivados,
        })


# ── Admin: resetear password ──────────────────────────────────────────────────

class AdminResetPasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        err = _require_superuser(request)
        if err:
            return err
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado.'}, status=404)

        alphabet = string.ascii_letters + string.digits
        base = ''.join(secrets.choice(alphabet) for _ in range(9))
        temp_password = base[:4].upper() + base[4:8] + '1'

        user.set_password(temp_password)
        user.save(update_fields=['password'])

        try:
            send_mail(
                subject='Tu nueva contraseña en Mi Estudio',
                message=(
                    f'Hola {user.first_name},\n\n'
                    f'Tu contraseña fue restablecida.\n'
                    f'Nueva contraseña temporal: {temp_password}\n\n'
                    'Cambiala después de iniciar sesión.'
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@miestudio.com'),
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response({'ok': True, 'temp_password': temp_password})


# ── Perfil propio ─────────────────────────────────────────────────────────────

class PerfilView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    CAMPOS_EDITABLES = [
        'nombre', 'apellido', 'telefono', 'colegio_abogados',
        'matricula_tomo', 'matricula_folio', 'matricula_numero',
        'numero_jubilacion', 'cuil_cuit', 'condicion_fiscal',
        'domicilio_real', 'domicilio_electronico', 'notificaciones_email',
    ]

    def get(self, request):
        user = request.user
        try:
            p = user.perfil
        except PerfilUsuario.DoesNotExist:
            return Response({'error': 'Perfil no encontrado.'}, status=404)

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
            'nombre': p.nombre,
            'apellido': p.apellido,
            'telefono': p.telefono,
            'plan': p.plan,
            'email_verificado': p.email_verificado,
            'fecha_registro': p.fecha_registro,
            'ultimo_acceso': p.ultimo_acceso,
            'colegio_abogados': p.colegio_abogados,
            'matricula_tomo': p.matricula_tomo,
            'matricula_folio': p.matricula_folio,
            'matricula_numero': p.matricula_numero,
            'numero_jubilacion': p.numero_jubilacion,
            'cuil_cuit': p.cuil_cuit,
            'condicion_fiscal': p.condicion_fiscal,
            'domicilio_real': p.domicilio_real,
            'domicilio_electronico': p.domicilio_electronico,
            'notificaciones_email': p.notificaciones_email,
            'tiene_password': user.has_usable_password(),
        })

    def patch(self, request):
        user = request.user
        try:
            p = user.perfil
        except PerfilUsuario.DoesNotExist:
            return Response({'error': 'Perfil no encontrado.'}, status=404)

        for campo in self.CAMPOS_EDITABLES:
            if campo in request.data:
                setattr(p, campo, request.data[campo])
        p.save()
        return Response({'ok': True})


# ── Credenciales MEV ─────────────────────────────────────────────────────────

class PerfilMevView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            p = request.user.perfil
        except PerfilUsuario.DoesNotExist:
            return Response({'error': 'Perfil no encontrado.'}, status=404)
        return Response({
            'mev_usuario': p.mev_usuario,
            'mev_depto': p.mev_depto,
            'tiene_clave': bool(p.mev_clave),
        })

    def patch(self, request):
        try:
            p = request.user.perfil
        except PerfilUsuario.DoesNotExist:
            return Response({'error': 'Perfil no encontrado.'}, status=404)

        from django.conf import settings as dj_settings
        key = getattr(dj_settings, 'MEV_ENCRYPTION_KEY', '')
        if not key:
            return Response({'error': 'MEV_ENCRYPTION_KEY no configurada en el servidor.'}, status=503)

        if 'mev_usuario' in request.data:
            p.mev_usuario = request.data['mev_usuario'].strip()
        if 'mev_depto' in request.data:
            p.mev_depto = request.data['mev_depto'].strip()
        if 'mev_clave' in request.data and request.data['mev_clave']:
            import logging as _logging
            _logger = _logging.getLogger(__name__)
            _logger.warning('MEV clave recibida longitud: %d, repr: %s',
                            len(request.data['mev_clave']),
                            repr(request.data['mev_clave'][:5]))
            from cryptography.fernet import Fernet
            fernet = Fernet(key.encode() if isinstance(key, str) else key)
            p.mev_clave = fernet.encrypt(request.data['mev_clave'].encode()).decode()

        p.save(update_fields=['mev_usuario', 'mev_depto', 'mev_clave'])
        return Response({'ok': True})


# ── Cambiar contraseña ────────────────────────────────────────────────────────

class CambiarPasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        nueva = request.data.get('password_nueva', '')
        nueva2 = request.data.get('password_nueva2', '')

        if nueva != nueva2:
            return Response({'password_nueva2': 'Las contraseñas no coinciden.'}, status=400)

        from apps.authentication.views import _validar_password
        err = _validar_password(nueva)
        if err:
            return Response({'password_nueva': err}, status=400)

        user.set_password(nueva)
        user.save()
        return Response({'ok': True})
