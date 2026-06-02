import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, FolderOpen, Hash, User, Building2, Scale,
  FileText, Calendar, Clock, AlertCircle, Edit,
  Plus, Users, Share2, RefreshCw, FileDown,
} from 'lucide-react'
import ReporteCarpeta from '../../components/print/ReporteCarpeta'
import toast from 'react-hot-toast'
import api from '../../services/api'
import MovimientoForm from '../movimientos/MovimientoForm'
import CarpetaForm from '../../components/carpetas/CarpetaForm'
import MovimientosTable from '../../components/movimientos/MovimientosTable'
import CompartirCarpetaModal from '../../components/carpetas/CompartirCarpetaModal'

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (fecha, opts) =>
  fecha ? new Date(fecha).toLocaleDateString('es-AR', opts ?? { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'


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
  const [loadingCarpeta, setLoadingCarpeta] = useState(true)
  const [filtro, setFiltro]                 = useState('todos')
  const [showMovForm, setShowMovForm]         = useState(false)
  const [showCarpetaForm, setShowCarpetaForm] = useState(false)
  const [showCompartir, setShowCompartir]     = useState(false)
  const [refreshKey, setRefreshKey]           = useState(0)
  const [syncingMev, setSyncingMev]           = useState(false)
  const [showReporte, setShowReporte]         = useState(false)

  useEffect(() => { fetchCarpeta() }, [id])

  useEffect(() => {
    let lastSync = Date.now()
    const interval = setInterval(() => {
      if (window._mev_last_sync && window._mev_last_sync > lastSync) {
        lastSync = window._mev_last_sync
        fetchCarpeta()
        setRefreshKey(k => k + 1)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [])

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

  const handleSyncMev = async () => {
    setSyncingMev(true)
    try {
      const res = await api.post(`/carpetas/${id}/sync_mev/`)
      const { encolado, nuevos, error } = res.data
      if (encolado) {
        toast.success('Sincronización encolada — los movimientos aparecerán en breve')
      } else if (error) {
        toast.error(`MEV: ${error}`)
      } else {
        toast.success(nuevos > 0 ? `${nuevos} nuevo${nuevos !== 1 ? 's' : ''} movimiento${nuevos !== 1 ? 's' : ''} importado${nuevos !== 1 ? 's' : ''}` : 'Sin novedades en la MEV')
        if (nuevos > 0) setRefreshKey(k => k + 1)
        fetchCarpeta()
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al sincronizar con la MEV')
    } finally {
      setSyncingMev(false)
    }
  }

  const getFetchUrl = () => {
    if (filtro === 'vencidos') return '/movimientos/vencidos/'
    if (filtro === 'proximos') return '/movimientos/proximos_vencer/'
    return '/movimientos/'
  }

  const getBaseParams = () => {
    const params = { carpeta: id }
    if (filtro === 'proximos') params.dias = 7
    return params
  }

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
    <>
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

          {carpeta.mev_estado && (
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
                MEV: {carpeta.mev_estado}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            {carpeta.numero_expediente && (
              <span className="flex items-center gap-1">
                <Hash size={11} /> {carpeta.numero_expediente}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={11} /> Desde {fmt(carpeta.fecha_inicio)}
            </span>
            {carpeta.dias_sin_movimiento !== null && carpeta.dias_sin_movimiento !== undefined && (
              <span className={`flex items-center gap-1 ${
                carpeta.dias_sin_movimiento <= 7  ? 'text-green-500' :
                carpeta.dias_sin_movimiento <= 30 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                <Clock size={11} />
                {carpeta.dias_sin_movimiento === 0
                  ? 'Movimiento hoy'
                  : `${carpeta.dias_sin_movimiento} días sin movimiento`}
              </span>
            )}
            {carpeta.compartida_con_count > 0 && (
              <span className="flex items-center gap-1">
                <Users size={11} /> Compartida con {carpeta.compartida_con_count} usuario{carpeta.compartida_con_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {carpeta.mev_url && (
            <button
              onClick={handleSyncMev}
              disabled={syncingMev}
              title={carpeta.mev_ultimo_sync ? `Último sync: ${new Date(carpeta.mev_ultimo_sync).toLocaleString('es-AR')}` : 'Sin sincronización previa'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60 uppercase"
            >
              <RefreshCw size={13} className={syncingMev ? 'animate-spin' : ''} />
              {syncingMev ? 'Sincronizando...' : 'Sincronizar MEV'}
            </button>
          )}
          <button
            onClick={() => setShowReporte(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
          >
            <FileDown size={13} /> Exportar PDF
          </button>
          <button
            onClick={() => setShowCompartir(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
          >
            <Share2 size={13} /> Compartir
          </button>
          <button
            onClick={() => setShowCarpetaForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
          >
            <Edit size={13} /> Editar
          </button>
        </div>
      </div>

      {/* ── Info panel ── */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <InfoItem icon={User}      label="Cliente"     value={carpeta.persona_nombre} />
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
          <span className="text-sm font-semibold uppercase text-gray-700 dark:text-gray-300">
            Movimientos
          </span>
          <button
            onClick={() => setShowMovForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase"
          >
            <Plus size={14} /> Nuevo movimiento
          </button>
        </div>

        {/* Filtros backend: TODOS / PRÓXIMOS 7 DÍAS / VENCIDOS */}
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
        </div>

        <MovimientosTable
          baseFetchUrl={getFetchUrl()}
          baseParams={getBaseParams()}
          showCarpetaColumn={false}
          emptyMessage="No hay movimientos en esta carpeta"
          refreshKey={refreshKey}
        />
      </div>

      {/* ── Modales ── */}
      {showMovForm && (
        <MovimientoForm
          carpetaId={id}
          carpetaNombre={carpeta?.nombre}
          onClose={() => setShowMovForm(false)}
          onSave={() => { setShowMovForm(false); setRefreshKey((k) => k + 1); }}
        />
      )}

      {showCarpetaForm && (
        <CarpetaForm
          carpeta={carpeta}
          onClose={() => setShowCarpetaForm(false)}
          onSave={() => { setShowCarpetaForm(false); fetchCarpeta() }}
        />
      )}

      {showCompartir && (
        <CompartirCarpetaModal
          isOpen={showCompartir}
          onClose={() => setShowCompartir(false)}
          carpeta={carpeta}
          onSave={() => { setShowCompartir(false); fetchCarpeta() }}
        />
      )}

      {showReporte && (
        <ReporteCarpeta
          carpetaId={id}
          filtros={filtro !== 'todos' ? { filtro } : {}}
          onClose={() => setShowReporte(false)}
        />
      )}
    </div>
    </>
  )
}

export default CarpetaDetail
