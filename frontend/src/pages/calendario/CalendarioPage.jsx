import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, RefreshCw,
  Link2, Unlink2, AlertCircle, ExternalLink, Edit2, X, Save,
} from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  parseISO, isToday, addMonths, subMonths, isBefore,
} from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../services/api';
import toast from 'react-hot-toast';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar';
const GCAL_API = 'https://www.googleapis.com/calendar/v3';
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TZ = 'America/Argentina/Buenos_Aires';

const LEGEND = [
  { color: 'bg-yellow-500', label: 'Vencimiento' },
  { color: 'bg-orange-400', label: 'Vence pronto' },
  { color: 'bg-red-500', label: 'Vencido' },
  { color: 'bg-green-500', label: 'Google Calendar' },
];

const eventColor = (type) => {
  switch (type) {
    case 'vencimiento_vencido': return 'bg-red-500';
    case 'vencimiento_proximo': return 'bg-orange-400';
    case 'vencimiento': return 'bg-yellow-500';
    case 'google': return 'bg-green-500';
    default: return 'bg-blue-500';
  }
};

const CalendarioPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [appEvents, setAppEvents] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // {id, titulo, carpeta, fechaActual}
  const [editingFecha, setEditingFecha] = useState('');
  const [savingFecha, setSavingFecha] = useState(false);

  const tokenClientRef = useRef(null);
  const accessTokenRef = useRef(null);

  // ── Google Identity Services ──────────────────────────────────────────────

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) { initGoogleAuth(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initGoogleAuth;
    document.head.appendChild(script);
  }, []);

  const initGoogleAuth = () => {
    if (!window.google?.accounts?.oauth2) return;
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (resp) => {
        setGoogleLoading(false);
        if (resp.error) {
          toast.error('Error al conectar con Google Calendar');
          return;
        }
        accessTokenRef.current = resp.access_token;
        setGoogleConnected(true);
        toast.success('Google Calendar conectado');
      },
    });
  };

  // Fetch Google events when connected or month changes
  useEffect(() => {
    if (googleConnected && accessTokenRef.current) {
      fetchGoogleEvents();
    }
  }, [googleConnected, currentDate]);

  const fetchGoogleEvents = async () => {
    const token = accessTokenRef.current;
    if (!token) return;
    try {
      const start = startOfMonth(currentDate).toISOString();
      const end = endOfMonth(currentDate).toISOString();
      const url =
        `${GCAL_API}/calendars/primary/events` +
        `?timeMin=${encodeURIComponent(start)}` +
        `&timeMax=${encodeURIComponent(end)}` +
        `&singleEvents=true&orderBy=startTime`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        setGoogleConnected(false);
        accessTokenRef.current = null;
        toast.error('Sesión de Google expirada. Volvé a conectar.');
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setGoogleEvents(
        (data.items || []).map(item => ({
          id: `gcal-${item.id}`,
          title: item.summary || '(Sin título)',
          date: parseISO(item.start?.dateTime || item.start?.date),
          type: 'google',
          descripcion: item.description || '',
          link: item.htmlLink,
          source: 'google',
        })),
      );
    } catch {
      toast.error('Error al cargar eventos de Google Calendar');
    }
  };

  const handleGoogleConnect = () => {
    if (!GOOGLE_CLIENT_ID) return;
    if (googleConnected) {
      window.google?.accounts.oauth2.revoke(accessTokenRef.current, () => {});
      accessTokenRef.current = null;
      setGoogleConnected(false);
      setGoogleEvents([]);
      toast('Google Calendar desconectado');
      return;
    }
    setGoogleLoading(true);
    tokenClientRef.current?.requestAccessToken();
  };

  // ── Sync app vencimientos → Google Calendar ───────────────────────────────

  const syncToGoogle = async () => {
    const token = accessTokenRef.current;
    if (!token) return;
    setSyncing(true);
    try {
      const vencimientos = appEvents.filter(e => e.type.startsWith('vencimiento'));
      for (const ev of vencimientos) {
        const body = {
          summary: `[MI ESTUDIO] ${ev.title}`,
          description: [ev.descripcion, ev.carpeta ? `Carpeta: ${ev.carpeta}` : '']
            .filter(Boolean).join('\n'),
          start: { dateTime: ev.date.toISOString(), timeZone: TZ },
          end: {
            dateTime: new Date(ev.date.getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: TZ,
          },
          reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
          extendedProperties: { private: { miEstudioId: ev.id } },
        };
        await fetch(`${GCAL_API}/calendars/primary/events`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      toast.success(`${vencimientos.length} vencimiento(s) enviados a Google Calendar`);
      await fetchGoogleEvents();
    } catch {
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  // ── App events from /movimientos/ ─────────────────────────────────────────

  useEffect(() => {
    fetchAppEvents();
  }, [currentDate]);

  const fetchAppEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/movimientos/');
      const movimientos = res.data.results || res.data;
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const events = [];

      movimientos.forEach(mov => {
        if (mov.fecha_vencimiento) {
          const d = parseISO(mov.fecha_vencimiento);
          let type = 'vencimiento';
          if (mov.vencido || isBefore(d, now)) type = 'vencimiento_vencido';
          else if (isBefore(d, in7)) type = 'vencimiento_proximo';
          events.push({
            id: `venc-${mov.id}`,
            movimientoId: mov.id,
            title: `Vence: ${mov.titulo}`,
            date: d,
            type,
            carpeta: mov.carpeta_nombre,
            descripcion: mov.descripcion,
            source: 'app',
          });
        }
      });

      setAppEvents(events);
    } catch {
      toast.error('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  // ── Editar vencimiento ────────────────────────────────────────────────────

  const abrirEditModal = (ev) => {
    setEditingEvent({ id: ev.movimientoId, titulo: ev.title, carpeta: ev.carpeta, fechaActual: ev.date });
    setEditingFecha(ev.date.toISOString().slice(0, 16));
  };

  const handleGuardarVencimiento = async () => {
    if (!editingFecha || !editingEvent) return;
    setSavingFecha(true);
    try {
      await api.patch(`/movimientos/${editingEvent.id}/`, {
        fecha_vencimiento: new Date(editingFecha).toISOString(),
      });
      toast.success('Fecha de vencimiento actualizada');
      setEditingEvent(null);
      fetchAppEvents();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingFecha(false);
    }
  };

  // ── Calendar grid ─────────────────────────────────────────────────────────

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const allEvents = [...appEvents, ...googleEvents];
  const eventsForDay = (day) => allEvents.filter(e => isSameDay(e.date, day));
  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold uppercase flex items-center gap-2">
          <Calendar className="text-accent" size={24} />
          CALENDARIO
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          {!GOOGLE_CLIENT_ID ? (
            <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertCircle size={14} />
              Configurá VITE_GOOGLE_CLIENT_ID en .env para sincronizar
            </span>
          ) : (
            <>
              {googleConnected && (
                <button
                  onClick={syncToGoogle}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
                >
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
              )}
              <button
                onClick={handleGoogleConnect}
                disabled={googleLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                {googleConnected ? <Unlink2 size={13} /> : <Link2 size={13} />}
                {googleLoading
                  ? 'Conectando...'
                  : googleConnected
                  ? 'Desconectar Google'
                  : 'Conectar Google Calendar'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 flex-wrap lg:flex-nowrap">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0 bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setCurrentDate(d => subMonths(d, 1))}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold capitalize text-sm">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </span>
            <button
              onClick={() => setCurrentDate(d => addMonths(d, 1))}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {DIAS.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Cargando...</div>
          ) : (
            <div className="grid grid-cols-7">
              {days.map(day => {
                const dayEvs = eventsForDay(day);
                const inMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDay && isSameDay(day, selectedDay);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`min-h-[72px] p-1.5 text-left border-b border-r border-gray-100 dark:border-gray-800 transition-colors ${
                      isSelected
                        ? 'bg-accent/10 dark:bg-accent/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                    } ${!inMonth ? 'opacity-35' : ''}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-[11px] rounded-full mb-0.5 ${
                        isToday(day)
                          ? 'bg-accent text-white font-bold'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvs.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          className={`${eventColor(ev.type)} rounded text-white text-[10px] px-1 py-0.5 truncate leading-tight`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvs.length > 3 && (
                        <div className="text-[10px] text-gray-500 pl-0.5">
                          +{dayEvs.length - 3} más
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3">
            {LEGEND.map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1 text-[11px] text-gray-500">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-full lg:w-72 bg-white dark:bg-dark-surface rounded-lg shadow flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="font-semibold text-sm">
              {selectedDay
                ? format(selectedDay, "EEEE d 'de' MMMM", { locale: es })
                : 'Seleccioná un día'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[480px]">
            {!selectedDay ? (
              <p className="text-xs text-gray-400 text-center py-6">
                Hacé clic en un día para ver sus eventos
              </p>
            ) : selectedEvents.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                Sin eventos para este día
              </p>
            ) : (
              selectedEvents.map(ev => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${eventColor(ev.type)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-snug">{ev.title}</p>
                      {ev.carpeta && (
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                          📁 {ev.carpeta}
                        </p>
                      )}
                      {ev.descripcion && (
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                          {ev.descripcion}
                        </p>
                      )}
                      {ev.link && (
                        <a
                          href={ev.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] text-accent hover:underline mt-0.5"
                        >
                          <ExternalLink size={10} />
                          Ver en Google Calendar
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      <span className="text-[10px] text-gray-400">
                        {format(ev.date, 'HH:mm')}
                      </span>
                      {ev.type.startsWith('vencimiento') && ev.source === 'app' && (
                        <button
                          onClick={() => abrirEditModal(ev)}
                          className="p-0.5 text-gray-400 hover:text-accent transition-colors"
                          title="Editar fecha de vencimiento"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mini-modal: editar fecha de vencimiento */}
      {editingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setEditingEvent(null)}
        >
          <div
            className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{editingEvent.titulo}</p>
                {editingEvent.carpeta && (
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">📁 {editingEvent.carpeta}</p>
                )}
              </div>
              <button
                onClick={() => setEditingEvent(null)}
                className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-gray-500">
                Nueva fecha de vencimiento
              </label>
              <input
                type="datetime-local"
                value={editingFecha}
                onChange={e => setEditingFecha(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setEditingEvent(null)}
                className="px-4 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarVencimiento}
                disabled={savingFecha || !editingFecha}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold disabled:opacity-60 transition-colors"
              >
                <Save size={12} />
                {savingFecha ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioPage;
