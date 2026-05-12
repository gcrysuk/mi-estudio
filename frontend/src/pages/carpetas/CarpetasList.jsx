import { useState, useEffect } from 'react';
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
  Pencil,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../stores/authStore';
import api from '../../services/api';
import CompartirCarpetaModal from '../../components/carpetas/CompartirCarpetaModal';
import EstadoCarpetaManager from '../../components/carpetas/EstadoCarpetaManager';
import TipoCarpetaManager from '../../components/carpetas/TipoCarpetaManager';
import ObjetoCarpetaManager from '../../components/carpetas/ObjetoCarpetaManager';
import BuscadorPersona from '../../components/buscadores/BuscadorPersona';
import BuscadorOrganismo from '../../components/buscadores/BuscadorOrganismo';
import { useModal } from '../../contexts/ModalContext';
import { Link } from 'react-router-dom';
import DetalleCarpetaModal from '../../components/carpetas/DetalleCarpetaModal';
import ColumnSelector from '../../components/common/ColumnSelector';

const CarpetasList = () => {
  const [carpetas, setCarpetas] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [organismos, setOrganismos] = useState([]);
  const [estados, setEstados] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [objetos, setObjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    estado: '',
    tipo: '',
    persona: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'fecha_inicio',
    direction: 'desc'
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [compartirModalOpen, setCompartirModalOpen] = useState(false);
  const [estadoModalOpen, setEstadoModalOpen] = useState(false);
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [objetoModalOpen, setObjetoModalOpen] = useState(false);
  const [selectedCarpeta, setSelectedCarpeta] = useState(null);
  const [editingCarpeta, setEditingCarpeta] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [carpetaParaDetalle, setCarpetaParaDetalle] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    numero_expediente: '',
    persona: '',
    persona_obj: null,
    parte: 'cliente',
    estado: '',
    tipo: '',
    objeto: '',
    organismo: '',
    descripcion: ''
  });

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

  const resetForm = () => {
    setFormData({
      nombre: '',
      numero_expediente: '',
      persona: '',
      persona_obj: null,
      parte: 'cliente',
      estado: '',
      tipo: '',
      objeto: '',
      organismo: '',
      descripcion: ''
    });
    setEditingCarpeta(null);
  };

  const { abrirModalPersona } = useModal();

  // Opciones para parte
  const parteOptions = [
    { value: 'cliente', label: 'CLIENTE' },
    { value: 'contraparte', label: 'DEMANDADO' },
    { value: 'otro', label: 'OTRO' }
  ];

  useEffect(() => {
    fetchData();
    fetchPersonas();
    fetchOrganismos();
    fetchEstados();
    fetchTipos();
    fetchObjetos();
  }, []);

  // Manejar tecla ESC para cerrar modales
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (modalOpen) setModalOpen(false);
        if (compartirModalOpen) setCompartirModalOpen(false);
        if (estadoModalOpen) setEstadoModalOpen(false);
        if (tipoModalOpen) setTipoModalOpen(false);
        if (objetoModalOpen) setObjetoModalOpen(false);
        if (deleteConfirm) setDeleteConfirm(null);
        if (bulkDeleteConfirm) setBulkDeleteConfirm(false);
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [modalOpen, compartirModalOpen, estadoModalOpen, tipoModalOpen, objetoModalOpen, deleteConfirm, bulkDeleteConfirm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/carpetas/');
      setCarpetas(response.data.results || response.data);
      setSelectedItems([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching carpetas:', error);
      toast.error('Error al cargar las carpetas');
    } finally {
      setLoading(false);
    }
  };

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
      const response = await api.get('/carpetas/organismos/');
      setOrganismos(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching organismos:', error);
      setOrganismos([
        { id: 1, nombre: 'JUZGADO CIVIL N°1' },
        { id: 2, nombre: 'JUZGADO LABORAL N°2' },
        { id: 3, nombre: 'CÁMARA DE APELACIONES' },
      ]);
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

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
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

  // Filtrar y ordenar carpetas
  const filteredCarpetas = carpetas
    .filter(carpeta => {
      const matchesSearch = 
        carpeta.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carpeta.numero_expediente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getPersonaNombre(carpeta.persona).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesEstado = !filters.estado || carpeta.estado === parseInt(filters.estado);
      const matchesTipo = !filters.tipo || carpeta.tipo === parseInt(filters.tipo);
      const matchesPersona = !filters.persona || carpeta.persona === parseInt(filters.persona);
      
      return matchesSearch && matchesEstado && matchesTipo && matchesPersona;
    })
    .sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'persona') {
        aVal = getPersonaNombre(a.persona);
        bVal = getPersonaNombre(b.persona);
      }
      if (sortConfig.key === 'estado') {
        aVal = getEstadoNombre(a.estado);
        bVal = getEstadoNombre(b.estado);
      }
      if (sortConfig.key === 'tipo') {
        aVal = getTipoNombre(a.tipo);
        bVal = getTipoNombre(b.tipo);
      }
      if (sortConfig.key === 'objeto') {
        aVal = getObjetoNombre(a.objeto);
        bVal = getObjetoNombre(b.objeto);
      }
      if (sortConfig.key === 'organismo') {
        aVal = getOrganismoNombre(a.organismo);
        bVal = getOrganismoNombre(b.organismo);
      }
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('📦 formData COMPLETO:', JSON.stringify(formData, null, 2));

    if (!formData.nombre) {
      toast.error('El nombre de la carpeta es obligatorio');
      return;
    }
    
    try {
      const dataToSend = {
        nombre: formData.nombre,
        numero_expediente: formData.numero_expediente || '',
        persona: formData.persona ? parseInt(formData.persona) : null,
        parte: formData.parte,
        estado: formData.estado ? parseInt(formData.estado) : null,
        tipo: formData.tipo ? parseInt(formData.tipo) : null,
        objeto: formData.objeto ? parseInt(formData.objeto) : null,
        organismo: formData.organismo ? parseInt(formData.organismo) : null,
        descripcion: formData.descripcion || ''
      };

      if (editingCarpeta) {
        await api.put(`/carpetas/${editingCarpeta.id}/`, dataToSend);
        toast.success('Carpeta actualizada');
      } else {
        await api.post('/carpetas/', dataToSend);
        toast.success('Carpeta creada');
      }
      
      setModalOpen(false);
      resetForm();
      
      // 🔥 ACTUALIZAR TODO
      await Promise.all([
        fetchData(),
        fetchPersonas()
      ]);
      
    } catch (error) {
      console.error('Error saving carpeta:', error);
      toast.error('Error al guardar: ' + (error.response?.data?.error || 'Verifica los datos'));
    }
  };  

  const handleDelete = async (id, nombre) => {
    try {
      const carpetaEliminada = carpetas.find(c => c.id === id);
      
      await api.delete(`/carpetas/${id}/`);
      setDeleteConfirm(null);
      fetchData();
      
      toast.success(
        (t) => (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Carpeta eliminada</span>
            <button
              onClick={async () => {
                try {
                  await api.post('/carpetas/', carpetaEliminada);
                  fetchData();
                  toast.dismiss(t.id);
                  toast.success('Carpeta restaurada');
                } catch {
                  toast.error('Error al restaurar');
                }
              }}
              className="bg-accent hover:bg-accent-hover text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider shadow-lg transition-all duration-200 hover:scale-105"
            >
              DESHACER
            </button>
          </div>
        ),
        { 
          duration: 8000,
          style: {
            background: '#1E1E1E',
            color: '#fff',
            border: '1px solid #4FC3F7',
          },
        }
      );
    } catch (error) {
      console.error('Error deleting carpeta:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const eliminadas = carpetas.filter(c => selectedItems.includes(c.id));
      
      for (const id of selectedItems) {
        await api.delete(`/carpetas/${id}/`);
      }
      
      setSelectedItems([]);
      setSelectAll(false);
      setBulkDeleteConfirm(false);
      fetchData();
      
      toast.success(
        (t) => (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{eliminadas.length} carpetas eliminadas</span>
            <button
              onClick={async () => {
                try {
                  await Promise.all(eliminadas.map(c => api.post('/carpetas/', c)));
                  fetchData();
                  toast.dismiss(t.id);
                  toast.success('Carpetas restauradas');
                } catch {
                  toast.error('Error al restaurar');
                }
              }}
              className="bg-accent hover:bg-accent-hover text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider shadow-lg transition-all duration-200 hover:scale-105"
            >
              DESHACER
            </button>
          </div>
        ),
        { 
          duration: 10000,
          style: {
            background: '#1E1E1E',
            color: '#fff',
            border: '1px solid #4FC3F7',
          },
        }
      );
    } catch (error) {
      console.error('Error deleting carpetas:', error);
      toast.error('Error al eliminar algunas carpetas');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (carpeta) => {
    setEditingCarpeta(carpeta);
    
    // Buscar el objeto persona completo para cliente
    const personaObj = personas.find(p => p.id === carpeta.persona);
    
    setFormData({
      nombre: carpeta.nombre,
      numero_expediente: carpeta.numero_expediente || '',
      persona: carpeta.persona || '',
      persona_obj: personaObj || null,
      parte: carpeta.parte || 'cliente',
      estado: carpeta.estado || '',
      tipo: carpeta.tipo || '',
      objeto: carpeta.objeto || '',
      organismo: carpeta.organismo || '',
      descripcion: carpeta.descripcion || ''
    });
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

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp size={14} className="inline ml-1" /> : 
      <ChevronDown size={14} className="inline ml-1" />;
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
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="flex-1 sm:flex-none bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 uppercase text-xs transition-colors"
          >
            <Plus size={16} />
            NUEVA CARPETA
          </button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-dark-surface p-3 rounded-lg shadow space-y-3">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="BUSCAR POR NOMBRE, N° EXPEDIENTE O PERSONA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-elevated border-none focus:ring-1 focus:ring-accent uppercase text-xs"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2">
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

          <select
            value={filters.persona}
            onChange={(e) => setFilters({...filters, persona: e.target.value})}
            className="w-full sm:w-auto px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-elevated border-none focus:ring-1 focus:ring-accent uppercase text-xs min-w-[150px]"
          >
            <option value="">TODAS LAS PERSONAS</option>
            {personas.map(p => (
              <option key={p.id} value={p.id}>
                {p.apellido}, {p.nombre}
              </option>
            ))}
          </select>

          {/* SELECTOR DE COLUMNAS */}
          <ColumnSelector
            columns={columnDefinitions}
            visibleColumns={visibleColumns}
            onToggleColumn={handleToggleColumn}
          />

          <button
            onClick={() => {
              setSearchTerm('');
              setFilters({ estado: '', tipo: '', persona: '' });
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
                <th onClick={() => handleSort('nombre')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent">
                  NOMBRE <SortIcon columnKey="nombre" />
                </th>
                {visibleColumns.numero_expediente && (
                  <th onClick={() => handleSort('numero_expediente')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent">
                    N° EXPEDIENTE <SortIcon columnKey="numero_expediente" />
                  </th>
                )}
                {visibleColumns.cliente && (
                  <th onClick={() => handleSort('persona')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent">
                    CLIENTE <SortIcon columnKey="persona" />
                  </th>
                )}
                {visibleColumns.estado && (
                  <th onClick={() => handleSort('estado')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent">
                    ESTADO <SortIcon columnKey="estado" />
                  </th>
                )}
                {visibleColumns.tipo && (
                  <th onClick={() => handleSort('tipo')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent">
                    TIPO <SortIcon columnKey="tipo" />
                  </th>
                )}
                {visibleColumns.objeto && (
                  <th onClick={() => handleSort('objeto')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent">
                    OBJETO <SortIcon columnKey="objeto" />
                  </th>
                )}
                {visibleColumns.organismo && (
                  <th onClick={() => handleSort('organismo')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent">
                    ORGANISMO <SortIcon columnKey="organismo" />
                  </th>
                )}
                {visibleColumns.fecha && (
                  <th onClick={() => handleSort('fecha_inicio')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent">
                    FECHA <SortIcon columnKey="fecha_inicio" />
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

                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium">
                      <Link 
                        to={`/carpetas/${carpeta.id}/movimientos`}
                        className="text-accent hover:text-accent-hover hover:underline"
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
                        <button
                          onClick={() => setDeleteConfirm({ 
                            id: carpeta.id, 
                            nombre: carpeta.nombre 
                          })}
                          className="p-1 hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de creación/edición */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
              <h2 className="text-base font-bold uppercase">
                {editingCarpeta ? 'EDITAR CARPETA' : 'NUEVA CARPETA'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:text-accent">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3">
              {/* Nombre de la carpeta (único obligatorio) */}
              <div>
                <label className="block text-xs font-medium mb-1 uppercase">NOMBRE / CARÁTULA *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value.toUpperCase()})}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                  required
                  placeholder="Ej: GARCÍA JUAN C/ MUNICIPALIDAD S/ AMPARO"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">N° EXPEDIENTE</label>
                  <input
                    type="text"
                    value={formData.numero_expediente}
                    onChange={(e) => setFormData({...formData, numero_expediente: e.target.value.toUpperCase()})}
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                    placeholder="Ej: 12345/2024"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">CLIENTE</label>
                  <BuscadorPersona
                    value={formData.persona_obj}
                    onChange={(persona) => {
                      setFormData({
                        ...formData,
                        persona_obj: persona,
                        persona: persona?.id || ''
                      });
                    }}
                    onCrearNueva={(callback) => {
                      console.log('🟡 Abriendo modal para crear CLIENTE');
                      abrirModalPersona((nuevaPersonaId) => {
                        console.log('✅ CLIENTE creado con ID:', nuevaPersonaId);
                        api.get(`/personas/${nuevaPersonaId}/`)
                          .then(response => {
                            console.log('✅ Datos del CLIENTE:', response.data);
                            callback(response.data.id);
                          })
                          .catch(error => {
                            console.error('❌ Error:', error);
                          });
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">PARTE</label>
                  <select
                    value={formData.parte}
                    onChange={(e) => setFormData({...formData, parte: e.target.value})}
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                  >
                    {parteOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">ORGANISMO</label>
                  <BuscadorOrganismo
                    value={formData.organismo}
                    onChange={(organismoId) => setFormData({...formData, organismo: organismoId})}
                    onCrearNuevo={(nombre) => {
                      toast.success('Funcionalidad en desarrollo');
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">ESTADO</label>
                  <div className="flex gap-1">
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value})}
                      className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                    >
                      <option value="">SELECCIONAR</option>
                      {estados.map(estado => (
                        <option key={estado.id} value={estado.id}>{estado.nombre}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setEstadoModalOpen(true)}
                      className="p-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Editar estados"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">TIPO</label>
                  <div className="flex gap-1">
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                      className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                    >
                      <option value="">SELECCIONAR</option>
                      {tipos.map(tipo => (
                        <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setTipoModalOpen(true)}
                      className="p-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Editar tipos"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">OBJETO</label>
                  <div className="flex gap-1">
                    <select
                      value={formData.objeto}
                      onChange={(e) => setFormData({...formData, objeto: e.target.value})}
                      className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                    >
                      <option value="">SELECCIONAR</option>
                      {objetos.map(objeto => (
                        <option key={objeto.id} value={objeto.id}>{objeto.nombre}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setObjetoModalOpen(true)}
                      className="p-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Editar objetos"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">DESCRIPCIÓN</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    rows="3"
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase"
                >
                  {editingCarpeta ? 'ACTUALIZAR' : 'CREAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modales de gestión */}
      <EstadoCarpetaManager
        isOpen={estadoModalOpen}
        onClose={() => setEstadoModalOpen(false)}
        onSave={() => {
          fetchEstados();
          fetchData();
        }}
      />

      <TipoCarpetaManager
        isOpen={tipoModalOpen}
        onClose={() => setTipoModalOpen(false)}
        onSave={() => {
          fetchTipos();
          fetchData();
        }}
      />

      <ObjetoCarpetaManager
        isOpen={objetoModalOpen}
        onClose={() => setObjetoModalOpen(false)}
        onSave={() => {
          fetchObjetos();
          fetchData();
        }}
      />

      {/* Modal de compartir */}
      {compartirModalOpen && (
        <CompartirCarpetaModal
          isOpen={compartirModalOpen}
          onClose={() => setCompartirModalOpen(false)}
          carpeta={selectedCarpeta}
          onSave={() => {
            fetchData();
            toast.success('Carpetas compartidas');
          }}
        />
      )}

      {/* Modal de confirmación de eliminación individual */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl p-4 max-w-md w-full">
            <h3 className="text-base font-bold mb-3">CONFIRMAR ELIMINACIÓN</h3>
            <p className="text-sm mb-4">¿Eliminar la carpeta "{deleteConfirm.nombre}"?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase">CANCELAR</button>
              <button onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.nombre)} className="px-3 py-1.5 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors uppercase">ELIMINAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación múltiple */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl p-4 max-w-md w-full">
            <h3 className="text-base font-bold mb-3">CONFIRMAR ELIMINACIÓN MÚLTIPLE</h3>
            <p className="text-sm mb-4">¿Eliminar {selectedItems.length} carpetas?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setBulkDeleteConfirm(false)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase">CANCELAR</button>
              <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors uppercase">ELIMINAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {detalleModalOpen && (
        <DetalleCarpetaModal
          carpeta={carpetaParaDetalle}
          onClose={() => setDetalleModalOpen(false)}
        />
      )}
    </div>
  );
};

export default CarpetasList;
