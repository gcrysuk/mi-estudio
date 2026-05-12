import { useState, useRef, useEffect } from 'react';
import { Columns, ChevronDown, Eye, EyeOff } from 'lucide-react';

const ColumnSelector = ({ columns, visibleColumns, onToggleColumn }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs uppercase transition-colors"
        title="Seleccionar columnas"
      >
        <Columns size={14} />
        COLUMNAS
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1 border-b border-gray-200 dark:border-gray-700 mb-1">
            MOSTRAR COLUMNAS
          </div>
          {columns.map(column => (
            <label
              key={column.key}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={visibleColumns[column.key]}
                onChange={() => onToggleColumn(column.key)}
                className="rounded border-gray-300 text-accent focus:ring-accent"
                disabled={column.fixed}
              />
              <div className="flex-1 text-sm">{column.label}</div>
              <div className="text-gray-400">
                {visibleColumns[column.key] ? <Eye size={14} /> : <EyeOff size={14} />}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColumnSelector;
