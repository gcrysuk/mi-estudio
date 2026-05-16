import { useState, useEffect } from 'react';
import { X, Save, Edit, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ConfirmDialog from '../ui/ConfirmDialog';

const EstadoCarpetaManager = ({ isOpen, onClose, onSave }) => {
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [estadoEnUso, setEstadoEnUso] = useState(null);
  const [carpetasCount, setCarpetasCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    color: '#4FC3F7',
    orden: 0,
    descripcion: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchEstados();
    }
  }, [isOpen]);

  const fetchEstados = async () => {
    setLoading(true);
    try {
      const response = await api.get('/carpetas/estados/');
      setEstados(response.data);
    } catch (error) {
      console.error('Error fetching estados:', error);
      toast.error('Error al cargar estados');
    } finally {
      setLoading(false);
    }
  };

const verificarUso = async (id) => {
  try {
    const response = await api.get(`/carpetas/estados/${id}/count/`);
    return response.data.count;
  } catch (error) {
    console.error('Error verificando uso:', error);
    return 0;
  }
};



  const handleEditClick = async (estado) => {
    const count = await verificarUso(estado.id);
    
    if (count > 0) {
      setEstadoEnUso(estado);
      setCarpetasCount(count);
      setPendingAction({ type: 'edit', data: estado });
      setShowWarning(true);
    } else {
      // Si no está en uso, editar directamente
      setEditingId(estado.id);
      setFormData({
        nombre: estado.nombre,
        color: estado.color || '#4FC3F7',
        orden: estado.orden || 0,
        descripcion: estado.descripcion || ''
      });
    }
  };

  const handleDeleteClick = async (id, nombre) => {
    const count = await verificarUso(id);
    
    if (count > 0) {
      setEstadoEnUso({ id, nombre });
      setCarpetasCount(count);
      setPendingAction({ type: 'delete', id, nombre });
      setShowWarning(true);
    } else {
      setConfirmDelete({ id, nombre });
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/carpetas/estados/${confirmDelete.id}/`);
      toast.success('Estado eliminado');
      fetchEstados();
      if (onSave) onSave();
    } catch (error) {
      console.error('Error deleting estado:', error);
      toast.error('Error al eliminar');
    } finally {
      setConfirmDelete(null);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'edit') {
      setEditingId(pendingAction.data.id);
      setFormData({
        nombre: pendingAction.data.nombre,
        color: pendingAction.data.color || '#4FC3F7',
        orden: pendingAction.data.orden || 0,
        descripcion: pendingAction.data.descripcion || ''
      });
      toast.success(`Se actualizarán ${carpetasCount} carpetas`, {
        icon: '⚠️',
        duration: 4000
      });
    } else if (pendingAction.type === 'delete') {
      try {
        await api.delete(`/carpetas/estados/${pendingAction.id}/`);
        toast.success('Estado eliminado');
        fetchEstados();
        if (onSave) onSave();
      } catch (error) {
        console.error('Error deleting estado:', error);
        toast.error('Error al eliminar');
      }
    }

    setShowWarning(false);
    setPendingAction(null);
    setEstadoEnUso(null);
  };

  const cancelAction = () => {
    setShowWarning(false);
    setPendingAction(null);
    setEstadoEnUso(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/carpetas/estados/${editingId}/`, formData);
        toast.success('Estado actualizado');
      } else {
        await api.post('/carpetas/estados/', formData);
        toast.success('Estado creado');
      }
      
      resetForm();
      fetchEstados();
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving estado:', error);
      toast.error('Error al guardar');
    }
  };

  const handleEdit = (estado) => {
    setEditingId(estado.id);
    setFormData({
      nombre: estado.nombre,
      color: estado.color || '#4FC3F7',
      orden: estado.orden || 0,
      descripcion: estado.descripcion || ''
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nombre: '',
      color: '#4FC3F7',
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
      message={`¿Eliminar el estado "${confirmDelete?.nombre}"?`}
      onConfirm={handleDeleteConfirmed}
      onCancel={() => setConfirmDelete(null)}
    />
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
          <h2 className="text-lg font-bold uppercase">GESTIÓN DE ESTADOS</h2>
          <button onClick={onClose} className="p-1 hover:text-accent">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {/* Modal de advertencia */}
          {showWarning && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
              <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center gap-3 text-yellow-600 mb-4">
                  <AlertTriangle size={32} />
                  <h3 className="text-lg font-bold">¡CUIDADO!</h3>
                </div>
                
                <p className="mb-4">
                  {pendingAction?.type === 'edit' ? (
                    <>El estado <span className="font-bold">{estadoEnUso?.nombre}</span> está siendo utilizado en <span className="font-bold">{carpetasCount}</span> carpetas.</>
                  ) : (
                    <>El estado <span className="font-bold">{estadoEnUso?.nombre}</span> está siendo utilizado en <span className="font-bold">{carpetasCount}</span> carpetas.</>
                  )}
                </p>
                
                <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                  {pendingAction?.type === 'edit' ? (
                    'Si editas este estado, TODAS las carpetas que lo usan se actualizarán automáticamente con los nuevos valores.'
                  ) : (
                    'No puedes eliminar un estado que está en uso. Debes reasignar las carpetas primero.'
                  )}
                </p>
                
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelAction}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    CANCELAR
                  </button>
                  {pendingAction?.type === 'edit' && (
                    <button
                      onClick={confirmAction}
                      className="px-4 py-2 text-sm rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      EDITAR DE TODOS MODOS
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-bold mb-3 uppercase">
              {editingId ? 'EDITAR ESTADO' : 'NUEVO ESTADO'}
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
                <label className="block text-xs font-medium mb-1 uppercase">COLOR</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="w-12 h-8 rounded border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated"
                    placeholder="#4FC3F7"
                  />
                </div>
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
              
              <div>
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

          {/* Lista de estados */}
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase">ESTADOS EXISTENTES</h3>
            {loading ? (
              <p className="text-center py-4">Cargando...</p>
            ) : (
              <div className="space-y-2">
                {estados.map(estado => (
                  <div
                    key={estado.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span 
                        className="w-6 h-6 rounded-full" 
                        style={{ backgroundColor: estado.color || '#4FC3F7' }}
                      />
                      <div>
                        <span className="font-medium">{estado.nombre}</span>
                        {estado.descripcion && (
                          <span className="text-xs text-gray-500 ml-2">({estado.descripcion})</span>
                        )}
                        <span className="text-xs text-gray-500 ml-2">Orden: {estado.orden}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditClick(estado)}
                        className="p-1 hover:text-accent"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(estado.id, estado.nombre)}
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

export default EstadoCarpetaManager;
