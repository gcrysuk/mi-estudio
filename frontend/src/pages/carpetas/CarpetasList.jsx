import { useState, useEffect, useCallback } from 'react';
import Pagination from '../../components/ui/Pagination';
import { useResizableColumns } from '../../hooks/useResizableColumns';

const CL_INITIAL_WIDTHS = {
  nombre: 220, numero_expediente: 140, persona: 150,
  estado: 120, tipo: 120, objeto: 120, organismo: 150, fecha_inicio: 120,
};
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Share2,
  ChevronUp,
  ChevronDown,
  X,
  FolderOpen,
  RefreshCw,
  Eye,
  Printer,
} from 'lucide-react';
import ImprimirLista from '../../components/print/ImprimirLista';
import toast from 'react-hot-toast';
import useAuthStore from '../../stores/authStore';
import api from '../../services/api';
import CompartirCarpetaModal from '../../components/carpetas/CompartirCarpetaModal';
import CarpetaForm from '../../components/carpetas/CarpetaForm';
import { useModal } from '../../contexts/ModalContext';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import DetalleCarpetaModal from '../../components/carpetas/DetalleCarpetaModal';
import ColumnSelector from '../../components/common/ColumnSelector';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const CarpetasList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const estadoNombreParam = searchParams.get('estado_nombre');

  const [carpetas, setCarpetas] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [organismos, setOrganismos] = useState([]);
  const [estados, setEstados] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [objetos, setObjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [count, setCount]         = useState(0);
  const [search, setSearch] = useState('');
  const [diasSinMovimiento, setDiasSinMovimiento] = useState('');
  const [filters, setFilters] = useState({
    estado: '',
    tipo: '',
  });
  // Si hay ?estado_nombre en la URL, esperar a que se resuelva el ID antes del primer fetch
  const [filtersReady, setFiltersReady] = useState(!searchParams.get('estado_nombre'));
  const [ordering, setOrdering] = useState('-fecha_inicio');

  // Maps UI column key → backend ordering field name
  const SORT_FIELD_MAP = {
    nombre:            'nombre',
    numero_expediente: 'numero_expediente',
    persona:           'persona__apellido',
    estado:            'estado__nombre',
    tipo:              'tipo__nombre',
    objeto:            'objeto__nombre',
    organismo:         'organismo__nombre',
    fecha_inicio:      'fecha_inicio',
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [compartirModalOpen, setCompartirModalOpen] = useState(false);
  const [selectedCarpeta, setSelectedCarpeta] = useState(null);
  const [editingCarpeta, setEditingCarpeta] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [carpetaParaDetalle, setCarpetaParaDetalle] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [printData, setPrintData] = useState([]);
  const [loadingPrint, setLoadingPrint] = useState(false);

  // Estado para columnas visibles
  const [visibleColumns, setVisibleColumns] = useState({
    numero_expediente: true,
    cliente: true,
    estado: true,
    tipo: true,
    objeto: true,
    organismo: true,
    fecha: true,
    acciones: true
  });

  // Cargar preferencias guardadas
  useEffect(() => {
    const savedColumns = localStorage.getItem('carpetas_visible_columns');
    if (savedColumns) {
      setVisibleColumns(JSON.parse(savedColumns));
    }
  }, []);

  // Guardar preferencias cuando cambien
  useEffect(() => {
    localStorage.setItem('carpetas_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Configuración de columnas para el selector
  const columnDefinitions = [
    { key: 'numero_expediente', label: 'N° EXPEDIENTE', fixed: false },
    { key: 'cliente', label: 'CLIENTE', fixed: false },
    { key: 'estado', label: 'ESTADO', fixed: false },
    { key: 'tipo', label: 'TIPO', fixed: false },
    { key: 'objeto', label: 'OBJETO', fixed: false },
    { key: 'organismo', label: 'ORGANISMO', fixed: false },
    { key: 'fecha', label: 'FECHA', fixed: false },
    { key: 'acciones', label: 'ACCIONES', fixed: true },
  ];

  const handleToggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const user = useAuthStore(state => state.user);

  const { abrirModalPersona } = useModal();

  const fetchData = useCallback(async (p, ps) => {
    setLoading(true);
    try {
      const params = { page: p, page_size: ps };
      if (search)             params.search = search;
      if (filters.estado)     params.estado = filters.estado;
      if (filters.tipo)       params.tipo   = filters.tipo;
      if (diasSinMovimiento)  params.dias_sin_movimiento = diasSinMovimiento;
      if (ordering)           params.ordering = ordering;

      const response = await api.get('/carpetas/', { params });
      const data = response.data;
      setCarpetas(data.results ?? []);
      setCount(data.count ?? 0);
      setTotalPages(data.total_pages ?? 1);
      setSelectedItems([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching carpetas:', error);
      toast.error('Error al cargar las carpetas');
    } finally {
      setLoading(false);
    }
  }, [filters, search, diasSinMovimiento, ordering]); // eslint-disable-line

  useEffect(() => {
    fetchPersonas();
    fetchOrganismos();
    fetchEstados();
    fetchTipos();
    fetchObjetos();
  }, []);

  // Resolver estado_nombre → ID una vez que cargaron los estados
  useEffect(() => {
    if (!estadoNombreParam || estados.length === 0) return;
    const match = estados.find(
      e => e.nombre.toLowerCase() === estadoNombreParam.toLowerCase()
    );
    if (match) setFilters(prev => ({ ...prev, estado: String(match.id) }));
    setFiltersReady(true);
  }, [estados, estadoNombreParam]); // eslint-disable-line

  // Reset to page 1 and fetch when filters/search change — esperar filtersReady
  useEffect(() => {
    if (!filtersReady) return;
    setPage(1);
    fetchData(1, pageSize);
  }, [filters, search, diasSinMovimiento, pageSize, filtersReady, ordering]); // eslint-disable-line

  // Fetch when page changes (user navigates)
  useEffect(() => {
    fetchData(page, pageSize);
  }, [page]); // eslint-disable-line

  // Manejar tecla ESC para cerrar modales
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (modalOpen) setModalOpen(false);
        if (compartirModalOpen) setCompartirModalOpen(false);
        if (deleteConfirm) setDeleteConfirm(null);
        if (bulkDeleteConfirm) setBulkDeleteConfirm(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [modalOpen, compartirModalOpen, deleteConfirm, bulkDeleteConfirm]);

  const fetchPersonas = async () => {
    try {
      const response = await api.get('/personas/');
      setPersonas(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching personas:', error);
    }
  };

  const fetchOrganismos = async () => {
    try {
      const response = await api.get('/organismos/');
      setOrganismos(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching organismos:', error);
    }
  };

  const fetchEstados = async () => {
    try {
      const response = await api.get('/carpetas/estados/');
      setEstados(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching estados:', error);
      setEstados([
        { id: 1, nombre: 'EN TRÁMITE', color: '#4FC3F7', orden: 1, activo: true },
        { id: 2, nombre: 'RECURSO', color: '#FFA726', orden: 2, activo: true },
        { id: 3, nombre: 'ESPERA', color: '#FF7043', orden: 3, activo: true },
        { id: 4, nombre: 'CERRADO', color: '#9E9E9E', orden: 4, activo: true },
      ]);
    }
  };

  const fetchTipos = async () => {
    try {
      const response = await api.get('/carpetas/tipos/');
      setTipos(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching tipos:', error);
      setTipos([
        { id: 1, nombre: 'EXPEDIENTE JUDICIAL', orden: 1, activo: true },
        { id: 2, nombre: 'ASESORÍA', orden: 2, activo: true },
        { id: 3, nombre: 'PRESUPUESTO', orden: 3, activo: true },
        { id: 4, nombre: 'PROYECTO', orden: 4, activo: true },
        { id: 5, nombre: 'OTRO', orden: 5, activo: true },
      ]);
    }
  };

  const fetchObjetos = async () => {
    try {
      const response = await api.get('/carpetas/objetos/');
      setObjetos(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching objetos:', error);
      setObjetos([
        { id: 1, nombre: 'AMPARO', orden: 1, activo: true },
        { id: 2, nombre: 'ESCRITURACIÓN', orden: 2, activo: true },
        { id: 3, nombre: 'DAÑOS Y PERJUICIOS', orden: 3, activo: true },
        { id: 4, nombre: 'DESALOJO', orden: 4, activo: true },
        { id: 5, nombre: 'ALIMENTOS', orden: 5, activo: true },
      ]);
    }
  };

  const handleSort = (uiKey) => {
    const campo = SORT_FIELD_MAP[uiKey] || uiKey;
    if (ordering === campo) setOrdering(`-${campo}`);
    else if (ordering === `-${campo}`) setOrdering(campo);
    else setOrdering(campo);
  };

  const getPersonaNombre = (personaId) => {
    const persona = personas.find(p => p.id === personaId);
    return persona ? `${persona.apellido}, ${persona.nombre}` : '';
  };

  const getEstadoNombre = (estadoId) => {
    const estado = estados.find(e => e.id === estadoId);
    return estado ? estado.nombre : '';
  };

  const getEstadoColor = (estadoId) => {
    const estado = estados.find(e => e.id === estadoId);
    return estado ? estado.color : '#4FC3F7';
  };

  const getTipoNombre = (tipoId) => {
    const tipo = tipos.find(t => t.id === tipoId);
    return tipo ? tipo.nombre : '';
  };

  const getObjetoNombre = (objetoId) => {
    const objeto = objetos.find(o => o.id === objetoId);
    return objeto ? objeto.nombre : '';
  };

  const getOrganismoNombre = (organismoId) => {
    const organismo = organismos.find(o => o.id === organismoId);
    return organismo ? organismo.nombre : '';
  };

  // Manejar selección de items
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredCarpetas.map(c => c.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  // Ordering is handled by the backend via the `ordering` param
  const filteredCarpetas = carpetas;

  const handleDeleteClick = (carpeta) => {
    if (carpeta.compartida_con_count > 0) {
      toast.error('Debés quitar todos los colaboradores antes de eliminar la carpeta');
      return;
    }
    setDeleteConfirm({ id: carpeta.id, nombre: carpeta.nombre });
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/carpetas/${id}/`);
      setDeleteConfirm(null);
      fetchData(page, pageSize);
      toast.success('Carpeta movida a la papelera');
    } catch (error) {
      console.error('Error deleting carpeta:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    const selectedCount = selectedItems.length;
    try {
      for (const id of selectedItems) {
        await api.delete(`/carpetas/${id}/`);
      }
      setSelectedItems([]);
      setSelectAll(false);
      setBulkDeleteConfirm(false);
      fetchData(page, pageSize);
      toast.success(`${selectedCount} carpetas eliminadas`);
    } catch (error) {
      console.error('Error deleting carpetas:', error);
      toast.error(error.response?.data?.detail || error.response?.data?.error || 'Error al eliminar algunas carpetas');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (carpeta) => {
    setEditingCarpeta(carpeta);
    setModalOpen(true);
  };

  const openCompartirModal = (carpeta) => {
    setSelectedCarpeta(carpeta);
    setCompartirModalOpen(true);
  };

  const openDetalleModal = (carpeta) => {
    setCarpetaParaDetalle(carpeta);
    setDetalleModalOpen(true);
  };

  const handleOpenPrint = async () => {
    setLoadingPrint(true);
    try {
      const params = { page_size: 500 };
      if (search)            params.search = search;
      if (filters.estado)    params.estado = filters.estado;
      if (filters.tipo)      params.tipo   = filters.tipo;
      if (diasSinMovimiento) params.dias_sin_movimiento = diasSinMovimiento;
      const res = await api.get('/carpetas/', { params });
      setPrintData(res.data.results ?? []);
      setShowPrint(true);
    } catch {
      toast.error('Error al cargar datos para impresión');
    } finally {
      setLoadingPrint(false);
    }
  };

  const getEstadoBadge = (estadoId) => {
    const estado = estados.find(e => e.id === estadoId);
    if (!estado) return null;
    return (
      <span 
        className="px-2 py-1 text-xs rounded-full text-white"
        style={{ backgroundColor: estado.color || '#4FC3F7' }}
      >
        {estado.nombre}
      </span>
    );
  };

  const { widths: colWidths, onMouseDown: onColMouseDown } = useResizableColumns(CL_INITIAL_WIDTHS, 'col-widths-carpetas');
  const rh = (key) => (
    <div
      onMouseDown={(e) => { e.stopPropagation(); onColMouseDown(e, key) }}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/40 z-10 select-none"
    />
  );

  const SortIcon = ({ columnKey }) => {
    const campo = SORT_FIELD_MAP[columnKey] || columnKey;
    if (ordering === campo) return <ChevronUp size={14} className="inline ml-1" />;
    if (ordering === `-${campo}`) return <ChevronDown size={14} className="inline ml-1" />;
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold uppercase flex items-center gap-2">
          <FolderOpen className="text-accent" size={20} />
          CARPETAS
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          {selectedItems.length > 0 && (
            <>
              <button
                onClick={() => openCompartirModal({ id: selectedItems, multiple: true })}
                className="flex-1 sm:flex-none bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 uppercase text-xs transition-colors"
              >
                <Share2 size={16} />
                COMPARTIR ({selectedItems.length})
              </button>
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 uppercase text-xs transition-colors"
              >
                <Trash2 size={16} />
                ELIMINAR ({selectedItems.length})
              </button>
            </>
          )}
          <button
            onClick={handleOpenPrint}
            disabled={loadingPrint}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center gap-1.5 uppercase text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <Printer size={14} /> {loadingPrint ? '...' : 'Imprimir'}
          </button>
          <button
            onClick={() => {
              setEditingCarpeta(null);
              setModalOpen(true);
            }}
            className="flex-1 sm:flex-none bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 uppercase text-xs transition-colors"
          >
            <Plus size={16} />
            NUEVA CARPETA
          </button>
        </div>
      </div>

      {/* Badge de filtro activo desde dashboard */}
      {estadoNombreParam && filters.estado && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
          <span>Filtro activo:</span>
          <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium uppercase">
            {estadoNombreParam}
          </span>
          <button
            onClick={() => {
              setFilters({ estado: '', tipo: '' });
              setSearch('');
              navigate('/carpetas', { replace: true });
            }}
            className="flex items-center gap-0.5 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={12} /> Limpiar
          </button>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-dark-surface p-3 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Buscador general */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Buscar en carpetas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-7 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-elevated border-none focus:ring-1 focus:ring-accent text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <select
            value={filters.estado}
            onChange={(e) => setFilters({...filters, estado: e.target.value})}
            className="w-full sm:w-auto px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-elevated border-none focus:ring-1 focus:ring-accent uppercase text-xs"
          >
            <option value="">TODOS LOS ESTADOS</option>
            {estados.map(estado => (
              <option key={estado.id} value={estado.id}>{estado.nombre}</option>
            ))}
          </select>

          <select
            value={filters.tipo}
            onChange={(e) => setFilters({...filters, tipo: e.target.value})}
            className="w-full sm:w-auto px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-elevated border-none focus:ring-1 focus:ring-accent uppercase text-xs"
          >
            <option value="">TODOS LOS TIPOS</option>
            {tipos.map(tipo => (
              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              placeholder="Días sin mov."
              value={diasSinMovimiento}
              onChange={(e) => setDiasSinMovimiento(e.target.value)}
              className="w-32 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
            />
          </div>

          <ColumnSelector
            columns={columnDefinitions}
            visibleColumns={visibleColumns}
            onToggleColumn={handleToggleColumn}
          />

          <button
            onClick={() => {
              setSearch('');
              setDiasSinMovimiento('');
              setFilters({ estado: '', tipo: '' });
              if (estadoNombreParam) navigate('/carpetas', { replace: true });
            }}
            className="w-full sm:w-auto px-2 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-1.5 uppercase text-xs"
          >
            <RefreshCw size={14} />
            LIMPIAR
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider w-8">
                  <input
                    type="checkbox"
                    checked={selectAll && filteredCarpetas.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-accent focus:ring-accent"
                  />
                </th>
                <th onClick={() => handleSort('nombre')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent relative" style={{ width: colWidths.nombre, minWidth: 60 }}>
                  NOMBRE <SortIcon columnKey="nombre" />{rh('nombre')}
                </th>
                {visibleColumns.numero_expediente && (
                  <th onClick={() => handleSort('numero_expediente')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent relative" style={{ width: colWidths.numero_expediente, minWidth: 60 }}>
                    N° EXPEDIENTE <SortIcon columnKey="numero_expediente" />{rh('numero_expediente')}
                  </th>
                )}
                {visibleColumns.cliente && (
                  <th onClick={() => handleSort('persona')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent relative" style={{ width: colWidths.persona, minWidth: 60 }}>
                    CLIENTE <SortIcon columnKey="persona" />{rh('persona')}
                  </th>
                )}
                {visibleColumns.estado && (
                  <th onClick={() => handleSort('estado')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent relative" style={{ width: colWidths.estado, minWidth: 60 }}>
                    ESTADO <SortIcon columnKey="estado" />{rh('estado')}
                  </th>
                )}
                {visibleColumns.tipo && (
                  <th onClick={() => handleSort('tipo')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent relative" style={{ width: colWidths.tipo, minWidth: 60 }}>
                    TIPO <SortIcon columnKey="tipo" />{rh('tipo')}
                  </th>
                )}
                {visibleColumns.objeto && (
                  <th onClick={() => handleSort('objeto')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent relative" style={{ width: colWidths.objeto, minWidth: 60 }}>
                    OBJETO <SortIcon columnKey="objeto" />{rh('objeto')}
                  </th>
                )}
                {visibleColumns.organismo && (
                  <th onClick={() => handleSort('organismo')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent relative" style={{ width: colWidths.organismo, minWidth: 60 }}>
                    ORGANISMO <SortIcon columnKey="organismo" />{rh('organismo')}
                  </th>
                )}
                {visibleColumns.fecha && (
                  <th onClick={() => handleSort('fecha_inicio')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent relative" style={{ width: colWidths.fecha_inicio, minWidth: 60 }}>
                    FECHA <SortIcon columnKey="fecha_inicio" />{rh('fecha_inicio')}
                  </th>
                )}
                {visibleColumns.acciones && (
                  <th className="px-2 py-2 text-right text-xs font-medium uppercase tracking-wider">
                    ACCIONES
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan="10" className="px-2 py-3 text-center text-xs">Cargando...</td></tr>
              ) : filteredCarpetas.length === 0 ? (
                <tr><td colSpan="10" className="px-2 py-6 text-center text-gray-500 text-xs">No hay carpetas</td></tr>
              ) : (
                filteredCarpetas.map(carpeta => (
                  <tr key={carpeta.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(carpeta.id)}
                        onChange={() => handleSelectItem(carpeta.id)}
                        className="rounded border-gray-300 text-accent focus:ring-accent"
                      />
                    </td>

                    <td className="px-2 py-2 text-sm font-medium" style={{ maxWidth: colWidths.nombre, overflow: 'hidden' }}>
                      <Link
                        to={`/carpetas/${carpeta.id}`}
                        className="text-accent hover:text-accent-hover hover:underline truncate block"
                        title={carpeta.nombre}
                      >
                        {carpeta.nombre}
                      </Link>
                    </td>
                    
                    {visibleColumns.numero_expediente && (
                      <td className="px-2 py-2 whitespace-nowrap text-sm">{carpeta.numero_expediente}</td>
                    )}
                    
                    {visibleColumns.cliente && (
                      <td className="px-2 py-2 whitespace-nowrap text-sm">{getPersonaNombre(carpeta.persona)}</td>
                    )}
                    
                    {visibleColumns.estado && (
                      <td className="px-2 py-2 whitespace-nowrap">{getEstadoBadge(carpeta.estado)}</td>
                    )}
                    
                    {visibleColumns.tipo && (
                      <td className="px-2 py-2 whitespace-nowrap uppercase text-xs">{getTipoNombre(carpeta.tipo)}</td>
                    )}
                    
                    {visibleColumns.objeto && (
                      <td className="px-2 py-2 whitespace-nowrap uppercase text-xs">{getObjetoNombre(carpeta.objeto)}</td>
                    )}
                    
                    {visibleColumns.organismo && (
                      <td className="px-2 py-2 whitespace-nowrap uppercase text-xs">{getOrganismoNombre(carpeta.organismo)}</td>
                    )}
                    
                    {visibleColumns.fecha && (
                      <td className="px-2 py-2 whitespace-nowrap text-xs">
                        {new Date(carpeta.fecha_inicio).toLocaleDateString('es-AR')}
                      </td>
                    )}
                    
                    {visibleColumns.acciones && (
                      <td className="px-2 py-2 whitespace-nowrap text-right space-x-1">
                        <button
                          onClick={() => openDetalleModal(carpeta)}
                          className="p-1 hover:text-accent transition-colors"
                          title="Ver detalles"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openEditModal(carpeta)}
                          className="p-1 hover:text-accent transition-colors"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => openCompartirModal(carpeta)}
                          className="p-1 hover:text-blue-500 transition-colors"
                          title="Compartir"
                        >
                          <Share2 size={14} />
                        </button>
                        {(!user || carpeta.propietario === user.id) && (
                          <button
                            onClick={() => handleDeleteClick(carpeta)}
                            className="p-1 hover:text-red-500 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          count={count}
          onPageChange={setPage}
          onPageSizeChange={(ps) => setPageSize(ps)}
        />
      </div>

      {/* Modal de creación/edición */}
      {modalOpen && (
        <CarpetaForm
          carpeta={editingCarpeta}
          onClose={() => { setModalOpen(false); setEditingCarpeta(null); }}
          onSave={() => { setModalOpen(false); setEditingCarpeta(null); fetchData(page, pageSize); }}
        />
      )}

      {/* Modal de compartir */}
      {compartirModalOpen && (
        <CompartirCarpetaModal
          isOpen={compartirModalOpen}
          onClose={() => setCompartirModalOpen(false)}
          carpeta={selectedCarpeta}
          onSave={() => {
            fetchData(page, pageSize);
            toast.success('Carpetas compartidas');
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Confirmar eliminación"
        message={`¿Eliminar la carpeta "${deleteConfirm?.nombre}"?`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        title="Confirmar eliminación múltiple"
        message={`¿Eliminar ${selectedItems.length} carpetas?`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      {/* Modal de detalles */}
      {detalleModalOpen && (
        <DetalleCarpetaModal
          carpeta={carpetaParaDetalle}
          onClose={() => setDetalleModalOpen(false)}
        />
      )}

      {showPrint && (
        <ImprimirLista
          titulo="Listado de Carpetas"
          filtros={[
            search && `Búsqueda: "${search}"`,
            filters.estado && `Estado: ${estados.find(e => String(e.id) === filters.estado)?.nombre}`,
            filters.tipo && `Tipo: ${tipos.find(t => String(t.id) === filters.tipo)?.nombre}`,
            diasSinMovimiento && `Sin mov. > ${diasSinMovimiento} días`,
          ].filter(Boolean).join(' | ') || undefined}
          headers={['Nombre', 'N° Expediente', 'Estado', 'Tipo', 'Propietario', 'Organismo', 'Fecha inicio']}
          items={printData}
          getRow={c => [
            c.nombre,
            c.numero_expediente || '—',
            c.estado_nombre || '—',
            c.tipo_nombre || '—',
            c.propietario_nombre || '—',
            c.organismo_nombre || '—',
            c.fecha_inicio ? new Date(c.fecha_inicio).toLocaleDateString('es-AR') : '—',
          ]}
          onClose={() => setShowPrint(false)}
        />
      )}

    </div>
  );
};

export default CarpetasList;
