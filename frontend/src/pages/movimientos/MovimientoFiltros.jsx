import { useState } from 'react';
import { Search, Calendar, Filter, X } from 'lucide-react';

const MovimientoFiltros = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    search: '',
    tipo: '',
    estado: '',
    fechaTipo: 'vencimiento', // 'vencimiento' o 'notificacion'
    fechaDesde: '',
    fechaHasta: '',
    diasPersonalizado: ''
  });

  const [showFiltrosAvanzados, setShowFiltrosAvanzados] = useState(false);

  const handleChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const limpiarFiltros = () => {
    const nuevosFiltros = {
      search: '',
      tipo: '',
      estado: '',
      fechaTipo: 'vencimiento',
      fechaDesde: '',
      fechaHasta: '',
      diasPersonalizado: ''
    };
    setFilters(nuevosFiltros);
    onFilterChange(nuevosFiltros);
  };

  return (
    <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow space-y-3">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por título o descripción..."
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowFiltrosAvanzados(!showFiltrosAvanzados)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs uppercase"
        >
          <Filter size={14} />
          Filtros avanzados
        </button>
        
        {filters.search && (
          <button
            onClick={limpiarFiltros}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-xs uppercase"
          >
            <X size={14} />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Filtros avanzados */}
      {showFiltrosAvanzados && (
        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">TIPO</label>
              <select
                value={filters.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
              >
                <option value="">TODOS</option>
                {/* Acá se cargarán los tipos desde el backend */}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">ESTADO</label>
              <select
                value={filters.estado}
                onChange={(e) => handleChange('estado', e.target.value)}
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
              >
                <option value="">TODOS</option>
                {/* Acá se cargarán los estados desde el backend */}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 uppercase">FILTRAR POR FECHA</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => handleChange('fechaTipo', 'vencimiento')}
                className={`flex-1 px-2 py-1 text-xs rounded-lg ${
                  filters.fechaTipo === 'vencimiento'
                    ? 'bg-accent text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Vencimiento
              </button>
              <button
                onClick={() => handleChange('fechaTipo', 'notificacion')}
                className={`flex-1 px-2 py-1 text-xs rounded-lg ${
                  filters.fechaTipo === 'notificacion'
                    ? 'bg-accent text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Notificación
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">DESDE</label>
                <input
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => handleChange('fechaDesde', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">HASTA</label>
                <input
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => handleChange('fechaHasta', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
                />
              </div>
            </div>

            <div className="mt-2">
              <label className="block text-xs font-medium mb-1">PRÓXIMOS DÍAS</label>
              <input
                type="number"
                min="1"
                max="90"
                value={filters.diasPersonalizado}
                onChange={(e) => handleChange('diasPersonalizado', e.target.value)}
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
                placeholder="Ej: 15 días"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientoFiltros;
