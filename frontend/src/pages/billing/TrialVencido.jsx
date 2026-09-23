import { AlertTriangle, LogOut } from 'lucide-react'
import useAuthStore from '../../stores/authStore'

const TrialVencido = () => {
  const logout = useAuthStore(state => state.logout)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-dark-surface rounded-xl shadow-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle size={26} className="text-red-500 dark:text-red-400" />
        </div>

        <div>
          <h2 className="text-lg font-bold uppercase mb-1">Período de prueba vencido</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Tu período de prueba de 90 días ha finalizado. Para continuar usando Mi Estudio
            necesitás suscribirte.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <a
            href="mailto:info-ventas@focustech.com.ar?subject=Suscripción Mi Estudio"
            className="block w-full py-2.5 px-4 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
          >
            Contactar para suscribirse
          </a>
          <p className="text-xs text-gray-400">
            📧 info-ventas@focustech.com.ar · 📞 +54 3487 534614
          </p>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default TrialVencido
