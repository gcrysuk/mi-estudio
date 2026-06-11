import { useState, useEffect, useMemo } from 'react'
import { Download, ChevronDown, ChevronRight } from 'lucide-react'
import api from '../../services/api'

const fmt = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const diffDias = (a, b) => {
  if (!a || !b) return null
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

export default function InformeMEVPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtroOrganismo, setFiltroOrganismo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [agrupado, setAgrupado] = useState(true)
  const [expandidos, setExpandidos] = useState({})

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (filtroOrganismo) params.organismo = filtroOrganismo
      if (filtroEstado) params.estado = filtroEstado
      if (filtroDesde) params.fecha_desde = filtroDesde
      if (filtroHasta) params.fecha_hasta = filtroHasta
      const res = await api.get('/carpetas/informe_mev/', { params })
      setRows(res.data)
    } catch (e) {
      setError('Error al cargar el informe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Group by organismo_nombre → list of rows
  const agrupados = useMemo(() => {
    const map = {}
    for (const r of rows) {
      const key = r.organismo_nombre || 'Sin organismo'
      if (!map[key]) map[key] = []
      map[key].push(r)
    }
    return map
  }, [rows])

  // Per-organismo stats: avg days between consecutive states per carpeta
  const statsOrganismo = useMemo(() => {
    const result = {}
    for (const [org, orgRows] of Object.entries(agrupados)) {
      // Group by carpeta
      const byCarpeta = {}
      for (const r of orgRows) {
        if (!byCarpeta[r.carpeta]) byCarpeta[r.carpeta] = []
        byCarpeta[r.carpeta].push(r)
      }
      const allDeltas = []
      for (const carpRows of Object.values(byCarpeta)) {
        const sorted = [...carpRows].sort((a, b) => new Date(a.fecha_cambio) - new Date(b.fecha_cambio))
        for (let i = 1; i < sorted.length; i++) {
          const d = diffDias(sorted[i - 1].fecha_cambio, sorted[i].fecha_cambio)
          if (d !== null) allDeltas.push(d)
        }
      }
      result[org] = {
        total: orgRows.length,
        carpetas: Object.keys(byCarpeta).length,
        promedioDias: allDeltas.length ? Math.round(allDeltas.reduce((a, b) => a + b, 0) / allDeltas.length) : null,
      }
    }
    return result
  }, [agrupados])

  const toggleExpand = (org) => setExpandidos(prev => ({ ...prev, [org]: !prev[org] }))

  const exportExcel = async () => {
    try {
      const params = {}
      if (filtroOrganismo) params.organismo = filtroOrganismo
      if (filtroEstado) params.estado = filtroEstado
      if (filtroDesde) params.fecha_desde = filtroDesde
      if (filtroHasta) params.fecha_hasta = filtroHasta
      const res = await api.get('/carpetas/informe_mev/', { params })
      const data = res.data

      // Build CSV
      const headers = ['Carpeta', 'Organismo', 'Estado Anterior', 'Estado Nuevo', 'Fecha Cambio']
      const csvRows = [headers.join(',')]
      for (const r of data) {
        csvRows.push([
          `"${r.carpeta_nombre || ''}"`,
          `"${r.organismo_nombre || ''}"`,
          `"${r.estado_anterior || ''}"`,
          `"${r.estado_nuevo || ''}"`,
          `"${fmt(r.fecha_cambio)}"`,
        ].join(','))
      }
      const blob = new Blob(['﻿' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'informe_mev.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al exportar')
    }
  }

  const inputCls = 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-accent'

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold">Informe MEV — Historial de Estados</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setAgrupado(v => !v)}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {agrupado ? 'Ver lista' : 'Ver agrupado'}
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent/80"
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">Organismo</label>
          <input className={inputCls} value={filtroOrganismo} onChange={e => setFiltroOrganismo(e.target.value)} placeholder="Filtrar..." />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">Estado</label>
          <input className={inputCls} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} placeholder="Filtrar..." />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">Desde</label>
          <input type="date" className={inputCls} value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">Hasta</label>
          <input type="date" className={inputCls} value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent/80"
        >
          Buscar
        </button>
        <button
          onClick={() => { setFiltroOrganismo(''); setFiltroEstado(''); setFiltroDesde(''); setFiltroHasta('') }}
          className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Limpiar
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-gray-500">No hay registros de cambios de estado MEV.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        agrupado ? (
          <div className="space-y-3">
            {Object.entries(agrupados).sort(([a], [b]) => a.localeCompare(b)).map(([org, orgRows]) => {
              const stats = statsOrganismo[org]
              const open = expandidos[org] ?? false
              return (
                <div key={org} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleExpand(org)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-left"
                  >
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="font-medium text-sm flex-1">{org}</span>
                    <span className="text-xs text-gray-500">{stats.carpetas} carpeta{stats.carpetas !== 1 ? 's' : ''}</span>
                    <span className="text-xs text-gray-500 ml-3">{stats.total} cambio{stats.total !== 1 ? 's' : ''}</span>
                    {stats.promedioDias !== null && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 ml-3">
                        Prom. {stats.promedioDias} días entre estados
                      </span>
                    )}
                  </button>
                  {open && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm table-fixed">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                            <th className="px-3 py-2 font-medium text-xs text-gray-600 dark:text-gray-300 w-48 overflow-hidden">Carpeta</th>
                            <th className="px-3 py-2 font-medium text-xs text-gray-600 dark:text-gray-300 w-36 overflow-hidden">Estado Anterior</th>
                            <th className="px-3 py-2 font-medium text-xs text-gray-600 dark:text-gray-300 w-36 overflow-hidden">Estado Nuevo</th>
                            <th className="px-3 py-2 font-medium text-xs text-gray-600 dark:text-gray-300 w-40 overflow-hidden">Fecha Cambio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {orgRows.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-3 py-2 overflow-hidden truncate">{r.carpeta_nombre}</td>
                              <td className="px-3 py-2 overflow-hidden">
                                <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 truncate max-w-full">
                                  {r.estado_anterior || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2 overflow-hidden">
                                <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 truncate max-w-full">
                                  {r.estado_nuevo}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400 overflow-hidden truncate">{fmt(r.fecha_cambio)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                  <th className="px-3 py-2 font-medium text-xs text-gray-600 dark:text-gray-300 w-48 overflow-hidden">Carpeta</th>
                  <th className="px-3 py-2 font-medium text-xs text-gray-600 dark:text-gray-300 w-44 overflow-hidden">Organismo</th>
                  <th className="px-3 py-2 font-medium text-xs text-gray-600 dark:text-gray-300 w-36 overflow-hidden">Estado Anterior</th>
                  <th className="px-3 py-2 font-medium text-xs text-gray-600 dark:text-gray-300 w-36 overflow-hidden">Estado Nuevo</th>
                  <th className="px-3 py-2 font-medium text-xs text-gray-600 dark:text-gray-300 w-40 overflow-hidden">Fecha Cambio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2 overflow-hidden truncate">{r.carpeta_nombre}</td>
                    <td className="px-3 py-2 overflow-hidden truncate text-gray-600 dark:text-gray-400">{r.organismo_nombre || '—'}</td>
                    <td className="px-3 py-2 overflow-hidden">
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 truncate max-w-full">
                        {r.estado_anterior || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 overflow-hidden">
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 truncate max-w-full">
                        {r.estado_nuevo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 overflow-hidden truncate">{fmt(r.fecha_cambio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
