import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, FolderOpen, Settings, Clock, Calendar, Plus, Bell, Mic, Sparkles, UserCheck, Printer, ChevronDown, Maximize2 } from 'lucide-react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import ReporteMinuta from '../../components/print/ReporteMinuta';
import ReporteTranscripcion from '../../components/print/ReporteTranscripcion';
import toast from 'react-hot-toast';
import api from '../../services/api';
import MovimientoConfig from './MovimientoConfig';
import BuscadorCarpeta from '../../components/carpetas/BuscadorCarpeta';
import CarpetaForm from '../../components/carpetas/CarpetaForm';
import AsignarResponsableModal from '../../components/movimientos/AsignarResponsableModal';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import useAuthStore from '../../stores/authStore';

// ── Quill toolbar config ──────────────────────────────────────────────────────

const QUILL_TOOLBAR = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['clean'],
];

// ── Text → HTML helper (for MEV plain-text content) ──────────────────────────

const textoAHtml = (texto) => {
  if (!texto) return '';
  if (/<[a-z][\s\S]*>/i.test(texto)) return texto;   // already HTML
  return texto.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('');
};

// ── EditorRico: quill v2 wrapper, React 18 StrictMode-safe ───────────────────

const EditorRico = memo(({ value, onChange, readonly = false }) => {
  const containerRef  = useRef(null);
  const quillRef      = useRef(null);
  const onChangeRef   = useRef(onChange);
  const lastEmitted   = useRef('');

  // Keep callback ref up-to-date without remounting
  useEffect(() => { onChangeRef.current = onChange; });

  // Mount quill once; quill.destroy() ensures clean cleanup in StrictMode
  useEffect(() => {
    if (!containerRef.current) return;
    const editorEl = document.createElement('div');
    containerRef.current.appendChild(editorEl);

    const quill = new Quill(editorEl, {
      theme: 'snow',
      readOnly: readonly,
      modules: { toolbar: readonly ? false : QUILL_TOOLBAR },
    });

    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
      lastEmitted.current = value;
    }

    quill.on('text-change', () => {
      const html = quill.getSemanticHTML();
      const normalized = html === '<p></p>' ? '' : html;
      lastEmitted.current = normalized;
      onChangeRef.current?.(normalized);
    });

    quillRef.current = quill;

    return () => {
      quill.destroy();
      quillRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync value prop when it changes externally (tab switch, load from server)
  useEffect(() => {
    if (!quillRef.current || value === lastEmitted.current) return;
    quillRef.current.clipboard.dangerouslyPasteHTML(value || '');
    lastEmitted.current = value || '';
  }, [value]);

  return <div ref={containerRef} className="quill-host" />;
});

// ── Solapa (tab) constants ────────────────────────────────────────────────────

const SOLAPAS = [
  { id: 'descripcion',  label: 'Descripción' },
  { id: 'transcripcion', label: 'Transcripción' },
  { id: 'minuta',       label: 'Minuta' },
];

// ── MovimientoForm ────────────────────────────────────────────────────────────

const MovimientoForm = ({
  carpetaId: initialCarpetaId, carpetaNombre, movimiento, onClose, onSave,
  estadoInicial, fechaMovimientoInicial, fechaVencimientoInicial,
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading]                   = useState(false);
  const [tiposMovimiento, setTiposMovimiento]   = useState([]);
  const [estadosMovimiento, setEstadosMovimiento] = useState([]);
  const [showConfig, setShowConfig]             = useState(false);
  const [showCarpetaForm, setShowCarpetaForm]   = useState(false);
  const [showMinuta, setShowMinuta]             = useState(false);
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [showPrintTranscripcion, setShowPrintTranscripcion] = useState(false);
  const [movimientoActual, setMovimientoActual] = useState(movimiento || null);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState(null);
  const [nombreInicial, setNombreInicial]       = useState('');
  const [notificaciones, setNotificaciones]     = useState([]);
  const [toDelete, setToDelete]                 = useState([]);
  const [nuevaFecha, setNuevaFecha]             = useState('');
  const [generandoMinuta, setGenerandoMinuta]   = useState(false);
  const [responsableSeleccionado, setResponsableSeleccionado] = useState(null);
  const [busquedaResponsable, setBusquedaResponsable] = useState('');
  const [usuariosBusqueda, setUsuariosBusqueda] = useState([]);
  const [cargandoResponsable, setCargandoResponsable] = useState(false);

  // Editor state
  const [solapaActiva, setSolapaActiva] = useState('descripcion');
  const [expandida, setExpandida]       = useState(false);
  const [minuta, setMinuta]             = useState('');   // AI-generated, local only

  const { isListening, reconnecting, start, stop } = useSpeechRecognition({
    onResult: (transcript) => {
      setFormData(prev => ({
        ...prev,
        descripcion: (prev.descripcion || '') + `<p>${transcript}</p>`,
      }));
      setSolapaActiva('descripcion');
    },
  });

  useEffect(() => {
    if (!reconnecting) return;
    const timer = setTimeout(() => {
      if (reconnecting) toast('La grabación se interrumpió brevemente, reconectando...', { icon: '⚠️' });
    }, 3000);
    return () => clearTimeout(timer);
  }, [reconnecting]);

  const generarMinuta = async () => {
    setGenerandoMinuta(true);
    const textoPlano = formData.descripcion.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    try {
      const payload = { texto: textoPlano };
      if (movimientoActual?.id) payload.movimiento_id = movimientoActual.id;
      const res = await api.post('/movimientos/generar_minuta/', payload);
      const minutaTexto = res.data.minuta;
      if (minutaTexto) {
        setMinuta(textoAHtml(minutaTexto));
        if (!formData.transcripcion) {
          setFormData(prev => ({ ...prev, transcripcion: prev.descripcion }));
        }
        setSolapaActiva('minuta');
        toast.success('Minuta generada');
      }
    } catch {
      toast.error('Error al generar la minuta');
    } finally {
      setGenerandoMinuta(false);
    }
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    transcripcion: '',
    tipo: '',
    estado: estadoInicial ?? '',
    complejidad: '',
    fecha_movimiento: fechaMovimientoInicial || getCurrentDateTime(),
    fecha_vencimiento: fechaVencimientoInicial || '',
    tiempo_trabajo: '',
    carpeta: initialCarpetaId || '',
  });

  useEffect(() => {
    fetchTiposMovimiento();
    fetchEstadosMovimiento();

    if (movimiento) {
      setFormData({
        titulo:           movimiento.titulo || '',
        descripcion:      textoAHtml(movimiento.descripcion || ''),
        transcripcion:    textoAHtml(movimiento.transcripcion || ''),
        tipo:             movimiento.tipo || '',
        estado:           movimiento.estado || '',
        complejidad:      movimiento.complejidad || '',
        fecha_movimiento: movimiento.fecha_movimiento
          ? new Date(movimiento.fecha_movimiento).toISOString().slice(0, 16)
          : getCurrentDateTime(),
        fecha_vencimiento: movimiento.fecha_vencimiento
          ? new Date(movimiento.fecha_vencimiento).toISOString().slice(0, 16)
          : '',
        tiempo_trabajo: movimiento.tiempo_trabajo || '',
        carpeta:        movimiento.carpeta || '',
      });
      if (movimiento.carpeta) {
        setCarpetaSeleccionada({
          id:         movimiento.carpeta,
          nombre:     movimiento.carpeta_nombre || '',
          propietario: movimiento.carpeta_propietario_id,
        });
      }
      api.get('/movimientos/notificaciones/', { params: { movimiento: movimiento.id } })
        .then(res => {
          setNotificaciones((res.data.results ?? res.data).map(n => ({
            id:    n.id,
            fecha: new Date(n.fecha).toISOString().slice(0, 16),
            isNew: false,
          })));
        })
        .catch(() => {});
    } else if (initialCarpetaId) {
      setCarpetaSeleccionada({ id: initialCarpetaId, nombre: carpetaNombre || '' });
    }
  }, [movimiento, initialCarpetaId]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') { if (expandida) setExpandida(false); else onClose(); }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, expandida]);

  useEffect(() => {
    if (!busquedaResponsable || busquedaResponsable.length < 2) {
      setUsuariosBusqueda([]); return;
    }
    const timer = setTimeout(async () => {
      setCargandoResponsable(true);
      try {
        const params = { search: busquedaResponsable };
        if (carpetaSeleccionada?.id) params.carpeta_id = carpetaSeleccionada.id;
        const res = await api.get('/usuarios/', { params });
        setUsuariosBusqueda(res.data.results || res.data);
      } finally { setCargandoResponsable(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [busquedaResponsable, carpetaSeleccionada?.id]);

  const fetchTiposMovimiento = async () => {
    try { setTiposMovimiento((await api.get('/movimientos/tipos/')).data); }
    catch (e) { console.error('Error fetching tipos:', e); }
  };
  const fetchEstadosMovimiento = async () => {
    try { setEstadosMovimiento((await api.get('/movimientos/estados/')).data); }
    catch (e) { console.error('Error fetching estados:', e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titulo) { toast.error('El título es obligatorio'); return; }
    if (!movimiento && !formData.carpeta) { toast.error('La carpeta es obligatoria'); return; }
    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        carpeta:           formData.carpeta || null,
        responsable:       !movimiento ? (responsableSeleccionado?.id || null) : undefined,
        fecha_movimiento:  new Date(formData.fecha_movimiento).toISOString(),
        fecha_notificacion: null,
        fecha_vencimiento: formData.fecha_vencimiento
          ? new Date(formData.fecha_vencimiento).toISOString() : null,
        tiempo_trabajo: formData.tiempo_trabajo ? parseInt(formData.tiempo_trabajo) : null,
        tipo:    formData.tipo  || null,
        estado:  formData.estado || null,
      };

      let movimientoId;
      if (movimiento) {
        await api.put(`/movimientos/${movimiento.id}/`, dataToSend);
        movimientoId = movimiento.id;
        toast.success('Movimiento actualizado');
      } else {
        movimientoId = (await api.post('/movimientos/', dataToSend)).data.id;
        toast.success('Movimiento creado');
      }

      await Promise.all(toDelete.map(id => api.delete(`/movimientos/notificaciones/${id}/`)));
      await Promise.all(
        notificaciones.filter(n => n.isNew).map(n =>
          api.post('/movimientos/notificaciones/', {
            movimiento: movimientoId,
            fecha: new Date(n.fecha).toISOString(),
          })
        )
      );
      onSave();
    } catch (error) {
      console.error('Error saving movimiento:', error);
      if (!error._403handled) {
        toast.error('Error al guardar: ' + (error.response?.data?.detail || error.response?.data?.error || 'Verifica los datos'));
      }
    } finally { setLoading(false); }
  };

  const editorValue = (solapa) => {
    if (solapa === 'descripcion')  return formData.descripcion;
    if (solapa === 'transcripcion') return formData.transcripcion;
    return minuta;
  };

  const handleDescripcionChange  = useCallback((v) => setFormData(p => ({ ...p, descripcion:   v })), []);
  const handleTranscripcionChange = useCallback((v) => setFormData(p => ({ ...p, transcripcion: v })), []);
  const handleMinutaChange        = useCallback((v) => setMinuta(v), []);

  const editorOnChange = (solapa) => {
    if (solapa === 'descripcion')   return handleDescripcionChange;
    if (solapa === 'transcripcion') return handleTranscripcionChange;
    return handleMinutaChange;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const TabBar = ({ compact = false }) => (
    <div className={`flex items-center border-b border-gray-200 dark:border-gray-700 ${compact ? '' : 'bg-gray-50 dark:bg-gray-800'}`}>
      {SOLAPAS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setSolapaActiva(id)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
            solapaActiva === id
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {label}
        </button>
      ))}

      {/* Voice + AI — descripcion only */}
      {solapaActiva === 'descripcion' && (
        <div className="flex items-center gap-0.5 ml-1">
          <button
            type="button"
            onClick={isListening ? stop : start}
            className={`flex items-center gap-1 px-1.5 py-1 text-xs rounded transition-colors ${
              reconnecting ? 'bg-yellow-500 text-white'
              : isListening ? 'bg-red-500 text-white animate-pulse'
              : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title={isListening ? 'Detener grabación' : 'Iniciar grabación de voz'}
          >
            <Mic size={11} />
            {reconnecting ? 'Reconect.' : isListening ? 'Grabando' : ''}
          </button>
          {formData.descripcion && !isListening && (
            <button
              type="button"
              onClick={generarMinuta}
              disabled={generandoMinuta}
              className="flex items-center gap-1 px-1.5 py-1 text-xs rounded text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
              title="Generar minuta con IA"
            >
              <Sparkles size={11} />
              {generandoMinuta ? '...' : 'IA'}
            </button>
          )}
        </div>
      )}

      {/* Print transcripcion — transcripcion tab only */}
      {solapaActiva === 'transcripcion' && formData.transcripcion && (
        <button
          type="button"
          onClick={() => setShowPrintTranscripcion(true)}
          className="ml-1 p-1 text-xs rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Imprimir transcripción"
        >
          <Printer size={11} />
        </button>
      )}

      {/* Usar minuta como descripción */}
      {solapaActiva === 'minuta' && minuta && (
        <button
          type="button"
          onClick={() => {
            setFormData(prev => ({
              ...prev,
              descripcion:  minuta,
              transcripcion: prev.transcripcion || prev.descripcion,
            }));
            setSolapaActiva('descripcion');
            toast.success('Minuta copiada a Descripción');
          }}
          className="ml-1 px-1.5 py-1 text-xs rounded text-accent hover:bg-accent/10 transition-colors"
          title="Usar minuta como descripción"
        >
          ↑ Usar
        </button>
      )}

      <button
        type="button"
        onClick={() => setExpandida(true)}
        className="ml-auto px-2 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        title="Expandir editor"
      >
        <Maximize2 size={12} />
      </button>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface z-10">
            <h2 className="text-sm font-bold uppercase">
              {movimiento ? 'EDITAR MOVIMIENTO' : 'NUEVO MOVIMIENTO'}
            </h2>
            <div className="flex items-center gap-1">
              {movimiento && (formData.descripcion || formData.transcripcion) && (
                <button type="button" onClick={() => setShowMinuta(true)}
                  className="p-1 hover:text-accent rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Imprimir minuta">
                  <Printer size={16} />
                </button>
              )}
              <button type="button" onClick={() => setShowConfig(true)}
                className="p-1 hover:text-accent rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Configurar tipos y estados">
                <Settings size={16} />
              </button>
              <button onClick={onClose}
                className="p-1 hover:text-accent rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                disabled={loading}>
                <X size={16} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-3 space-y-2">
            {/* Carpeta */}
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase flex items-center gap-1">
                <FolderOpen size={12} />CARPETA{!movimiento && ' *'}
              </label>
              <BuscadorCarpeta
                value={carpetaSeleccionada}
                onChange={(c) => { setCarpetaSeleccionada(c); setFormData(p => ({ ...p, carpeta: c?.id || '' })); }}
                onCrearNueva={(texto) => { setNombreInicial(texto); setShowCarpetaForm(true); }}
                placeholder="Buscar carpeta..."
              />
            </div>

            {/* Título */}
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">TÍTULO *</label>
              <input type="text" value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                required placeholder="Ej: Presentación de demanda" />
            </div>

            {/* Tipo, Estado y Complejidad */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-0.5 uppercase">TIPO</label>
                <select value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent">
                  <option value="">SELECCIONAR</option>
                  {tiposMovimiento.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-0.5 uppercase">ESTADO</label>
                <select value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  disabled={!!estadoInicial}
                  className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent disabled:opacity-70 disabled:cursor-not-allowed">
                  <option value="">SELECCIONAR</option>
                  {estadosMovimiento.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-0.5 uppercase">COMPLEJIDAD</label>
                <select value={formData.complejidad}
                  onChange={(e) => setFormData({ ...formData, complejidad: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent">
                  <option value="">Sin complejidad</option>
                  <option value="alto">🔴 Alto</option>
                  <option value="medio">🟡 Medio</option>
                  <option value="bajo">🟢 Bajo</option>
                </select>
              </div>
            </div>

            {/* Fecha movimiento */}
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase flex items-center gap-1">
                <Calendar size={12} />FECHA MOVIMIENTO
              </label>
              <input type="datetime-local" value={formData.fecha_movimiento}
                onChange={(e) => setFormData({ ...formData, fecha_movimiento: e.target.value })}
                className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" />
            </div>

            {/* Recordatorios */}
            <div>
              <label className="block text-xs font-medium mb-1 uppercase flex items-center gap-1">
                <Bell size={12} />FECHAS DE RECORDATORIO
              </label>
              <div className="flex gap-1">
                <input type="datetime-local" value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" />
                <button type="button" onClick={() => { if (!nuevaFecha) return; setNotificaciones(p => [...p, { id: null, fecha: nuevaFecha, isNew: true }]); setNuevaFecha(''); }}
                  disabled={!nuevaFecha}
                  className="px-2 py-1 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white disabled:opacity-40 flex items-center gap-1 uppercase">
                  <Plus size={12} />AGREGAR
                </button>
              </div>
              {notificaciones.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {notificaciones.map((n, i) => (
                    <li key={i} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-dark-elevated rounded px-2 py-1">
                      <span>{new Date(n.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <button type="button" onClick={() => { const notif = notificaciones[i]; if (notif.id) setToDelete(p => [...p, notif.id]); setNotificaciones(p => p.filter((_, j) => j !== i)); }}
                        className="text-gray-400 hover:text-red-500 ml-2"><X size={12} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Vencimiento y Tiempo */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-0.5 uppercase flex items-center gap-1">
                  <Clock size={12} />FECHA VENCE
                </label>
                <input type="datetime-local" value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-0.5 uppercase flex items-center gap-1">
                  <Clock size={12} />TIEMPO (min)
                </label>
                <input type="number" min="0" step="5" value={formData.tiempo_trabajo}
                  onChange={(e) => setFormData({ ...formData, tiempo_trabajo: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                  placeholder="120" />
              </div>
            </div>

            {/* ── Editor con solapas ── */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <TabBar />
              <EditorRico
                key={solapaActiva}
                value={editorValue(solapaActiva)}
                onChange={editorOnChange(solapaActiva)}
              />
            </div>

            {/* Responsable — solo al crear */}
            {!movimiento && (
              <div>
                <label className="block text-xs font-medium mb-0.5 uppercase flex items-center gap-1">
                  <UserCheck size={12} />RESPONSABLE (OPCIONAL)
                </label>
                {responsableSeleccionado ? (
                  <div className="flex items-center justify-between px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-dark-elevated">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent flex-shrink-0">
                        {(responsableSeleccionado.nombre_completo || responsableSeleccionado.username)[0].toUpperCase()}
                      </div>
                      <span className="text-xs">{responsableSeleccionado.nombre_completo || responsableSeleccionado.username}</span>
                    </div>
                    <button type="button" onClick={() => setResponsableSeleccionado(null)} className="text-gray-400 hover:text-red-500"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <input type="text" value={busquedaResponsable}
                      onChange={(e) => setBusquedaResponsable(e.target.value)}
                      placeholder="Buscar usuario..."
                      className="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" />
                    {(cargandoResponsable || usuariosBusqueda.length > 0) && (
                      <div className="absolute z-20 w-full mt-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface shadow-lg overflow-hidden">
                        {cargandoResponsable ? (
                          <div className="px-3 py-2 text-xs text-gray-400">Buscando...</div>
                        ) : usuariosBusqueda.map(u => (
                          <button key={u.id} type="button"
                            onClick={() => { setResponsableSeleccionado(u); setBusquedaResponsable(''); setUsuariosBusqueda([]); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent flex-shrink-0">
                              {(u.nombre_completo || u.username)[0].toUpperCase()}
                            </div>
                            <span className="text-xs">{u.nombre_completo || u.username}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Responsable — solo al editar y si el usuario es owner de la carpeta */}
            {movimientoActual && carpetaSeleccionada?.propietario === user?.id && (
              <div>
                <label className="block text-xs font-medium mb-0.5 uppercase flex items-center gap-1">
                  <UserCheck size={12} />RESPONSABLE
                </label>
                {movimientoActual.responsable_username ? (
                  <div className="flex items-center justify-between px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-dark-elevated">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                        {movimientoActual.responsable_username[0].toUpperCase()}
                      </div>
                      <span className="text-xs">{movimientoActual.responsable_username}</span>
                    </div>
                    <button type="button" onClick={() => setShowAsignarModal(true)} className="text-xs text-accent hover:underline">Reasignar</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowAsignarModal(true)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-dashed border-accent/50 text-accent hover:border-accent hover:bg-accent/5 transition-colors text-left flex items-center gap-1.5">
                    <UserCheck size={13} />Asignar responsable...
                  </button>
                )}
              </div>
            )}

            {/* Tracking */}
            {movimiento?.id && (movimiento.creado_por_nombre || movimiento.modificado_por_nombre) && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 space-y-0.5">
                {movimiento.creado_por_nombre && (
                  <p>Creado por: <span className="font-medium">{movimiento.creado_por_nombre}</span>
                    {movimiento.fecha_creacion && <> &bull; {new Date(movimiento.fecha_creacion).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
                  </p>
                )}
                {movimiento.modificado_por_nombre && (
                  <p>Última modificación: <span className="font-medium">{movimiento.modificado_por_nombre}</span>
                    {movimiento.ultima_actualizacion && <> &bull; {new Date(movimiento.ultima_actualizacion).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
                  </p>
                )}
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={onClose} disabled={loading}
                className="px-3 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase">
                CANCELAR
              </button>
              <button type="submit" disabled={loading}
                className="px-3 py-1 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase flex items-center gap-1">
                <Save size={14} />
                {loading ? 'GUARDANDO...' : (movimiento ? 'ACTUALIZAR' : 'CREAR')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Modal de expansión ── */}
      {expandida && createPortal(
        <div className="fixed inset-0 z-[60] bg-white dark:bg-dark-bg flex flex-col p-4">
          <div className="flex items-center justify-between mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
            <TabBar compact />
            <button type="button" onClick={() => setExpandida(false)}
              className="ml-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-auto quill-expanded">
            <EditorRico
              key={`expanded-${solapaActiva}`}
              value={editorValue(solapaActiva)}
              onChange={editorOnChange(solapaActiva)}
            />
          </div>
          <div className="flex justify-end mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={() => setExpandida(false)}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors">
              Cerrar
            </button>
          </div>
        </div>,
        document.body
      )}

      {showConfig && (
        <MovimientoConfig onClose={() => { setShowConfig(false); fetchTiposMovimiento(); fetchEstadosMovimiento(); }} />
      )}

      {showCarpetaForm && createPortal(
        <CarpetaForm nombreInicial={nombreInicial} onClose={() => setShowCarpetaForm(false)} onSave={(c) => { setCarpetaSeleccionada(c); setFormData(p => ({ ...p, carpeta: c.id })); setShowCarpetaForm(false); }} />,
        document.body
      )}

      {showMinuta && movimiento && createPortal(
        <ReporteMinuta movimiento={{ ...movimiento, ...formData, carpeta_nombre: carpetaSeleccionada?.nombre }} onClose={() => setShowMinuta(false)} />,
        document.body
      )}

      {showPrintTranscripcion && createPortal(
        <ReporteTranscripcion
          movimiento={{ ...movimientoActual, carpeta_nombre: carpetaSeleccionada?.nombre }}
          transcripcion={formData.transcripcion}
          onClose={() => setShowPrintTranscripcion(false)}
        />,
        document.body
      )}

      {showAsignarModal && movimientoActual && createPortal(
        <AsignarResponsableModal
          movimiento={movimientoActual}
          onClose={() => setShowAsignarModal(false)}
          onAsignado={async () => {
            try { setMovimientoActual((await api.get(`/movimientos/${movimientoActual.id}/`)).data); }
            catch { /* silencioso */ }
          }}
        />,
        document.body
      )}
    </>
  );
};

export default MovimientoForm;
