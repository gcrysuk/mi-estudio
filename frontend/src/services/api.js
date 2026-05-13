import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

console.log('🔧 API_URL configurada:', API_URL)

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token - VERSIÓN MEJORADA
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

// Interceptor para refresh token - VERSIÓN MEJORADA
api.interceptors.response.use(
  (response) => {
    console.log('✅ Respuesta exitosa de:', response.config.url)
    return response
  },
  async (error) => {
    const originalRequest = error.config
    console.error('❌ Error en respuesta:', error.response?.status, error.config?.url)

    const status = error.response?.status
    // Manejar tanto 401 como 403: ambos pueden indicar token expirado o ausente
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        originalRequest._retry = true
        console.log('🔄 Intentando refrescar token...')

        try {
          const response = await api.post('/auth/refresh/', {
            refresh: refreshToken,
          })

          const { access } = response.data
          localStorage.setItem('access_token', access)
          console.log('✅ Token refrescado exitosamente')

          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        } catch (refreshError) {
          console.error('❌ Error al refrescar token:', refreshError)
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('auth-storage')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        console.warn('⚠️ No hay refresh token, redirigiendo a login')
        localStorage.removeItem('access_token')
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
