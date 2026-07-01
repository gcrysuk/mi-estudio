import { X } from 'lucide-react';

// Fila de chips de filtros activos, estilo Mercado Libre. Genérica: recibe
// una lista de { id, label, onRemove } ya armada por el listado que la usa
// (Movimientos, Carpetas, Personas, Notif. MEV, etc.) — no conoce la forma
// de los filtros de cada listado, solo los pinta y dispara el remove.
const FilterChips = ({ chips = [], className = '' }) => {
  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 px-1 ${className}`}>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="flex items-center gap-1 bg-accent/10 text-accent text-xs px-2.5 py-1 rounded-full font-medium"
        >
          {chip.label}
          <button onClick={chip.onRemove} className="hover:text-red-500">
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
};

export default FilterChips;
