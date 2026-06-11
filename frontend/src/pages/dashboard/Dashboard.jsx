import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, FolderOpen, ListTodo, Scale, FileText, Archive } from 'lucide-react';
import api from '../../services/api';

const SkeletonCard = () => (
  <div className="rounded-2xl shadow-lg p-6 bg-gray-200 dark:bg-gray-700 animate-pulse h-36" />
);

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

const MEV_CARDS = [
  {
    key: 'a_despacho_90',
    label: 'A DESPACHO +90 DÍAS',
    sub: 'sin cambio de estado en la MEV',
    icon: Scale,
    gradient: 'from-violet-500 to-purple-600',
    to: '/carpetas?mev_estado=A+Despacho',
  },
  {
    key: 'en_letra_90',
    label: 'EN LETRA +90 DÍAS',
    sub: 'sin cambio de estado en la MEV',
    icon: FileText,
    gradient: 'from-orange-500 to-rose-500',
    to: '/carpetas?mev_estado=En+Letra',
  },
  {
    key: 'inactivas_3m',
    label: 'CARPETAS INACTIVAS +3 MESES',
    sub: 'sin movimientos de ningún tipo',
    icon: Archive,
    gradient: 'from-slate-500 to-gray-600',
    to: '/carpetas',
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [mevStats, setMevStats] = useState(null);
  const [loadingMev, setLoadingMev] = useState(true);

  useEffect(() => {
    setLoadingStats(true);
    api.get('/movimientos/dashboard_stats/')
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));

    setLoadingMev(true);
    api.get('/carpetas/mev_stats/')
      .then(res => setMevStats(res.data))
      .catch(() => {})
      .finally(() => setLoadingMev(false));
  }, []);

  const handleCardClick = (to) => {
    localStorage.removeItem('movimientos_busqueda');
    localStorage.removeItem("movimientos_busqueda");
    localStorage.removeItem("movimientos_ordering");
    localStorage.removeItem('movimientos_filtro_tipo');
    localStorage.removeItem('movimientos_filtro_estado');
    localStorage.removeItem('movimientos_filtro_vencimiento');
    localStorage.removeItem('movimientos_filtro_responsable');
    localStorage.removeItem('movimientos_filtro_creado_por');
    localStorage.removeItem('movimientos_filtro_modificado_por');
    localStorage.removeItem('movimientos_filtro_complejidad');
    navigate(to);
  };

  return (
    <div className="space-y-8 p-4">
      <h1 className="text-2xl font-bold uppercase">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {CARDS.map(({ key, label, sub, icon: Icon, gradient, to }) => (
          loadingStats ? (
            <SkeletonCard key={key} />
          ) : (
            <button
              key={key}
              onClick={() => handleCardClick(to)}
              className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-lg p-4 sm:p-6 text-white text-left cursor-pointer hover:scale-105 transition-transform duration-200 focus:outline-none`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-90">{label}</p>
                  <p className="text-3xl sm:text-5xl font-bold leading-none">{stats?.[key] ?? 0}</p>
                  <p className="text-sm opacity-80">{sub}</p>
                </div>
                <Icon size={40} className="opacity-20 flex-shrink-0" />
              </div>
            </button>
          )
        ))}
      </div>

      {/* MEV grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">MEV</h2>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-3">
          {MEV_CARDS.map(({ key, label, sub, icon: Icon, gradient, to }) => (
            loadingMev ? (
              <SkeletonCard key={key} />
            ) : (
              <button
                key={key}
                onClick={() => handleCardClick(to)}
                className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-lg p-4 sm:p-6 text-white text-left cursor-pointer hover:scale-105 transition-transform duration-200 focus:outline-none`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-90">{label}</p>
                    <p className="text-3xl sm:text-5xl font-bold leading-none">{mevStats?.[key] ?? 0}</p>
                    <p className="text-sm opacity-80">{sub}</p>
                  </div>
                  <Icon size={40} className="opacity-20 flex-shrink-0" />
                </div>
              </button>
            )
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
