import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, Loader, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../stores/authStore'

export default function GoogleUsernameModal({ googleData, onClose, onSuccess }) {
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'ok' | 'taken'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!username || username.length < 3) { setUsernameStatus(null); return }
    setUsernameStatus('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/verificar-username/?username=${encodeURIComponent(username)}`)
        setUsernameStatus(res.data.disponible ? 'ok' : 'taken')
      } catch { setUsernameStatus(null) }
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [username])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (usernameStatus !== 'ok') return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/google/completar_registro/', {
        google_token: googleData.google_token,
        username,
      })
      const data = res.data
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      useAuthStore.setState({
        token: data.access,
        refreshToken: data.refresh,
        user: {
          id: data.user_id, username: data.username, email: data.email,
          is_superuser: data.is_superuser, is_staff: data.is_staff,
          nombre: data.nombre, apellido: data.apellido, plan: data.plan,
        },
        isAuthenticated: true,
        isLoading: false,
      })
      toast.success(`¡Bienvenido, ${data.nombre || data.username}!`)
      onSuccess()
    } catch (err) {
      const errData = err.response?.data
      if (errData?.username) {
        setError(errData.username)
        setUsernameStatus('taken')
      } else {
        setError(errData?.error || 'Error al completar el registro.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-lg">¡Bienvenido!</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Elegí tu nombre de usuario para continuar con Google.
        </p>

        {/* Email de referencia (no editable) */}
        <div className="mb-4 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-500 dark:text-gray-400">
          {googleData.google_email}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre de usuario *</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full px-4 py-2 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-accent text-sm"
                required
                autoFocus
                placeholder="ej: gabriel_cruz"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && <Loader size={14} className="animate-spin text-gray-400" />}
                {usernameStatus === 'ok' && <CheckCircle size={14} className="text-green-500" />}
                {usernameStatus === 'taken' && <XCircle size={14} className="text-red-500" />}
              </span>
            </div>
            {usernameStatus === 'taken' && <p className="text-red-500 text-xs mt-0.5">Este usuario ya está en uso</p>}
            {usernameStatus === 'ok' && <p className="text-green-500 text-xs mt-0.5">Disponible</p>}
            {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || usernameStatus !== 'ok'}
            className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? 'Creando cuenta...' : 'Continuar →'}
          </button>
        </form>
      </div>
    </div>
  )
}
