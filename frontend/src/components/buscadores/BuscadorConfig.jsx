import { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Tag, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useClickOutside from '../../hooks/useClickOutside';

const BuscadorConfig = ({ endpoint, placeholder, label, value, onChange, withColor = false }) => {
  const [isOpen, setIsOpen]         = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(false);

  const [showForm, setShowForm]     = useState(false);
  const [newNombre, setNewNombre]   = useState('');
  const [newColor, setNewColor]     = useState('#4FC3F7');
  const [creating, setCreating]     = useState(false);

  const dropdownRef = useRef(null);
  const inputRef    = useRef(null);
  const nombreRef   = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(fetchItems, searchTerm ? 250 : 0);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  // Focus nombre input when form opens
  useEffect(() => {
    if (showForm) setTimeout(() => nombreRef.current?.focus(), 50);
  }, [showForm]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const res = await api.get(endpoint, { params });
      setItems(res.data.results ?? res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const seleccionar = (item) => {
    onChange(item);
    setSearchTerm('');
    setIsOpen(false);
  };

  const limpiar = () => {
    onChange(null);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const openForm = () => {
    setNewNombre(searchTerm.trim().toUpperCase());
    setNewColor('#4FC3F7');
    setIsOpen(false);
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const nombre = newNombre.trim();
    if (!nombre) return;
    setCreating(true);
    try {
      const body = { nombre };
      if (withColor) body.color = newColor;
      const res = await api.post(endpoint, body);
      toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} creado`);
      seleccionar(res.data);
      setShowForm(false);
    } catch {
      toast.error(`Error al crear ${label}`);
    } finally {
      setCreating(false);
    }
  };

  const showAddButton = searchTerm.trim().length > 0 && !loading &&
    !items.some(i => i.nombre.toLowerCase() === searchTerm.trim().toLowerCase());

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          {value?.color ? (
            <span
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: value.color }}
            />
          ) : (
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          )}
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

        {isOpen && !value && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {loading ? (
              <div className="p-2 text-center text-sm text-gray-500">Buscando...</div>
            ) : items.length === 0 && !showAddButton ? (
              <div className="p-2 text-center text-sm text-gray-500">Sin resultados</div>
            ) : (
              <>
                {items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => seleccionar(item)}
                    className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 border-b last:border-0 border-gray-100 dark:border-gray-700"
                  >
                    {item.color ? (
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                    ) : (
                      <Tag size={13} className="text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-sm truncate">{item.nombre}</span>
                  </button>
                ))}
                {showAddButton && (
                  <>
                    {items.length > 0 && <div className="border-t border-gray-200 dark:border-gray-700" />}
                    <button
                      type="button"
                      onClick={openForm}
                      className="w-full p-2 text-left text-sm text-accent hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <Plus size={14} />
                      + Agregar &quot;{searchTerm.trim()}&quot;
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Mini-modal de creación */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[300] p-4">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-bold uppercase">
                Nuevo {label}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 uppercase">NOMBRE *</label>
                <input
                  ref={nombreRef}
                  type="text"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                  required
                  placeholder={`Nombre del ${label}...`}
                />
              </div>

              {withColor && (
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">COLOR</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-10 h-9 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent font-mono"
                      placeholder="#4FC3F7"
                    />
                    <span
                      className="w-7 h-7 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: newColor }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 uppercase"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white uppercase flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Save size={13} />
                  {creating ? 'CREANDO...' : 'CREAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default BuscadorConfig;
