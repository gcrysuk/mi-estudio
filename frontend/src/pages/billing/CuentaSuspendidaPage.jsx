import { useState } from 'react'
import { Lock, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const CuentaSuspendidaPage = () => {
  const [activando, setActivando] = useState(false)

  const handleRegularizar = async () => {
    setActivando(true)
    try {
      const res = await api.post('/billing/suscripcion/iniciar/')
      if (res.data?.init_point) {
        window.location.href = res.data.init_point
      } else {
        toast.error('No se pudo iniciar la suscripción')
        setActivando(false)
      }
    } catch {
      toast.error('No se pudo iniciar la suscripción')
      setActivando(false)
    }
  }

  const handleCerrarSesion = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth-storage')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm bg-white dark:bg-dark-surface rounded-xl shadow-xl p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <Lock size={26} className="text-red-500 dark:text-red-400" />
        </div>

        <h1 className="text-lg font-bold uppercase text-foreground">Cuenta suspendida</h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Tu cuenta está suspendida por falta de pago. Para reactivar tu acceso, regularizá tu suscripción.
        </p>

        <div className="space-y-2 pt-2">
          <button
            onClick={handleRegularizar}
            disabled={activando}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {activando ? 'Redirigiendo...' : 'Regularizar suscripción'}
          </button>

          <button
            onClick={handleCerrarSesion}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

export default CuentaSuspendidaPage
