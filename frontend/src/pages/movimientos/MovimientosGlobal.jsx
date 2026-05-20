import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus, X } from 'lucide-react';
import MovimientoForm from './MovimientoForm';
import MovimientosTable from '../../components/movimientos/MovimientosTable';

const FILTROS = [
  { key: 'todos',         label: 'Todos',           url: '/movimientos/',              params: {},          color: 'accent' },
  { key: 'vencidos_hoy',  label: 'Vencen hoy',      url: '/movimientos/vencen_hoy/',   params: {},          color: 'red' },
  { key: 'proximos',      label: 'Próximos 7 días',  url: '/movimientos/proximos_vencer/', params: { dias: 7 }, color: 'accent' },
  { key: 'vencidos',      label: 'Vencidos',         url: '/movimientos/vencidos/',     params: {},          color: 'red' },
  { key: 'pendientes',    label: 'Pendientes',       url: '/movimientos/pendientes/',   params: {},          color: 'accent' },
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
        <button
          onClick={() => setNewModalOpen(true)}
          className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 uppercase text-xs"
        >
          <Plus size={16} /> NUEVO MOVIMIENTO
        </button>
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
      />

      {newModalOpen && (
        <MovimientoForm
          onClose={() => setNewModalOpen(false)}
          onSave={() => { setNewModalOpen(false); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
};

export default MovimientosGlobal;
