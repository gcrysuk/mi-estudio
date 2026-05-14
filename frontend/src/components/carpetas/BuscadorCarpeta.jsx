import { useState, useEffect, useRef } from 'react';
import { Search, X, FolderOpen, Plus } from 'lucide-react';
import api from '../../services/api';
import useClickOutside from '../../hooks/useClickOutside';

const BuscadorCarpeta = ({ value, onChange, onCrearNueva, placeholder = "Buscar carpeta..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [carpetas, setCarpetas] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setCarpetas([]);
      return;
    }

    const timer = setTimeout(() => {
      buscarCarpetas();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const buscarCarpetas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/carpetas/', {
        params: { search: searchTerm, activo: true }
      });
      setCarpetas(response.data.results || response.data);
    } catch (error) {
      console.error('Error buscando carpetas:', error);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarCarpeta = (carpeta) => {
    onChange(carpeta);
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
          ) : carpetas.length === 0 ? (
            <div className="p-3">
              <div className="text-center text-sm text-gray-500 mb-2">
                No se encontraron carpetas
              </div>
              {onCrearNueva && (
                <button
                  onClick={onCrearNueva}
                  className="w-full p-2 text-left text-sm text-accent hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 rounded border border-dashed border-accent"
                >
                  <Plus size={16} />
                  + Agregar carpeta
                </button>
              )}
            </div>
          ) : (
            <>
              {carpetas.map(carpeta => (
                <button
                  key={carpeta.id}
                  onClick={() => seleccionarCarpeta(carpeta)}
                  className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 border-b last:border-0 border-gray-100 dark:border-gray-700"
                >
                  <FolderOpen size={16} className="text-gray-400" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{carpeta.nombre}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {carpeta.numero_expediente}
                    </span>
                  </div>
                </button>
              ))}
              {onCrearNueva && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button
                    onClick={onCrearNueva}
                    className="w-full p-2 text-left text-sm text-accent hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    + Agregar carpeta
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

export default BuscadorCarpeta;
