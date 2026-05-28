import { GoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../stores/authStore'

/**
 * Botón de Google reutilizable para Login y Registro.
 * Al completar el flujo llama al backend /auth/google/ y autentica al usuario.
 * onSuccess(data) recibe los datos del response si hay que hacer algo adicional.
 */
const GoogleAuthButton = ({ onSuccess, disabled }) => {
  const login = useAuthStore(state => state.login)

  const handleCredential = async (credentialResponse) => {
    const idToken = credentialResponse.credential
    if (!idToken) {
      toast.error('No se recibió el token de Google.')
      return
    }
    try {
      const res = await api.post('/auth/google/', { token: idToken })
      const { access, refresh, user_id, username, email, is_superuser, is_staff, nombre, apellido, plan } = res.data

      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)

      // Actualizar el store directamente (sin llamar a api.post('/auth/login/'))
      useAuthStore.setState({
        token: access,
        refreshToken: refresh,
        user: { id: user_id, username, email, is_superuser, is_staff, nombre, apellido, plan },
        isAuthenticated: true,
        isLoading: false,
      })

      toast.success(`Bienvenido, ${nombre || username}!`)
      if (onSuccess) onSuccess(res.data)
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al autenticar con Google.'
      toast.error(msg)
    }
  }

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <GoogleLogin
        onSuccess={handleCredential}
        onError={() => toast.error('Error al iniciar sesión con Google.')}
        useOneTap={false}
        theme="outline"
        size="large"
        text="continue_with"
        shape="rectangular"
        width="100%"
      />
    </div>
  )
}

export default GoogleAuthButton
