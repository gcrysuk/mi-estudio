import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useAuthStore(state => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const success = await login(username, password)
    if (success) {
      navigate('/dashboard', { replace: true })
    } else {
      setError('Usuario o contraseña incorrectos')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-lg mb-4">
          <span className="text-3xl">⚖️</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Estudio</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistema de gestión jurídica</p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-accent"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Contraseña</label>
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
    </div>
  )
}

export default Login
