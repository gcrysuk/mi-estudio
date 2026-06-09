import PrintLayout from './PrintLayout'

const fmtAR = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

export default function ReporteMinuta({ movimiento, onClose }) {
  const ahora = fmtAR(new Date().toISOString())

  return (
    <PrintLayout onClose={onClose} title={`Minuta: ${movimiento.titulo}`}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #333', paddingBottom: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>MI ESTUDIO</h1>
            <p style={{ fontSize: '11px', color: '#555', margin: '2px 0 0' }}>Sistema de Gestión Jurídica</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#555' }}>
            <p>Fecha: {ahora}</p>
          </div>
        </div>
      </div>

      {/* Datos del movimiento */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px' }}>MINUTA</h2>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11px', marginBottom: '16px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 'bold', width: '130px', border: '1px solid #ddd', backgroundColor: '#f8f8f8' }}>Título</td>
              <td style={{ padding: '4px 8px', border: '1px solid #ddd' }} colSpan={3}>{movimiento.titulo}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 'bold', border: '1px solid #ddd', backgroundColor: '#f8f8f8' }}>Carpeta</td>
              <td style={{ padding: '4px 8px', border: '1px solid #ddd', width: '200px' }}>{movimiento.carpeta_nombre || '—'}</td>
              <td style={{ padding: '4px 8px', fontWeight: 'bold', border: '1px solid #ddd', width: '80px', backgroundColor: '#f8f8f8' }}>Fecha</td>
              <td style={{ padding: '4px 8px', border: '1px solid #ddd', width: '140px' }}>{fmtAR(movimiento.fecha_movimiento)}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 'bold', border: '1px solid #ddd', backgroundColor: '#f8f8f8' }}>Tipo</td>
              <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>{movimiento.tipo_nombre || '—'}</td>
              <td style={{ padding: '4px 8px', fontWeight: 'bold', border: '1px solid #ddd', backgroundColor: '#f8f8f8' }}>Estado</td>
              <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>{movimiento.estado_nombre || '—'}</td>
            </tr>
            {movimiento.responsable_username && (
              <tr>
                <td style={{ padding: '4px 8px', fontWeight: 'bold', border: '1px solid #ddd', backgroundColor: '#f8f8f8' }}>Responsable</td>
                <td style={{ padding: '4px 8px', border: '1px solid #ddd' }} colSpan={3}>{movimiento.responsable_nombre || movimiento.responsable_username}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Cuerpo de la minuta */}
        <div
          style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '16px', minHeight: '200px', fontSize: '11px', lineHeight: '1.7', backgroundColor: '#fff' }}
          dangerouslySetInnerHTML={{ __html: movimiento.descripcion || '<p style="color:#999;font-style:italic">(Sin descripción)</p>' }}
        />
      </div>

      {/* Espacio para firma */}
      <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'center', width: '220px' }}>
          <div style={{ borderTop: '1px solid #333', paddingTop: '6px', fontSize: '11px' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Firma</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#666' }}>{fmtAR(new Date().toISOString())}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px', paddingTop: '8px', borderTop: '1px solid #ccc', fontSize: '10px', color: '#888', textAlign: 'center' }}>
        Generado por Mi Estudio — {ahora}
      </div>
    </PrintLayout>
  )
}
