import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus, X, Printer } from 'lucide-react';
import MovimientoForm from './MovimientoForm';
import ReporteMovimientos from '../../components/print/ReporteMovimientos';
import MovimientosTable from '../../components/movimientos/MovimientosTable';

const FILTROS = [
  { key: 'todos',         label: 'Todos',           url: '/movimientos/', params: {},                          color: 'accent' },
  { key: 'vencidos_hoy',  label: 'Vencen hoy',      url: '/movimientos/', params: { vence_hoy: true },         color: 'red' },
  { key: 'proximos',      label: 'Próximos 7 días',  url: '/movimientos/', params: { proximos_dias: 7 },        color: 'accent' },
  { key: 'vencidos',      label: 'Vencidos',         url: '/movimientos/', params: { vencido: 'true' },         color: 'red' },
  { key: 'pendientes',    label: 'Pendientes',       url: '/movimientos/', params: { estado_nombre: 'Pendiente' }, color: 'accent' },
];

const MovimientosGlobal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [filtro, setFiltro] = useState(() => {
    const param = searchParams.get('filtro');
    return FILTROS.find(f => f.key === param)?.key ?? 'todos';
  });

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [refreshKey, setRefreshKey]     = useState(0);
  const [showReporte, setShowReporte]   = useState(false);

  useEffect(() => {
    const param = searchParams.get("filtro");
    const key = FILTROS.find(f => f.key === param)?.key ?? "todos";
    setFiltro(key);
  }, [searchParams]);

  useEffect(() => {
    let lastSync = Date.now()
    const interval = setInterval(() => {
      if (window._mev_last_sync && window._mev_last_sync > lastSync) {
        lastSync = window._mev_last_sync
        setRefreshKey(k => k + 1)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const activeFiltro = FILTROS.find(f => f.key === filtro) ?? FILTROS[0];

  const handleFiltro = (key) => {
    setFiltro(key);
    if (key === 'todos') {
      navigate('/movimientos', { replace: true });
    } else {
      navigate(`/movimientos?filtro=${key}`, { replace: true });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-accent" size={22} />
          <h1 className="text-xl font-bold uppercase">Movimientos</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowReporte(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 uppercase transition-colors"
          >
            <Printer size={14} /> Imprimir lista
          </button>
          <button
            onClick={() => setNewModalOpen(true)}
            className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 uppercase text-xs"
          >
            <Plus size={16} /> NUEVO MOVIMIENTO
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-dark-surface p-3 rounded-lg shadow flex flex-wrap gap-2 items-center">
        {FILTROS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => handleFiltro(key)}
            className={`px-3 py-1.5 rounded-lg text-xs uppercase font-medium transition-colors ${
              filtro === key
                ? color === 'red'
                  ? 'bg-red-500 text-white'
                  : 'bg-accent text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}

        {filtro !== 'todos' && (
          <button
            onClick={() => handleFiltro('todos')}
            className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
          >
            <X size={13} /> Limpiar filtro
          </button>
        )}
      </div>

      {/* Active filter badge */}
      {filtro !== 'todos' && (
        <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
          Mostrando:{' '}
          <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
            {activeFiltro.label}
          </span>
        </p>
      )}

      <MovimientosTable
        baseFetchUrl={activeFiltro.url}
        baseParams={activeFiltro.params}
        showCarpetaColumn={true}
        refreshKey={refreshKey}
        onClearTabFilter={() => handleFiltro('todos')}
      />

      {newModalOpen && (
        <MovimientoForm
          onClose={() => setNewModalOpen(false)}
          onSave={() => { setNewModalOpen(false); setRefreshKey((k) => k + 1); }}
        />
      )}

      {showReporte && (
        <ReporteMovimientos
          filtros={filtro !== 'todos' ? { filtro } : {}}
          filtroLabel={activeFiltro.label}
          onClose={() => setShowReporte(false)}
        />
      )}
    </div>
  );
};

export default MovimientosGlobal;
