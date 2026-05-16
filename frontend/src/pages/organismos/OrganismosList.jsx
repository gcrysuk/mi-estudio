import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Building2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useUndo } from '../../hooks/useUndo';

const PROVINCIAS = [
  'Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Ciudad Autónoma de Buenos Aires',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego, Antártida e Islas del Atlántico Sur',
  'Tucumán',
];

const MATERIAS = [
  { value: 'civil_comercial', label: 'Civil y Comercial' },
  { value: 'laboral', label: 'Laboral' },
  { value: 'familia', label: 'Familia' },
  { value: 'penal', label: 'Penal' },
];

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

  const [localidades, setLocalidades] = useState([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const { pushUndo, undoLast } = useUndo();

  const emptyForm = {
    nombre: '',
    direccion: '',
    provincia: '',
    localidad: '',
    materia: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (modalOpen) setModalOpen(false);
        if (deleteConfirm) setDeleteConfirm(null);
        if (bulkDeleteConfirm) setBulkDeleteConfirm(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalOpen, deleteConfirm, bulkDeleteConfirm]);

  useEffect(() => {
    if (formData.provincia) {
      fetchLocalidades(formData.provincia);
    } else {
      setLocalidades([]);
    }
  }, [formData.provincia]);

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

  const fetchLocalidades = async (provincia) => {
    setLoadingLocalidades(true);
    setLocalidades([]);
    try {
      const url = `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(provincia)}&max=5000&campos=nombre`;
      const res = await fetch(url);
      const data = await res.json();
      const nombres = (data.localidades || [])
        .map((l) => l.nombre)
        .sort((a, b) => a.localeCompare(b, 'es'));
      setLocalidades(nombres);
    } catch {
      setLocalidades([]);
    } finally {
      setLoadingLocalidades(false);
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
      o.localidad?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aVal = a[sortConfig.key] ?? '';
      let bVal = b[sortConfig.key] ?? '';
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!formData.direccion.trim()) {
      toast.error('La dirección es obligatoria');
      return;
    }
    try {
      if (editingOrganismo) {
        await api.put(`/organismos/${editingOrganismo.id}/`, formData);
        toast.success('Organismo actualizado');
      } else {
        await api.post('/organismos/', formData);
        toast.success('Organismo creado');
      }
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Error al guardar: ' + (error.response?.data?.detail || 'Verifica los datos'));
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingOrganismo(null);
    setLocalidades([]);
  };

  const openEditModal = (organismo) => {
    setEditingOrganismo(organismo);
    setFormData({
      nombre: organismo.nombre || '',
      direccion: organismo.direccion || '',
      provincia: organismo.provincia || '',
      localidad: organismo.localidad || '',
      materia: organismo.materia || '',
    });
    setModalOpen(true);
  };

  const getMateriaLabel = (value) => MATERIAS.find((m) => m.value === value)?.label || value;

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
            onClick={() => { resetForm(); setModalOpen(true); }}
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
              placeholder="BUSCAR POR NOMBRE, PROVINCIA O LOCALIDAD..."
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
                  onClick={() => handleSort('materia')}
                  className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent hidden lg:table-cell"
                >
                  MATERIA <SortIcon columnKey="materia" />
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
                      {org.materia ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent font-medium">
                          {getMateriaLabel(org.materia)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right space-x-1">
                      <button
                        onClick={() => openEditModal(org)}
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

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
              <h2 className="text-base font-bold uppercase">
                {editingOrganismo ? 'EDITAR ORGANISMO' : 'NUEVO ORGANISMO'}
              </h2>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="p-1 hover:text-accent">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 uppercase">NOMBRE *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value.toUpperCase() })}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 uppercase">DIRECCIÓN *</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 uppercase">PROVINCIA</label>
                <select
                  value={formData.provincia}
                  onChange={(e) =>
                    setFormData({ ...formData, provincia: e.target.value, localidad: '' })
                  }
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                >
                  <option value="">SELECCIONAR PROVINCIA</option>
                  {PROVINCIAS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 uppercase">
                  LOCALIDAD
                  {loadingLocalidades && (
                    <span className="ml-2 text-gray-400 normal-case font-normal">(cargando...)</span>
                  )}
                </label>
                <select
                  value={formData.localidad}
                  onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                  disabled={!formData.provincia || loadingLocalidades}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.provincia
                      ? 'PRIMERO SELECCIONÁ UNA PROVINCIA'
                      : loadingLocalidades
                      ? 'CARGANDO LOCALIDADES...'
                      : 'SELECCIONAR LOCALIDAD'}
                  </option>
                  {localidades.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 uppercase">MATERIA</label>
                <select
                  value={formData.materia}
                  onChange={(e) => setFormData({ ...formData, materia: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                >
                  <option value="">SELECCIONAR MATERIA</option>
                  {MATERIAS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); resetForm(); }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase"
                >
                  {editingOrganismo ? 'ACTUALIZAR' : 'CREAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
    </div>
  );
};

export default OrganismosList;
