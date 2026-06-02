import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, ShieldCheck, KeyRound, UserX, UserCheck, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useTheme } from '../../contexts/ThemeContext'

const PLAN_LABELS = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }
const PLAN_COLORS = { free: 'bg-gray-100 text-gray-600', pro: 'bg-blue-100 text-blue-700', enterprise: 'bg-purple-100 text-purple-700' }

function fmt(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) }
  catch { return '—' }
}

export default function AdminUsuariosPage() {
  const { dark } = useTheme()
  const [usuarios, setUsuarios] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroPlan, setFiltroPlan] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [page, setPage] = useState(1)
  const [resetModal, setResetModal] = useState(null)
  const [tempPwd, setTempPwd] = useState('')
  const [desactivarModal, setDesactivarModal] = useState(null) // usuario a desactivar
  const [desactivandoId, setDesactivandoId] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: 20 }
      if (search) params.search = search
      if (filtroPlan) params.plan = filtroPlan
      if (filtroEstado) params.estado = filtroEstado
      const res = await api.get('/usuarios/admin/lista/', { params })
      setUsuarios(res.data.results)
      setCount(res.data.count)
    } catch { toast.error('Error al cargar usuarios') }
    finally { setLoading(false) }
  }, [page, search, filtroPlan, filtroEstado])

  useEffect(() => { cargar() }, [cargar])

  const reactivar = async (u) => {
    try {
      await api.patch(`/usuarios/admin/${u.id}/`, { activo: true })
      toast.success('Usuario activado')
      cargar()
    } catch { toast.error('Error al activar usuario') }
  }

  const confirmarDesactivar = async () => {
    if (!desactivarModal) return
    setDesactivandoId(desactivarModal.id)
    try {
      const res = await api.delete(`/usuarios/admin/${desactivarModal.id}/`)
      const { carpetas_desactivadas, carpetas_transferidas, movimientos_desactivados } = res.data
      const partes = []
      if (carpetas_desactivadas > 0) partes.push(`${carpetas_desactivadas} carpeta${carpetas_desactivadas !== 1 ? 's' : ''} desactivada${carpetas_desactivadas !== 1 ? 's' : ''}`)
      if (carpetas_transferidas > 0) partes.push(`${carpetas_transferidas} transferida${carpetas_transferidas !== 1 ? 's' : ''}`)
      if (movimientos_desactivados > 0) partes.push(`${movimientos_desactivados} movimiento${movimientos_desactivados !== 1 ? 's' : ''}`)
      const resumen = partes.length ? partes.join(', ') + ' movidos a papelera.' : ''
      toast.success(`Usuario desactivado. ${resumen}`)
      setDesactivarModal(null)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al desactivar usuario')
    } finally {
      setDesactivandoId(null)
    }
  }

  const cambiarPlan = async (u, plan) => {
    try {
      await api.patch(`/usuarios/admin/${u.id}/`, { plan })
      toast.success(`Plan actualizado a ${PLAN_LABELS[plan]}`)
      cargar()
    } catch { toast.error('Error al cambiar plan') }
  }

  const resetPassword = async (u) => {
    try {
      const res = await api.post(`/usuarios/admin/${u.id}/resetear-password/`)
      setTempPwd(res.data.temp_password || '(enviado por email)')
      setResetModal(u)
      toast.success('Contraseña restablecida')
    } catch { toast.error('Error al restablecer contraseña') }
  }

  const th = `px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider ${dark ? 'text-gray-400' : 'text-gray-500'}`
  const td = `px-3 py-2.5 text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={22} className="text-accent" />
        <h1 className="text-xl font-bold uppercase">Administración de Usuarios</h1>
        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
          {count} usuario{count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filtros */}
      <div className={`p-3 rounded-lg shadow flex flex-wrap gap-2 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nombre, email o usuario..."
            className={`w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border ${dark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
          />
        </div>
        <select value={filtroPlan} onChange={e => { setFiltroPlan(e.target.value); setPage(1) }}
          className={`px-2 py-1.5 text-xs rounded-lg border ${dark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <option value="">Todos los planes</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(1) }}
          className={`px-2 py-1.5 text-xs rounded-lg border ${dark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
          <option value="no_verificado">Sin verificar</option>
        </select>
        <button onClick={cargar} className={`p-1.5 rounded-lg ${dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}><RefreshCw size={14} /></button>
      </div>

      {/* Tabla */}
      <div className={`rounded-lg shadow overflow-hidden ${dark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={dark ? 'bg-gray-900' : 'bg-gray-50'}>
              <tr>
                <th className={th}>Nombre</th>
                <th className={th}>Usuario</th>
                <th className={th}>Email</th>
                <th className={th}>Plan</th>
                <th className={th}>Estado</th>
                <th className={th}>Último acceso</th>
                <th className={`${th} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500">Cargando...</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500">Sin resultados</td></tr>
              ) : usuarios.map(u => (
                <tr key={u.id} className={`${dark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} ${!u.activo ? (dark ? 'opacity-60' : 'opacity-70') : ''}`}>
                  <td className={td}>
                    <span className="font-medium">{u.apellido}, {u.nombre}</span>
                    {u.is_superuser && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">admin</span>}
                  </td>
                  <td className={`${td} font-mono text-xs`}>{u.username}</td>
                  <td className={`${td} max-w-[180px] truncate`}>{u.email}</td>
                  <td className={td}>
                    <select
                      value={u.plan}
                      onChange={e => cambiarPlan(u, e.target.value)}
                      disabled={!u.activo}
                      className={`text-xs px-1.5 py-0.5 rounded ${PLAN_COLORS[u.plan] || PLAN_COLORS.free} border-0 cursor-pointer disabled:cursor-not-allowed`}
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </td>
                  <td className={td}>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      !u.activo ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                      !u.email_verificado ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {!u.activo ? 'Inactivo' : !u.email_verificado ? 'Sin verificar' : 'Activo'}
                    </span>
                  </td>
                  <td className={`${td} text-xs`}>{fmt(u.ultimo_acceso)}</td>
                  <td className={`${td} text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      {u.activo ? (
                        <button
                          onClick={() => setDesactivarModal(u)}
                          title="Desactivar usuario"
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          <UserX size={14} className="text-red-500" />
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivar(u)}
                          title="Reactivar usuario"
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          <UserCheck size={14} className="text-green-500" />
                        </button>
                      )}
                      <button
                        onClick={() => resetPassword(u)}
                        title="Resetear contraseña"
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <KeyRound size={14} className="text-blue-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {count > 20 && (
        <div className="flex justify-center gap-2 text-sm">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">
            Anterior
          </button>
          <span className="px-2 py-1 text-gray-500">Pág. {page} / {Math.ceil(count / 20)}</span>
          <button disabled={page * 20 >= count} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">
            Siguiente
          </button>
        </div>
      )}

      {/* Modal contraseña temporal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-xl p-6 max-w-sm w-full ${dark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="font-bold mb-3">Contraseña restablecida</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Contraseña temporal para <strong>{resetModal.username}</strong>:
            </p>
            <div className={`font-mono text-lg text-center py-2 px-4 rounded ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {tempPwd}
            </div>
            <p className="text-xs text-gray-500 mt-2">Se envió por email al usuario.</p>
            <button
              onClick={() => { setResetModal(null); setTempPwd('') }}
              className="mt-4 w-full py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal confirmación desactivar */}
      {desactivarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-xl p-6 max-w-sm w-full ${dark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <h3 className="font-bold text-base">¿Desactivar usuario?</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              ¿Estás seguro que querés desactivar a{' '}
              <strong>{desactivarModal.nombre} {desactivarModal.apellido}</strong>?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              Se moverán a la papelera todas sus carpetas y movimientos que no estén compartidos con otros usuarios. Las carpetas compartidas se transferirán al colaborador más antiguo.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDesactivarModal(null)}
                disabled={!!desactivandoId}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${dark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'} disabled:opacity-50`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDesactivar}
                disabled={!!desactivandoId}
                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {desactivandoId ? 'Desactivando...' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
