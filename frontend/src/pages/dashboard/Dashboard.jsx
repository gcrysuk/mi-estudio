import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, FolderOpen, ListTodo, ChevronRight, CalendarClock } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../services/api';

const SkeletonCard = () => (
  <div className="rounded-2xl shadow-lg p-6 bg-gray-200 dark:bg-gray-700 animate-pulse h-36" />
);

const SkeletonRow = () => (
  <div className="h-12 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />
);

const urgencyClasses = (fechaStr) => {
  const days = differenceInDays(parseISO(fechaStr), new Date());
  if (days <= 0) return 'text-red-600 dark:text-red-400 font-semibold';
  if (days <= 2) return 'text-orange-500 dark:text-orange-400 font-semibold';
  if (days <= 6) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-gray-500 dark:text-gray-400';
};

const urgencyDotClass = (fechaStr) => {
  const days = differenceInDays(parseISO(fechaStr), new Date());
  if (days <= 0) return 'bg-red-500';
  if (days <= 2) return 'bg-orange-400';
  if (days <= 6) return 'bg-yellow-400';
  return 'bg-green-400';
};

const CARDS = [
  {
    key: 'vencen_hoy',
    label: 'VENCEN HOY',
    sub: 'movimientos con vencimiento hoy',
    icon: AlertCircle,
    gradient: 'from-red-500 to-orange-500',
    to: '/movimientos?filtro=vencidos_hoy',
  },
  {
    key: 'vencen_semana',
    label: 'VENCEN ESTA SEMANA',
    sub: 'próximos 7 días',
    icon: Clock,
    gradient: 'from-yellow-400 to-amber-500',
    to: '/movimientos?filtro=proximos',
  },
  {
    key: 'carpetas_activas',
    label: 'CARPETAS ACTIVAS',
    sub: 'carpetas en curso',
    icon: FolderOpen,
    gradient: 'from-green-500 to-emerald-600',
    to: '/carpetas?estado_nombre=activa',
  },
  {
    key: 'pendientes',
    label: 'PENDIENTES',
    sub: 'movimientos en estado pendiente',
    icon: ListTodo,
    gradient: 'from-blue-500 to-cyan-500',
    to: '/movimientos?filtro=pendientes',
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [proximos, setProximos] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingProximos, setLoadingProximos] = useState(true);

  useEffect(() => {
    api.get('/movimientos/dashboard_stats/')
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));

    api.get('/movimientos/proximos_vencer/', { params: { dias: 30, page_size: 5 } })
      .then(res => setProximos(res.data.results ?? res.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingProximos(false));
  }, []);

  return (
    <div className="space-y-8 p-4">
      <h1 className="text-2xl font-bold uppercase">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CARDS.map(({ key, label, sub, icon: Icon, gradient, to }) => (
          loadingStats ? (
            <SkeletonCard key={key} />
          ) : (
            <button
              key={key}
              onClick={() => navigate(to)}
              className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-lg p-6 text-white text-left cursor-pointer hover:scale-105 transition-transform duration-200 focus:outline-none`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-90">{label}</p>
                  <p className="text-5xl font-bold leading-none">{stats?.[key] ?? 0}</p>
                  <p className="text-sm opacity-80">{sub}</p>
                </div>
                <Icon size={40} className="opacity-20 flex-shrink-0" />
              </div>
            </button>
          )
        ))}
      </div>

      {/* Próximos vencimientos */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <CalendarClock size={18} className="text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wide">Próximos vencimientos</h2>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {loadingProximos ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : proximos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              No hay vencimientos en los próximos 30 días
            </p>
          ) : (
            proximos.map(mov => (
              <button
                key={mov.id}
                onClick={() => navigate(`/carpetas/${mov.carpeta}`)}
                className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${urgencyDotClass(mov.fecha_vencimiento)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{mov.titulo}</p>
                  {mov.carpeta_nombre && (
                    <p className="text-[11px] text-gray-500 truncate">📁 {mov.carpeta_nombre}</p>
                  )}
                </div>
                <span className={`text-xs flex-shrink-0 ${urgencyClasses(mov.fecha_vencimiento)}`}>
                  {format(parseISO(mov.fecha_vencimiento), "d MMM yyyy", { locale: es })}
                </span>
                <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
