import secrets
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone

from rest_framework import status, serializers
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from apps.usuarios.models import PerfilUsuario

User = get_user_model()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _enviar_email_verificacion(user, token):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    link = f"{frontend_url}/verificar-email?token={token}"
    cuerpo_txt = (
        f"Hola {user.first_name},\n\n"
        f"Para activar tu cuenta hacé click en:\n{link}\n\n"
        "Este link expira en 24 horas.\n"
        "Si no creaste esta cuenta, ignorá este email."
    )
    cuerpo_html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
      <h2 style="color:#4F46E5">Activá tu cuenta en Mi Estudio</h2>
      <p>Hola <strong>{user.first_name}</strong>,</p>
      <p>Para activar tu cuenta hacé click en el botón:</p>
      <p style="text-align:center;margin:32px 0">
        <a href="{link}"
           style="background:#4F46E5;color:white;padding:12px 28px;border-radius:8px;
                  text-decoration:none;font-weight:bold;display:inline-block">
          Activar mi cuenta
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px">Este link expira en 24 horas.</p>
      <p style="color:#6b7280;font-size:13px">Si no creaste esta cuenta, ignorá este email.</p>
    </div>
    """
    try:
        send_mail(
            subject="Activá tu cuenta en Mi Estudio",
            message=cuerpo_txt,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@miestudio.com'),
            recipient_list=[user.email],
            html_message=cuerpo_html,
            fail_silently=False,
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error("Error enviando email de verificación: %s", exc)


def _validar_password(password):
    if len(password) < 8:
        return 'La contraseña debe tener al menos 8 caracteres.'
    if not any(c.isupper() for c in password):
        return 'La contraseña debe contener al menos una mayúscula.'
    if not any(c.isdigit() for c in password):
        return 'La contraseña debe contener al menos un número.'
    return None


# ── Login ─────────────────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get(self.username_field, '').strip()
        password = attrs.get('password', '')

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError({'detail': 'Credenciales incorrectas.'})

        if not user.check_password(password):
            raise serializers.ValidationError({'detail': 'Credenciales incorrectas.'})

        try:
            perfil = user.perfil
            if not perfil.activo:
                raise serializers.ValidationError({
                    'detail': 'Tu cuenta fue desactivada. Contactá al administrador.',
                    'code': 'cuenta_desactivada',
                })
            if not user.is_active and not perfil.email_verificado:
                raise serializers.ValidationError({
                    'detail': 'Debés verificar tu email antes de iniciar sesión.',
                    'code': 'email_no_verificado',
                })
        except PerfilUsuario.DoesNotExist:
            pass

        if not user.is_active:
            raise serializers.ValidationError({'detail': 'Tu cuenta está inactiva.'})

        refresh = RefreshToken.for_user(user)

        try:
            user.perfil.ultimo_acceso = timezone.now()
            user.perfil.save(update_fields=['ultimo_acceso'])
        except PerfilUsuario.DoesNotExist:
            pass

        self.user = user
        nombre = apellido = plan = ''
        try:
            nombre = user.perfil.nombre
            apellido = user.perfil.apellido
            plan = user.perfil.plan
        except PerfilUsuario.DoesNotExist:
            pass

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'username': user.username,
            'email': user.email,
            'user_id': user.id,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
            'nombre': nombre,
            'apellido': apellido,
            'plan': plan,
        }


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


# ── Logout ───────────────────────────────────────────────────────────────────

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Se requiere el refresh token.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response({'error': 'Token inválido o ya expirado.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': 'Sesión cerrada correctamente.'})


# ── Perfil ────────────────────────────────────────────────────────────────────

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
        }
        try:
            p = user.perfil
            data.update({'nombre': p.nombre, 'apellido': p.apellido,
                         'plan': p.plan, 'email_verificado': p.email_verificado})
        except PerfilUsuario.DoesNotExist:
            data.update({'nombre': user.first_name, 'apellido': user.last_name,
                         'plan': 'free', 'email_verificado': False})
        return Response(data)


# ── Registro ─────────────────────────────────────────────────────────────────

class RegistroView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        nombre = request.data.get('nombre', '').strip()
        apellido = request.data.get('apellido', '').strip()
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        password2 = request.data.get('password2', '')

        errors = {}
        if not nombre:
            errors['nombre'] = 'El nombre es obligatorio.'
        if not apellido:
            errors['apellido'] = 'El apellido es obligatorio.'
        if not username:
            errors['username'] = 'El nombre de usuario es obligatorio.'
        if not email:
            errors['email'] = 'El email es obligatorio.'
        if not password:
            errors['password'] = 'La contraseña es obligatoria.'
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        if (User.objects.filter(username__iexact=username).exists() or
                PerfilUsuario.objects.filter(username_display__iexact=username).exists()):
            errors['username'] = 'Este nombre de usuario ya está en uso.'
        if User.objects.filter(email__iexact=email).exists():
            errors['email'] = 'Este email ya está registrado.'
        if password != password2:
            errors['password2'] = 'Las contraseñas no coinciden.'
        elif (err := _validar_password(password)):
            errors['password'] = err
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username, email=email, password=password,
            first_name=nombre, last_name=apellido, is_active=False,
        )

        token = secrets.token_urlsafe(32)
        try:
            perfil = user.perfil
            perfil.username_display = username
            perfil.nombre = nombre
            perfil.apellido = apellido
            perfil.email_verificado = False
            perfil.token_verificacion = token
            perfil.fecha_token = timezone.now()
            perfil.activo = True
            perfil.save()
        except PerfilUsuario.DoesNotExist:
            PerfilUsuario.objects.create(
                usuario=user, nombre=nombre, apellido=apellido,
                username_display=username, email_verificado=False,
                token_verificacion=token, fecha_token=timezone.now(), activo=True,
            )

        _enviar_email_verificacion(user, token)
        return Response(
            {'mensaje': 'Registro exitoso. Revisá tu email para activar tu cuenta.'},
            status=status.HTTP_201_CREATED,
        )


# ── Verificar email ───────────────────────────────────────────────────────────

class VerificarEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get('token', '')
        if not token:
            return Response({'error': 'Token requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            perfil = PerfilUsuario.objects.select_related('usuario').get(token_verificacion=token)
        except PerfilUsuario.DoesNotExist:
            return Response({'error': 'Token inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if not perfil.fecha_token or (timezone.now() - perfil.fecha_token) > timedelta(hours=24):
            return Response(
                {'error': 'El token expiró. Solicitá un nuevo email de verificación.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = perfil.usuario
        user.is_active = True
        user.save(update_fields=['is_active'])
        perfil.email_verificado = True
        perfil.token_verificacion = ''
        perfil.fecha_token = None
        perfil.save(update_fields=['email_verificado', 'token_verificacion', 'fecha_token'])

        return Response({'mensaje': '¡Email verificado! Ya podés iniciar sesión.'})


# ── Reenviar verificación ─────────────────────────────────────────────────────

class ReenviarVerificacionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'mensaje': 'Si el email existe, recibirás un nuevo link de verificación.'})

        if user.is_active:
            return Response({'error': 'Esta cuenta ya está verificada.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            perfil = user.perfil
        except PerfilUsuario.DoesNotExist:
            return Response({'mensaje': 'Si el email existe, recibirás un nuevo link de verificación.'})

        if perfil.fecha_token and (timezone.now() - perfil.fecha_token) < timedelta(minutes=5):
            return Response(
                {'error': 'Esperá 5 minutos antes de solicitar otro email.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        token = secrets.token_urlsafe(32)
        perfil.token_verificacion = token
        perfil.fecha_token = timezone.now()
        perfil.save(update_fields=['token_verificacion', 'fecha_token'])
        _enviar_email_verificacion(user, token)

        return Response({'mensaje': 'Si el email existe, recibirás un nuevo link de verificación.'})


# ── Verificar username disponible ─────────────────────────────────────────────

class VerificarUsernameView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        username = request.query_params.get('username', '').strip()
        if not username:
            return Response({'disponible': False})
        ocupado = (
            User.objects.filter(username__iexact=username).exists() or
            PerfilUsuario.objects.filter(username_display__iexact=username).exists()
        )
        return Response({'disponible': not ocupado})


# ── Google OAuth ──────────────────────────────────────────────────────────────

class GoogleAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token', '').strip()
        if not token:
            return Response({'error': 'Token requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        if not getattr(settings, 'GOOGLE_CLIENT_ID', ''):
            return Response({'error': 'Google OAuth no configurado.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests
            idinfo = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError as exc:
            return Response({'error': f'Token de Google inválido: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

        email = idinfo.get('email', '').lower()
        nombre = idinfo.get('given_name', '')
        apellido = idinfo.get('family_name', '')

        if not email:
            return Response({'error': 'No se pudo obtener el email de Google.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Email nuevo → pedir username antes de crear la cuenta
            return Response({
                'requiere_username': True,
                'google_email': email,
                'google_nombre': nombre,
                'google_apellido': apellido,
                'google_token': token,
            })

        # Verificar que la cuenta esté activa
        try:
            perfil = user.perfil
            if not perfil.activo:
                return Response(
                    {'error': 'Tu cuenta fue desactivada. Contactá al administrador.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            # Si existía con registro normal pero no había verificado: activar vía Google
            if not user.is_active:
                user.is_active = True
                user.save(update_fields=['is_active'])
                perfil.email_verificado = True
                perfil.save(update_fields=['email_verificado'])
        except PerfilUsuario.DoesNotExist:
            pass

        # Actualizar último acceso
        try:
            user.perfil.ultimo_acceso = timezone.now()
            user.perfil.save(update_fields=['ultimo_acceso'])
        except PerfilUsuario.DoesNotExist:
            pass

        refresh = RefreshToken.for_user(user)
        nombre_r = apellido_r = plan = ''
        try:
            nombre_r = user.perfil.nombre
            apellido_r = user.perfil.apellido
            plan = user.perfil.plan
        except PerfilUsuario.DoesNotExist:
            nombre_r, apellido_r = user.first_name, user.last_name

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'username': user.username,
            'email': user.email,
            'user_id': user.id,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
            'nombre': nombre_r,
            'apellido': apellido_r,
            'plan': plan,
        })


# ── Google: completar registro con username elegido ───────────────────────────

class GoogleCompletarRegistroView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        google_token = request.data.get('google_token', '').strip()
        username = request.data.get('username', '').strip()

        if not google_token or not username:
            return Response({'error': 'Datos incompletos.'}, status=status.HTTP_400_BAD_REQUEST)

        if not getattr(settings, 'GOOGLE_CLIENT_ID', ''):
            return Response({'error': 'Google OAuth no configurado.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests
            idinfo = google_id_token.verify_oauth2_token(
                google_token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError as exc:
            return Response({'error': f'Token de Google inválido: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

        email = idinfo.get('email', '').lower()
        nombre = idinfo.get('given_name', '')
        apellido = idinfo.get('family_name', '')

        if not email:
            return Response({'error': 'No se pudo obtener el email de Google.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'El email ya está registrado.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(username) < 3:
            return Response({'username': 'El nombre de usuario debe tener al menos 3 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

        if (User.objects.filter(username__iexact=username).exists() or
                PerfilUsuario.objects.filter(username_display__iexact=username).exists()):
            return Response({'username': 'Este nombre de usuario ya está en uso.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=nombre,
            last_name=apellido,
            is_active=True,
        )
        user.set_unusable_password()
        user.save(update_fields=['password'])

        try:
            perfil = user.perfil
            perfil.nombre = nombre
            perfil.apellido = apellido
            perfil.username_display = username
            perfil.email_verificado = True
            perfil.activo = True
            perfil.save()
        except PerfilUsuario.DoesNotExist:
            PerfilUsuario.objects.create(
                usuario=user, nombre=nombre, apellido=apellido,
                username_display=username, email_verificado=True, activo=True,
            )

        try:
            user.perfil.ultimo_acceso = timezone.now()
            user.perfil.save(update_fields=['ultimo_acceso'])
        except PerfilUsuario.DoesNotExist:
            pass

        refresh = RefreshToken.for_user(user)
        nombre_r = apellido_r = plan = ''
        try:
            nombre_r = user.perfil.nombre
            apellido_r = user.perfil.apellido
            plan = user.perfil.plan
        except PerfilUsuario.DoesNotExist:
            nombre_r, apellido_r = user.first_name, user.last_name

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'username': user.username,
            'email': user.email,
            'user_id': user.id,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
            'nombre': nombre_r,
            'apellido': apellido_r,
            'plan': plan,
        }, status=status.HTTP_201_CREATED)
