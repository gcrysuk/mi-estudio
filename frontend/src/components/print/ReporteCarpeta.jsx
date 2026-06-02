import { useState, useEffect } from 'react'
import api from '../../services/api'
import PrintLayout from './PrintLayout'

const fmtAR = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

const fmtFecha = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return '—' }
}

export default function ReporteCarpeta({ carpetaId, filtros = {}, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/carpetas/${carpetaId}/reporte/`, { params: filtros })
      .then(res => setData(res.data))
      .catch(() => setError('Error al cargar el reporte'))
      .finally(() => setLoading(false))
  }, [carpetaId])

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

  const { carpeta, movimientos, filtros_aplicados, generado_en, total } = data
  const ahora = fmtAR(generado_en)

  return (
    <PrintLayout onClose={onClose} title={`Reporte: ${carpeta.nombre}`}>
      {/* Header del estudio */}
      <div style={{ borderBottom: '2px solid #333', paddingBottom: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>MI ESTUDIO</h1>
            <p style={{ fontSize: '11px', color: '#555', margin: '2px 0 0' }}>Sistema de Gestión Jurídica</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#555' }}>
            <p>Generado: {ahora}</p>
            <p>Total: {total} movimiento{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Datos de la carpeta */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
          {carpeta.nombre}
        </h2>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 8px', fontWeight: 'bold', width: '150px', border: '1px solid #ddd' }}>Nº Expediente</td>
              <td style={{ padding: '3px 8px', border: '1px solid #ddd' }}>{carpeta.numero_expediente || '—'}</td>
              <td style={{ padding: '3px 8px', fontWeight: 'bold', width: '120px', border: '1px solid #ddd' }}>Estado</td>
              <td style={{ padding: '3px 8px', border: '1px solid #ddd' }}>{carpeta.estado_nombre || '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 8px', fontWeight: 'bold', border: '1px solid #ddd' }}>Propietario</td>
              <td style={{ padding: '3px 8px', border: '1px solid #ddd' }}>{carpeta.propietario_nombre || '—'}</td>
              <td style={{ padding: '3px 8px', fontWeight: 'bold', border: '1px solid #ddd' }}>Organismo</td>
              <td style={{ padding: '3px 8px', border: '1px solid #ddd' }}>{carpeta.organismo_nombre || '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 8px', fontWeight: 'bold', border: '1px solid #ddd' }}>Fecha inicio</td>
              <td style={{ padding: '3px 8px', border: '1px solid #ddd' }}>{fmtFecha(carpeta.fecha_inicio)}</td>
              <td style={{ padding: '3px 8px', fontWeight: 'bold', border: '1px solid #ddd' }}>Tipo</td>
              <td style={{ padding: '3px 8px', border: '1px solid #ddd' }}>{carpeta.tipo_nombre || '—'}</td>
            </tr>
          </tbody>
        </table>

        {Object.keys(filtros_aplicados).length > 0 && (
          <p style={{ marginTop: '6px', fontSize: '10px', color: '#666' }}>
            Filtros: {Object.entries(filtros_aplicados).map(([k, v]) => `${k}: ${v}`).join(' | ')}
          </p>
        )}
      </div>

      {/* Tabla de movimientos */}
      <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
        Movimientos ({movimientos.length})
      </h3>
      {movimientos.length === 0 ? (
        <p style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>Sin movimientos para los filtros seleccionados.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left' }}>Título</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left', width: '90px' }}>Tipo</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left', width: '90px' }}>Estado</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left', width: '110px' }}>Fecha</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left', width: '110px' }}>Vencimiento</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left' }}>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m, i) => (
              <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: '500' }}>{m.titulo}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{m.tipo_nombre || '—'}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{m.estado_nombre || '—'}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{fmtAR(m.fecha_movimiento)}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', color: m.vencido ? '#c00' : 'inherit' }}>
                  {m.fecha_vencimiento ? fmtAR(m.fecha_vencimiento) : '—'}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', maxWidth: '200px', overflow: 'hidden' }}>
                  {m.descripcion ? m.descripcion.slice(0, 120) + (m.descripcion.length > 120 ? '…' : '') : '—'}
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
