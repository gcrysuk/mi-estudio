import { useState, useEffect, useCallback } from 'react';
import {
  Search, X, Edit, Trash2, Calendar, Clock,
  FolderOpen, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MovimientoForm from '../../pages/movimientos/MovimientoForm';
import ConfirmDialog from '../ui/ConfirmDialog';
import ColumnSelector from '../common/ColumnSelector';
import Pagination from '../ui/Pagination';
import { useUndo } from '../../hooks/useUndo';

const COLUMN_CONFIG = [
  { key: 'carpeta',     label: 'Carpeta',     fixed: false },
  { key: 'tipo',        label: 'Tipo',        fixed: false },
  { key: 'estado',      label: 'Estado',      fixed: false },
  { key: 'fecha',       label: 'Fecha',       fixed: false },
  { key: 'vencimiento', label: 'Vencimiento', fixed: false },
  { key: 'fecha_notif', label: 'Fecha Notif', fixed: false },
  { key: 'tiempo',      label: 'Tiempo',      fixed: false },
  { key: 'descripcion', label: 'Descripción', fixed: false },
];

const DEFAULT_COLUMNS = {
  carpeta: true, tipo: true, estado: true, fecha: true,
  vencimiento: true, fecha_notif: true, tiempo: true, descripcion: true,
};

const STORAGE_KEY = 'movimientos_columnas';

const norm = (s) =>
  (s ?? '').normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();

const MovimientosTable = ({
  baseFetchUrl,
  baseParams = {},
  showCarpetaColumn = true,
  emptyMessage = 'No se encontraron movimientos',
  refreshKey = 0,
}) => {
  const [movimientos, setMovimientos]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [page, setPage]                       = useState(1);
  const [pageSize, setPageSize]               = useState(10);
  const [totalPages, setTotalPages]           = useState(1);
  const [count, setCount]                     = useState(0);

  const [editingMovimiento, setEditingMovimiento] = useState(null);
  const [modalOpen, setModalOpen]             = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState(null);

  const [sortConfig, setSortConfig]           = useState({ key: 'fecha_movimiento', direction: 'desc' });
  const [visibleColumns, setVisibleColumns]   = useState(() => {
    try { return { ...DEFAULT_COLUMNS, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}) }; }
    catch { return DEFAULT_COLUMNS; }
  });
  const [searchTitulo, setSearchTitulo]       = useState('');
  const [searchCarpeta, setSearchCarpeta]     = useState('');
  const [filters, setFilters]                 = useState({ tipo: '', estado: '', vencido: '' });
  const [tipos, setTipos]                     = useState([]);
  const [estados, setEstados]                 = useState([]);
  const { pushUndo, undoLast }                = useUndo();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    Promise.all([
      api.get('/movimientos/tipos/'),
      api.get('/movimientos/estados/'),
    ]).then(([t, e]) => {
      setTipos(t.data);
      setEstados(e.data);
    }).catch(() => {});
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  // Stable key for baseParams (prevents spurious refetch when parent re-renders with same value)
  const baseParamsKey = JSON.stringify(baseParams);

  const doFetch = useCallback(async (p, ps) => {
    setLoading(true);
    try {
      const params = { ...baseParams, page: p, page_size: ps };
      if (searchTitulo) params.search = searchTitulo;
      if (filters.tipo)   params.tipo    = filters.tipo;
      if (filters.estado) params.estado  = filters.estado;
      if (filters.vencido !== '') params.vencido = filters.vencido;

      const res = await api.get(baseFetchUrl, { params });
      const data = res.data;

      if (data && data.results !== undefined) {
        setMovimientos(data.results);
        setCount(data.count ?? 0);
        setTotalPages(data.total_pages ?? 1);
      } else {
        const arr = Array.isArray(data) ? data : [];
        setMovimientos(arr);
        setCount(arr.length);
        setTotalPages(1);
      }
    } catch {
      toast.error('Error al cargar los movimientos');
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  }, [baseFetchUrl, baseParamsKey, searchTitulo, filters.tipo, filters.estado, filters.vencido]); // eslint-disable-line

  // Reset to page 1 and fetch when URL/params/search/filters/refreshKey change
  useEffect(() => {
    setPage(1);
    doFetch(1, pageSize);
  }, [doFetch, refreshKey, pageSize]); // eslint-disable-line

  // Fetch when user manually navigates to a different page
  useEffect(() => {
    doFetch(page, pageSize);
  }, [page]); // eslint-disable-line

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const saved = movimientos.find((m) => m.id === confirmDelete.id);
    try {
      await api.delete(`/movimientos/${confirmDelete.id}/`);
      setConfirmDelete(null);
      doFetch(page, pageSize);
      if (saved) {
        pushUndo({
          entidad: 'movimiento',
          datos: saved,
          restoreFn: async () => { await api.post('/movimientos/', saved); doFetch(page, pageSize); },
        });
      }
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">Movimiento eliminado</span>
          {saved && (
            <button
              onClick={async () => { await undoLast(); toast.dismiss(t.id); }}
              className="text-xs bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded uppercase"
            >
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

  // ── Sort (client-side within current page) ────────────────────────────────

  const handleSort = (key) => setSortConfig((prev) => ({
    key,
    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
  }));

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => {
    setFilters({ tipo: '', estado: '', vencido: '' });
    setSearchTitulo('');
    setSearchCarpeta('');
  };

  const hasActiveFilters =
    searchTitulo || searchCarpeta || filters.tipo || filters.estado || filters.vencido !== '';

  const formatFecha = (fecha) =>
    fecha
      ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null;

  const colorVencimiento = (mov) => {
    if (mov.vencido) return 'text-red-600 dark:text-red-400';
    if (!mov.fecha_vencimiento) return '';
    const dias = Math.ceil((new Date(mov.fecha_vencimiento) - new Date()) / 86400000);
    if (dias <= 2) return 'text-orange-500';
    if (dias <= 5) return 'text-yellow-500';
    return 'text-green-600 dark:text-green-400';
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc'
      ? <ChevronUp size={14} className="inline ml-1" />
      : <ChevronDown size={14} className="inline ml-1" />;
  };

  const TH = ({ columnKey, children }) => (
    <th
      onClick={() => handleSort(columnKey)}
      className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide cursor-pointer hover:text-accent select-none"
    >
      {children}<SortIcon columnKey={columnKey} />
    </th>
  );

  const columnConfigForSelector = showCarpetaColumn
    ? COLUMN_CONFIG
    : COLUMN_CONFIG.filter((c) => c.key !== 'carpeta');

  // Client-side: carpeta name text filter + sort within current page
  const displayed = movimientos
    .filter((mov) => {
      if (searchCarpeta && !norm(mov.carpeta_nombre).includes(norm(searchCarpeta))) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      let aVal, bVal;
      switch (sortConfig.key) {
        case 'titulo':             aVal = a.titulo ?? '';             bVal = b.titulo ?? '';             break;
        case 'carpeta_nombre':     aVal = a.carpeta_nombre ?? '';     bVal = b.carpeta_nombre ?? '';     break;
        case 'tipo_nombre':        aVal = a.tipo_nombre ?? '';        bVal = b.tipo_nombre ?? '';        break;
        case 'estado_nombre':      aVal = a.estado_nombre ?? '';      bVal = b.estado_nombre ?? '';      break;
        case 'fecha_movimiento':   aVal = a.fecha_movimiento ?? '';   bVal = b.fecha_movimiento ?? '';   break;
        case 'fecha_vencimiento':  aVal = a.fecha_vencimiento ?? '';  bVal = b.fecha_vencimiento ?? '';  break;
        case 'fecha_notificacion': aVal = a.fecha_notificacion ?? ''; bVal = b.fecha_notificacion ?? ''; break;
        case 'tiempo_trabajo':     aVal = a.tiempo_trabajo ?? 0;      bVal = b.tiempo_trabajo ?? 0;      break;
        default:                   aVal = ''; bVal = '';
      }
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return  1 * dir;
      return 0;
    });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
    <ConfirmDialog
      isOpen={!!confirmDelete}
      title="Confirmar eliminación"
      message="¿Eliminar este movimiento?"
      onConfirm={handleDelete}
      onCancel={() => setConfirmDelete(null)}
    />

    <div className="space-y-2">
      {/* Barra de filtros */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-3 flex flex-wrap gap-2 items-center">
        {/* Búsqueda por título (server-side via ?search=) */}
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
            <button onClick={() => setSearchTitulo('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Búsqueda por carpeta — solo en vista global (client-side dentro de la página) */}
        {showCarpetaColumn && (
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
              <button onClick={() => setSearchCarpeta('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Tipo */}
        <div className="relative">
          <select
            value={filters.tipo}
            onChange={(e) => setFilter('tipo', e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
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
            {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
        </div>

        {/* Vencido */}
        <div className="flex gap-1">
          {[
            { label: 'Todos',    value: '' },
            { label: 'Vencidos', value: 'true' },
            { label: 'Vigentes', value: 'false' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter('vencido', opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg uppercase transition-colors ${
                filters.vencido === opt.value
                  ? opt.value === 'true' ? 'bg-red-500 text-white' : 'bg-accent text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Limpiar */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 transition-colors"
          >
            <X size={13} /> Limpiar
          </button>
        )}

        {/* Selector de columnas */}
        <div className="ml-auto">
          <ColumnSelector
            columns={columnConfigForSelector}
            visibleColumns={visibleColumns}
            onToggleColumn={(key) => setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))}
          />
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-10 text-center text-gray-500 text-sm">
          Cargando...
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-10 text-center text-gray-500 text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left border-b border-gray-200 dark:border-gray-700">
                <TH columnKey="titulo">Título</TH>
                {showCarpetaColumn && visibleColumns.carpeta     && <TH columnKey="carpeta_nombre">Carpeta</TH>}
                {visibleColumns.tipo        && <TH columnKey="tipo_nombre">Tipo</TH>}
                {visibleColumns.estado      && <TH columnKey="estado_nombre">Estado</TH>}
                {visibleColumns.fecha       && <TH columnKey="fecha_movimiento">Fecha</TH>}
                {visibleColumns.vencimiento && <TH columnKey="fecha_vencimiento">Vencimiento</TH>}
                {visibleColumns.fecha_notif && <TH columnKey="fecha_notificacion">Fecha Notif</TH>}
                {visibleColumns.tiempo      && <TH columnKey="tiempo_trabajo">Tiempo</TH>}
                {visibleColumns.descripcion && (
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Descripción</th>
                )}
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {displayed.map((mov) => (
                <tr
                  key={mov.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-4 py-2.5 max-w-[220px]">
                    <p className="font-medium truncate">{mov.titulo}</p>
                  </td>

                  {showCarpetaColumn && visibleColumns.carpeta && (
                    <td className="px-4 py-2.5">
                      {mov.carpeta ? (
                        <Link
                          to={`/carpetas/${mov.carpeta}`}
                          className="flex items-center gap-1 text-xs text-accent hover:underline truncate max-w-[140px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FolderOpen size={13} className="flex-shrink-0" />
                          {mov.carpeta_nombre}
                        </Link>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.tipo && (
                    <td className="px-4 py-2.5">
                      {mov.tipo_nombre
                        ? <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{mov.tipo_nombre}</span>
                        : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>
                  )}

                  {visibleColumns.estado && (
                    <td className="px-4 py-2.5">
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
                  )}

                  {visibleColumns.fecha && (
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {mov.fecha_movimiento ? (
                        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Calendar size={12} /> {formatFecha(mov.fecha_movimiento)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.vencimiento && (
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {mov.fecha_vencimiento ? (
                        <span className={`flex items-center gap-1 text-xs ${colorVencimiento(mov)}`}>
                          {mov.vencido ? <AlertCircle size={12} /> : <Clock size={12} />}
                          {formatFecha(mov.fecha_vencimiento)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.fecha_notif && (
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {mov.fecha_notificacion ? (
                        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Calendar size={12} /> {formatFecha(mov.fecha_notificacion)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.tiempo && (
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {mov.tiempo_trabajo ? (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {mov.tiempo_trabajo} min
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.descripcion && (
                    <td className="px-4 py-2.5 max-w-[200px]">
                      {mov.descripcion ? (
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate block">
                          {mov.descripcion}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  )}

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

          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            count={count}
            onPageChange={setPage}
            onPageSizeChange={(ps) => setPageSize(ps)}
          />
        </div>
      )}
    </div>

    {modalOpen && (
      <MovimientoForm
        movimiento={editingMovimiento}
        onClose={() => { setModalOpen(false); setEditingMovimiento(null); }}
        onSave={() => { setModalOpen(false); setEditingMovimiento(null); doFetch(page, pageSize); }}
      />
    )}
    </>
  );
};

export default MovimientosTable;
