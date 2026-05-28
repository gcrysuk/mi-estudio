import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import useAuthStore from '../../stores/authStore'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [reenvioEmail, setReenvioEmail] = useState('')
  const [reenvioMsg, setReenvioMsg] = useState('')
  const [reenvioLoading, setReenvioLoading] = useState(false)
  const login = useAuthStore(state => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setErrorCode('')
    const result = await login(username, password)
    if (result.ok) {
      navigate('/dashboard', { replace: true })
    } else {
      setError(result.detail || 'Usuario o contraseña incorrectos')
      setErrorCode(result.code || '')
    }
  }

  const handleReenviar = async () => {
    setReenvioLoading(true)
    setReenvioMsg('')
    try {
      const res = await api.post('/auth/reenviar-verificacion/', { email: reenvioEmail })
      setReenvioMsg(res.data.mensaje || 'Email enviado.')
    } catch (err) {
      setReenvioMsg(err.response?.data?.error || 'Error al reenviar.')
    } finally {
      setReenvioLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-lg mb-4">
          <span className="text-3xl">⚖️</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Estudio</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistema de gestión jurídica</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {errorCode === 'email_no_verificado' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 mb-4 text-sm space-y-2">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">Reenviar email de verificación</p>
          <input
            type="email"
            value={reenvioEmail}
            onChange={e => setReenvioEmail(e.target.value)}
            placeholder="Tu email"
            className="w-full px-3 py-1.5 text-sm rounded border border-yellow-300 dark:border-yellow-600 bg-white dark:bg-gray-700"
          />
          <button
            type="button"
            onClick={handleReenviar}
            disabled={reenvioLoading || !reenvioEmail}
            className="w-full py-1.5 text-xs rounded bg-yellow-500 hover:bg-yellow-600 text-white font-medium disabled:opacity-50 transition-colors"
          >
            {reenvioLoading ? 'Enviando...' : 'Reenviar email'}
          </button>
          {reenvioMsg && <p className="text-yellow-700 dark:text-yellow-300 text-xs">{reenvioMsg}</p>}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-accent"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-accent"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Ingresar
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        ¿No tenés cuenta?{' '}
        <Link to="/registro" className="text-accent hover:underline font-medium">
          Registrate
        </Link>
      </p>
    </div>
  )
}

export default Login
