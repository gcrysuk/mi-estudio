import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, FolderOpen, Settings, Clock, Calendar, Plus, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import MovimientoConfig from './MovimientoConfig';
import BuscadorCarpeta from '../../components/carpetas/BuscadorCarpeta';
import CarpetaForm from '../../components/carpetas/CarpetaForm';

const MovimientoForm = ({ carpetaId: initialCarpetaId, carpetaNombre, movimiento, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [tiposMovimiento, setTiposMovimiento] = useState([]);
  const [estadosMovimiento, setEstadosMovimiento] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showCarpetaForm, setShowCarpetaForm] = useState(false);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState(null);
  const [nombreInicial, setNombreInicial] = useState('');
  const [notificaciones, setNotificaciones] = useState([]); // [{id, fecha, isNew}]
  const [toDelete, setToDelete] = useState([]);             // ids to DELETE on save
  const [nuevaFecha, setNuevaFecha] = useState('');

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: '',
    estado: '',
    fecha_movimiento: getCurrentDateTime(),
    fecha_vencimiento: '',
    tiempo_trabajo: '',
    carpeta: initialCarpetaId || ''
  });

  useEffect(() => {
    fetchTiposMovimiento();
    fetchEstadosMovimiento();

    if (movimiento) {
      setFormData({
        titulo: movimiento.titulo || '',
        descripcion: movimiento.descripcion || '',
        tipo: movimiento.tipo || '',
        estado: movimiento.estado || '',
        fecha_movimiento: movimiento.fecha_movimiento ?
          new Date(movimiento.fecha_movimiento).toISOString().slice(0, 16) : getCurrentDateTime(),
        fecha_vencimiento: movimiento.fecha_vencimiento ?
          new Date(movimiento.fecha_vencimiento).toISOString().slice(0, 16) : '',
        tiempo_trabajo: movimiento.tiempo_trabajo || '',
        carpeta: movimiento.carpeta || ''
      });
      if (movimiento.carpeta) {
        setCarpetaSeleccionada({
          id: movimiento.carpeta,
          nombre: movimiento.carpeta_nombre || ''
        });
      }
      // Cargar notificaciones existentes
      api.get('/movimientos/notificaciones/', { params: { movimiento: movimiento.id } })
        .then(res => {
          const items = (res.data.results ?? res.data).map(n => ({
            id: n.id,
            fecha: new Date(n.fecha).toISOString().slice(0, 16),
            isNew: false,
          }));
          setNotificaciones(items);
        })
        .catch(() => {});
    } else if (initialCarpetaId) {
      setCarpetaSeleccionada({ id: initialCarpetaId, nombre: carpetaNombre || '' });
    }
  }, [movimiento, initialCarpetaId]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const fetchTiposMovimiento = async () => {
    try {
      const response = await api.get('/movimientos/tipos/');
      setTiposMovimiento(response.data);
    } catch (error) {
      console.error('Error fetching tipos:', error);
    }
  };

  const fetchEstadosMovimiento = async () => {
    try {
      const response = await api.get('/movimientos/estados/');
      setEstadosMovimiento(response.data);
    } catch (error) {
      console.error('Error fetching estados:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.titulo) {
      toast.error('El título es obligatorio');
      return;
    }

    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        carpeta: formData.carpeta || null,
        fecha_movimiento: new Date(formData.fecha_movimiento).toISOString(),
        fecha_notificacion: null,
        fecha_vencimiento: formData.fecha_vencimiento ?
          new Date(formData.fecha_vencimiento).toISOString() : null,
        tiempo_trabajo: formData.tiempo_trabajo ? parseInt(formData.tiempo_trabajo) : null,
        tipo: formData.tipo || null,
        estado: formData.estado || null
      };

      let movimientoId;
      if (movimiento) {
        await api.put(`/movimientos/${movimiento.id}/`, dataToSend);
        movimientoId = movimiento.id;
        toast.success('Movimiento actualizado');
      } else {
        const res = await api.post('/movimientos/', dataToSend);
        movimientoId = res.data.id;
        toast.success('Movimiento creado');
      }

      // Sincronizar notificaciones
      await Promise.all(toDelete.map(id => api.delete(`/movimientos/notificaciones/${id}/`)));
      await Promise.all(
        notificaciones
          .filter(n => n.isNew)
          .map(n => api.post('/movimientos/notificaciones/', {
            movimiento: movimientoId,
            fecha: new Date(n.fecha).toISOString(),
          }))
      );

      onSave();
    } catch (error) {
      console.error('Error saving movimiento:', error);
      toast.error('Error al guardar: ' + (error.response?.data?.error || 'Verifica los datos'));
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarFecha = () => {
    if (!nuevaFecha) return;
    setNotificaciones(prev => [...prev, { id: null, fecha: nuevaFecha, isNew: true }]);
    setNuevaFecha('');
  };

  const handleRemoverFecha = (index) => {
    const notif = notificaciones[index];
    if (notif.id) setToDelete(prev => [...prev, notif.id]);
    setNotificaciones(prev => prev.filter((_, i) => i !== index));
  };

  const handleCarpetaCreada = (nuevaCarpeta) => {
    setCarpetaSeleccionada(nuevaCarpeta);
    setFormData(prev => ({ ...prev, carpeta: nuevaCarpeta.id }));
    setShowCarpetaForm(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface z-10">
            <h2 className="text-sm font-bold uppercase">
              {movimiento ? 'EDITAR MOVIMIENTO' : 'NUEVO MOVIMIENTO'}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowConfig(true)}
                className="p-1 hover:text-accent rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Configurar tipos y estados"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:text-accent rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={loading}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-3 space-y-2">
            {/* Carpeta - autocomplete */}
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase flex items-center gap-1">
                <FolderOpen size={12} />
                CARPETA
              </label>
              <BuscadorCarpeta
                value={carpetaSeleccionada}
                onChange={(c) => {
                  setCarpetaSeleccionada(c);
                  setFormData(prev => ({ ...prev, carpeta: c?.id || '' }));
                }}
                onCrearNueva={(texto) => { setNombreInicial(texto); setShowCarpetaForm(true); }}
                placeholder="Buscar carpeta..."
              />
            </div>

            {/* Título */}
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">TÍTULO *</label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                required
                placeholder="Ej: Presentación de demanda"
              />
            </div>

            {/* Tipo y Estado */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-0.5 uppercase">TIPO</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                >
                  <option value="">SELECCIONAR</option>
                  {tiposMovimiento.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-0.5 uppercase">ESTADO</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                >
                  <option value="">SELECCIONAR</option>
                  {estadosMovimiento.map(estado => (
                    <option key={estado.id} value={estado.id}>{estado.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fecha movimiento */}
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase flex items-center gap-1">
                <Calendar size={12} />
                FECHA MOVIMIENTO
              </label>
              <input
                type="datetime-local"
                value={formData.fecha_movimiento}
                onChange={(e) => setFormData({ ...formData, fecha_movimiento: e.target.value })}
                className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Notificaciones múltiples */}
            <div>
              <label className="block text-xs font-medium mb-1 uppercase flex items-center gap-1">
                <Bell size={12} />
                FECHAS DE NOTIFICACIÓN
              </label>
              <div className="flex gap-1">
                <input
                  type="datetime-local"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={handleAgregarFecha}
                  disabled={!nuevaFecha}
                  className="px-2 py-1 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-40 flex items-center gap-1 uppercase"
                >
                  <Plus size={12} /> AGREGAR
                </button>
              </div>
              {notificaciones.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {notificaciones.map((n, i) => (
                    <li key={i} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-dark-elevated rounded px-2 py-1">
                      <span>
                        {new Date(n.fecha).toLocaleString('es-AR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoverFecha(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Vencimiento y Tiempo */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-0.5 uppercase flex items-center gap-1">
                  <Clock size={12} />
                  FECHA VENCE
                </label>
                <input
                  type="datetime-local"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-0.5 uppercase flex items-center gap-1">
                  <Clock size={12} />
                  TIEMPO (min)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={formData.tiempo_trabajo}
                  onChange={(e) => setFormData({ ...formData, tiempo_trabajo: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                  placeholder="120"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">DESCRIPCIÓN</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows="2"
                className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                placeholder="Detalles del movimiento..."
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
                disabled={loading}
              >
                CANCELAR
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase flex items-center gap-1"
                disabled={loading}
              >
                <Save size={14} />
                {loading ? 'GUARDANDO...' : (movimiento ? 'ACTUALIZAR' : 'CREAR')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showConfig && (
        <MovimientoConfig onClose={() => {
          setShowConfig(false);
          fetchTiposMovimiento();
          fetchEstadosMovimiento();
        }} />
      )}

      {showCarpetaForm && createPortal(
        <CarpetaForm
          nombreInicial={nombreInicial}
          onClose={() => setShowCarpetaForm(false)}
          onSave={handleCarpetaCreada}
        />,
        document.body
      )}
    </>
  );
};

export default MovimientoForm;
