import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Search, ExternalLink, X, ChevronUp, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ESTADO_BADGE = {
  pendiente: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  asignado: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  sin_match: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  procesado: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
  error: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
};

const ESTADOS_PROCESAMIENTO = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'asignado',  label: 'Asignado'  },
  { value: 'sin_match', label: 'Sin match' },
  { value: 'procesado', label: 'Procesado' },
  { value: 'error',     label: 'Error'     },
];

// Mapea la columna de UI al campo de ordering que expone el backend
// (ordering_fields en apps/mev_ingest/views.py). El filtro de estado se
// envía siempre junto al ordering en la misma request (mismo mecanismo
// que ya funciona en Movimientos vía el filtro por desplegable).
const SORT_FIELD_MAP = {
  nro_causa:           'nro_causa',
  caratula:             'caratula',
  estado:               'estado',
  fecha_proveido:       'fecha_proveido',
  estado_procesamiento: 'estado_procesamiento',
};

const fecha = (value) => {
  if (!value) return '-';
  try { return format(parseISO(value), "d MMM yyyy HH:mm", { locale: es }); }
  catch { return value; }
};

function AsignarCarpeta({ notif, onAsignado }) {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (!termino.trim()) { setResultados([]); return; }
    setBuscando(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get('/carpetas/', { params: { search: termino, page_size: 10 } });
        setResultados(res.data.results ?? res.data);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [termino]);

  const handleAsignar = async (carpetaId) => {
    try {
      await api.post(`/mev-ingest/${notif.id}/asignar/`, { carpeta: carpetaId });
      toast.success('Notificación asignada y aplicada');
      onAsignado();
    } catch {
      toast.error('Error al asignar la notificación');
    }
  };

  return (
    <div className="flex flex-col gap-1.5 min-w-[220px]">
      <div className="relative">
        <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar carpeta..."
          className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
        />
      </div>
      {buscando && <span className="text-[11px] text-gray-400">Buscando...</span>}
      {resultados.length > 0 && (
        <ul className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
          {resultados.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => handleAsignar(c.id)}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent/10 text-gray-700 dark:text-gray-200"
              >
                {c.nombre} {c.numero_expediente ? `(${c.numero_expediente})` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NotificacionesMEVPage() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [ordering, setOrdering] = useState('');

  const fetchNotificaciones = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filtroEstado) params.estado_procesamiento = filtroEstado;
      if (ordering) params.ordering = ordering;
      const res = await api.get('/mev-ingest/', { params });
      setNotificaciones(res.data.results ?? res.data);
    } catch {
      toast.error('Error al cargar notificaciones MEV');
    } finally {
      setLoading(false);
    }
  }, [search, filtroEstado, ordering]);

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  const handleSort = (uiKey) => {
    const campo = SORT_FIELD_MAP[uiKey];
    if (!campo) return;
    setOrdering((prev) => (prev === campo ? `-${campo}` : campo));
  };

  const SortIcon = ({ columnKey }) => {
    const campo = SORT_FIELD_MAP[columnKey];
    if (!campo) return null;
    if (ordering === campo) return <ChevronUp size={13} className="inline ml-1" />;
    if (ordering === `-${campo}`) return <ChevronDown size={13} className="inline ml-1" />;
    return null;
  };

  const TH = ({ columnKey, children }) => (
    <th
      onClick={() => handleSort(columnKey)}
      className="px-3 py-2 text-left cursor-pointer select-none hover:text-accent"
    >
      {children}<SortIcon columnKey={columnKey} />
    </th>
  );

  const hayFiltrosActivos = search || filtroEstado;
  const limpiarFiltros = () => { setSearch(''); setFiltroEstado(''); };

  return (
    <div className="min-h-full bg-gray-100 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <Mail size={20} className="text-accent" />
          <h1 className="text-xl font-bold uppercase text-gray-800 dark:text-white">
            Notificaciones MEV
          </h1>
        </div>

        {/* Barra de filtros */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-3 flex flex-wrap gap-2 items-center mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por carátula, causa u organismo..."
              className={`w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-accent ${search ? 'border-accent ring-1 ring-accent' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className={`appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-accent ${filtroEstado ? 'border-accent ring-1 ring-accent text-accent' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <option value="">Todos los estados</option>
              {ESTADOS_PROCESAMIENTO.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>

          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center gap-1 text-white font-bold text-xs shadow-sm transition-colors"
            >
              <X size={12} /> LIMPIAR
            </button>
          )}
        </div>

        <div className="rounded-xl shadow overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400 text-sm">
              Cargando...
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Mail size={36} strokeWidth={1} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {hayFiltrosActivos ? 'Ningún resultado coincide con el filtro aplicado' : 'No hay notificaciones MEV recibidas'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-[11px] uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <TH columnKey="nro_causa">Causa</TH>
                  <TH columnKey="caratula">Carátula</TH>
                  <TH columnKey="estado">Estado MEV</TH>
                  <TH columnKey="fecha_proveido">Fecha</TH>
                  <TH columnKey="estado_procesamiento">Procesamiento</TH>
                  <th className="px-3 py-2 text-left">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {notificaciones.map((notif) => (
                  <tr key={notif.id} className="text-gray-700 dark:text-gray-200">
                    <td className="px-3 py-2 whitespace-nowrap">{notif.nro_causa}</td>
                    <td className="px-3 py-2 max-w-[220px] truncate" title={notif.caratula}>{notif.caratula}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{notif.estado}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-[12px]">{fecha(notif.fecha_proveido)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase ${ESTADO_BADGE[notif.estado_procesamiento] ?? ESTADO_BADGE.pendiente}`}>
                        {notif.estado_procesamiento}
                      </span>
                      {notif.estado_procesamiento === 'sin_match' && notif.carpetas_candidatas_count > 1 && (
                        <div className="text-[10px] text-orange-500 mt-1">
                          {notif.carpetas_candidatas_count} carpetas coinciden, elegí una
                        </div>
                      )}
                      {notif.estado_procesamiento === 'error' && notif.error_detalle && (
                        <div className="text-[10px] text-red-500 mt-1 max-w-[180px] truncate" title={notif.error_detalle}>
                          {notif.error_detalle}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {notif.estado_procesamiento === 'sin_match' && (
                        <AsignarCarpeta notif={notif} onAsignado={fetchNotificaciones} />
                      )}
                      {notif.estado_procesamiento === 'procesado' && notif.carpeta && (
                        <Link
                          to={`/carpetas/${notif.carpeta}`}
                          className="flex items-center gap-1 text-[11px] uppercase font-medium text-accent hover:opacity-75 transition-opacity"
                        >
                          Ver carpeta <ExternalLink size={11} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
