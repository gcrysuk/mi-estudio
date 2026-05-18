import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, FileText, ArrowLeft, AlertCircle, Clock } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MovimientoForm from './MovimientoForm';
import MovimientosTable from '../../components/movimientos/MovimientosTable';

const MovimientosList = () => {
  const { carpetaId } = useParams();
  const [carpeta, setCarpeta]       = useState(null);
  const [filtro, setFiltro]         = useState('todos');
  const [modalOpen, setModalOpen]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!carpetaId) { toast.error('ID de carpeta no válido'); return; }
    api.get(`/carpetas/${carpetaId}/`)
      .then((r) => setCarpeta(r.data))
      .catch(() => toast.error('Error al cargar la carpeta'));
  }, [carpetaId]);

  if (!carpetaId) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p className="text-gray-600">No se especificó una carpeta válida</p>
        <Link to="/carpetas" className="mt-4 inline-block text-accent hover:underline">
          Volver a carpetas
        </Link>
      </div>
    );
  }

  const getFetchUrl = () => {
    if (filtro === 'vencidos') return '/movimientos/vencidos/';
    if (filtro === 'proximos') return '/movimientos/proximos_vencer/';
    return '/movimientos/';
  };

  const getBaseParams = () => {
    const params = { carpeta: carpetaId };
    if (filtro === 'proximos') params.dias = 7;
    return params;
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/carpetas" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold uppercase flex items-center gap-2">
            <FileText className="text-accent" size={24} />
            MOVIMIENTOS
          </h1>
          {carpeta && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{carpeta.nombre}</p>
          )}
        </div>
      </div>

      {/* Filtros backend + botón nuevo */}
      <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow flex flex-wrap gap-4 justify-between">
        <div className="flex gap-2">
          {[
            { key: 'todos',    label: 'Todos' },
            { key: 'proximos', label: 'Próximos 7 días', icon: Clock },
            { key: 'vencidos', label: 'Vencidos',        icon: AlertCircle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`px-3 py-1.5 rounded-lg text-xs uppercase flex items-center gap-1 ${
                filtro === key
                  ? key === 'vencidos' ? 'bg-red-500 text-white' : 'bg-accent text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
              }`}
            >
              {Icon && <Icon size={14} />} {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 uppercase text-xs"
        >
          <Plus size={16} /> NUEVO MOVIMIENTO
        </button>
      </div>

      <MovimientosTable
        baseFetchUrl={getFetchUrl()}
        baseParams={getBaseParams()}
        showCarpetaColumn={false}
        emptyMessage="No hay movimientos para esta carpeta"
        refreshKey={refreshKey}
      />

      {modalOpen && (
        <MovimientoForm
          carpetaId={carpetaId}
          onClose={() => setModalOpen(false)}
          onSave={() => { setModalOpen(false); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
};

export default MovimientosList;
