import { useState, useEffect } from 'react';
import { X, Save, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ConfirmDialog from '../ui/ConfirmDialog';

const TipoCarpetaManager = ({ isOpen, onClose, onSave }) => {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    orden: 0,
    descripcion: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchTipos();
    }
  }, [isOpen]);

  const fetchTipos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/carpetas/tipos/');
      setTipos(response.data);
    } catch (error) {
      console.error('Error fetching tipos:', error);
      toast.error('Error al cargar tipos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/carpetas/tipos/${editingId}/`, formData);
        toast.success('Tipo actualizado');
      } else {
        await api.post('/carpetas/tipos/', formData);
        toast.success('Tipo creado');
      }
      
      resetForm();
      fetchTipos();
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving tipo:', error);
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/carpetas/tipos/${id}/`);
      toast.success('Tipo eliminado');
      fetchTipos();
      if (onSave) onSave();
    } catch (error) {
      console.error('Error deleting tipo:', error);
      toast.error('No se puede eliminar porque está en uso');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleEdit = (tipo) => {
    setEditingId(tipo.id);
    setFormData({
      nombre: tipo.nombre,
      orden: tipo.orden || 0,
      descripcion: tipo.descripcion || ''
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nombre: '',
      orden: 0,
      descripcion: ''
    });
  };

  if (!isOpen) return null;

  return (
    <>
    <ConfirmDialog
      isOpen={!!confirmDelete}
      title="Confirmar eliminación"
      message={`¿Eliminar el tipo "${confirmDelete?.nombre}"?`}
      onConfirm={() => handleDelete(confirmDelete.id)}
      onCancel={() => setConfirmDelete(null)}
    />
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
          <h2 className="text-lg font-bold uppercase">GESTIÓN DE TIPOS</h2>
          <button onClick={onClose} className="p-1 hover:text-accent">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {/* Formulario */}
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-bold mb-3 uppercase">
              {editingId ? 'EDITAR TIPO' : 'NUEVO TIPO'}
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 uppercase">NOMBRE *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value.toUpperCase()})}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1 uppercase">ORDEN</label>
                <input
                  type="number"
                  value={formData.orden}
                  onChange={(e) => setFormData({...formData, orden: parseInt(e.target.value) || 0})}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1 uppercase">DESCRIPCIÓN</label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-3">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100"
                >
                  CANCELAR
                </button>
              )}
              <button
                type="submit"
                className="px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white flex items-center gap-1"
              >
                <Save size={14} />
                {editingId ? 'ACTUALIZAR' : 'CREAR'}
              </button>
            </div>
          </form>

          {/* Lista de tipos */}
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase">TIPOS EXISTENTES</h3>
            {loading ? (
              <p className="text-center py-4">Cargando...</p>
            ) : (
              <div className="space-y-2">
                {tipos.map(tipo => (
                  <div
                    key={tipo.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{tipo.nombre}</span>
                      {tipo.descripcion && (
                        <span className="text-xs text-gray-500 ml-2">({tipo.descripcion})</span>
                      )}
                      <span className="text-xs text-gray-500 ml-2">Orden: {tipo.orden}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(tipo)}
                        className="p-1 hover:text-accent"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: tipo.id, nombre: tipo.nombre })}
                        className="p-1 hover:text-red-500"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default TipoCarpetaManager;
