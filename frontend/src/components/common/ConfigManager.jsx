import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Save, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ConfigManager = ({ 
  title, 
  endpoint, 
  fields = [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'color', label: 'Color', type: 'color', default: '#4FC3F7' },
    { key: 'orden', label: 'Orden', type: 'number', default: 0 }
  ],
  onSave 
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await api.get(endpoint);
      setItems(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const defaultData = {};
    fields.forEach(field => {
      defaultData[field.key] = field.default || (field.type === 'color' ? '#4FC3F7' : '');
    });
    setFormData(defaultData);
    setEditingItem(null);
  };

  const handleEdit = (item) => {
    const editData = {};
    fields.forEach(field => {
      editData[field.key] = item[field.key] || '';
    });
    setFormData(editData);
    setEditingItem(item);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar campos requeridos
    for (const field of fields) {
      if (field.required && !formData[field.key]) {
        toast.error(`${field.label} es obligatorio`);
        return;
      }
    }

    try {
      if (editingItem) {
        await api.put(`${endpoint}${editingItem.id}/`, formData);
        toast.success('Actualizado correctamente');
      } else {
        await api.post(endpoint, formData);
        toast.success('Creado correctamente');
      }
      resetForm();
      fetchItems();
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    
    try {
      await api.delete(`${endpoint}${id}/`);
      toast.success('Eliminado correctamente');
      fetchItems();
      if (onSave) onSave();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Error al eliminar');
    }
  };

  const moveItem = async (id, direction) => {
    const index = items.findIndex(i => i.id === id);
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === items.length - 1)
    ) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[direction === 'up' ? index - 1 : index + 1];
    newItems[direction === 'up' ? index - 1 : index + 1] = temp;

    // Actualizar órdenes
    try {
      await Promise.all(newItems.map((item, idx) => 
        api.put(`${endpoint}${item.id}/`, { ...item, orden: idx + 1 })
      ));
      setItems(newItems);
      toast.success('Orden actualizado');
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Error al reordenar');
    }
  };

  return (
    <div className="space-y-4">
      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
        <h3 className="font-bold uppercase text-sm">
          {editingItem ? 'EDITAR' : 'NUEVO'} {title}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {fields.map(field => (
            <div key={field.key}>
              <label className="block text-xs font-medium mb-1 uppercase">
                {field.label} {field.required && '*'}
              </label>
              {field.type === 'color' ? (
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData[field.key] || field.default || '#4FC3F7'}
                    onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                    className="w-12 h-9 rounded border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={formData[field.key] || field.default || '#4FC3F7'}
                    onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                    className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
                    placeholder="#4FC3F7"
                  />
                </div>
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({...formData, [field.key]: parseInt(e.target.value) || 0})}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
                />
              ) : (
                <input
                  type="text"
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({...formData, [field.key]: e.target.value.toUpperCase()})}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
                  required={field.required}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {editingItem && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              CANCELAR
            </button>
          )}
          <button
            type="submit"
            className="px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white flex items-center gap-1"
          >
            <Save size={14} />
            {editingItem ? 'ACTUALIZAR' : 'CREAR'}
          </button>
        </div>
      </form>

      {/* Lista */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase w-16">ORDEN</th>
                {fields.map(field => (
                  <th key={field.key} className="px-4 py-2 text-left text-xs font-medium uppercase">
                    {field.label}
                  </th>
                ))}
                <th className="px-4 py-2 text-right text-xs font-medium uppercase">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={fields.length + 2} className="px-4 py-3 text-center">Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={fields.length + 2} className="px-4 py-6 text-center text-gray-500">
                  No hay {title.toLowerCase()} creados
                </td></tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{index + 1}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveItem(item.id, 'up')}
                            disabled={index === 0}
                            className="text-gray-500 hover:text-accent disabled:opacity-30"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => moveItem(item.id, 'down')}
                            disabled={index === items.length - 1}
                            className="text-gray-500 hover:text-accent disabled:opacity-30"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </div>
                    </td>
                    {fields.map(field => (
                      <td key={field.key} className="px-4 py-2 whitespace-nowrap">
                        {field.key === 'color' ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded-full border border-gray-300"
                              style={{ backgroundColor: item[field.key] }}
                            />
                            <span className="text-xs font-mono">{item[field.key]}</span>
                          </div>
                        ) : (
                          <span className="text-sm">{item[field.key]}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-500 hover:text-blue-700"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.nombre)}
                        className="text-red-500 hover:text-red-700"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConfigManager;
