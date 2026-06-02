import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutList, RefreshCw, Search, ExternalLink, Printer } from 'lucide-react'
import ImprimirLista from '../../components/print/ImprimirLista'
import { format, parseISO, isBefore, addDays } from 'date-fns'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'
import { getResumen } from '../../services/movimientosService'

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
  vencido: { light: 'bg-red-50 hover:bg-red-100', dark: 'bg-red-900/15 hover:bg-red-900/25' },
  proximo: { light: 'bg-yellow-50 hover:bg-yellow-100', dark: 'bg-yellow-900/15 hover:bg-yellow-900/25' },
  ok:      { light: 'hover:bg-gray-50', dark: 'hover:bg-gray-700' },
  null:    { light: 'hover:bg-gray-50', dark: 'hover:bg-gray-700' },
}

export default function ResumenPage() {
  const { dark } = useTheme()
  const navigate = useNavigate()
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showPrint, setShowPrint] = useState(false)

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

  const filtrados = movimientos.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (m.carpeta_nombre || '').toLowerCase().includes(q) ||
           m.titulo.toLowerCase().includes(q)
  })

  const th = `px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${
    dark ? 'text-gray-400' : 'text-gray-500'
  }`
  const td = `px-3 py-2.5 text-sm`

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
          filtros={search ? `Búsqueda: "${search}"` : undefined}
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
          <button onClick={() => setSearch('')} className="text-xs text-gray-400 hover:text-gray-600">
            ✕
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className={`rounded-lg shadow overflow-hidden ${dark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={dark ? 'bg-gray-900' : 'bg-gray-50'}>
              <tr>
                <th className={th}>Carpeta</th>
                <th className={th}>Último movimiento</th>
                <th className={th}>Tipo</th>
                <th className={th}>Estado</th>
                <th className={th}>Responsable</th>
                <th className={th}>Fecha</th>
                <th className={th}>Vencimiento</th>
                <th className={`${th} pr-4`} />
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
                        {search ? 'Sin resultados para tu búsqueda' : 'No hay movimientos disponibles'}
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
                      <td className={`${td} font-medium max-w-[160px] ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                        <span className="block truncate">
                          {mov.carpeta_nombre || 'Sin carpeta'}
                        </span>
                      </td>

                      {/* Último movimiento */}
                      <td className={`${td} max-w-[220px] ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="block truncate">{mov.titulo}</span>
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
