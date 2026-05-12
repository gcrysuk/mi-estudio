import { useState, useEffect } from 'react';
import { X, Save, Trash2, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const TipoPersonaModal = ({ isOpen, onClose, onSave, tipo }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activo: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Resetear formulario cuando cambia el tipo o se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (tipo) {
        setFormData({
          nombre: tipo.nombre || '',
          descripcion: tipo.descripcion || '',
          activo: tipo.activo !== undefined ? tipo.activo : true
        });
      } else {
        setFormData({
          nombre: '',
          descripcion: '',
          activo: true
        });
      }
      setError('');
      setDeleteConfirm(false);
    }
  }, [tipo, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (tipo) {
        // Actualizar
        console.log('Actualizando tipo:', tipo.id, formData);
        const response = await api.put('/personas/tipos/', {
          id: tipo.id,
          ...formData
        });
        console.log('Respuesta actualización:', response.data);
      } else {
        // Crear
        console.log('Creando tipo:', formData);
        const response = await api.post('/personas/tipos/', formData);
        console.log('Respuesta creación:', response.data);
      }
      
      // Notificar éxito y cerrar
      onSave();
      onClose();
    } catch (error) {
      console.error('Error en guardado:', error.response?.data || error.message);
      setError(error.response?.data?.error || 'Error al guardar el tipo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Eliminando tipo ID:', tipo.id);
      
      // Enviar el ID como query parameter
      const response = await api.delete(`/personas/tipos/?id=${tipo.id}`);
      console.log('Respuesta eliminación:', response.data);
      
      // Notificar éxito y cerrar
      onSave();
      onClose();
    } catch (error) {
      console.error('Error en eliminación:', error.response?.data || error.message);
      
      // Mostrar mensaje de error específico
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Error al eliminar el tipo. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase">
            {tipo ? 'EDITAR TIPO' : 'NUEVO TIPO DE PERSONA'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 hover:text-accent transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {deleteConfirm ? (
          <div className="p-6">
            <div className="flex items-center gap-3 text-yellow-600 mb-4">
              <AlertCircle size={24} />
              <p className="font-medium">¿Eliminar este tipo?</p>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              El tipo "{tipo?.nombre}" será desactivado. Esta acción se puede revertir.
            </p>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                disabled={loading}
              >
                CANCELAR
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {loading ? 'ELIMINANDO...' : 'ELIMINAR'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 uppercase">
                NOMBRE *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value.toUpperCase()})}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-2 focus:ring-accent"
                required
                maxLength="50"
                disabled={loading}
                placeholder="Ej: CLIENTE, PROVEEDOR, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 uppercase">
                DESCRIPCIÓN
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                rows="3"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-2 focus:ring-accent"
                disabled={loading}
                placeholder="Descripción opcional del tipo"
              />
            </div>

            {tipo && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                  className="rounded border-gray-300 text-accent focus:ring-accent"
                  disabled={loading}
                />
                <label htmlFor="activo" className="text-sm font-medium uppercase">
                  ACTIVO
                </label>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {tipo && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  <Trash2 size={18} />
                  ELIMINAR
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
                  disabled={loading}
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {loading ? 'GUARDANDO...' : 'GUARDAR'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TipoPersonaModal;
