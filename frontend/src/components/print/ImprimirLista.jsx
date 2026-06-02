import { useEffect } from 'react'
import { Printer, X } from 'lucide-react'

const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; }
    .no-print { display: none !important; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 5px 7px; font-size: 10px; text-align: left; }
    th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: bold; }
  }
`

const fmt = () => new Date().toLocaleString('es-AR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

export default function ImprimirLista({ titulo, headers, getRow, items, filtros, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const ahora = fmt()

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto">
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* Barra de acciones — no se imprime */}
      <div className="no-print sticky top-0 z-10 bg-gray-800 text-white px-4 py-2 flex items-center justify-between shadow">
        <span className="text-sm font-medium">MI ESTUDIO — {titulo}</span>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-700 transition-colors"
          >
            <Printer size={13} /> Imprimir / Guardar PDF
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-gray-600 hover:bg-gray-500 transition-colors"
          >
            <X size={13} /> Cerrar
          </button>
        </div>
      </div>

      {/* Contenido imprimible */}
      <div className="print-area max-w-6xl mx-auto p-8">
        <div style={{ borderBottom: '2px solid #333', paddingBottom: '6px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>MI ESTUDIO</div>
            <div style={{ fontSize: '12px', fontWeight: '600', marginTop: '2px' }}>{titulo}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#555' }}>
            <div>Generado: {ahora}</div>
            <div>Total: {items.length} registro{items.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {filtros && (
          <div style={{ marginBottom: '10px', padding: '4px 8px', backgroundColor: '#f5f5f5', borderRadius: '3px', fontSize: '11px', color: '#555' }}>
            Filtros: {filtros}
          </div>
        )}

        {items.length === 0 ? (
          <p style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>Sin registros.</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                {headers.map(h => (
                  <th key={h} style={{ border: '1px solid #ccc', padding: '5px 7px', textAlign: 'left', fontWeight: 'bold' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const cells = getRow(item)
                return (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    {cells.map((cell, j) => (
                      <td key={j} style={{ border: '1px solid #ccc', padding: '4px 7px' }}>{cell ?? '—'}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: '20px', paddingTop: '6px', borderTop: '1px solid #ccc', fontSize: '10px', color: '#888', textAlign: 'center' }}>
          Generado por Mi Estudio — {ahora}
        </div>
      </div>
    </div>
  )
}
