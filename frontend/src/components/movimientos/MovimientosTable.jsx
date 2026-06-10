import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

function renderDescripcion(texto) {
  if (!texto) return null;
  const parts = texto.split(/(\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (match) {
      return (
        <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer"
           className="text-accent underline hover:opacity-80" onClick={e => e.stopPropagation()}>
          {match[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
import {
  Search, X, Edit, Trash2, Calendar, Clock,
  FolderOpen, AlertCircle, ChevronDown, ChevronUp, Plus, Filter,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MovimientoForm from '../../pages/movimientos/MovimientoForm';
import MovimientoDetalleModal from './MovimientoDetalleModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import ColumnSelector from '../common/ColumnSelector';
import Pagination from '../ui/Pagination';
import useClickOutside from '../../hooks/useClickOutside';
import { useResizableColumns } from '../../hooks/useResizableColumns';

const MT_INITIAL_WIDTHS = {
  titulo: 240, carpeta_nombre: 150, tipo_nombre: 110, estado_nombre: 130,
  fecha_movimiento: 130, fecha_vencimiento: 130, fecha_notificacion: 130,
  tiempo_trabajo: 90, descripcion: 180, responsable: 130, creado_por: 140, modificado_por: 140,
  complejidad: 100, fecha_completado: 150,
};

// ── ComplejidadSelector ───────────────────────────────────────────────────────

const COMPLEJIDAD_CONFIG = {
  alto:  { label: 'Alto',  className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  medio: { label: 'Medio', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  bajo:  { label: 'Bajo',  className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const ComplejidadBadge = ({ valor }) => {
  if (!valor) return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>;
  const { label, className } = COMPLEJIDAD_CONFIG[valor] || {};
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{label}</span>;
};

const ComplejidadSelector = ({ movimiento, onUpdate }) => {
  const [isOpen, setIsOpen]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 160 });
  const cellRef    = useRef(null);
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const handleOpen = () => {
    const rect = cellRef.current.getBoundingClientRect();
    setDropdownPos({
      top:   rect.bottom + window.scrollY + 4,
      left:  rect.left   + window.scrollX,
      width: Math.max(rect.width, 160),
    });
    setIsOpen((o) => !o);
  };

  const apply = async (valor) => {
    setSaving(true);
    try {
      await api.patch(`/movimientos/${movimiento.id}/`, { complejidad: valor });
      onUpdate({ ...movimiento, complejidad: valor });
      setIsOpen(false);
      toast.success('Complejidad actualizada');
    } catch {
      toast.error('Error al actualizar complejidad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={cellRef}>
      <div className="cursor-pointer hover:opacity-75 transition-opacity" onClick={handleOpen} title="Click para cambiar complejidad">
        <ComplejidadBadge valor={movimiento.complejidad} />
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
        >
          {movimiento.complejidad && (
            <button type="button" disabled={saving} onClick={() => apply(null)}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 italic">
              Sin complejidad
            </button>
          )}
          {Object.entries(COMPLEJIDAD_CONFIG).map(([valor, { label, className }]) => (
            <button
              key={valor}
              type="button"
              disabled={saving}
              onClick={() => apply(valor)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 ${
                movimiento.complejidad === valor ? 'font-semibold' : ''
              }`}
            >
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{label}</span>
              {movimiento.complejidad === valor && <span className="ml-auto text-accent">✓</span>}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

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

// ── TipoSelector ─────────────────────────────────────────────────────────────

const TipoSelector = ({ movimiento, onUpdate }) => {
  const [isOpen, setIsOpen]         = useState(false);
  const [tipos, setTipos]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 180 });
  const cellRef    = useRef(null);
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const handleOpen = () => {
    const rect = cellRef.current.getBoundingClientRect();
    setDropdownPos({
      top:   rect.bottom + window.scrollY + 4,
      left:  rect.left   + window.scrollX,
      width: Math.max(rect.width, 180),
    });
    setIsOpen((o) => !o);
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get('/movimientos/tipos/')
      .then((r) => setTipos(r.data.results ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  const apply = async (tipoId, tipoObj) => {
    setSaving(true);
    try {
      await api.patch(`/movimientos/${movimiento.id}/`, { tipo: tipoId });
      onUpdate({ ...movimiento, tipo: tipoId, tipo_nombre: tipoObj?.nombre ?? null, tipo_color: tipoObj?.color ?? null });
      setIsOpen(false);
      toast.success('Tipo actualizado');
    } catch {
      toast.error('Error al actualizar tipo');
    } finally {
      setSaving(false);
    }
  };

  const badge = movimiento.tipo_nombre ? (
    <span
      className="text-xs px-2 py-0.5 rounded font-medium"
      style={{
        backgroundColor: movimiento.tipo_color ? `${movimiento.tipo_color}22` : '#f3f4f6',
        color: movimiento.tipo_color ?? '#6b7280',
      }}
    >
      {movimiento.tipo_nombre}
    </span>
  ) : (
    <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
  );

  return (
    <div ref={cellRef}>
      <div
        className="cursor-pointer hover:opacity-75 transition-opacity"
        onClick={handleOpen}
        title="Click para cambiar tipo"
      >
        {badge}
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
        >
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-2 text-center text-xs text-gray-400">Cargando...</div>
            ) : (
              <>
                {movimiento.tipo && (
                  <button type="button" disabled={saving} onClick={() => apply(null, null)}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 italic">
                    Sin tipo
                  </button>
                )}
                {tipos.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={saving}
                    onClick={() => apply(t.id, t)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 ${
                      t.id === movimiento.tipo ? 'font-semibold' : ''
                    }`}
                  >
                    {t.color && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    )}
                    {t.nombre}
                    {t.id === movimiento.tipo && <span className="ml-auto text-accent">✓</span>}
                  </button>
                ))}
                {tipos.length === 0 && !loading && (
                  <div className="p-2 text-center text-xs text-gray-400">Sin tipos disponibles</div>
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
  { key: 'carpeta',      label: 'Carpeta',      fixed: false },
  { key: 'tipo',         label: 'Tipo',         fixed: false },
  { key: 'estado',       label: 'Estado',       fixed: false },
  { key: 'complejidad',  label: 'Complejidad',  fixed: false },
  { key: 'fecha',        label: 'Fecha',        fixed: false },
  { key: 'vencimiento',  label: 'Vencimiento',  fixed: false },
  { key: 'fecha_notif',  label: 'Notificación', fixed: false },
  { key: 'tiempo',       label: 'Tiempo',       fixed: false },
  { key: 'descripcion',    label: 'Descripción',    fixed: false },
  { key: 'responsable',    label: 'Responsable',    fixed: false },
  { key: 'creado_por',     label: 'Creado por',     fixed: false },
  { key: 'modificado_por', label: 'Modificado por', fixed: false },
  { key: 'completado',     label: 'Completado',     fixed: false },
];

const DEFAULT_COLUMNS = {
  carpeta: true, tipo: true, estado: true, complejidad: true, fecha: true,
  vencimiento: true, fecha_notif: true, tiempo: true, descripcion: true,
  responsable: true, creado_por: false, modificado_por: false, completado: false,
};

const STORAGE_KEY = 'movimientos_columnas';

const MovimientosTable = ({
  baseFetchUrl,
  baseParams = {},
  showCarpetaColumn = true,
  emptyMessage = 'No se encontraron movimientos',
  refreshKey = 0,
}) => {
  const [searchParams] = useSearchParams();
  const [movimientos, setMovimientos]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [page, setPage]                       = useState(1);
  const [pageSize, setPageSize]               = useState(() => parseInt(localStorage.getItem('movimientos_page_size') || '10', 10));
  const [totalPages, setTotalPages]           = useState(1);
  const [count, setCount]                     = useState(0);

  const [editingMovimiento, setEditingMovimiento] = useState(null);
  const [modalOpen, setModalOpen]             = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState(null);
  const [detalleMovId, setDetalleMovId]       = useState(null);

  const [ordering, setOrdering]               = useState(() => localStorage.getItem('movimientos_ordering') || '-fecha_movimiento');
  const { widths: colWidths, onMouseDown: onColMouseDown } = useResizableColumns(MT_INITIAL_WIDTHS, 'col-widths-movimientos');
  const rh = (key) => (
    <div
      onMouseDown={(e) => { e.stopPropagation(); onColMouseDown(e, key) }}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/40 z-10 select-none"
    />
  );

  // Maps UI column key → backend ordering field name
  const SORT_FIELD_MAP = {
    titulo:            'titulo',
    carpeta_nombre:    'carpeta__nombre',
    tipo_nombre:       'tipo__nombre',
    estado_nombre:     'estado__nombre',
    complejidad:       'complejidad',
    fecha_movimiento:  'fecha_movimiento',
    fecha_vencimiento: 'fecha_vencimiento',
    tiempo_trabajo:    'tiempo_trabajo',
    responsable_username: 'responsable__username',
    responsable:          'responsable__username',
    creado_por:           'creado_por__username',
    modificado_por:       'modificado_por__username',
    fecha_completado:     'fecha_completado',
    // fecha_notificacion: computed field, not sortable by backend
  };
  const [visibleColumns, setVisibleColumns]   = useState(() => {
    try { return { ...DEFAULT_COLUMNS, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}) }; }
    catch { return DEFAULT_COLUMNS; }
  });
  const [search, setSearch]                   = useState(() => localStorage.getItem('movimientos_busqueda') || '');
  const [filters, setFilters] = useState(() => ({
    tipo:         localStorage.getItem('movimientos_filtro_tipo')         || '',
    estado:       new URLSearchParams(window.location.search).get('estado') || localStorage.getItem('movimientos_filtro_estado') || '',
    vencido:      localStorage.getItem('movimientos_filtro_vencimiento')  || '',
    responsable:  localStorage.getItem('movimientos_filtro_responsable')  || '',
    creado_por:   localStorage.getItem('movimientos_filtro_creado_por')   || '',
    modificado_por: localStorage.getItem('movimientos_filtro_modificado_por') || '',
    complejidad:  localStorage.getItem('movimientos_filtro_complejidad')  || '',
  }));
  const [tipos, setTipos]                     = useState([]);
  const [estados, setEstados]                 = useState([]);

  const handleUpdateMovimiento = (updated) => {
    // Optimistic update for immediate feedback, then sync with server
    setMovimientos((prev) => prev.map((m) => m.id === updated.id ? updated : m));
    doFetch(page, pageSize);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => { localStorage.setItem('movimientos_busqueda', search); }, [search]);
  useEffect(() => { localStorage.setItem('movimientos_ordering', ordering); }, [ordering]);
  useEffect(() => { localStorage.setItem('movimientos_page_size', String(pageSize)); }, [pageSize]);
  useEffect(() => {
    localStorage.setItem('movimientos_filtro_tipo', filters.tipo);
    localStorage.setItem('movimientos_filtro_estado', filters.estado);
    localStorage.setItem('movimientos_filtro_vencimiento', filters.vencido);
    localStorage.setItem('movimientos_filtro_responsable', filters.responsable);
    localStorage.setItem('movimientos_filtro_creado_por', filters.creado_por);
    localStorage.setItem('movimientos_filtro_modificado_por', filters.modificado_por);
    localStorage.setItem('movimientos_filtro_complejidad', filters.complejidad);
  }, [filters.tipo, filters.estado, filters.vencido, filters.responsable, filters.creado_por, filters.modificado_por, filters.complejidad]);

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
      if (filters.estado)        params.estado        = filters.estado;
      if (filters.responsable)   params.responsable   = filters.responsable;
      if (filters.creado_por)    params.creado_por    = filters.creado_por;
      if (filters.modificado_por) params.modificado_por = filters.modificado_por;
      if (filters.vencido !== '') params.vencido = filters.vencido;
      if (filters.complejidad)    params.complejidad = filters.complejidad;
      if (ordering)           params.ordering = ordering;

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
  }, [baseFetchUrl, baseParamsKey, search, filters.tipo, filters.estado, filters.vencido, filters.responsable, filters.creado_por, filters.modificado_por, filters.complejidad, ordering]); // eslint-disable-line

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

  // ── Sort (backend ordering via query param) ───────────────────────────────

  const handleSort = (uiKey) => {
    const campo = SORT_FIELD_MAP[uiKey];
    if (!campo) return; // computed/unsortable column
    setOrdering((prev) => prev === campo ? `-${campo}` : campo);
  };

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => {
    setFilters({ tipo: '', estado: '', vencido: '', responsable: '', creado_por: '', modificado_por: '', complejidad: '' });
    setSearch('');
  };

  const hasActiveFilters =
    search || filters.tipo || filters.estado || filters.vencido !== '' || filters.responsable || filters.creado_por || filters.modificado_por || filters.complejidad;

  const formatFecha = (fecha) =>
    fecha
      ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null;

  const formatFechaHora = (fecha) =>
    fecha
      ? new Date(fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
    const campo = SORT_FIELD_MAP[columnKey];
    if (!campo) return null;
    if (ordering === campo) return <ChevronUp size={14} className="inline ml-1" />;
    if (ordering === `-${campo}`) return <ChevronDown size={14} className="inline ml-1" />;
    return null;
  };

  const TH = ({ columnKey, children, className = '' }) => (
    <th
      onClick={() => handleSort(columnKey)}
      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide cursor-pointer hover:text-accent select-none relative ${className}`}
      style={{ width: colWidths[columnKey], minWidth: 60 }}
    >
      {children}<SortIcon columnKey={columnKey} />
      {rh(columnKey)}
    </th>
  );

  const columnConfigForSelector = showCarpetaColumn
    ? COLUMN_CONFIG
    : COLUMN_CONFIG.filter((c) => c.key !== 'carpeta');

  // Ordering is handled by the backend via the `ordering` param
  const displayed = movimientos;

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
            className={`w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent ${search ? 'border-accent ring-1 ring-accent' : 'border-gray-300 dark:border-gray-600'}`}
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
            className={`appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent ${filters.tipo ? 'border-accent ring-1 ring-accent text-accent' : 'border-gray-300 dark:border-gray-600'}`}
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
            className={`appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent ${filters.estado ? 'border-accent ring-1 ring-accent text-accent' : 'border-gray-300 dark:border-gray-600'}`}
          >
            <option value="">Todos los estados</option>
            {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
        </div>

        {/* Complejidad */}
        <div className="relative">
          <select
            value={filters.complejidad}
            onChange={(e) => setFilter('complejidad', e.target.value)}
            className={`appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent ${filters.complejidad ? 'border-accent ring-1 ring-accent text-accent' : 'border-gray-300 dark:border-gray-600'}`}
          >
            <option value="">Todas las complejidades</option>
            <option value="alto">🔴 Alto</option>
            <option value="medio">🟡 Medio</option>
            <option value="bajo">🟢 Bajo</option>
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

        {/* Responsable */}
        <input
          type="text"
          placeholder="Filtrar responsable..."
          value={filters.responsable}
          onChange={(e) => setFilter("responsable", e.target.value)}
          className={`px-2 py-1.5 text-sm rounded-lg border bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent w-40 ${filters.responsable ? 'border-accent ring-1 ring-accent' : 'border-gray-300 dark:border-gray-600'}`}
        />
        <input
          type="text"
          placeholder="Filtrar creado por..."
          value={filters.creado_por}
          onChange={(e) => setFilter("creado_por", e.target.value)}
          className={`px-2 py-1.5 text-sm rounded-lg border bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent w-40 ${filters.creado_por ? 'border-accent ring-1 ring-accent' : 'border-gray-300 dark:border-gray-600'}`}
        />
        <input
          type="text"
          placeholder="Filtrar modificado por..."
          value={filters.modificado_por}
          onChange={(e) => setFilter("modificado_por", e.target.value)}
          className={`px-2 py-1.5 text-sm rounded-lg border bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent w-40 ${filters.modificado_por ? 'border-accent ring-1 ring-accent' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {/* Limpiar + badge */}
        {hasActiveFilters && (
          <>
            <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-yellow-400 text-yellow-900 rounded-lg shadow-sm border border-yellow-500">
              <Filter size={11} />
              FILTROS ACTIVOS
            </span>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
            >
              <X size={12} /> LIMPIAR
            </button>
          </>
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
          <div className="overflow-x-auto w-full">
          <table className="table-fixed min-w-[800px] w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left border-b border-gray-200 dark:border-gray-700">
                <TH columnKey="titulo">Título</TH>
                {showCarpetaColumn && visibleColumns.carpeta     && <TH columnKey="carpeta_nombre">Carpeta</TH>}
                {visibleColumns.tipo        && <TH columnKey="tipo_nombre">Tipo</TH>}
                {visibleColumns.estado      && <TH columnKey="estado_nombre">Estado</TH>}
                {visibleColumns.complejidad && <TH columnKey="complejidad">Complejidad</TH>}
                {visibleColumns.fecha       && <TH columnKey="fecha_movimiento">Fecha</TH>}
                {visibleColumns.vencimiento && <TH columnKey="fecha_vencimiento">Vencimiento</TH>}
                {visibleColumns.fecha_notif && <TH columnKey="fecha_notificacion">Notificación</TH>}
                {visibleColumns.tiempo      && <TH columnKey="tiempo_trabajo">Tiempo</TH>}
                {visibleColumns.descripcion && (
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide relative" style={{ width: colWidths.descripcion, minWidth: 60 }}>Descripción{rh('descripcion')}</th>
                )}
                {visibleColumns.responsable   && <TH columnKey="responsable">Responsable</TH>}
                {visibleColumns.creado_por     && <TH columnKey="creado_por">Creado por</TH>}
                {visibleColumns.modificado_por && <TH columnKey="modificado_por">Modificado por</TH>}
                {visibleColumns.completado     && <TH columnKey="fecha_completado">Completado</TH>}
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {displayed.map((mov) => (
                <tr
                  key={mov.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-4 py-2.5" style={{ maxWidth: colWidths.titulo, overflow: 'hidden' }}>
                    <button
                      onClick={() => setDetalleMovId(mov.id)}
                      className="font-medium truncate block text-left w-full hover:text-accent hover:underline transition-colors"
                      title={mov.titulo}
                    >
                      {mov.titulo}
                    </button>
                    {mov.responsable_username && (
                      <span className={`inline-flex items-center gap-1 text-[10px] mt-0.5 px-1.5 py-0.5 rounded font-medium ${
                        mov.es_responsable
                          ? 'bg-accent/15 text-accent'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        <span className="w-3.5 h-3.5 rounded-full bg-current/20 flex items-center justify-center font-bold text-[8px] flex-shrink-0">
                          {mov.responsable_username[0].toUpperCase()}
                        </span>
                        {mov.es_responsable ? 'Asignado a mí' : (mov.responsable_nombre || mov.responsable_username)}
                      </span>
                    )}
                  </td>

                  {showCarpetaColumn && visibleColumns.carpeta && (
                    <td className="px-4 py-2.5" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                      {mov.carpeta ? (
                        <Link
                          to={`/carpetas/${mov.carpeta}`}
                          className="flex items-center gap-1 text-xs text-accent hover:underline break-words whitespace-normal"
                          title={mov.carpeta_nombre}
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
                      <TipoSelector movimiento={mov} onUpdate={handleUpdateMovimiento} />
                    </td>
                  )}

                  {visibleColumns.estado && (
                    <td className="px-4 py-2.5">
                      <EstadoSelector movimiento={mov} onUpdate={handleUpdateMovimiento} />
                    </td>
                  )}

                  {visibleColumns.complejidad && (
                    <td className="px-4 py-2.5">
                      <ComplejidadSelector movimiento={mov} onUpdate={handleUpdateMovimiento} />
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
                    <td className="px-4 py-2.5">
                      {mov.descripcion ? (
                        <div
                          className="text-xs text-muted-foreground line-clamp-2 max-w-xs prose prose-sm dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: mov.descripcion || '' }}
                        />
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.responsable && (
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
                            title={mov.responsable_nombre || mov.responsable_username || undefined}>
                        {mov.responsable_nombre || mov.responsable_username || '—'}
                      </span>
                    </td>
                  )}

                  {visibleColumns.creado_por && (
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {mov.creado_por_nombre || mov.creado_por_username || '—'}
                      </span>
                    </td>
                  )}

                  {visibleColumns.modificado_por && (
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {mov.modificado_por_nombre || '—'}
                      </span>
                    </td>
                  )}

                  {visibleColumns.completado && (
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {mov.fecha_completado ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          ✅ {formatFechaHora(mov.fecha_completado)}
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

    {detalleMovId && (
      <MovimientoDetalleModal
        movimientoId={detalleMovId}
        onClose={() => setDetalleMovId(null)}
        onEdit={() => doFetch(page, pageSize)}
      />
    )}
    </>
  );
};

export default MovimientosTable;
