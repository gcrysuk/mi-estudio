import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, FolderOpen, Hash, User, Building2, Scale,
  FileText, Calendar, Clock, AlertCircle, Edit, Trash2,
  Plus, Users, ChevronDown, X, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import MovimientoForm from '../movimientos/MovimientoForm'
import CarpetaForm from '../../components/carpetas/CarpetaForm'

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (fecha, opts) =>
  fecha ? new Date(fecha).toLocaleDateString('es-AR', opts ?? { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const fmtDateTime = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const colorVencimiento = (mov) => {
  if (mov.vencido) return 'text-red-500 dark:text-red-400'
  if (!mov.fecha_vencimiento) return 'text-gray-400'
  const dias = Math.ceil((new Date(mov.fecha_vencimiento) - new Date()) / 86400000)
  if (dias <= 2) return 'text-orange-500'
  if (dias <= 5) return 'text-yellow-500'
  return 'text-green-600 dark:text-green-400'
}

// ── subcomponent: tarjeta de dato ─────────────────────────────────────────────
const InfoItem = ({ icon: Icon, label, value }) => {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
const CarpetaDetail = () => {
  const { id } = useParams()

  const [carpeta, setCarpeta]               = useState(null)
  const [movimientos, setMovimientos]       = useState([])
  const [loadingCarpeta, setLoadingCarpeta] = useState(true)
  const [loadingMovs, setLoadingMovs]       = useState(true)
  const [filtro, setFiltro]                 = useState('todos')
  const [search, setSearch]                 = useState('')
  const [editingMov, setEditingMov]         = useState(null)
  const [showMovForm, setShowMovForm]       = useState(false)
  const [showCarpetaForm, setShowCarpetaForm] = useState(false)

  useEffect(() => { fetchCarpeta() }, [id])
  useEffect(() => { fetchMovimientos() }, [id, filtro])

  const fetchMovimientos = async () => {
    setLoadingMovs(true)
    try {
      let url = `/movimientos/?carpeta=${id}`
      if (filtro === 'vencidos')  url = `/movimientos/vencidos/?carpeta=${id}`
      if (filtro === 'proximos')  url = `/movimientos/proximos_vencer/?dias=7&carpeta=${id}`
      const res = await api.get(url)
      setMovimientos(res.data.results ?? res.data)
    } catch {
      toast.error('Error al cargar los movimientos')
    } finally {
      setLoadingMovs(false)
    }
  }

  const fetchCarpeta = async () => {
    setLoadingCarpeta(true)
    try {
      const res = await api.get(`/carpetas/${id}/`)
      setCarpeta(res.data)
    } catch {
      toast.error('Error al cargar la carpeta')
    } finally {
      setLoadingCarpeta(false)
    }
  }

  const handleDeleteMov = async (movId) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    try {
      await api.delete(`/movimientos/${movId}/`)
      toast.success('Movimiento eliminado')
      fetchMovimientos()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const movsFiltrados = movimientos.filter(m =>
    !search ||
    m.titulo?.toLowerCase().includes(search.toLowerCase()) ||
    m.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
    m.tipo_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    m.estado_nombre?.toLowerCase().includes(search.toLowerCase())
  )

  // ── loading / not found ───────────────────────────────────────────────────
  if (loadingCarpeta) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        Cargando...
      </div>
    )
  }

  if (!carpeta) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <FolderOpen size={40} className="text-gray-300" />
        <p className="text-gray-500">Carpeta no encontrada</p>
        <Link to="/carpetas" className="text-accent text-sm hover:underline">Volver a carpetas</Link>
      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Link
          to="/carpetas"
          className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold truncate">{carpeta.nombre}</h1>

            {carpeta.estado_nombre && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${carpeta.estado_color ?? '#4FC3F7'}22`, color: carpeta.estado_color ?? '#4FC3F7' }}
              >
                {carpeta.estado_nombre}
              </span>
            )}
            {carpeta.tipo_nombre && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {carpeta.tipo_nombre}
              </span>
            )}
            {carpeta.objeto_nombre && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {carpeta.objeto_nombre}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            {carpeta.numero_expediente && (
              <span className="flex items-center gap-1">
                <Hash size={11} /> {carpeta.numero_expediente}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={11} /> Desde {fmt(carpeta.fecha_inicio)}
            </span>
            {carpeta.compartida_con_count > 0 && (
              <span className="flex items-center gap-1">
                <Users size={11} /> Compartida con {carpeta.compartida_con_count} usuario{carpeta.compartida_con_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowCarpetaForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
        >
          <Edit size={13} /> Editar
        </button>
      </div>

      {/* ── Info panel ── */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <InfoItem icon={User}      label="Cliente"     value={carpeta.persona_nombre} />
        <InfoItem icon={User}      label="Contraparte" value={carpeta.contraparte} />
        <InfoItem icon={Building2} label="Organismo"   value={carpeta.organismo_nombre} />
        <InfoItem icon={Scale}     label="Propietario" value={carpeta.propietario_nombre} />
        {carpeta.descripcion && (
          <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex items-start gap-2">
            <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Descripción</p>
              <p className="text-sm">{carpeta.descripcion}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Movimientos ── */}
      <div className="space-y-2">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase text-gray-700 dark:text-gray-300">
              Movimientos
            </span>
            {!loadingMovs && (
              <span className="text-xs text-gray-400">({movimientos.length})</span>
            )}
          </div>
          <button
            onClick={() => { setEditingMov(null); setShowMovForm(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase"
          >
            <Plus size={14} /> Nuevo movimiento
          </button>
        </div>

        {/* Filtros + búsqueda */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow px-3 py-2 flex flex-wrap items-center gap-2">
          {[
            { key: 'todos',    label: 'Todos' },
            { key: 'proximos', label: 'Próximos 7 días', icon: Clock },
            { key: 'vencidos', label: 'Vencidos',        icon: AlertCircle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg uppercase transition-colors ${
                filtro === key
                  ? key === 'vencidos' ? 'bg-red-500 text-white' : 'bg-accent text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {Icon && <Icon size={12} />} {label}
            </button>
          ))}

          <div className="relative ml-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-7 pr-7 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent w-44"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        {loadingMovs ? (
          <div className="text-center py-8 text-sm text-gray-500">Cargando movimientos...</div>
        ) : movsFiltrados.length === 0 ? (
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-8 text-center text-sm text-gray-500">
            {search ? 'Sin resultados para esa búsqueda' : 'No hay movimientos en esta carpeta'}
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Título</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Tipo</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide hidden md:table-cell">Estado</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Vencimiento</th>
                  <th className="px-4 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {movsFiltrados.map(mov => (
                  <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">

                    <td className="px-4 py-2.5 max-w-[220px]">
                      <p className="font-medium truncate">{mov.titulo}</p>
                      {mov.descripcion && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{mov.descripcion}</p>
                      )}
                    </td>

                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      {mov.tipo_nombre
                        ? <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{mov.tipo_nombre}</span>
                        : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>

                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {mov.estado_nombre
                        ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded font-medium"
                            style={{ backgroundColor: mov.estado_color ? `${mov.estado_color}22` : undefined, color: mov.estado_color ?? undefined }}
                          >
                            {mov.estado_nombre}
                          </span>
                        )
                        : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <Calendar size={11} /> {fmt(mov.fecha_movimiento)}
                      </span>
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap hidden sm:table-cell">
                      {mov.fecha_vencimiento
                        ? (
                          <span className={`flex items-center gap-1 text-xs ${colorVencimiento(mov)}`}>
                            {mov.vencido ? <AlertCircle size={11} /> : <Clock size={11} />}
                            {fmt(mov.fecha_vencimiento)}
                          </span>
                        )
                        : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditingMov(mov); setShowMovForm(true) }}
                          className="p-1.5 rounded hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMov(mov.id)}
                          className="p-1.5 rounded hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      {showMovForm && (
        <MovimientoForm
          carpetaId={id}
          movimiento={editingMov}
          onClose={() => { setShowMovForm(false); setEditingMov(null) }}
          onSave={() => { setShowMovForm(false); setEditingMov(null); fetchMovimientos() }}
        />
      )}

      {showCarpetaForm && (
        <CarpetaForm
          carpeta={carpeta}
          onClose={() => setShowCarpetaForm(false)}
          onSave={() => { setShowCarpetaForm(false); fetchCarpeta() }}
        />
      )}
    </div>
  )
}

export default CarpetaDetail
