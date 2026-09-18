import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, UserCheck, RefreshCw, Folder, Scale, CheckCheck, Trash2,
  ExternalLink, Circle, CheckCircle, ChevronDown, AlertTriangle, Link2, Search,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../../services/api';
import MovimientoDetalleModal from '../../components/movimientos/MovimientoDetalleModal';

const FILTROS_PRIMARIOS = [
  { key: 'todas',     label: 'Todas' },
  { key: 'no_leidas', label: 'No leídas' },
];

const FILTROS_SECUNDARIOS = [
  { key: 'asignacion',          label: 'Asignaciones' },
  { key: 'cambio_estado',       label: 'Cambios de estado' },
  { key: 'carpeta_compartida',  label: 'Carpetas compartidas' },
  { key: 'mev_nuevo_movimiento', label: 'MEV' },
  { key: 'mev_cambio_estado',   label: 'MEV estado' },
  { key: 'mev_error',           label: 'MEV error' },
  { key: 'mev_sin_match',       label: 'MEV sin asignar' },
  { key: 'mev_procesado',       label: 'MEV procesado' },
];

const TIPO_META = {
  asignacion:           { icon: UserCheck, color: 'text-accent',     bg: 'bg-accent/10',     badge: 'bg-accent/10 text-accent',          barra: 'bg-accent',    label: 'Asignación' },
  cambio_estado:        { icon: RefreshCw, color: 'text-blue-500',   bg: 'bg-blue-500/10',   badge: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400', barra: 'bg-blue-500', label: 'Cambio de estado' },
  carpeta_compartida:   { icon: Folder,    color: 'text-orange-500', bg: 'bg-orange-500/10', badge: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400', barra: 'bg-orange-500', label: 'Carpeta compartida' },
  mev_nuevo_movimiento: { icon: Scale,         color: 'text-indigo-500', bg: 'bg-indigo-500/10', badge: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400', barra: 'bg-indigo-500', label: 'MEV' },
  mev_cambio_estado:    { icon: Scale,         color: 'text-indigo-500', bg: 'bg-indigo-500/10', badge: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400', barra: 'bg-indigo-500', label: 'MEV estado' },
  mev_error:            { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-500/10',    badge: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',           barra: 'bg-red-500',    label: 'MEV error' },
  mev_sin_match:        { icon: Link2,   color: 'text-orange-500', bg: 'bg-orange-500/10', badge: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400', barra: 'bg-orange-500', label: 'MEV sin asignar' },
  mev_procesado:        { icon: Scale,   color: 'text-green-500',  bg: 'bg-green-500/10',  badge: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',   barra: 'bg-green-500',  label: 'MEV procesado' },
};

function buildDestino(notif) {
  const carpetaId = notif.carpeta_id;
  if (!carpetaId) return null;
  return `/carpetas/${carpetaId}`;
}

const relativo = (fecha) => {
  try { return formatDistanceToNow(parseISO(fecha), { addSuffix: true, locale: es }); }
  catch { return fecha; }
};

function Avatar({ nombre }) {
  const inicial = (nombre || '?')[0].toUpperCase();
  return (
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent select-none">
      {inicial}
    </div>
  );
}

function ChipFiltro({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

function ChipSecundario({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border transition-colors ${
        active
          ? 'bg-accent/10 border-accent text-accent'
          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

function ActBtn({ children, icon: Icon, onClick, variant = 'default' }) {
  const variants = {
    default: 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200',
    primary: 'bg-accent/10 text-accent hover:bg-accent hover:text-white',
    danger:  'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center sm:justify-start gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${variants[variant]}`}
    >
      {Icon && <Icon size={13} />}
      {children}
    </button>
  );
}

export default function NotificacionesPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('todas');
  const [query, setQuery] = useState('');
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextUrl, setNextUrl] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotificaciones = useCallback(async (url = null) => {
    if (!url) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = {};
      if (filtro === 'no_leidas') params.leida = 'false';
      else if (filtro !== 'todas') params.tipo = filtro;

      const res = url
        ? await api.get(url, { params: {} })
        : await api.get('/movimientos/notificaciones_sistema/feed/', { params });

      const data = res.data;
      const results = data.results ?? data;
      if (url) {
        setNotificaciones(prev => [...prev, ...results]);
      } else {
        setNotificaciones(results);
      }
      setNextUrl(data.next ?? null);
    } catch {
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filtro]);

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  const handleMarcarLeida = async (notif) => {
    try {
      await api.patch('/movimientos/notificaciones_sistema/feed_marcar_leida/', {
        origen: notif.origen, id: notif.id,
      });
      setNotificaciones(prev => prev.map(n =>
        (n.origen === notif.origen && n.id === notif.id) ? { ...n, leida: true } : n
      ));
    } catch {
      toast.error('Error al marcar');
    }
  };

  const handleMarcarNoLeida = async (notif) => {
    try {
      await api.patch('/movimientos/notificaciones_sistema/feed_marcar_no_leida/', {
        origen: notif.origen, id: notif.id,
      });
      setNotificaciones(prev => prev.map(n =>
        (n.origen === notif.origen && n.id === notif.id) ? { ...n, leida: false } : n
      ));
    } catch {
      toast.error('Error al marcar');
    }
  };

  const handleEliminar = async (id) => {
    try {
      await api.delete(`/movimientos/notificaciones_sistema/${id}/eliminar/`);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleMarcarTodas = async () => {
    try {
      await api.patch('/movimientos/notificaciones_sistema/feed_marcar_todas_leidas/');
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      toast.success('Todas marcadas como leídas');
    } catch {
      toast.error('Error');
    }
  };

  const handleEliminarLeidas = async () => {
    try {
      await api.delete('/movimientos/notificaciones_sistema/eliminar_todas/');
      setNotificaciones(prev => prev.filter(n => !(n.origen === 'sistema' && n.leida)));
      toast.success('Notificaciones leídas eliminadas');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;
  const leidas = notificaciones.filter(n => n.origen === 'sistema' && n.leida).length;

  const notificacionesVisibles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notificaciones;
    return notificaciones.filter(n => {
      const hay = `${n.mensaje ?? ''} ${n.carpeta_nombre ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [notificaciones, query]);

  return (
    <div className="min-h-full bg-gray-100 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-start gap-3">
            <Bell size={24} className="text-accent mt-0.5" />
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white leading-tight">
                Notificaciones
              </h1>
              <div className="flex items-center gap-2.5 mt-1 text-[13px]">
                <span className="flex items-center gap-1.5 font-semibold text-gray-500 dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-mono tabular-nums text-gray-700 dark:text-gray-200">{noLeidas}</span> sin leer
                </span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-gray-500 dark:text-gray-400">
                  <span className="font-mono tabular-nums text-gray-700 dark:text-gray-200">{notificaciones.length}</span> en total
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {noLeidas > 0 && (
              <button
                onClick={handleMarcarTodas}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              >
                <CheckCheck size={14} /> Marcar todas leídas
              </button>
            )}
            {leidas > 0 && (
              <button
                onClick={handleEliminarLeidas}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
              >
                <Trash2 size={14} /> Eliminar leídas
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5">
              {FILTROS_PRIMARIOS.map(({ key, label }) => (
                <ChipFiltro key={key} active={filtro === key} onClick={() => setFiltro(key)}>
                  {label}
                  {key === 'no_leidas' && (
                    <span className="font-mono tabular-nums text-[11px] opacity-80">{noLeidas}</span>
                  )}
                </ChipFiltro>
              ))}
            </div>
            <div className="relative flex-1 min-w-[190px] sm:ml-auto">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar carpeta o mensaje…"
                autoComplete="off"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 border border-transparent focus:outline-none focus:ring-2 focus:ring-accent text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTROS_SECUNDARIOS.map(({ key, label }) => (
              <ChipSecundario key={key} active={filtro === key} onClick={() => setFiltro(filtro === key ? 'todas' : key)}>
                {label}
              </ChipSecundario>
            ))}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="text-sm">Cargando...</div>
          </div>
        ) : notificacionesVisibles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl">
            <Bell size={36} strokeWidth={1} className="text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {notificaciones.length === 0 ? 'No tenés notificaciones' : 'No hay notificaciones que coincidan con tu búsqueda'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {notificacionesVisibles.map((notif) => {
              const meta = TIPO_META[notif.tipo] ?? TIPO_META.asignacion;
              const IconComp = meta.icon;
              const actorNombre = notif.actor_detalle?.nombre_completo || notif.actor_detalle?.username || '';
              const destino = buildDestino(notif);
              const esSinMatch = notif.origen === 'mev' && notif.tipo === 'mev_sin_match';
              const esError = notif.tipo === 'mev_error';
              const handleVer = async () => {
                if (esSinMatch) {
                  navigate('/notificaciones-mev?estado_procesamiento=sin_match');
                  return;
                }
                if (notif.movimiento) {
                  try {
                    const res = await api.get(`/movimientos/${notif.movimiento}/`);
                    setMovimientoSeleccionado(res.data);
                  } catch {
                    if (destino) navigate(destino);
                  }
                  return;
                }
                if (destino) navigate(destino);
              };

              return (
                <article
                  key={`${notif.origen}-${notif.id}`}
                  className={`relative overflow-hidden rounded-xl border transition-colors ${
                    notif.leida
                      ? 'bg-gray-50/70 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800'
                      : 'bg-white dark:bg-dark-surface border-gray-200 dark:border-gray-700'
                  } hover:border-gray-300 dark:hover:border-gray-600`}
                >
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      esError ? 'bg-red-500' : !notif.leida ? meta.barra : 'bg-transparent'
                    }`}
                  />
                  <div className="flex flex-col sm:flex-row gap-3 pl-4 pr-3.5 py-3.5">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {actorNombre ? (
                        <Avatar nombre={actorNombre} />
                      ) : (
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg} ${meta.color} ${notif.leida ? 'opacity-70' : ''}`}>
                          <IconComp size={18} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] leading-snug ${!notif.leida ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-500 dark:text-gray-400'}`}>
                          {notif.carpeta_nombre || notif.mensaje}
                        </p>
                        {notif.carpeta_nombre && (
                          <p className={`text-sm mt-0.5 leading-snug ${!notif.leida ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                            {notif.mensaje}
                          </p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${meta.badge}`}>
                            {meta.label}
                          </span>
                          <span className="text-[11px] font-mono tabular-nums text-gray-400 dark:text-gray-500">
                            {relativo(notif.fecha)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-1.5 sm:gap-1 flex-wrap sm:flex-nowrap sm:min-w-[118px] sm:flex-shrink-0">
                      {notif.leida ? (
                        <ActBtn icon={Circle} onClick={() => handleMarcarNoLeida(notif)}>Marcar no leída</ActBtn>
                      ) : (
                        <ActBtn icon={CheckCircle} variant="primary" onClick={() => handleMarcarLeida(notif)}>Marcar leída</ActBtn>
                      )}
                      {(esSinMatch || notif.movimiento || destino) && (
                        <ActBtn icon={ExternalLink} onClick={handleVer}>{esSinMatch ? 'Asignar' : 'Ver'}</ActBtn>
                      )}
                      {notif.origen === 'sistema' && (
                        <ActBtn icon={Trash2} variant="danger" onClick={() => handleEliminar(notif.id)}>Eliminar</ActBtn>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Cargar más */}
        {nextUrl && (
          <div className="mt-3">
            <button
              onClick={() => fetchNotificaciones(nextUrl)}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-colors bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <ChevronDown size={14} />
              {loadingMore ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>

      {movimientoSeleccionado && (
        <MovimientoDetalleModal
          movimientoId={movimientoSeleccionado.id}
          onClose={() => setMovimientoSeleccionado(null)}
          onEdit={() => {}}
        />
      )}
    </div>
  );
}
