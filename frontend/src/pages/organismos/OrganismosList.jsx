import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  Building2,
  RefreshCw,
  Printer,
} from 'lucide-react';
import ImprimirLista from '../../components/print/ImprimirLista';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useUndo } from '../../hooks/useUndo';
import OrganismoForm from '../../components/organismos/OrganismoForm';

const OrganismosList = () => {
  const [organismos, setOrganismos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrganismo, setEditingOrganismo] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const { pushUndo, undoLast } = useUndo();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (modalOpen) { setModalOpen(false); setEditingOrganismo(null); }
        if (deleteConfirm) setDeleteConfirm(null);
        if (bulkDeleteConfirm) setBulkDeleteConfirm(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalOpen, deleteConfirm, bulkDeleteConfirm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/organismos/');
      setOrganismos(response.data.results || response.data);
      setSelectedItems([]);
      setSelectAll(false);
    } catch {
      toast.error('Error al cargar los organismos');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filtered.map((o) => o.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((i) => i !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleDelete = async (id, nombre) => {
    const eliminado = organismos.find((o) => o.id === id);
    try {
      await api.delete(`/organismos/${id}/`);
      setDeleteConfirm(null);
      fetchData();
      if (eliminado) {
        pushUndo({ entidad: 'organismo', datos: eliminado, restoreFn: async () => { await api.post('/organismos/', eliminado); fetchData(); } });
      }
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">Organismo eliminado</span>
          {eliminado && (
            <button onClick={async () => { await undoLast(); toast.dismiss(t.id); }}
              className="text-xs bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded uppercase">
              DESHACER
            </button>
          )}
        </div>
      ), { duration: 8000 });
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const eliminados = organismos.filter((o) => selectedItems.includes(o.id));
      for (const id of selectedItems) {
        await api.delete(`/organismos/${id}/`);
      }
      setSelectedItems([]);
      setSelectAll(false);
      setBulkDeleteConfirm(false);
      fetchData();
      pushUndo({ entidad: 'organismos', datos: eliminados, restoreFn: async () => { await Promise.all(eliminados.map((o) => api.post('/organismos/', o))); fetchData(); } });
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">{eliminados.length} organismos eliminados</span>
          <button onClick={async () => { await undoLast(); toast.dismiss(t.id); }}
            className="text-xs bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded uppercase">
            DESHACER
          </button>
        </div>
      ), { duration: 10000 });
    } catch {
      toast.error('Error al eliminar algunos organismos');
    } finally {
      setLoading(false);
    }
  };

  const filtered = organismos
    .filter((o) =>
      o.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.provincia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.localidad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.materia_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aVal = a[sortConfig.key] ?? '';
      let bVal = b[sortConfig.key] ?? '';
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc'
      ? <ChevronUp size={14} className="inline ml-1" />
      : <ChevronDown size={14} className="inline ml-1" />;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold uppercase flex items-center gap-2">
          <Building2 className="text-accent" size={20} />
          ORGANISMOS
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          {selectedItems.length > 0 && (
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 uppercase text-xs transition-colors"
            >
              <Trash2 size={16} />
              ELIMINAR ({selectedItems.length})
            </button>
          )}
          <button
            onClick={() => setShowPrint(true)}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center gap-1.5 uppercase text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Printer size={14} /> Imprimir
          </button>
          <button
            onClick={() => { setEditingOrganismo(null); setModalOpen(true); }}
            className="flex-1 sm:flex-none bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 uppercase text-xs transition-colors"
          >
            <Plus size={16} />
            NUEVO ORGANISMO
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white dark:bg-dark-surface p-3 rounded-lg shadow space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="BUSCAR POR NOMBRE, PROVINCIA, LOCALIDAD O MATERIA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-elevated border-none focus:ring-1 focus:ring-accent uppercase text-xs"
            />
          </div>
          <button
            onClick={() => setSearchTerm('')}
            className="px-2 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-1.5 uppercase text-xs"
          >
            <RefreshCw size={14} />
            LIMPIAR
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px]">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider w-8">
                  <input
                    type="checkbox"
                    checked={selectAll && filtered.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-accent focus:ring-accent"
                  />
                </th>
                <th
                  onClick={() => handleSort('nombre')}
                  className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent"
                >
                  NOMBRE <SortIcon columnKey="nombre" />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell">
                  DIRECCIÓN
                </th>
                <th
                  onClick={() => handleSort('provincia')}
                  className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent hidden md:table-cell"
                >
                  PROVINCIA <SortIcon columnKey="provincia" />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider hidden lg:table-cell">
                  LOCALIDAD
                </th>
                <th
                  onClick={() => handleSort('materia_nombre')}
                  className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent hidden lg:table-cell"
                >
                  MATERIA <SortIcon columnKey="materia_nombre" />
                </th>
                <th className="px-2 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-2 py-3 text-center text-xs">Cargando...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-2 py-6 text-center text-gray-500 text-xs">
                    No hay organismos
                  </td>
                </tr>
              ) : (
                filtered.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(org.id)}
                        onChange={() => handleSelectItem(org.id)}
                        className="rounded border-gray-300 text-accent focus:ring-accent"
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium">{org.nombre}</td>
                    <td className="px-2 py-2 text-sm hidden md:table-cell max-w-[180px] truncate">
                      {org.direccion || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm hidden md:table-cell">
                      {org.provincia || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs hidden lg:table-cell">
                      {org.localidad || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap hidden lg:table-cell">
                      {org.materia_nombre ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent font-medium">
                          {org.materia_nombre}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right space-x-1">
                      <button
                        onClick={() => { setEditingOrganismo(org); setModalOpen(true); }}
                        className="p-1 hover:text-accent transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ id: org.id, nombre: org.nombre })}
                        className="p-1 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <OrganismoForm
          organismo={editingOrganismo}
          onClose={() => { setModalOpen(false); setEditingOrganismo(null); }}
          onSave={() => { setModalOpen(false); setEditingOrganismo(null); fetchData(); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Confirmar eliminación"
        message={`¿Eliminar ${deleteConfirm?.nombre}?`}
        onConfirm={() => handleDelete(deleteConfirm.id, deleteConfirm.nombre)}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        title="Confirmar eliminación múltiple"
        message={`¿Eliminar ${selectedItems.length} organismos?`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      {showPrint && (
        <ImprimirLista
          titulo="Listado de Organismos"
          filtros={searchTerm ? `Búsqueda: "${searchTerm}"` : undefined}
          headers={['Nombre', 'Jurisdicción', 'Materia', 'Dirección', 'Localidad', 'Provincia']}
          items={filtered}
          getRow={o => [
            o.nombre,
            o.jurisdiccion || '—',
            o.materia_nombre || '—',
            o.direccion || '—',
            o.localidad || '—',
            o.provincia || '—',
          ]}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
};

export default OrganismosList;
