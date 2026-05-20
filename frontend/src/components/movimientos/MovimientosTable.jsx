import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, Edit, Trash2, Calendar, Clock,
  FolderOpen, AlertCircle, ChevronDown, ChevronUp, Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MovimientoForm from '../../pages/movimientos/MovimientoForm';
import ConfirmDialog from '../ui/ConfirmDialog';
import ColumnSelector from '../common/ColumnSelector';
import Pagination from '../ui/Pagination';
import useClickOutside from '../../hooks/useClickOutside';

// ── EstadoSelector ────────────────────────────────────────────────────────────

const EstadoSelector = ({ movimiento, onUpdate }) => {
  const [isOpen, setIsOpen]         = useState(false);
  const [search, setSearch]         = useState('');
  const [estados, setEstados]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 208 });
  const cellRef    = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef   = useRef(null);

  useClickOutside(dropdownRef, () => { setIsOpen(false); setSearch(''); });

  const handleOpen = () => {
    const rect = cellRef.current.getBoundingClientRect();
    setDropdownPos({
      top:   rect.bottom + window.scrollY + 4,
      left:  rect.left   + window.scrollX,
      width: Math.max(rect.width, 208),
    });
    setIsOpen((o) => !o);
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get('/movimientos/estados/')
      .then((r) => setEstados(r.data.results ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const filtered = estados.filter((e) =>
    e.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const showAdd = search.trim().length > 0 && !loading &&
    !estados.some((e) => e.nombre.toLowerCase() === search.trim().toLowerCase());

  const apply = async (estadoId, estadoObj) => {
    setSaving(true);
    try {
      const res = await api.patch(`/movimientos/${movimiento.id}/`, { estado: estadoId });
      onUpdate({ ...movimiento, estado: estadoId, estado_nombre: estadoObj.nombre, estado_color: estadoObj.color ?? null });
      setIsOpen(false);
      setSearch('');
      toast.success('Estado actualizado');
    } catch {
      toast.error('Error al actualizar estado');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const nombre = search.trim().toUpperCase();
    if (!nombre) return;
    setSaving(true);
    try {
      const res = await api.post('/movimientos/estados/', { nombre });
      await apply(res.data.id, res.data);
    } catch {
      toast.error('Error al crear estado');
      setSaving(false);
    }
  };

  const badge = movimiento.estado_nombre ? (
    <span
      className="text-xs px-2 py-0.5 rounded font-medium"
      style={{
        backgroundColor: movimiento.estado_color ? `${movimiento.estado_color}22` : '#f3f4f6',
        color: movimiento.estado_color ?? '#6b7280',
      }}
    >
      {movimiento.estado_nombre}
    </span>
  ) : (
    <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
  );

  return (
    <div ref={cellRef}>
      <div
        className="cursor-pointer hover:opacity-75 transition-opacity"
        onClick={handleOpen}
        title="Click para cambiar estado"
      >
        {badge}
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
          }}
          className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
        >
          <div className="p-1.5 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar estado..."
                className="w-full pl-7 pr-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-2 text-center text-xs text-gray-400">Cargando...</div>
            ) : (
              <>
                {movimiento.estado && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => apply(null, { nombre: null, color: null })}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 italic"
                  >
                    Sin estado
                  </button>
                )}
                {filtered.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    disabled={saving}
                    onClick={() => apply(e.id, e)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 ${
                      e.id === movimiento.estado ? 'font-semibold' : ''
                    }`}
                  >
                    {e.color && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: e.color }}
                      />
                    )}
                    {e.nombre}
                    {e.id === movimiento.estado && (
                      <span className="ml-auto text-accent">✓</span>
                    )}
                  </button>
                ))}
                {showAdd && (
                  <>
                    {filtered.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-gray-700" />
                    )}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleCreate}
                      className="w-full text-left px-3 py-1.5 text-xs text-accent hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5"
                    >
                      <Plus size={12} />
                      {saving ? 'Creando...' : `+ Agregar "${search.trim()}"`}
                    </button>
                  </>
                )}
                {filtered.length === 0 && !showAdd && (
                  <div className="p-2 text-center text-xs text-gray-400">Sin resultados</div>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const COLUMN_CONFIG = [
  { key: 'carpeta',     label: 'Carpeta',     fixed: false },
  { key: 'tipo',        label: 'Tipo',        fixed: false },
  { key: 'estado',      label: 'Estado',      fixed: false },
  { key: 'fecha',       label: 'Fecha',       fixed: false },
  { key: 'vencimiento', label: 'Vencimiento', fixed: false },
  { key: 'fecha_notif', label: 'Notificación', fixed: false },
  { key: 'tiempo',      label: 'Tiempo',      fixed: false },
  { key: 'descripcion', label: 'Descripción', fixed: false },
];

const DEFAULT_COLUMNS = {
  carpeta: true, tipo: true, estado: true, fecha: true,
  vencimiento: true, fecha_notif: true, tiempo: true, descripcion: true,
};

const STORAGE_KEY = 'movimientos_columnas';

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
  const [search, setSearch]                   = useState('');
  const [filters, setFilters]                 = useState({ tipo: '', estado: '', vencido: '' });
  const [tipos, setTipos]                     = useState([]);
  const [estados, setEstados]                 = useState([]);

  const handleUpdateMovimiento = (updated) => {
    setMovimientos((prev) => prev.map((m) => m.id === updated.id ? updated : m));
  };

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
      if (search)             params.search  = search;
      if (filters.tipo)       params.tipo    = filters.tipo;
      if (filters.estado)     params.estado  = filters.estado;
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
  }, [baseFetchUrl, baseParamsKey, search, filters.tipo, filters.estado, filters.vencido]); // eslint-disable-line

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
    try {
      await api.delete(`/movimientos/${confirmDelete.id}/`);
      setConfirmDelete(null);
      doFetch(page, pageSize);
      toast.success('Movimiento movido a la papelera');
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
    setSearch('');
  };

  const hasActiveFilters =
    search || filters.tipo || filters.estado || filters.vencido !== '';

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

  const TH = ({ columnKey, children, className = '' }) => (
    <th
      onClick={() => handleSort(columnKey)}
      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide cursor-pointer hover:text-accent select-none ${className}`}
    >
      {children}<SortIcon columnKey={columnKey} />
    </th>
  );

  const columnConfigForSelector = showCarpetaColumn
    ? COLUMN_CONFIG
    : COLUMN_CONFIG.filter((c) => c.key !== 'carpeta');

  // Client-side: sort within current page
  const displayed = movimientos
    .slice()
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
        case 'fecha_notificacion': aVal = a.proxima_notificacion ?? ''; bVal = b.proxima_notificacion ?? ''; break;
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
        {/* Búsqueda general (server-side via ?search=) */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en movimientos..."
            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left border-b border-gray-200 dark:border-gray-700">
                <TH columnKey="titulo">Título</TH>
                {showCarpetaColumn && visibleColumns.carpeta     && <TH columnKey="carpeta_nombre" className="hidden sm:table-cell">Carpeta</TH>}
                {visibleColumns.tipo        && <TH columnKey="tipo_nombre"        className="hidden md:table-cell">Tipo</TH>}
                {visibleColumns.estado      && <TH columnKey="estado_nombre">Estado</TH>}
                {visibleColumns.fecha       && <TH columnKey="fecha_movimiento"   className="hidden sm:table-cell">Fecha</TH>}
                {visibleColumns.vencimiento && <TH columnKey="fecha_vencimiento"  className="hidden lg:table-cell">Vencimiento</TH>}
                {visibleColumns.fecha_notif && <TH columnKey="fecha_notificacion" className="hidden lg:table-cell">Notificación</TH>}
                {visibleColumns.tiempo      && <TH columnKey="tiempo_trabajo"     className="hidden xl:table-cell">Tiempo</TH>}
                {visibleColumns.descripcion && (
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide hidden xl:table-cell">Descripción</th>
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
                    <td className="px-4 py-2.5 hidden sm:table-cell">
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
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {mov.tipo_nombre
                        ? <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{mov.tipo_nombre}</span>
                        : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>
                  )}

                  {visibleColumns.estado && (
                    <td className="px-4 py-2.5">
                      <EstadoSelector movimiento={mov} onUpdate={handleUpdateMovimiento} />
                    </td>
                  )}

                  {visibleColumns.fecha && (
                    <td className="px-4 py-2.5 whitespace-nowrap hidden sm:table-cell">
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
                    <td className="px-4 py-2.5 whitespace-nowrap hidden lg:table-cell">
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
                    <td className="px-4 py-2.5 whitespace-nowrap hidden lg:table-cell">
                      {mov.proxima_notificacion ? (
                        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Calendar size={12} /> {formatFecha(mov.proxima_notificacion)}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.tiempo && (
                    <td className="px-4 py-2.5 whitespace-nowrap hidden xl:table-cell">
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
                    <td className="px-4 py-2.5 max-w-[200px] hidden xl:table-cell">
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
          </div>

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
