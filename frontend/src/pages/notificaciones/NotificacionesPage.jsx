import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, UserCheck, RefreshCw, Folder, Scale, CheckCheck, Trash2,
  ExternalLink, Circle, CheckCircle, ChevronDown, AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../../services/api';

const FILTROS = [
  { key: 'todas',              label: 'Todas' },
  { key: 'no_leidas',          label: 'No leídas' },
  { key: 'asignacion',         label: 'Asignaciones' },
  { key: 'cambio_estado',      label: 'Cambios de estado' },
  { key: 'carpeta_compartida', label: 'Carpetas compartidas' },
  { key: 'mev_nuevo_movimiento', label: 'MEV' },
  { key: 'mev_cambio_estado',   label: 'MEV estado' },
  { key: 'mev_error',           label: 'MEV error' },
];

const TIPO_META = {
  asignacion:           { icon: UserCheck, color: 'text-accent',     bg: 'bg-accent/10',     badge: 'bg-accent/10 text-accent',          label: 'Asignación' },
  cambio_estado:        { icon: RefreshCw, color: 'text-blue-500',   bg: 'bg-blue-500/10',   badge: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400', label: 'Cambio de estado' },
  carpeta_compartida:   { icon: Folder,    color: 'text-orange-500', bg: 'bg-orange-500/10', badge: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400', label: 'Carpeta compartida' },
  mev_nuevo_movimiento: { icon: Scale,         color: 'text-indigo-500', bg: 'bg-indigo-500/10', badge: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400', label: 'MEV' },
  mev_cambio_estado:    { icon: Scale,         color: 'text-indigo-500', bg: 'bg-indigo-500/10', badge: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400', label: 'MEV estado' },
  mev_error:            { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-500/10',    badge: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',           label: 'MEV error' },
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
    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent select-none">
      {inicial}
    </div>
  );
}

export default function NotificacionesPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('todas');
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
        : await api.get('/movimientos/notificaciones_sistema/todas/', { params });

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

  const handleMarcarLeida = async (id) => {
    try {
      await api.patch(`/movimientos/notificaciones_sistema/${id}/marcar_leida/`);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    } catch {
      toast.error('Error al marcar');
    }
  };

  const handleMarcarNoLeida = async (id) => {
    try {
      await api.patch(`/movimientos/notificaciones_sistema/${id}/marcar_no_leida/`);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: false } : n));
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
      await api.patch('/movimientos/notificaciones_sistema/marcar_todas_leidas/');
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      toast.success('Todas marcadas como leídas');
    } catch {
      toast.error('Error');
    }
  };

  const handleEliminarLeidas = async () => {
    try {
      await api.delete('/movimientos/notificaciones_sistema/eliminar_todas/');
      setNotificaciones(prev => prev.filter(n => !n.leida));
      toast.success('Notificaciones leídas eliminadas');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;
  const leidas = notificaciones.filter(n => n.leida).length;

  return (
    <div className="min-h-full bg-gray-100 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-accent" />
            <h1 className="text-xl font-bold uppercase text-gray-800 dark:text-white">
              Notificaciones
            </h1>
            {noLeidas > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {noLeidas}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {noLeidas > 0 && (
              <button
                onClick={handleMarcarTodas}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs uppercase font-medium transition-colors bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-transparent"
              >
                <CheckCheck size={13} /> Marcar todas leídas
              </button>
            )}
            {leidas > 0 && (
              <button
                onClick={handleEliminarLeidas}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs uppercase font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={13} /> Eliminar leídas
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-5 p-3 rounded-xl bg-white dark:bg-gray-800 shadow">
          {FILTROS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-colors ${
                filtro === key
                  ? 'bg-accent text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="rounded-xl shadow overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
              <div className="text-sm">Cargando...</div>
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Bell size={36} strokeWidth={1} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No tenés notificaciones
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {notificaciones.map((notif) => {
                const meta = TIPO_META[notif.tipo] ?? TIPO_META.asignacion;
                const IconComp = meta.icon;
                const actorNombre = notif.actor_detalle?.nombre_completo || notif.actor_detalle?.username || '';
                const destino = buildDestino(notif);

                return (
                  <li
                    key={notif.id}
                    className={`px-3 sm:px-5 py-3 sm:py-4 transition-colors ${
                      !notif.leida
                        ? 'bg-blue-50/50 dark:bg-blue-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Indicador no leída */}
                      <div className="flex-shrink-0 mt-1">
                        {!notif.leida
                          ? <Circle size={7} className="text-blue-500 fill-blue-500" />
                          : <div className="w-[7px]" />
                        }
                      </div>

                      {/* Avatar actor */}
                      {actorNombre ? (
                        <Avatar nombre={actorNombre} />
                      ) : (
                        <div className={`flex-shrink-0 w-9 h-9 rounded-full ${meta.bg} flex items-center justify-center ${meta.color}`}>
                          <IconComp size={16} />
                        </div>
                      )}

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug text-gray-800 dark:text-gray-100 ${!notif.leida ? 'font-medium' : ''}`}>
                            {notif.mensaje}
                          </p>
                          {/* Badge tipo */}
                          <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            {relativo(notif.fecha_creacion)}
                          </span>
                          {notif.carpeta_nombre && (
                            <span className="text-[11px] truncate max-w-[140px] text-gray-400 dark:text-gray-500" title={notif.carpeta_nombre}>
                              {notif.carpeta_nombre}
                            </span>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-3 mt-2">
                          {notif.leida ? (
                            <button
                              onClick={() => handleMarcarNoLeida(notif.id)}
                              className="flex items-center gap-1 text-[11px] uppercase transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <Circle size={11} /> No leída
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarcarLeida(notif.id)}
                              className="flex items-center gap-1 text-[11px] uppercase transition-colors text-gray-400 dark:text-gray-500 hover:text-accent"
                            >
                              <CheckCircle size={11} /> Leída
                            </button>
                          )}
                          <button
                            onClick={() => handleEliminar(notif.id)}
                            className="flex items-center gap-1 text-[11px] uppercase text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={11} /> Eliminar
                          </button>
                          {destino && (
                            <button
                              onClick={() => navigate(destino)}
                              className="ml-auto flex items-center gap-1 text-[11px] uppercase font-medium text-accent hover:opacity-75 transition-opacity"
                            >
                              Ver <ExternalLink size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Cargar más */}
          {nextUrl && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => fetchNotificaciones(nextUrl)}
                disabled={loadingMore}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs uppercase font-medium rounded-lg transition-colors bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <ChevronDown size={14} />
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
