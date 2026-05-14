from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Carpeta, CompartirCarpeta

User = get_user_model()

LIST_URL   = '/api/v1/carpetas/'
DETAIL_URL = '/api/v1/carpetas/{}/'


class CarpetaPermisosTest(APITestCase):
    """Verifica que el sistema de permisos de Carpeta funciona correctamente."""

    def setUp(self):
        self.user_a = User.objects.create_user('user_a', password='pass')
        self.user_b = User.objects.create_user('user_b', password='pass')
        self.carpeta_a = Carpeta.objects.create(
            nombre='Carpeta de A',
            propietario=self.user_a,
        )

    # ------------------------------------------------------------------
    # 1. Visibilidad: user B no debe ver carpetas ajenas
    # ------------------------------------------------------------------
    def test_usuario_no_ve_carpetas_de_otro(self):
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(LIST_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [c['id'] for c in response.data['results']]
        self.assertNotIn(
            self.carpeta_a.id, ids,
            'User B no debería ver la carpeta de User A',
        )

    def test_propietario_ve_su_propia_carpeta(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(LIST_URL)

        ids = [c['id'] for c in response.data['results']]
        self.assertIn(self.carpeta_a.id, ids)

    # ------------------------------------------------------------------
    # 2. Edición: user B sin acceso obtiene 404 (no está en su queryset)
    # ------------------------------------------------------------------
    def test_usuario_sin_acceso_no_puede_editar(self):
        self.client.force_authenticate(user=self.user_b)
        response = self.client.patch(
            DETAIL_URL.format(self.carpeta_a.id),
            {'nombre': 'Hackeado'},
        )
        self.assertEqual(
            response.status_code, status.HTTP_404_NOT_FOUND,
            'User B no tiene acceso → debe recibir 404, no 403 ni 200',
        )

    # ------------------------------------------------------------------
    # 3. Borrado: user B sin acceso obtiene 404
    # ------------------------------------------------------------------
    def test_usuario_sin_acceso_no_puede_borrar(self):
        self.client.force_authenticate(user=self.user_b)
        response = self.client.delete(DETAIL_URL.format(self.carpeta_a.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # La carpeta sigue activa
        self.carpeta_a.refresh_from_db()
        self.assertTrue(self.carpeta_a.activo)

    # ------------------------------------------------------------------
    # 4. Compartido solo-lectura: puede ver pero no modificar (403)
    # ------------------------------------------------------------------
    def test_compartido_readonly_no_puede_editar(self):
        CompartirCarpeta.objects.create(
            carpeta=self.carpeta_a,
            usuario=self.user_b,
            compartido_por=self.user_a,
            puede_editar=False,
        )
        self.client.force_authenticate(user=self.user_b)

        # La carpeta SÍ aparece en el listado
        response = self.client.get(LIST_URL)
        ids = [c['id'] for c in response.data['results']]
        self.assertIn(self.carpeta_a.id, ids, 'El compartido debe poder ver la carpeta')

        # Pero no puede editarla → 403
        response = self.client.patch(
            DETAIL_URL.format(self.carpeta_a.id),
            {'nombre': 'Intento de edición'},
        )
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN,
            'Compartido sin puede_editar debe recibir 403',
        )

    def test_compartido_readonly_no_puede_borrar(self):
        CompartirCarpeta.objects.create(
            carpeta=self.carpeta_a,
            usuario=self.user_b,
            compartido_por=self.user_a,
            puede_editar=False,
        )
        self.client.force_authenticate(user=self.user_b)
        response = self.client.delete(DETAIL_URL.format(self.carpeta_a.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.carpeta_a.refresh_from_db()
        self.assertTrue(self.carpeta_a.activo)

    # ------------------------------------------------------------------
    # 5. Compartido con escritura: puede editar (control positivo)
    # ------------------------------------------------------------------
    def test_compartido_con_edicion_puede_editar(self):
        CompartirCarpeta.objects.create(
            carpeta=self.carpeta_a,
            usuario=self.user_b,
            compartido_por=self.user_a,
            puede_editar=True,
        )
        self.client.force_authenticate(user=self.user_b)
        response = self.client.patch(
            DETAIL_URL.format(self.carpeta_a.id),
            {'nombre': 'Nombre editado'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.carpeta_a.refresh_from_db()
        self.assertEqual(self.carpeta_a.nombre, 'Nombre editado')
