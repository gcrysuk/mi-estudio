import { Search, X } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';

// Bottom sheet de filtros genérico (mobile), estilo Mercado Libre.
// No conoce los filtros de ningún listado en particular: recibe la
// definición de los campos a mostrar y sus callbacks por props, para que
// Movimientos, Carpetas, Personas, Notif. MEV, etc. lo reutilicen sin
// reescribirlo — cada listado arma su propio `fields`/`quickFilters` a
// partir del estado de filtros que YA tiene.
//
// fields: [{ key, type: 'search' | 'select' | 'text', label, value, onChange, placeholder, options? }]
//   - options (solo para type 'select'): [{ value, label }]
// quickFilters (opcional): { label?, value, options: [{ key, label, color? }], onChange }
//   - para filtros rápidos tipo tabs (ej. Todos/Vencen hoy/Vencidos en Movimientos)
const MobileFilterSheet = ({
  open,
  onClose,
  title = 'Filtrar',
  quickFilters = null,
  fields = [],
  onApply,
  onClear,
  applyLabel = 'Aplicar',
  clearLabel = 'Limpiar',
}) => {
  const handleApply = () => {
    onApply?.();
    onClose?.();
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {quickFilters && quickFilters.options?.length > 0 && (
          <div>
            {quickFilters.label && (
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
                {quickFilters.label}
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {quickFilters.options.map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => quickFilters.onChange?.(key)}
                  className={`px-3 py-2 rounded-lg text-xs uppercase font-medium transition-colors ${
                    quickFilters.value === key
                      ? color === 'red' ? 'bg-red-500 text-white' : 'bg-accent text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
              {field.label}
            </label>

            {field.type === 'select' ? (
              <select
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              >
                <option value="">{field.placeholder}</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'search' ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                />
              </div>
            ) : (
              <input
                type="text"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              />
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClear}
            className="flex-1 px-3 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-sm uppercase"
          >
            {clearLabel}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-3 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-bold text-sm uppercase"
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default MobileFilterSheet;
