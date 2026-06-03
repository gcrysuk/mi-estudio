import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutList, RefreshCw, Search, ExternalLink, Printer,
  ChevronUp, ChevronDown, Clock, AlertCircle, X,
} from 'lucide-react'
import ImprimirLista from '../../components/print/ImprimirLista'
import { format, parseISO, isBefore, addDays } from 'date-fns'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'
import { getResumen } from '../../services/movimientosService'
import { useResizableColumns } from '../../hooks/useResizableColumns'

const RS_INITIAL_WIDTHS = {
  carpeta: 160, movimiento: 220, tipo: 110, estado: 120,
  responsable: 120, fecha: 130, vencimiento: 130,
};

const fmt = (iso) => {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'dd/MM/yy HH:mm') }
  catch { return '—' }
}

function vencState(fecha, vencido) {
  if (!fecha) return null
  if (vencido) return 'vencido'
  const d = parseISO(fecha)
  const now = new Date()
  if (isBefore(d, now)) return 'vencido'
  if (isBefore(d, addDays(now, 7))) return 'proximo'
  return 'ok'
}

const VENC_TEXT = {
  vencido: 'text-red-600 dark:text-red-400 font-medium',
  proximo: 'text-orange-500 dark:text-orange-400 font-medium',
  ok: '',
}

const ROW_BG = {
  vencido: { light: 'bg-red-50 hover:bg-red-100',     dark: 'bg-red-900/15 hover:bg-red-900/25' },
  proximo: { light: 'bg-yellow-50 hover:bg-yellow-100', dark: 'bg-yellow-900/15 hover:bg-yellow-900/25' },
  ok:      { light: 'hover:bg-gray-50',               dark: 'hover:bg-gray-700' },
  null:    { light: 'hover:bg-gray-50',               dark: 'hover:bg-gray-700' },
}

const VENC_BTNS = [
  { key: 'todos',    label: 'Todos' },
  { key: 'vencidos', label: 'Vencidos',     icon: AlertCircle },
  { key: 'proximos', label: 'Próx. 7 días', icon: Clock },
  { key: 'vigentes', label: 'Vigentes' },
]

const SORT_GETVAL = {
  carpeta:     m => m.carpeta_nombre || '',
  movimiento:  m => m.titulo || '',
  tipo:        m => m.tipo_nombre || '',
  estado:      m => m.estado_nombre || '',
  responsable: m => m.responsable_username || '',
  fecha:       m => m.fecha_creacion || '',
  vencimiento: m => m.fecha_vencimiento || '',
}

