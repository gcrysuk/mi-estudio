import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import api from '../../services/api'

export default function VerificarEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [estado, setEstado] = useState('loading') // 'loading' | 'ok' | 'error'
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (!token) { setEstado('error'); setMensaje('No se proporcionó un token.'); return }
    api.get(`/auth/verificar-email/?token=${encodeURIComponent(token)}`)
      .then(res => { setEstado('ok'); setMensaje(res.data.mensaje || '¡Cuenta verificada!') })
      .catch(err => { setEstado('error'); setMensaje(err.response?.data?.error || 'Token inválido o expirado.') })
  }, [token])

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl text-center max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg mb-4 mx-auto">
        <span className="text-2xl">⚖️</span>
      </div>

      {estado === 'loading' && (
        <>
          <Loader size={32} className="animate-spin text-accent mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Verificando tu email...</p>
        </>
      )}

      {estado === 'ok' && (
        <>
          <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">¡Email verificado!</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{mensaje}</p>
          <Link
            to="/login"
            className="inline-block bg-accent hover:bg-accent-hover text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Ir al login
          </Link>
        </>
      )}

      {estado === 'error' && (
        <>
          <XCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Verificación fallida</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{mensaje}</p>
          <Link to="/login" className="text-accent hover:underline text-sm">
            Volver al login
          </Link>
        </>
      )}
    </div>
  )
}
