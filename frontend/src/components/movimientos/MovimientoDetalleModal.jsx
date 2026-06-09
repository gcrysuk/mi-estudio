import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Edit, FolderOpen, Clock, Bell } from 'lucide-react';
import api from '../../services/api';
import MovimientoForm from '../../pages/movimientos/MovimientoForm';

const fmt = (fecha, withTime = false) => {
  if (!fecha) return null;
  const opts = withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Date(fecha).toLocaleDateString('es-AR', opts);
};

const SOLAPAS = [
  { key: 'descripcion',   label: 'Descripción' },
  { key: 'transcripcion', label: 'Transcripción' },
  { key: 'minuta',        label: 'Minuta' },
];

const MovimientoDetalleModal = ({ movimientoId, onClose, onEdit }) => {
  const navigate = useNavigate();
  const [movimiento, setMovimiento] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [solapaActiva, setSolapaActiva] = useState('descripcion');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [movRes, notifRes] = await Promise.all([
        api.get(`/movimientos/${movimientoId}/`),
        api.get('/movimientos/notificaciones/', { params: { movimiento: movimientoId } }),
      ]);
      setMovimiento(movRes.data);
      setNotificaciones(notifRes.data.results ?? notifRes.data);
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

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 sticky top-0 bg-white dark:bg-dark-surface z-10">
          {loading ? (
            <div className="h-5 flex-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <h2 className="text-base font-bold uppercase flex-1 leading-tight">{movimiento?.titulo}</h2>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando...</div>
        ) : !movimiento ? (
          <div className="p-8 text-center text-sm text-gray-500">No se pudo cargar el movimiento.</div>
        ) : (
          <div className="overflow-y-auto flex-1">

            {/* Carpeta */}
            {movimiento.carpeta && (
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2">
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

            {/* Tipo / Estado / Fecha */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700/50 border-b border-gray-100 dark:border-gray-700/50">
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 uppercase mb-1">Tipo</p>
                {movimiento.tipo_nombre
                  ? <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{movimiento.tipo_nombre}</span>
                  : <span className="text-sm text-gray-400">—</span>}
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 uppercase mb-1">Estado</p>
                {movimiento.estado_nombre ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: movimiento.estado_color ? `${movimiento.estado_color}22` : '#f3f4f6',
                      color: movimiento.estado_color ?? '#6b7280',
                    }}
                  >
                    {movimiento.estado_nombre}
                  </span>
                ) : <span className="text-sm text-gray-400">—</span>}
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 uppercase mb-1">Fecha</p>
                <p className="text-sm font-medium">{fmt(movimiento.fecha_movimiento) || '—'}</p>
              </div>
            </div>

            {/* Vencimiento */}
            {movimiento.fecha_vencimiento && (
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2">
                <Clock size={13} className={movimiento.vencido ? 'text-red-500' : 'text-gray-400'} />
                <span className="text-xs text-gray-500 uppercase mr-1">Vencimiento:</span>
                <span className={`text-sm font-medium ${movimiento.vencido ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {fmt(movimiento.fecha_vencimiento, true)}
                </span>
                {movimiento.vencido && (
                  <span className="text-xs text-red-500 font-semibold uppercase">(vencido)</span>
                )}
              </div>
            )}

            {/* Completado */}
            {movimiento.fecha_completado && (
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2">
                <span className="text-sm">✅</span>
                <span className="text-xs text-gray-500 uppercase mr-1">Completado:</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {fmt(movimiento.fecha_completado, true)}
                </span>
              </div>
            )}

            {/* Notificaciones */}
            {notificaciones.length > 0 && (
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50 flex items-start gap-2">
                <Bell size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 uppercase">Notificaciones:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {notificaciones.map((n) => (
                      <span key={n.id} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {fmt(n.fecha, true)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Solapas: Descripción / Transcripción / Minuta */}
            <div className="mx-4 my-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                {SOLAPAS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSolapaActiva(key)}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                      solapaActiva === key
                        ? 'border-b-2 border-accent text-accent bg-white dark:bg-dark-surface'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="p-3 min-h-[120px] max-h-72 overflow-y-auto bg-white dark:bg-dark-surface">
                {SOLAPAS.map(({ key }) => {
                  const html = movimiento[key];
                  return solapaActiva === key ? (
                    html ? (
                      <div
                        key={key}
                        className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300"
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

            {/* Footer */}
            <div className="px-4 pb-4 flex justify-end border-t border-gray-100 dark:border-gray-700/50 pt-3">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase"
              >
                <Edit size={13} /> Editar
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
