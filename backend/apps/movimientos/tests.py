from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.carpetas.models import Carpeta, CompartirCarpeta
from .models import Movimiento

User = get_user_model()

LIST_URL   = '/api/v1/movimientos/'
DETAIL_URL = '/api/v1/movimientos/{}/'


def make_movimiento(creado_por, carpeta=None, titulo='Test'):
    return Movimiento.objects.create(
        titulo=titulo,
        creado_por=creado_por,
        carpeta=carpeta,
        fecha_movimiento=timezone.now(),
    )


class MovimientoVisibilidadTest(APITestCase):
    """Movimientos sin carpeta solo los ve su creador."""

    def setUp(self):
        self.user_a = User.objects.create_user('mov_user_a', password='pass')
        self.user_b = User.objects.create_user('mov_user_b', password='pass')

    def test_movimiento_sin_carpeta_invisible_para_otro_usuario(self):
        mov = make_movimiento(self.user_a, carpeta=None)

        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(LIST_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [m['id'] for m in response.data['results']]
        self.assertNotIn(
            mov.id, ids,
            'Un movimiento sin carpeta no debe ser visible para otro usuario',
        )

    def test_movimiento_sin_carpeta_visible_para_su_creador(self):
        mov = make_movimiento(self.user_a, carpeta=None)

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(LIST_URL)

        ids = [m['id'] for m in response.data['results']]
        self.assertIn(mov.id, ids, 'El creador debe ver su propio movimiento sin carpeta')


class MovimientoPermisosEscrituraTest(APITestCase):
    """Verifica que puede_editar se aplica al crear/editar/borrar movimientos."""

    def setUp(self):
        self.user_a = User.objects.create_user('mov_owner', password='pass')
        self.user_b = User.objects.create_user('mov_shared', password='pass')
        self.carpeta = Carpeta.objects.create(nombre='Carpeta Test', propietario=self.user_a)

    def test_usuario_sin_acceso_no_puede_crear_movimiento_en_carpeta_ajena(self):
        self.client.force_authenticate(user=self.user_b)
        response = self.client.post(LIST_URL, {
            'titulo': 'Intento',
            'carpeta': self.carpeta.id,
            'fecha_movimiento': timezone.now().isoformat(),
        })
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN,
            'User B no tiene acceso a la carpeta, debe recibir 403',
        )

    def test_compartido_readonly_no_puede_crear_movimiento(self):
        CompartirCarpeta.objects.create(
            carpeta=self.carpeta,
            usuario=self.user_b,
            compartido_por=self.user_a,
            puede_editar=False,
        )
        self.client.force_authenticate(user=self.user_b)
        response = self.client.post(LIST_URL, {
            'titulo': 'Intento readonly',
            'carpeta': self.carpeta.id,
            'fecha_movimiento': timezone.now().isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_compartido_readonly_no_puede_editar_movimiento(self):
        mov = make_movimiento(self.user_a, carpeta=self.carpeta)
        CompartirCarpeta.objects.create(
            carpeta=self.carpeta,
            usuario=self.user_b,
            compartido_por=self.user_a,
            puede_editar=False,
        )
        self.client.force_authenticate(user=self.user_b)
        response = self.client.patch(DETAIL_URL.format(mov.id), {'titulo': 'Hack'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_compartido_readonly_no_puede_borrar_movimiento(self):
        mov = make_movimiento(self.user_a, carpeta=self.carpeta)
        CompartirCarpeta.objects.create(
            carpeta=self.carpeta,
            usuario=self.user_b,
            compartido_por=self.user_a,
            puede_editar=False,
        )
        self.client.force_authenticate(user=self.user_b)
        response = self.client.delete(DETAIL_URL.format(mov.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        mov.refresh_from_db()
        self.assertTrue(mov.activo)

    def test_compartido_con_edicion_puede_crear_movimiento(self):
        CompartirCarpeta.objects.create(
            carpeta=self.carpeta,
            usuario=self.user_b,
            compartido_por=self.user_a,
            puede_editar=True,
        )
        self.client.force_authenticate(user=self.user_b)
        response = self.client.post(LIST_URL, {
            'titulo': 'Movimiento válido',
            'carpeta': self.carpeta.id,
            'fecha_movimiento': timezone.now().isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
