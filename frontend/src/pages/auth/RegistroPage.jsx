import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import api from '../../services/api'
import GoogleAuthButton from '../../components/auth/GoogleAuthButton'

const INPUT = "w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-accent text-sm"
const LABEL = "block text-sm font-medium mb-1"

export default function RegistroPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '', apellido: '', username: '', email: '',
    password: '', password2: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [registrado, setRegistrado] = useState(false)
  const [emailRegistrado, setEmailRegistrado] = useState('')

  // Username validation
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'ok' | 'taken'
  const debounceRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!form.username || form.username.length < 3) { setUsernameStatus(null); return }
    setUsernameStatus('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/verificar-username/?username=${encodeURIComponent(form.username)}`)
        setUsernameStatus(res.data.disponible ? 'ok' : 'taken')
      } catch { setUsernameStatus(null) }
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [form.username])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await api.post('/auth/registro/', form)
      setEmailRegistrado(form.email)
      setRegistrado(true)
    } catch (err) {
      setErrors(err.response?.data || { general: 'Error al registrarse.' })
    } finally {
      setLoading(false)
    }
  }

  const handleReenviar = async () => {
    setLoading(true)
    try {
      await api.post('/auth/reenviar-verificacion/', { email: emailRegistrado })
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }

  if (registrado) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">¡Registro exitoso!</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          Te enviamos un email a <strong>{emailRegistrado}</strong>.<br />
          Revisá tu bandeja y hacé click en el link para activar tu cuenta.
        </p>
        <button
          onClick={handleReenviar}
          disabled={loading}
          className="text-accent hover:underline text-sm disabled:opacity-50"
        >
          {loading ? 'Enviando...' : '¿No llegó? Reenviar email'}
        </button>
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <Link to="/login" className="text-sm text-accent hover:underline">
            Volver al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
      <div className="flex flex-col items-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg mb-3">
          <span className="text-2xl">⚖️</span>
        </div>
        <h1 className="text-xl font-bold">Crear cuenta</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mi Estudio</p>
      </div>

      {errors.general && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 text-red-700 dark:text-red-300 px-3 py-2 rounded text-sm mb-4">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Nombre *</label>
            <input type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)} className={INPUT} required />
            {errors.nombre && <p className="text-red-500 text-xs mt-0.5">{errors.nombre}</p>}
          </div>
          <div>
            <label className={LABEL}>Apellido *</label>
            <input type="text" value={form.apellido} onChange={e => set('apellido', e.target.value)} className={INPUT} required />
            {errors.apellido && <p className="text-red-500 text-xs mt-0.5">{errors.apellido}</p>}
          </div>
        </div>

        <div>
          <label className={LABEL}>Nombre de usuario *</label>
          <div className="relative">
            <input
              type="text"
              value={form.username}
              onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
              className={`${INPUT} pr-8`}
              required
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking' && <Loader size={14} className="animate-spin text-gray-400" />}
              {usernameStatus === 'ok' && <CheckCircle size={14} className="text-green-500" />}
              {usernameStatus === 'taken' && <XCircle size={14} className="text-red-500" />}
            </span>
          </div>
          {usernameStatus === 'taken' && <p className="text-red-500 text-xs mt-0.5">Este usuario ya está en uso</p>}
          {usernameStatus === 'ok' && <p className="text-green-500 text-xs mt-0.5">Disponible</p>}
          {errors.username && <p className="text-red-500 text-xs mt-0.5">{errors.username}</p>}
        </div>

        <div>
          <label className={LABEL}>Email *</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={INPUT} required />
          {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Contraseña *</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={INPUT} required />
            {errors.password && <p className="text-red-500 text-xs mt-0.5">{errors.password}</p>}
          </div>
          <div>
            <label className={LABEL}>Confirmar *</label>
            <input type="password" value={form.password2} onChange={e => set('password2', e.target.value)} className={INPUT} required />
            {errors.password2 && <p className="text-red-500 text-xs mt-0.5">{errors.password2}</p>}
          </div>
        </div>
        <p className="text-xs text-gray-400">Mínimo 8 caracteres, una mayúscula y un número.</p>

        <button
          type="submit"
          disabled={loading || usernameStatus === 'taken'}
          className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 mt-2"
        >
          {loading ? 'Registrando...' : 'Crear cuenta'}
        </button>
      </form>

      {/* Separador */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">o</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Google */}
      <div className="flex justify-center">
        <GoogleAuthButton onSuccess={() => navigate('/dashboard', { replace: true })} />
      </div>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="text-accent hover:underline font-medium">Iniciar sesión</Link>
      </p>
    </div>
  )
}
