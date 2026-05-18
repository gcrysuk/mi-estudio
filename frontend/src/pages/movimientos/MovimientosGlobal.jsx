import { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import MovimientoForm from './MovimientoForm';
import MovimientosTable from '../../components/movimientos/MovimientosTable';

const MovimientosGlobal = () => {
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [refreshKey, setRefreshKey]     = useState(0);

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

      <MovimientosTable
        baseFetchUrl="/movimientos/"
        baseParams={{}}
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
