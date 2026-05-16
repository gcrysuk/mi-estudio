import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Plus, 
  Calendar,
  AlertCircle,
  Clock,
  FileText,
  ArrowLeft,
  Edit,
  Trash2
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MovimientoForm from './MovimientoForm';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useUndo } from '../../hooks/useUndo';

const MovimientosList = () => {
  const { carpetaId } = useParams();
  const [movimientos, setMovimientos] = useState([]);
  const [carpeta, setCarpeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { pushUndo, undoLast } = useUndo();

  // DEBUG: Ver qué ID llega
  console.log('📁 carpetaId desde URL:', carpetaId);

  useEffect(() => {
    if (!carpetaId) {
      console.error('❌ No hay carpetaId en la URL');
      toast.error('ID de carpeta no válido');
      return;
    }
    
    fetchCarpeta();
    fetchMovimientos();
  }, [carpetaId, filtro]);

  const fetchCarpeta = async () => {
    try {
      console.log('🔍 Fetching carpeta:', carpetaId);
      const response = await api.get(`/carpetas/${carpetaId}/`);
      console.log('✅ Carpeta cargada:', response.data);
      setCarpeta(response.data);
    } catch (error) {
      console.error('❌ Error fetching carpeta:', error);
      toast.error('Error al cargar la carpeta');
    }
  };

  const fetchMovimientos = async () => {
    setLoading(true);
    try {
      let url = '';
      if (filtro === 'todos') {
        url = `/movimientos/?carpeta=${carpetaId}`;
      } else if (filtro === 'vencidos') {
        url = `/movimientos/vencidos/?carpeta=${carpetaId}`;
      } else if (filtro === 'proximos') {
        url = `/movimientos/proximos_vencer/?dias=7&carpeta=${carpetaId}`;
      }
      
      console.log('🔍 Fetching movimientos con URL:', url);
      const response = await api.get(url);
      console.log('✅ Movimientos cargados:', response.data);
      setMovimientos(response.data);
    } catch (error) {
      console.error('❌ Error fetching movimientos:', error);
      toast.error('Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const saved = movimientos.find(m => m.id === confirmDelete.id);
    try {
      await api.delete(`/movimientos/${confirmDelete.id}/`);
      setConfirmDelete(null);
      fetchMovimientos();
      if (saved) {
        pushUndo({ entidad: 'movimiento', datos: saved, restoreFn: async () => { await api.post('/movimientos/', saved); fetchMovimientos(); } });
      }
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">Movimiento eliminado</span>
          {saved && (
            <button onClick={async () => { await undoLast(); toast.dismiss(t.id); }}
              className="text-xs bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded uppercase">
              DESHACER
            </button>
          )}
        </div>
      ), { duration: 8000 });
    } catch (error) {
      toast.error('Error al eliminar');
      setConfirmDelete(null);
    }
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getColorVencimiento = (fecha, vencido) => {
    if (vencido) return 'text-red-600 bg-red-50';
    if (!fecha) return 'text-gray-600';
    
    const dias = Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24));
    if (dias <= 2) return 'text-orange-600 bg-orange-50';
    if (dias <= 5) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (!carpetaId) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p className="text-gray-600">No se especificó una carpeta válida</p>
        <Link to="/carpetas" className="mt-4 inline-block text-accent hover:underline">
          Volver a carpetas
        </Link>
      </div>
    );
  }

  return (
    <>
    <ConfirmDialog
      isOpen={!!confirmDelete}
      title="Confirmar eliminación"
      message="¿Eliminar este movimiento?"
      onConfirm={handleDelete}
      onCancel={() => setConfirmDelete(null)}
    />
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to="/carpetas" 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold uppercase flex items-center gap-2">
            <FileText className="text-accent" size={24} />
            MOVIMIENTOS
          </h1>
          {carpeta && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {carpeta.nombre}
            </p>
          )}
        </div>
      </div>

      {/* Filtros y acciones */}
      <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow flex flex-wrap gap-4 justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFiltro('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs uppercase ${
              filtro === 'todos' 
                ? 'bg-accent text-white' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltro('proximos')}
            className={`px-3 py-1.5 rounded-lg text-xs uppercase flex items-center gap-1 ${
              filtro === 'proximos' 
                ? 'bg-accent text-white' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
            }`}
          >
            <Clock size={14} />
            Próximos 7 días
          </button>
          <button
            onClick={() => setFiltro('vencidos')}
            className={`px-3 py-1.5 rounded-lg text-xs uppercase flex items-center gap-1 ${
              filtro === 'vencidos' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
            }`}
          >
            <AlertCircle size={14} />
            Vencidos
          </button>
        </div>
        <button
          onClick={() => {
            setEditingMovimiento(null);
            setModalOpen(true);
          }}
          className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 uppercase text-xs"
        >
          <Plus size={16} />
          NUEVO MOVIMIENTO
        </button>
      </div>

      {/* Lista de movimientos */}
      {loading ? (
        <div className="text-center py-8">Cargando...</div>
      ) : movimientos.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface p-8 rounded-lg text-center text-gray-500">
          No hay movimientos para esta carpeta
        </div>
      ) : (
        <div className="space-y-3">
          {movimientos.map(mov => (
            <div 
              key={mov.id}
              className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{mov.titulo}</h3>
                    {mov.tipo_nombre && (
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {mov.tipo_nombre}
                      </span>
                    )}
                    <span className="text-xs uppercase bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                      {mov.tipo_acto}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {mov.descripcion}
                  </p>
                  
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatFecha(mov.fecha_movimiento)}
                    </span>
                    
                    {mov.fecha_vencimiento && (
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${getColorVencimiento(mov.fecha_vencimiento, mov.vencido)}`}>
                        <Clock size={12} />
                        Vence: {formatFecha(mov.fecha_vencimiento)}
                      </span>
                    )}
                    
                    <span className="text-gray-500">
                      por: {mov.creado_por_username}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingMovimiento(mov);
                      setModalOpen(true);
                    }}
                    className="p-2 hover:text-accent"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: mov.id })}
                    className="p-2 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para crear/editar */}
      {modalOpen && (
        <MovimientoForm
          carpetaId={carpetaId}
          movimiento={editingMovimiento}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false);
            fetchMovimientos();
          }}
        />
      )}
    </div>
    </>
  );
};

export default MovimientosList;
