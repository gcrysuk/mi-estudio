import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, Edit, FolderOpen, Clock, Bell, Gavel, Landmark, Inbox, Hash,
  AlertTriangle, FileText, PenLine, UserRound, CalendarClock, Tag, CheckCircle2,
} from 'lucide-react';
import api from '../../services/api';
import MovimientoForm from '../../pages/movimientos/MovimientoForm';

const fmt = (fecha, withTime = false) => {
  if (!fecha) return null;
  const opts = withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Date(fecha).toLocaleDateString('es-AR', opts);
};

const diasHasta = (fecha) => {
  if (!fecha) return null;
  const ms = new Date(fecha).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
};

const SOLAPAS = [
  { key: 'descripcion',   label: 'Descripción', icon: FileText },
  { key: 'transcripcion', label: 'Transcripción', icon: PenLine },
  { key: 'minuta',        label: 'Minuta', icon: FileText },
];

const MovimientoDetalleModal = ({ movimientoId, onClose, onEdit }) => {
  const navigate = useNavigate();
  const [movimiento, setMovimiento] = useState(null);
  const [carpeta, setCarpeta] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [solapaActiva, setSolapaActiva] = useState('descripcion');
  const [showMeta, setShowMeta] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [movRes, notifRes] = await Promise.all([
        api.get(`/movimientos/${movimientoId}/`),
        api.get('/movimientos/notificaciones/', { params: { movimiento: movimientoId } }),
      ]);
      setMovimiento(movRes.data);
      setNotificaciones(notifRes.data.results ?? notifRes.data);
      if (movRes.data.carpeta) {
        try {
          const carpRes = await api.get(`/carpetas/${movRes.data.carpeta}/`);
          setCarpeta(carpRes.data);
        } catch {
          setCarpeta(null);
        }
      }
    } catch {
      /* no-op */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [movimientoId]);

  useEffect(() => {
    if (showEdit) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, showEdit]);

  if (showEdit && movimiento) {
    return (
      <MovimientoForm
        movimiento={movimiento}
        onClose={() => setShowEdit(false)}
        onSave={() => { setShowEdit(false); fetchData(); onEdit?.(); }}
      />
    );
  }

  const dias = movimiento ? diasHasta(movimiento.fecha_vencimiento) : null;
  const banner = movimiento?.fecha_vencimiento && !movimiento.fecha_completado
    ? {
        tono: movimiento.vencido ? 'crit' : dias <= 3 ? 'warn' : 'info',
        texto: movimiento.vencido
          ? `Venció el ${fmt(movimiento.fecha_vencimiento, true)}`
          : dias === 0
            ? 'Vence hoy'
            : dias === 1
              ? 'Vence mañana'
              : `Vence en ${dias} días`,
      }
    : null;
  const bannerEstilos = {
    crit: 'border-red-500/20 bg-red-500/[0.07] text-red-600 dark:text-red-300',
    warn: 'border-amber-500/20 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300',
    info: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400',
  };

  return createPortal(
    <div data-modal="movimiento" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="relative rounded-t-2xl border-b border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50 dark:from-gray-800/60 to-white dark:to-dark-surface px-5 sm:px-6 pt-5 pb-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-white transition-colors"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>

          {loading ? (
            <div className="h-14 flex-1 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mr-10" />
          ) : (
            <>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-accent">
                <Gavel size={14} /> {movimiento?.tipo_nombre || 'Movimiento'}
              </div>
              <h2 className="mt-1.5 max-w-[92%] text-[18px] sm:text-[19px] font-bold leading-snug text-gray-900 dark:text-white">
                {movimiento?.carpeta_nombre || movimiento?.titulo}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                {carpeta?.organismo_nombre && (
                  <span className="inline-flex items-center gap-1.5">
                    <Landmark size={13} className="text-gray-400 dark:text-gray-500" /> {carpeta.organismo_nombre}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Inbox size={13} className="text-gray-400 dark:text-gray-500" /> {fmt(movimiento?.fecha_movimiento, true)} hs
                </span>
                {carpeta?.numero_expediente && (
                  <span className="inline-flex items-center gap-1.5">
                    <Hash size={13} className="text-gray-400 dark:text-gray-500" /> Expte. {carpeta.numero_expediente}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Banner de plazo */}
        {!loading && banner && (
          <div className={`flex items-center gap-3 border-b px-5 sm:px-6 py-3 flex-shrink-0 ${bannerEstilos[banner.tono]}`}>
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span className="text-sm font-bold">{banner.texto}</span>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando...</div>
        ) : !movimiento ? (
          <div className="p-8 text-center text-sm text-gray-500">No se pudo cargar el movimiento.</div>
        ) : (
          <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5">

            {/* Carpeta */}
            {movimiento.carpeta && (
              <div className="mb-4 flex items-center gap-2">
                <FolderOpen size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 uppercase mr-1">Carpeta:</span>
                <span
                  onClick={() => { onClose(); navigate(`/carpetas/${movimiento.carpeta}`); }}
                  className="text-sm font-medium cursor-pointer hover:text-accent hover:underline transition-colors"
                >
                  {movimiento.carpeta_nombre}
                </span>
              </div>
            )}

            {/* Trámite y firma */}
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <PenLine size={13} /> Trámite
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-700">
              <div className="bg-white dark:bg-dark-surface px-4 py-3">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                  <Tag size={12} /> Tipo
                </div>
                {movimiento.tipo_nombre
                  ? <span className="mt-1 inline-block text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-medium text-gray-700 dark:text-gray-200">{movimiento.tipo_nombre}</span>
                  : <p className="mt-1 text-sm text-gray-400">—</p>}
              </div>
              <div className="bg-white dark:bg-dark-surface px-4 py-3">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                  <UserRound size={12} /> Estado
                </div>
                {movimiento.estado_nombre ? (
                  <span
                    className="mt-1 inline-block text-xs px-2 py-0.5 rounded font-semibold"
                    style={{
                      backgroundColor: movimiento.estado_color ? `${movimiento.estado_color}22` : '#f3f4f6',
                      color: movimiento.estado_color ?? '#6b7280',
                    }}
                  >
                    {movimiento.estado_nombre}
                  </span>
                ) : <p className="mt-1 text-sm text-gray-400">—</p>}
              </div>
              <div className="bg-white dark:bg-dark-surface px-4 py-3">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                  <CalendarClock size={12} /> Fecha
                </div>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-200">{fmt(movimiento.fecha_movimiento) || '—'}</p>
              </div>
            </div>

            {/* Vencimiento */}
            {movimiento.fecha_vencimiento && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/40 px-3.5 py-2.5">
                <Clock size={13} className={movimiento.vencido ? 'text-red-500' : 'text-gray-400'} />
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase mr-1">Vencimiento:</span>
                <span className={`text-sm font-medium ${movimiento.vencido ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
                  {fmt(movimiento.fecha_vencimiento, true)}
                </span>
                {movimiento.vencido && (
                  <span className="text-xs text-red-500 font-semibold uppercase">(vencido)</span>
                )}
              </div>
            )}

            {/* Completado */}
            {movimiento.fecha_completado && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-100 dark:border-green-800/40 bg-green-50 dark:bg-green-900/15 px-3.5 py-2.5">
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase mr-1">Completado:</span>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  {fmt(movimiento.fecha_completado, true)}
                </span>
              </div>
            )}

            {/* Notificaciones */}
            {notificaciones.length > 0 && (
              <div className="mt-4 flex items-start gap-2">
                <Bell size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Notificaciones:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {notificaciones.map((n) => (
                      <span key={n.id} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                        {fmt(n.fecha, true)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Solapas: Descripción / Transcripción / Minuta */}
            <div className="mt-5 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                {SOLAPAS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSolapaActiva(key)}
                    className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                      solapaActiva === key
                        ? 'border-b-2 border-accent text-accent bg-white dark:bg-dark-surface'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="p-4 min-h-[120px] max-h-72 overflow-y-auto bg-white dark:bg-dark-surface">
                {SOLAPAS.map(({ key }) => {
                  const html = movimiento[key];
                  return solapaActiva === key ? (
                    html ? (
                      <div
                        key={key}
                        className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-normal break-words"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    ) : (
                      <p key={key} className="text-sm text-gray-400 italic">
                        Sin {key === 'descripcion' ? 'descripción' : key === 'transcripcion' ? 'transcripción' : 'minuta'}
                      </p>
                    )
                  ) : null;
                })}
              </div>
            </div>

            {/* Metadatos MEV colapsables */}
            {carpeta?.mev_estado && (
              <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30">
                <button
                  onClick={() => setShowMeta(v => !v)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <span className={`transition-transform ${showMeta ? 'rotate-90' : ''}`}>▸</span>
                  Ver estado MEV de la carpeta
                  <span className="ml-auto rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">técnico</span>
                </button>
                {showMeta && (
                  <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                    <dl className="space-y-1.5 font-mono text-[11px] leading-relaxed text-gray-500 dark:text-gray-500">
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                        <dt className="w-40 shrink-0 text-gray-400 dark:text-gray-600">Estado MEV:</dt>
                        <dd className="break-all text-gray-600 dark:text-gray-400">{carpeta.mev_estado}</dd>
                      </div>
                      {carpeta.mev_fecha_estado && (
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                          <dt className="w-40 shrink-0 text-gray-400 dark:text-gray-600">Desde:</dt>
                          <dd className="break-all text-gray-600 dark:text-gray-400">{fmt(carpeta.mev_fecha_estado, true)}</dd>
                        </div>
                      )}
                      {carpeta.mev_ultimo_sync && (
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                          <dt className="w-40 shrink-0 text-gray-400 dark:text-gray-600">Última sincronización:</dt>
                          <dd className="break-all text-gray-600 dark:text-gray-400">{fmt(carpeta.mev_ultimo_sync, true)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Footer */}
        {!loading && movimiento && (
          <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30 rounded-b-2xl px-5 sm:px-6 py-4 sm:flex-row sm:items-center flex-shrink-0">
            {movimiento.carpeta && (
              <button
                onClick={() => { onClose(); navigate(`/carpetas/${movimiento.carpeta}`); }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-hover px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                <FolderOpen size={16} /> Ver carpeta completa
              </button>
            )}
            <div className="flex flex-1 justify-end">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <Edit size={14} /> Editar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MovimientoDetalleModal;
