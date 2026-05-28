// frontend/src/components/buscadores/BuscadorPersona.jsx
import { useState, useEffect, useRef } from 'react';
import { Search, X, Users, Plus } from 'lucide-react';
import api from '../../services/api';
import useClickOutside from '../../hooks/useClickOutside';
import { useModal } from '../../contexts/ModalContext';
import toast from 'react-hot-toast';

const BuscadorPersona = ({ 
  value, 
  onChange, 
  placeholder = "Buscar persona...",
  onCrearNueva,
  onClear,
  autoFocus = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keepOpen, setKeepOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const { abrirModalPersona } = useModal();

  // Modificamos useClickOutside para respetar keepOpen
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (keepOpen) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [keepOpen]);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setPersonas([]);
      return;
    }

    const timer = setTimeout(() => {
      buscarPersonas();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const buscarPersonas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/personas/', {
        params: {
          search: searchTerm,
          activo: true,
        }
      });
      setPersonas(response.data.results || response.data);
    } catch (error) {
      console.error('Error buscando personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarPersona = (persona) => {
    onChange(persona);
    setSearchTerm('');
    setIsOpen(false);
    setKeepOpen(false);
  };

  const limpiar = () => {
    onChange(null);
    if (onClear) onClear();
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleCrearNueva = () => {
    console.log('🟡 Click en crear nueva persona');
    setKeepOpen(true);
    
    if (onCrearNueva) {
      // PASAMOS EL CALLBACK PARA RECIBIR EL ID
      onCrearNueva((nuevaPersonaId) => {
        console.log('📦 BuscadorPersona recibió ID:', nuevaPersonaId);
        api.get(`/personas/${nuevaPersonaId}/`)
          .then(response => {
            console.log('✅ Persona obtenida:', response.data);
            seleccionarPersona(response.data);
            setKeepOpen(false);
          })
          .catch(error => {
            console.error('❌ Error obteniendo persona:', error);
            setKeepOpen(false);
            toast.error('Error al obtener la persona creada');
          });
      });
    } else {
      abrirModalPersona((nuevaPersonaId) => {
        console.log('📦 Modal devolvió ID:', nuevaPersonaId);
        api.get(`/personas/${nuevaPersonaId}/`)
          .then(response => {
            console.log('✅ Persona obtenida:', response.data);
            seleccionarPersona(response.data);
            setKeepOpen(false);
          })
          .catch(error => {
            console.error('❌ Error:', error);
            setKeepOpen(false);
            toast.error('Error al obtener la persona');
          });
      });
    }
  };

  const formatNombre = (persona) => {
    if (!persona) return '';
    if (persona.tipo_persona === 'juridica') return persona.razon_social || '—';
    const apellido = persona.apellido || '';
    const nombre = persona.nombre || '';
    if (apellido && nombre) return `${apellido}, ${nombre}`;
    return apellido || nombre || '—';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input de búsqueda */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <input
          ref={inputRef}
          type="text"
          value={value ? formatNombre(value) : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (value) onChange(null);
            setIsOpen(true);
            setKeepOpen(false);
          }}
          onFocus={() => {
            setIsOpen(true);
            setKeepOpen(false);
          }}
          placeholder={value ? '' : placeholder}
          className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
          autoFocus={autoFocus}
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

      {/* Dropdown de resultados */}
      {isOpen && searchTerm.length >= 2 && !value && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-center text-sm text-gray-500">Buscando...</div>
          ) : personas.length === 0 ? (
            <div className="p-3">
              <div className="text-center text-sm text-gray-500 mb-2">
                No se encontraron personas para "{searchTerm}"
              </div>
              <button
                type="button"
                onClick={handleCrearNueva}
                className="w-full p-2 text-left text-sm text-accent hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 rounded border border-dashed border-accent"
              >
                <Plus size={16} />
                Crear nueva persona "{searchTerm}"
              </button>
            </div>
          ) : (
            <>
              {personas.map(persona => (
                <button
                  key={persona.id}
                  onClick={() => seleccionarPersona(persona)}
                  className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 border-b last:border-0 border-gray-100 dark:border-gray-700"
                >
                  <Users size={16} className="text-gray-400" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">
                      {formatNombre(persona)}
                    </span>
                    {persona.numero_documento && (
                      <span className="text-xs text-gray-500 ml-2">
                        {persona.tipo_documento}: {persona.numero_documento}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button
                type="button"
                onClick={handleCrearNueva}
                className="w-full p-2 text-left text-sm text-accent hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Plus size={16} />
                Crear nueva persona
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BuscadorPersona;
