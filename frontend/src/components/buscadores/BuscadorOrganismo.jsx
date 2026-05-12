// frontend/src/components/buscadores/BuscadorOrganismo.jsx
import { useState, useEffect, useRef } from 'react';
import { Search, X, Building } from 'lucide-react';
import api from '../../services/api';
import useClickOutside from '../../hooks/useClickOutside';

const BuscadorOrganismo = ({ value, onChange, placeholder = "Buscar organismo...", onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [organismos, setOrganismos] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setOrganismos([]);
      return;
    }

    const timer = setTimeout(() => {
      buscarOrganismos();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const buscarOrganismos = async () => {
    setLoading(true);
    try {
      // Usar el endpoint de organismos
      const response = await api.get('/carpetas/organismos/', {
        params: {
          search: searchTerm, // Si el backend soporta búsqueda
          activo: true
        }
      });
      setOrganismos(response.data);
    } catch (error) {
      console.error('Error buscando organismos:', error);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarOrganismo = (organismo) => {
    onChange(organismo);
    setSearchTerm('');
    setIsOpen(false);
  };

  const limpiar = () => {
    onChange(null);
    if (onClear) onClear();
    setSearchTerm('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <input
          ref={inputRef}
          type="text"
          value={value ? value.nombre : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (value) onChange(null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={value ? '' : placeholder}
          className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
          disabled={value}
        />
        {value && (
          <button
            onClick={limpiar}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && searchTerm.length >= 2 && !value && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-center text-sm text-gray-500">Buscando...</div>
          ) : organismos.length === 0 ? (
            <div className="p-2 text-center text-sm text-gray-500">No se encontraron organismos</div>
          ) : (
            organismos.map(organismo => (
              <button
                key={organismo.id}
                onClick={() => seleccionarOrganismo(organismo)}
                className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 border-b last:border-0 border-gray-100 dark:border-gray-700"
              >
                <Building size={16} className="text-gray-400" />
                <div className="flex-1">
                  <span className="text-sm font-medium">
                    {organismo.nombre}
                  </span>
                  {organismo.descripcion && (
                    <span className="text-xs text-gray-500 ml-2">
                      {organismo.descripcion}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BuscadorOrganismo;
