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
  Filter,
  X,
} from 'lucide-react';
import ImprimirLista from '../../components/print/ImprimirLista';
import { useResizableColumns } from '../../hooks/useResizableColumns';

const OL_INITIAL_WIDTHS = { nombre: 200, direccion: 180, provincia: 130, localidad: 130, materia: 130 };
import toast from 'react-hot-toast';
import api from '../../services/api';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useUndo } from '../../hooks/useUndo';
import OrganismoForm from '../../components/organismos/OrganismoForm';

const OrganismosList = () => {
  const [organismos, setOrganismos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('organismos_busqueda') || '');
  const [sortConfig, setSortConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('organismos_ordering')) || { key: 'nombre', direction: 'asc' }; }
    catch { return { key: 'nombre', direction: 'asc' }; }
  });
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

  useEffect(() => { localStorage.setItem('organismos_busqueda', searchTerm); }, [searchTerm]);
  useEffect(() => { localStorage.setItem('organismos_ordering', JSON.stringify(sortConfig)); }, [sortConfig]);

  const hasActiveFilters = !!searchTerm;

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

  const { widths: colWidths, onMouseDown: onColMouseDown } = useResizableColumns(OL_INITIAL_WIDTHS, 'col-widths-organismos');
  const rh = (key) => (
    <div
      onMouseDown={(e) => { e.stopPropagation(); onColMouseDown(e, key) }}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/40 z-10 select-none"
    />
  );

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
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-accent uppercase text-xs ${searchTerm ? 'bg-accent/10 dark:bg-accent/10 ring-1 ring-accent text-accent' : 'bg-gray-100 dark:bg-dark-elevated'}`}
            />
          </div>
          {hasActiveFilters && (
            <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-yellow-400 text-yellow-900 rounded-lg shadow-sm border border-yellow-500 whitespace-nowrap">
              <Filter size={11} />
              FILTROS ACTIVOS
            </span>
          )}
          <button
            onClick={() => setSearchTerm('')}
            className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 flex items-center gap-1 text-white font-bold text-xs shadow-sm transition-colors"
          >
            <X size={12} />
            LIMPIAR
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-fixed w-full min-w-[650px]">
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
                  className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent relative overflow-hidden"
                  style={{ width: colWidths.nombre, minWidth: 60 }}
                >
                  NOMBRE <SortIcon columnKey="nombre" />{rh('nombre')}
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider overflow-hidden hidden md:table-cell relative" style={{ width: colWidths.direccion, minWidth: 60 }}>
                  DIRECCIÓN{rh('direccion')}
                </th>
                <th
                  onClick={() => handleSort('provincia')}
                  className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent overflow-hidden hidden md:table-cell relative"
                  style={{ width: colWidths.provincia, minWidth: 60 }}
                >
                  PROVINCIA <SortIcon columnKey="provincia" />{rh('provincia')}
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider overflow-hidden hidden lg:table-cell relative" style={{ width: colWidths.localidad, minWidth: 60 }}>
                  LOCALIDAD{rh('localidad')}
                </th>
                <th
                  onClick={() => handleSort('materia_nombre')}
                  className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent overflow-hidden hidden lg:table-cell relative"
                  style={{ width: colWidths.materia, minWidth: 60 }}
                >
                  MATERIA <SortIcon columnKey="materia_nombre" />{rh('materia')}
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
                    <td className="px-2 py-2 whitespace-nowrap overflow-hidden">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(org.id)}
                        onChange={() => handleSelectItem(org.id)}
                        className="rounded border-gray-300 text-accent focus:ring-accent"
                      />
                    </td>
                    <td className="px-2 py-2 text-sm font-medium overflow-hidden" style={{ maxWidth: colWidths.nombre }}>
                      <span className="truncate block" title={org.nombre}>{org.nombre}</span>
                    </td>
                    <td className="px-2 py-2 text-sm hidden md:table-cell truncate overflow-hidden" style={{ maxWidth: colWidths.direccion }} title={org.direccion || undefined}>
                      {org.direccion || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap overflow-hidden text-sm hidden md:table-cell">
                      {org.provincia || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap overflow-hidden text-xs hidden lg:table-cell">
                      {org.localidad || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap overflow-hidden hidden lg:table-cell">
                      {org.materia_nombre ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent font-medium">
                          {org.materia_nombre}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap overflow-hidden text-right space-x-1">
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