export default function ResumenPage() {
  const { dark } = useTheme()
  const navigate = useNavigate()
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showPrint, setShowPrint] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroVenc, setFiltroVenc] = useState('todos')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getResumen()
      setMovimientos(res.data.results ?? res.data ?? [])
    } catch {
      toast.error('Error al cargar el resumen')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const estados = useMemo(() =>
    [...new Set(movimientos.map(m => m.estado_nombre).filter(Boolean))].sort(),
    [movimientos]
  )
  const tipos = useMemo(() =>
    [...new Set(movimientos.map(m => m.tipo_nombre).filter(Boolean))].sort(),
    [movimientos]
  )

  const handleSort = (col) => {
    if (sortCol !== col) {
      setSortCol(col)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortCol(null)
      setSortDir('asc')
    }
  }

  const filtrados = useMemo(() => {
    let result = movimientos.filter(m => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !(m.carpeta_nombre || '').toLowerCase().includes(q) &&
          !m.titulo.toLowerCase().includes(q)
        ) return false
      }
      if (filtroEstado && m.estado_nombre !== filtroEstado) return false
      if (filtroTipo && m.tipo_nombre !== filtroTipo) return false
      if (filtroVenc !== 'todos') {
        const vs = vencState(m.fecha_vencimiento, m.vencido)
        if (filtroVenc === 'vencidos' && vs !== 'vencido') return false
        if (filtroVenc === 'proximos' && vs !== 'proximo') return false
        if (filtroVenc === 'vigentes' && vs !== 'ok') return false
      }
      return true
    })

    if (sortCol && SORT_GETVAL[sortCol]) {
      const getVal = SORT_GETVAL[sortCol]
      result = [...result].sort((a, b) => {
        const cmp = getVal(a).localeCompare(getVal(b), undefined, { sensitivity: 'base' })
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [movimientos, search, filtroEstado, filtroTipo, filtroVenc, sortCol, sortDir])

  const hasActiveFilters = filtroEstado || filtroTipo || filtroVenc !== 'todos'

  const limpiarFiltros = () => {
    setFiltroEstado('')
    setFiltroTipo('')
    setFiltroVenc('todos')
  }

  const filtrosTexto = [
    search && `Búsqueda: "${search}"`,
    filtroEstado && `Estado: ${filtroEstado}`,
    filtroTipo && `Tipo: ${filtroTipo}`,
    filtroVenc !== 'todos' && `Vencimiento: ${filtroVenc}`,
  ].filter(Boolean).join(' | ') || undefined

  const { widths: colWidths, onMouseDown: onColMouseDown } = useResizableColumns(RS_INITIAL_WIDTHS, 'col-widths-resumen')
  const rh = (key) => (
    <div
      onMouseDown={(e) => { e.stopPropagation(); onColMouseDown(e, key) }}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/40 z-10 select-none"
    />
  )

  const thBase = `px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-accent transition-colors relative ${
    dark ? 'text-gray-400' : 'text-gray-500'
  }`
  const td = `px-3 py-2.5 text-sm`

  const sortIcon = (col) => {
    if (sortCol !== col) return <ChevronUp size={12} className="ml-1 inline opacity-20" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="ml-1 inline" />
      : <ChevronDown size={12} className="ml-1 inline" />
  }

  const dropSel = `appearance-none pl-3 pr-8 py-1.5 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-accent text-xs uppercase ${
    dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
  }`

  const handleRowClick = (mov) => {
    if (mov.carpeta) navigate(`/movimientos?carpeta=${mov.carpeta}`)
    else navigate('/movimientos')
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <LayoutList size={22} className="text-accent" />
          <h1 className={`text-xl font-bold uppercase ${dark ? 'text-white' : 'text-gray-800'}`}>
            Resumen
          </h1>
          {!loading && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'
            }`}>
              {filtrados.length} carpeta{filtrados.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50 ${
            dark
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
        <button
          onClick={() => setShowPrint(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
            dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Printer size={13} /> Imprimir
        </button>
      </div>

      {showPrint && (
        <ImprimirLista
          titulo="Resumen de Carpetas"
          filtros={filtrosTexto}
          headers={['Carpeta', 'Último movimiento', 'Tipo', 'Estado', 'Responsable', 'Fecha', 'Vencimiento']}
          items={filtrados}
          getRow={m => [
            m.carpeta_nombre || 'Sin carpeta',
            m.titulo,
            m.tipo_nombre || '—',
            m.estado_nombre || '—',
            m.responsable_username || '—',
            fmt(m.fecha_creacion),
            m.fecha_vencimiento ? fmt(m.fecha_vencimiento) : '—',
          ]}
          onClose={() => setShowPrint(false)}
        />
      )}

      {/* Buscador */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow ${
        dark ? 'bg-gray-800' : 'bg-white border border-gray-200'
      }`}>
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por carpeta o movimiento..."
          className={`flex-1 text-sm bg-transparent outline-none placeholder-gray-400 ${
            dark ? 'text-gray-200' : 'text-gray-700'
          }`}
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className={`rounded-lg shadow p-3 ${dark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Estado */}
          <div className="relative">
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className={dropSel}>
              <option value="">Todos los estados</option>
              {estados.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Tipo */}
          <div className="relative">
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={dropSel}>
              <option value="">Todos los tipos</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Vencimiento */}
          <div className="flex gap-1">
            {VENC_BTNS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFiltroVenc(key)}
                className={`px-3 py-1.5 rounded-lg text-xs uppercase flex items-center gap-1 transition-colors ${
                  filtroVenc === key
                    ? key === 'vencidos' ? 'bg-red-500 text-white' : 'bg-accent text-white'
                    : dark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {Icon && <Icon size={12} />}
                {label}
              </button>
            ))}
          </div>

          {/* Limpiar */}
          {hasActiveFilters && (
            <button
              onClick={limpiarFiltros}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ml-auto ${
                dark
                  ? 'text-gray-400 hover:text-gray-200 border-gray-600'
                  : 'text-gray-500 hover:text-gray-700 border-gray-300'
              }`}
            >
              <X size={12} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className={`rounded-lg shadow overflow-hidden ${dark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={dark ? 'bg-gray-900' : 'bg-gray-50'}>
              <tr>
                <th className={thBase} onClick={() => handleSort('carpeta')} style={{ width: colWidths.carpeta, minWidth: 60 }}>
                  Carpeta{sortIcon('carpeta')}{rh('carpeta')}
                </th>
                <th className={thBase} onClick={() => handleSort('movimiento')} style={{ width: colWidths.movimiento, minWidth: 60 }}>
                  Último movimiento{sortIcon('movimiento')}{rh('movimiento')}
                </th>
                <th className={thBase} onClick={() => handleSort('tipo')} style={{ width: colWidths.tipo, minWidth: 60 }}>
                  Tipo{sortIcon('tipo')}{rh('tipo')}
                </th>
                <th className={thBase} onClick={() => handleSort('estado')} style={{ width: colWidths.estado, minWidth: 60 }}>
                  Estado{sortIcon('estado')}{rh('estado')}
                </th>
                <th className={thBase} onClick={() => handleSort('responsable')} style={{ width: colWidths.responsable, minWidth: 60 }}>
                  Responsable{sortIcon('responsable')}{rh('responsable')}
                </th>
                <th className={thBase} onClick={() => handleSort('fecha')} style={{ width: colWidths.fecha, minWidth: 60 }}>
                  Fecha{sortIcon('fecha')}{rh('fecha')}
                </th>
                <th className={thBase} onClick={() => handleSort('vencimiento')} style={{ width: colWidths.vencimiento, minWidth: 60 }}>
                  Vencimiento{sortIcon('vencimiento')}{rh('vencimiento')}
                </th>
                <th className={`px-3 py-2.5 pr-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`} />
              </tr>
            </thead>
            <tbody className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                    Cargando...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <LayoutList size={28} strokeWidth={1} className={dark ? 'text-gray-600' : 'text-gray-300'} />
                      <p className="text-sm text-gray-400">
                        {search || hasActiveFilters
                          ? 'Sin resultados para los filtros activos'
                          : 'No hay movimientos disponibles'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map(mov => {
                  const vs = vencState(mov.fecha_vencimiento, mov.vencido)
                  const rowKey = String(vs)
                  const bg = (ROW_BG[rowKey] ?? ROW_BG['ok'])[dark ? 'dark' : 'light']

                  return (
                    <tr
                      key={mov.id}
                      onClick={() => handleRowClick(mov)}
                      className={`cursor-pointer transition-colors ${bg}`}
                    >
                      {/* Carpeta */}
                      <td className={`${td} font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`} style={{ maxWidth: colWidths.carpeta, overflow: 'hidden' }}>
                        <span className="block truncate" title={mov.carpeta_nombre || 'Sin carpeta'}>
                          {mov.carpeta_nombre || 'Sin carpeta'}
                        </span>
                      </td>

                      {/* Último movimiento */}
                      <td className={`${td} ${dark ? 'text-gray-300' : 'text-gray-700'}`} style={{ maxWidth: colWidths.movimiento, overflow: 'hidden' }}>
                        <span className="block truncate" title={mov.titulo}>{mov.titulo}</span>
                      </td>

                      {/* Tipo */}
                      <td className={td}>
                        {mov.tipo_nombre ? (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full text-white font-medium whitespace-nowrap"
                            style={{ backgroundColor: mov.tipo_color || '#6b7280' }}
                          >
                            {mov.tipo_nombre}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className={td}>
                        {mov.estado_nombre ? (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full text-white font-medium whitespace-nowrap"
                            style={{ backgroundColor: mov.estado_color || '#6b7280' }}
                          >
                            {mov.estado_nombre}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Responsable */}
                      <td className={`${td} text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {mov.responsable_username || '—'}
                      </td>

                      {/* Fecha creación */}
                      <td className={`${td} text-xs whitespace-nowrap ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {fmt(mov.fecha_creacion)}
                      </td>

                      {/* Vencimiento */}
                      <td className={`${td} text-xs whitespace-nowrap`}>
                        <span className={VENC_TEXT[vs] || (dark ? 'text-gray-400' : 'text-gray-500')}>
                          {mov.fecha_vencimiento ? fmt(mov.fecha_vencimiento) : '—'}
                        </span>
                      </td>

                      {/* Acción */}
                      <td
                        className={`${td} text-right pr-4`}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleRowClick(mov)}
                          title="Ver movimientos de esta carpeta"
                          className="p-1 rounded text-accent hover:bg-accent/10 transition-colors"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
