import axios from 'axios'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

console.log('🔧 API_URL configurada:', API_URL)

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Instancia separada para el refresh (sin interceptores, evita loops)
const authApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    console.log('📤 Petición a:', config.url)
    console.log('🔑 Token existe:', token ? 'SÍ' : 'NO')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('✅ Token agregado al header')
    } else {
      console.warn('⚠️ No hay token disponible')
    }

    return config
  },
  (error) => {
    console.error('❌ Error en interceptor request:', error)
    return Promise.reject(error)
  }
)

function clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('auth-storage')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// Interceptor para manejar 401 con refresh de token
api.interceptors.response.use(
  (response) => {
    console.log('✅ Respuesta exitosa de:', response.config.url)
    return response
  },
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    console.error('❌ Error en respuesta:', status, error.config?.url)

    if (status === 403) {
      toast.error('No tenés permisos para modificar este elemento. Tenés acceso de solo lectura.')
      error._403handled = true
      return Promise.reject(error)
    }

    if (status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')

      if (!refreshToken) {
        console.warn('⚠️ No hay refresh token, redirigiendo a login')
        clearSession()
        return Promise.reject(error)
      }

      originalRequest._retry = true
      console.log('🔄 Intentando refrescar token...')

      try {
        // Usamos authApi (sin interceptores) para evitar loops infinitos
        const response = await authApi.post('/auth/refresh/', {
          refresh: refreshToken,
        })

        const { access } = response.data
        localStorage.setItem('access_token', access)
        console.log('✅ Token refrescado exitosamente')

        originalRequest.headers.Authorization = `Bearer ${access}`
        return api(originalRequest)
      } catch (refreshError) {
        console.error('❌ Error al refrescar token:', refreshError)
        clearSession()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
