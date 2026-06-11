import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, FolderOpen, ListTodo } from 'lucide-react';
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setLoadingStats(true);
    api.get('/movimientos/dashboard_stats/')
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
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

    </div>
  );
};

export default Dashboard;
