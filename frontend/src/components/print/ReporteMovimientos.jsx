import { useState, useEffect } from 'react'
import api from '../../services/api'
import PrintLayout from './PrintLayout'

const fmtAR = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

export default function ReporteMovimientos({ filtros = {}, filtroLabel = 'Todos', onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/movimientos/reporte/', { params: filtros })
      .then(res => setData(res.data))
      .catch(() => setError('Error al cargar el reporte'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Generando reporte...</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center gap-3">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 rounded">Cerrar</button>
      </div>
    )
  }

  const { movimientos, filtros_aplicados, generado_en, total } = data
  const ahora = fmtAR(generado_en)

  return (
    <PrintLayout onClose={onClose} title={`Reporte de movimientos — ${filtroLabel}`}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #333', paddingBottom: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>MI ESTUDIO</h1>
            <p style={{ fontSize: '11px', color: '#555', margin: '2px 0 0' }}>Listado de Movimientos</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#555' }}>
            <p>Generado: {ahora}</p>
            <p>Total: {total} movimiento{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Filtros aplicados */}
      {Object.keys(filtros_aplicados).length > 0 && (
        <div style={{ marginBottom: '12px', padding: '6px 10px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '11px' }}>
          <strong>Filtros: </strong>
          {Object.entries(filtros_aplicados).map(([k, v]) => `${k}: ${v}`).join(' | ')}
        </div>
      )}

      {/* Tabla */}
      {movimientos.length === 0 ? (
        <p style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>Sin movimientos para los filtros seleccionados.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left' }}>Carpeta</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left' }}>Título</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left', width: '80px' }}>Tipo</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left', width: '80px' }}>Estado</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left', width: '100px' }}>Fecha</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left', width: '100px' }}>Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m, i) => (
              <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '9px', color: '#555' }}>
                  {m.carpeta_nombre || '—'}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: '500' }}>{m.titulo}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{m.tipo_nombre || '—'}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{m.estado_nombre || '—'}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{fmtAR(m.fecha_movimiento)}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', color: m.vencido ? '#c00' : 'inherit' }}>
                  {m.fecha_vencimiento ? fmtAR(m.fecha_vencimiento) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div style={{ marginTop: '24px', paddingTop: '8px', borderTop: '1px solid #ccc', fontSize: '10px', color: '#888', textAlign: 'center' }}>
        Generado por Mi Estudio — {ahora}
      </div>
    </PrintLayout>
  )
}
