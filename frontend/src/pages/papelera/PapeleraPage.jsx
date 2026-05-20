import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, AlertTriangle, FolderOpen, ClipboardList, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const TABS = [
  { key: 'carpetas',    label: 'Carpetas',    icon: FolderOpen },
  { key: 'movimientos', label: 'Movimientos', icon: ClipboardList },
  { key: 'personas',    label: 'Personas',    icon: Users },
];

const fmt = (fecha) =>
  fecha
    ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

const ENDPOINTS = {
  carpetas:    { list: '/carpetas/papelera/',    restaurar: (id) => `/carpetas/${id}/restaurar/`,    eliminar: (id) => `/carpetas/${id}/eliminar_definitivo/` },
  movimientos: { list: '/movimientos/papelera/', restaurar: (id) => `/movimientos/${id}/restaurar/`, eliminar: (id) => `/movimientos/${id}/eliminar_definitivo/` },
  personas:    { list: '/personas/papelera/',    restaurar: (id) => `/personas/${id}/restaurar/`,    eliminar: (id) => `/personas/${id}/eliminar_definitivo/` },
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
    <Trash2 size={48} strokeWidth={1.2} />
    <p className="text-sm">Esta sección está vacía</p>
  </div>
);

const ActionButtons = ({ id, label, onRestaurar, onEliminar, procesando }) => (
  <div className="flex justify-end gap-2">
    <button
      onClick={() => onRestaurar(id)}
      disabled={procesando === id}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50"
    >
      <RotateCcw size={12} /> RESTAURAR
    </button>
    <button
      onClick={() => onEliminar(id, label)}
      disabled={procesando === id}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
    >
      <Trash2 size={12} /> ELIMINAR
    </button>
  </div>
);

