import { useState, useEffect } from 'react';
import { X, Save, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ConfirmDialog from '../ui/ConfirmDialog';

const ObjetoCarpetaManager = ({ isOpen, onClose, onSave }) => {
  const [objetos, setObjetos] = useState([]);
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
      fetchObjetos();
    }
  }, [isOpen]);

  const fetchObjetos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/carpetas/objetos/');
      setObjetos(response.data);
    } catch (error) {
      console.error('Error fetching objetos:', error);
      toast.error('Error al cargar objetos');
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
        await api.put(`/carpetas/objetos/${editingId}/`, formData);
        toast.success('Objeto actualizado');
      } else {
        await api.post('/carpetas/objetos/', formData);
        toast.success('Objeto creado');
      }
      
      resetForm();
      fetchObjetos();
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving objeto:', error);
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/carpetas/objetos/${id}/`);
      toast.success('Objeto eliminado');
      fetchObjetos();
      if (onSave) onSave();
    } catch (error) {
      console.error('Error deleting objeto:', error);
      toast.error('No se puede eliminar porque está en uso');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleEdit = (objeto) => {
    setEditingId(objeto.id);
    setFormData({
      nombre: objeto.nombre,
      orden: objeto.orden || 0,
      descripcion: objeto.descripcion || ''
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
      message={`¿Eliminar el objeto "${confirmDelete?.nombre}"?`}
      onConfirm={() => handleDelete(confirmDelete.id)}
      onCancel={() => setConfirmDelete(null)}
    />
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
          <h2 className="text-lg font-bold uppercase">GESTIÓN DE OBJETOS</h2>
          <button onClick={onClose} className="p-1 hover:text-accent">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {/* Formulario */}
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-bold mb-3 uppercase">
              {editingId ? 'EDITAR OBJETO' : 'NUEVO OBJETO'}
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

          {/* Lista de objetos */}
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase">OBJETOS EXISTENTES</h3>
            {loading ? (
              <p className="text-center py-4">Cargando...</p>
            ) : (
              <div className="space-y-2">
                {objetos.map(objeto => (
                  <div
                    key={objeto.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{objeto.nombre}</span>
                      {objeto.descripcion && (
                        <span className="text-xs text-gray-500 ml-2">({objeto.descripcion})</span>
                      )}
                      <span className="text-xs text-gray-500 ml-2">Orden: {objeto.orden}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(objeto)}
                        className="p-1 hover:text-accent"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: objeto.id, nombre: objeto.nombre })}
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

export default ObjetoCarpetaManager;
