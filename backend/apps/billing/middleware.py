# apps/billing/middleware.py
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import Suscripcion

User = get_user_model()

CACHE_TTL_SEGUNDOS = 300  # 5 minutos

WHITELIST_PREFIJOS = (
    '/api/v1/auth/',
    '/api/v1/billing/suscripcion/iniciar/',
    '/api/v1/billing/suscripcion/estado/',
    '/api/v1/billing/webhook/mp/',
    '/admin/',
    '/static/',
    '/media/',
)

_jwt_authenticator = JWTAuthentication()


class SuscripcionMiddleware:
    """Bloquea el acceso cuando la suscripción del usuario está suspendida.

    La API autentica con JWT (no con sesión), así que AuthenticationMiddleware
    no deja `request.user` resuelto para estas requests: acá lo resolvemos
    nosotros mismos a partir del header Authorization.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith(WHITELIST_PREFIJOS):
            return self.get_response(request)

        usuario = self._resolver_usuario(request)
        if usuario is None:
            return self.get_response(request)

        if usuario.is_superuser or usuario.is_staff:
            return self.get_response(request)

        datos = self._obtener_datos_suscripcion(usuario.id)
        if not datos['existe']:
            return self.get_response(request)

        if self._debe_bloquear(datos):
            return JsonResponse(
                {
                    'error': 'cuenta_suspendida',
                    'mensaje': 'Tu cuenta está suspendida por falta de pago. Por favor regularizá tu suscripción.',
                    'codigo': 402,
                },
                status=402,
            )

        return self.get_response(request)

    def _resolver_usuario(self, request):
        try:
            resultado = _jwt_authenticator.authenticate(request)
        except (InvalidToken, TokenError, AuthenticationFailed):
            return None
        if resultado is None:
            return None
        usuario, _token = resultado
        return usuario

    def _obtener_datos_suscripcion(self, user_id):
        cache_key = f'suscripcion_estado_{user_id}'
        datos = cache.get(cache_key)
        if datos is not None:
            return datos

        try:
            usuario = User.objects.select_related('suscripcion').get(pk=user_id)
            suscripcion = usuario.suscripcion
        except (User.DoesNotExist, Suscripcion.DoesNotExist):
            datos = {'existe': False}
        else:
            datos = {
                'existe': True,
                'estado': suscripcion.estado,
                'trial_hasta': suscripcion.trial_hasta,
            }

        cache.set(cache_key, datos, CACHE_TTL_SEGUNDOS)
        return datos

    @staticmethod
    def _debe_bloquear(datos):
        if datos['estado'] == 'suspendido':
            return True
        # Trial vencido: bloquea en el momento aunque el job diario
        # (chequear_trials_vencidos) todavía no haya pasado el estado
        # a 'activo'/'suspendido'.
        if datos['estado'] == 'trial' and datos['trial_hasta'] < timezone.now().date():
            return True
        return False