const PapeleraPage = () => {
  const [activeTab, setActiveTab]       = useState('carpetas');
  const [data, setData]                 = useState({ carpetas: [], movimientos: [], personas: [] });
  const [loading, setLoading]           = useState({ carpetas: false, movimientos: false, personas: false });
  const [procesando, setProcesando]     = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null); // { tipo, id, nombre }
  const [confirmVaciar, setConfirmVaciar]     = useState(false);

  const fetchTab = useCallback(async (tab) => {
    setLoading((prev) => ({ ...prev, [tab]: true }));
    try {
      const res = await api.get(ENDPOINTS[tab].list);
      setData((prev) => ({ ...prev, [tab]: res.data.results ?? res.data ?? [] }));
    } catch {
      toast.error(`Error al cargar ${tab}`);
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, []);

  useEffect(() => {
    TABS.forEach(({ key }) => fetchTab(key));
  }, [fetchTab]);

  const handleRestaurar = async (tab, id) => {
    setProcesando(id);
    try {
      await api.post(ENDPOINTS[tab].restaurar(id));
      toast.success('Elemento restaurado');
      fetchTab(tab);
    } catch {
      toast.error('Error al restaurar');
    } finally {
      setProcesando(null);
    }
  };

  const handleEliminarDefinitivo = async () => {
    if (!confirmEliminar) return;
    const { tipo, id } = confirmEliminar;
    setProcesando(id);
    try {
      await api.delete(ENDPOINTS[tipo].eliminar(id));
      setConfirmEliminar(null);
      toast.success('Eliminado definitivamente');
      fetchTab(tipo);
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setProcesando(null);
    }
  };

  const handleVaciar = async () => {
    const items = data[activeTab];
    setConfirmVaciar(false);
    let errores = 0;
    for (const item of items) {
      try {
        await api.delete(ENDPOINTS[activeTab].eliminar(item.id));
      } catch {
        errores++;
      }
    }
    if (errores === 0) {
      toast.success(`${TABS.find(t => t.key === activeTab)?.label} vaciada`);
    } else {
      toast.error(`${errores} elemento(s) no se pudieron eliminar`);
    }
    fetchTab(activeTab);
  };

  const activeItems = data[activeTab];
  const activeLoading = loading[activeTab];

  const renderTable = () => {
    if (activeLoading) return <p className="px-4 py-6 text-center text-xs text-gray-500">Cargando...</p>;
    if (activeItems.length === 0) return <EmptyState />;

    if (activeTab === 'carpetas') return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">NOMBRE</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">FECHA ELIM.</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">N° EXPEDIENTE</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">CLIENTE</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {activeItems.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-3 py-2 text-sm font-medium">{c.nombre}</td>
                <td className="px-3 py-2 text-xs">{fmt(c.fecha_eliminacion)}</td>
                <td className="px-3 py-2 text-xs">{c.numero_expediente || '—'}</td>
                <td className="px-3 py-2 text-xs">{c.persona_nombre || '—'}</td>
                <td className="px-3 py-2">
                  <ActionButtons
                    id={c.id} label={c.nombre} procesando={procesando}
                    onRestaurar={(id) => handleRestaurar('carpetas', id)}
                    onEliminar={(id, nombre) => setConfirmEliminar({ tipo: 'carpetas', id, nombre })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    if (activeTab === 'movimientos') return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">TÍTULO</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">CARPETA</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">FECHA ELIM.</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {activeItems.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-3 py-2 text-sm font-medium">{m.titulo}</td>
                <td className="px-3 py-2 text-xs">{m.carpeta_nombre || '—'}</td>
                <td className="px-3 py-2 text-xs">{fmt(m.fecha_eliminacion)}</td>
                <td className="px-3 py-2">
                  <ActionButtons
                    id={m.id} label={m.titulo} procesando={procesando}
                    onRestaurar={(id) => handleRestaurar('movimientos', id)}
                    onEliminar={(id, nombre) => setConfirmEliminar({ tipo: 'movimientos', id, nombre })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    if (activeTab === 'personas') return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">NOMBRE</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">FECHA ELIM.</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {activeItems.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-3 py-2 text-sm font-medium">{p.apellido}, {p.nombre}</td>
                <td className="px-3 py-2 text-xs">{fmt(p.fecha_eliminacion)}</td>
                <td className="px-3 py-2">
                  <ActionButtons
                    id={p.id} label={`${p.apellido}, ${p.nombre}`} procesando={procesando}
                    onRestaurar={(id) => handleRestaurar('personas', id)}
                    onEliminar={(id, nombre) => setConfirmEliminar({ tipo: 'personas', id, nombre })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const tabLabel = TABS.find((t) => t.key === activeTab)?.label ?? '';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold uppercase flex items-center gap-2">
          <Trash2 className="text-accent" size={20} />
          PAPELERA
        </h1>
        {activeItems.length > 0 && (
          <button
            onClick={() => setConfirmVaciar(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors uppercase"
          >
            <Trash2 size={14} />
            VACIAR {tabLabel.toUpperCase()}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = data[key].length;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium uppercase transition-colors border-b-2 -mb-px ${
                activeTab === key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === key ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
        {renderTable()}
      </div>

      {/* ConfirmDialog - eliminar individual */}
      <ConfirmDialog
        isOpen={!!confirmEliminar}
        title="Eliminar definitivamente"
        message={
          <span>
            <span className="flex items-center gap-1.5 text-red-600 font-semibold mb-2">
              <AlertTriangle size={15} /> Acción irreversible
            </span>
            Esta acción es permanente e irreversible. Se eliminará <strong>"{confirmEliminar?.nombre}"</strong> y no podrá recuperarse.
          </span>
        }
        confirmLabel="SÍ, ELIMINAR"
        onConfirm={handleEliminarDefinitivo}
        onCancel={() => setConfirmEliminar(null)}
      />

      {/* ConfirmDialog - vaciar tab */}
      <ConfirmDialog
        isOpen={confirmVaciar}
        title={`Vaciar ${tabLabel}`}
        message={
          <span>
            <span className="flex items-center gap-1.5 text-red-600 font-semibold mb-2">
              <AlertTriangle size={15} /> Acción irreversible
            </span>
            Se eliminarán definitivamente los <strong>{activeItems.length} elemento(s)</strong> en esta sección. Esta acción no se puede deshacer.
          </span>
        }
        confirmLabel="SÍ, VACIAR TODO"
        onConfirm={handleVaciar}
        onCancel={() => setConfirmVaciar(false)}
      />
    </div>
  );
};

export default PapeleraPage;
