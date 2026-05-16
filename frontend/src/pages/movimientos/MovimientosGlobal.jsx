import { useState, useEffect } from 'react';
import {
  ClipboardList, Search, X, Edit, Trash2,
  Calendar, Clock, FolderOpen, AlertCircle, ChevronDown
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MovimientoForm from './MovimientoForm';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useUndo } from '../../hooks/useUndo';

const EMPTY_FILTERS = { tipo: '', estado: '', vencido: '' };

const norm = (s) =>
  (s ?? '').normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

const MovimientosGlobal = () => {
  const [movimientosRaw, setMovimientosRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchTitulo, setSearchTitulo] = useState('');
  const [searchCarpeta, setSearchCarpeta] = useState('');
  const [tipos, setTipos] = useState([]);
  const [estados, setEstados] = useState([]);
  const [editingMovimiento, setEditingMovimiento] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { pushUndo, undoLast } = useUndo();

  // Filtrado client-side con normalización de tildes
  const movimientos = movimientosRaw.filter(mov => {
    if (searchTitulo && !norm(mov.titulo).includes(norm(searchTitulo))) return false;
    if (searchCarpeta && !norm(mov.carpeta_nombre).includes(norm(searchCarpeta))) return false;
    return true;
  });

  useEffect(() => {
    fetchOpciones();
  }, []);

  useEffect(() => {
    fetchMovimientos();
  }, [filters.tipo, filters.estado, filters.vencido]);

  const fetchOpciones = async () => {
    try {
      const [tiposRes, estadosRes] = await Promise.all([
        api.get('/movimientos/tipos/'),
        api.get('/movimientos/estados/'),
      ]);
      setTipos(tiposRes.data);
      setEstados(estadosRes.data);
    } catch {
      // silencioso
    }
  };

  const fetchMovimientos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.tipo)           params.tipo    = filters.tipo;
      if (filters.estado)         params.estado  = filters.estado;
      if (filters.vencido !== '') params.vencido = filters.vencido;

      const response = await api.get('/movimientos/', { params });
      setMovimientosRaw(response.data.results ?? response.data);
    } catch {
      toast.error('Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const saved = movimientosRaw.find(m => m.id === confirmDelete.id);
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
    } catch {
      toast.error('Error al eliminar');
      setConfirmDelete(null);
    }
  };

  const setFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchTitulo('');
    setSearchCarpeta('');
  };

  const hasActiveFilters =
    searchTitulo || searchCarpeta || filters.tipo || filters.estado || filters.vencido !== '';

  const formatFecha = (fecha) =>
    fecha
      ? new Date(fecha).toLocaleDateString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        })
      : null;

  const colorVencimiento = (mov) => {
    if (mov.vencido) return 'text-red-600 dark:text-red-400';
    if (!mov.fecha_vencimiento) return '';
    const dias = Math.ceil((new Date(mov.fecha_vencimiento) - new Date()) / 86400000);
    if (dias <= 2) return 'text-orange-500';
    if (dias <= 5) return 'text-yellow-500';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <>
    <ConfirmDialog
      isOpen={!!confirmDelete}
      title="Confirmar eliminación"
      message="¿Eliminar este movimiento?"
      onConfirm={handleDelete}
      onCancel={() => setConfirmDelete(null)}
    />
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="text-accent" size={22} />
        <h1 className="text-xl font-bold uppercase">Movimientos</h1>
        {!loading && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            ({movimientos.length})
          </span>
        )}
      </div>

      {/* Barra de filtros */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-3 flex flex-wrap gap-2 items-center">
        {/* Búsqueda por título */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={searchTitulo}
            onChange={(e) => setSearchTitulo(e.target.value)}
            placeholder="Buscar por título..."
            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
          />
          {searchTitulo && (
            <button
              onClick={() => setSearchTitulo('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Búsqueda por carpeta */}
        <div className="relative flex-1 min-w-[180px]">
          <FolderOpen className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={searchCarpeta}
            onChange={(e) => setSearchCarpeta(e.target.value)}
            placeholder="Buscar por carpeta..."
            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
          />
          {searchCarpeta && (
            <button
              onClick={() => setSearchCarpeta('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tipo */}
        <div className="relative">
          <select
            value={filters.tipo}
            onChange={(e) => setFilter('tipo', e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
          >
            <option value="">Todos los tipos</option>
            {tipos.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
        </div>

        {/* Estado */}
        <div className="relative">
          <select
            value={filters.estado}
            onChange={(e) => setFilter('estado', e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
          >
            <option value="">Todos los estados</option>
            {estados.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
        </div>

        {/* Vencimiento */}
        <div className="flex gap-1">
          {[
            { label: 'Todos', value: '' },
            { label: 'Vencidos', value: 'true' },
            { label: 'Vigentes', value: 'false' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter('vencido', opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg uppercase transition-colors ${
                filters.vencido === opt.value
                  ? opt.value === 'true'
                    ? 'bg-red-500 text-white'
                    : 'bg-accent text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Limpiar filtros */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 transition-colors"
          >
            <X size={13} />
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Cargando...</div>
      ) : movimientos.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-10 text-center text-gray-500 text-sm">
          No se encontraron movimientos
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Título</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide hidden md:table-cell">Carpeta</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide hidden lg:table-cell">Tipo</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide hidden lg:table-cell">Estado</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Vencimiento</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {movimientos.map(mov => (
                <tr
                  key={mov.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  {/* Título + descripción */}
                  <td className="px-4 py-2.5 max-w-[220px]">
                    <p className="font-medium truncate">{mov.titulo}</p>
                    {mov.descripcion && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {mov.descripcion}
                      </p>
                    )}
                  </td>

                  {/* Carpeta */}
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    {mov.carpeta_nombre ? (
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-xs">
                        <FolderOpen size={13} className="flex-shrink-0 text-accent" />
                        <span className="truncate max-w-[140px]">{mov.carpeta_nombre}</span>
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    {mov.tipo_nombre ? (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {mov.tipo_nombre}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    {mov.estado_nombre ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: mov.estado_color ? `${mov.estado_color}22` : undefined,
                          color: mov.estado_color ?? undefined,
                        }}
                      >
                        {mov.estado_nombre}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Fecha movimiento */}
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {mov.fecha_movimiento ? (
                      <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <Calendar size={12} />
                        {formatFecha(mov.fecha_movimiento)}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Vencimiento */}
                  <td className="px-4 py-2.5 whitespace-nowrap hidden sm:table-cell">
                    {mov.fecha_vencimiento ? (
                      <span className={`flex items-center gap-1 text-xs ${colorVencimiento(mov)}`}>
                        {mov.vencido && <AlertCircle size={12} />}
                        {!mov.vencido && <Clock size={12} />}
                        {formatFecha(mov.fecha_vencimiento)}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditingMovimiento(mov); setModalOpen(true); }}
                        className="p-1.5 rounded hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: mov.id })}
                        className="p-1.5 rounded hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <MovimientoForm
          movimiento={editingMovimiento}
          onClose={() => { setModalOpen(false); setEditingMovimiento(null); }}
          onSave={() => { setModalOpen(false); setEditingMovimiento(null); fetchMovimientos(); }}
        />
      )}
    </div>
    </>
  );
};

export default MovimientosGlobal;
