import { useState, useEffect, useRef } from 'react';
import { Search, X, Building2, Plus } from 'lucide-react';
import api from '../../services/api';
import useClickOutside from '../../hooks/useClickOutside';

const BuscadorOrganismo = ({ value, onChange, onCrearNuevo, placeholder = 'Buscar organismo...' }) => {
  const [isOpen, setIsOpen]     = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [organismos, setOrganismos] = useState([]);
  const [loading, setLoading]   = useState(false);
  const dropdownRef = useRef(null);
  const inputRef    = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setOrganismos([]);
      return;
    }
    const timer = setTimeout(buscarOrganismos, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const buscarOrganismos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/organismos/', {
        params: { search: searchTerm, activo: true },
      });
      setOrganismos(response.data.results ?? response.data);
    } catch (error) {
      console.error('Error buscando organismos:', error);
    } finally {
      setLoading(false);
    }
  };

  const seleccionar = (organismo) => {
    onChange(organismo);
    setSearchTerm('');
    setIsOpen(false);
  };

  const limpiar = () => {
    onChange(null);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
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
          disabled={!!value}
          className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent disabled:opacity-70"
        />
        {value && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
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
            <div className="p-3">
              <p className="text-center text-sm text-gray-500 mb-2">No se encontraron organismos</p>
              {onCrearNuevo && (
                <button
                  type="button"
                  onClick={onCrearNuevo}
                  className="w-full p-2 text-left text-sm text-accent hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 rounded border border-dashed border-accent"
                >
                  <Plus size={15} /> + Agregar organismo
                </button>
              )}
            </div>
          ) : (
            <>
              {organismos.map(org => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => seleccionar(org)}
                  className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 border-b last:border-0 border-gray-100 dark:border-gray-700"
                >
                  <Building2 size={15} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{org.nombre}</p>
                    {(org.jurisdiccion || org.localidad) && (
                      <p className="text-xs text-gray-500 truncate">
                        {[org.jurisdiccion, org.localidad].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </button>
              ))}
              {onCrearNuevo && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700" />
                  <button
                    type="button"
                    onClick={onCrearNuevo}
                    className="w-full p-2 text-left text-sm text-accent hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <Plus size={15} /> + Agregar organismo
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BuscadorOrganismo;
