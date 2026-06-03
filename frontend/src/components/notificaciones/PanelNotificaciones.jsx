import { Bell, Check, ExternalLink, CheckCheck, UserCheck, RefreshCw, Folder, Scale, ArrowRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const fmt = (fecha) => {
  try { return format(parseISO(fecha), 'dd/MM/yyyy HH:mm'); }
  catch { return fecha; }
};

const relativo = (fecha) => {
  try { return formatDistanceToNow(parseISO(fecha), { addSuffix: true, locale: es }); }
  catch { return fmt(fecha); }
};

const TIPO_META = {
  asignacion:          { icon: <UserCheck size={12} />, color: 'text-accent',     bg: 'bg-accent/10' },
  cambio_estado:       { icon: <RefreshCw size={12} />, color: 'text-blue-500',   bg: 'bg-blue-500/10' },
  carpeta_compartida:  { icon: <Folder size={12} />,    color: 'text-orange-500', bg: 'bg-orange-500/10' },
  mev_nuevo_movimiento:{ icon: <Scale size={12} />,         color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  mev_cambio_estado:   { icon: <Scale size={12} />,         color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  mev_error:           { icon: <AlertTriangle size={12} />, color: 'text-red-500',    bg: 'bg-red-500/10'    },
};

function Avatar({ nombre }) {
  const inicial = (nombre || '?')[0].toUpperCase();
  return (
    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[11px] font-bold text-accent">
      {inicial}
    </div>
  );
}

const PanelNotificaciones = ({
  notificaciones,
  notificacionesSistema = [],
  onMarcarLeida,
  onMarcarLeidaSistema,
  onMarcarTodas,
  onClose,
}) => {
  const totalCount = notificaciones.length + notificacionesSistema.length;

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
          Notificaciones
          {totalCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </span>
        {totalCount > 0 && (
          <button
            onClick={onMarcarTodas}
            className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover uppercase font-medium transition-colors"
          >
            <CheckCheck size={13} />
            Marcar todas
          </button>
        )}
      </div>

      <div className="overflow-y-auto max-h-[440px]">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <Bell size={28} strokeWidth={1.2} />
            <p className="text-xs">No hay notificaciones pendientes</p>
          </div>
        ) : (
          <>
            {notificacionesSistema.length > 0 && (
              <div>
                <p className="px-4 py-1.5 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  Actividad del sistema
                </p>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notificacionesSistema.map((notif) => {
                    const meta = TIPO_META[notif.tipo] ?? TIPO_META.asignacion;
                    const actorNombre = notif.actor_detalle?.nombre_completo || notif.actor_detalle?.username || '';
                    return (
                      <li key={notif.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-start gap-3">
                          {actorNombre ? (
                            <Avatar nombre={actorNombre} />
                          ) : (
                            <div className={`flex-shrink-0 w-7 h-7 rounded-full ${meta.bg} flex items-center justify-center ${meta.color}`}>
                              {meta.icon}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-snug">{notif.mensaje}</p>
                            {notif.carpeta_nombre && (
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">{notif.carpeta_nombre}</p>
                            )}
                            <p className="text-[11px] text-gray-400 mt-0.5">{relativo(notif.fecha_creacion)}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                onClick={() => onMarcarLeidaSistema?.(notif.id)}
                                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-accent transition-colors uppercase"
                              >
                                <Check size={11} /> Leída
                              </button>
                              {notif.carpeta_id && (
                                <Link
                                  to={`/carpetas/${notif.carpeta_id}`}
                                  onClick={onClose}
                                  className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover transition-colors uppercase"
                                >
                                  <ExternalLink size={11} /> Ver
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {notificaciones.length > 0 && (
              <div>
                <p className="px-4 py-1.5 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  Vencimientos
                </p>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notificaciones.map((notif) => (
                    <li key={notif.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                          <Bell size={12} className="text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{notif.movimiento_titulo}</p>
                          {notif.carpeta_nombre && (
                            <p className="text-[11px] text-gray-500 truncate">{notif.carpeta_nombre}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-0.5">{fmt(notif.fecha)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              onClick={() => onMarcarLeida(notif.id)}
                              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-accent transition-colors uppercase"
                            >
                              <Check size={11} /> Leída
                            </button>
                            {notif.carpeta_id && (
                              <Link
                                to={`/carpetas/${notif.carpeta_id}`}
                                onClick={onClose}
                                className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover transition-colors uppercase"
                              >
                                <ExternalLink size={11} /> Ver
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer: ver todas */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2.5">
        <Link
          to="/notificaciones"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 text-xs text-accent hover:text-accent-hover font-medium transition-colors"
        >
          Ver todas las notificaciones
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
};

export default PanelNotificaciones;
