import { useEffect } from 'react'
import { X, Printer } from 'lucide-react'

const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; }
    .no-print { display: none !important; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 5px 8px; font-size: 10px; }
    th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: bold; }
    .page-break { page-break-after: always; }
    h1, h2, h3 { color: #111 !important; }
  }
`

export default function PrintLayout({ onClose, children, title = 'Vista previa de impresión' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto">
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* Barra de acciones — no se imprime */}
      <div className="no-print sticky top-0 z-10 bg-gray-800 text-white px-4 py-2 flex items-center justify-between shadow">
        <span className="text-sm font-medium">{title}</span>
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
      <div className="print-area max-w-5xl mx-auto p-8">
        {children}
      </div>
    </div>
  )
}
