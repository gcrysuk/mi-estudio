import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Users,
  RefreshCw,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../stores/authStore';
import api from '../../services/api';
import DetallePersonaModal from '../../components/personas/DetallePersonaModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useUndo } from '../../hooks/useUndo';

const TIPO_PERSONA_OPTIONS = [
  { value: 'fisica',   label: 'Física' },
  { value: 'juridica', label: 'Jurídica' },
  { value: 'otro',     label: 'Otro' },
];

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

const PersonasList = ({ isModal = false, onGuardar, onCancelar }) => {
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [personaParaDetalle, setPersonaParaDetalle] = useState(null);  
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    tipo_persona: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'apellido',
    direction: 'asc'
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [pendingCallback, setPendingCallback] = useState(null);
  const [localidades, setLocalidades] = useState([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const { pushUndo, undoLast } = useUndo();
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    tipo_persona: '',
    tipo_documento: 'DNI',
    numero_documento: '',
    email: '',
    telefono: '',
    direccion: '',
    provincia: '',
    localidad: '',
  });

  const openDetalleModal = (persona) => {
    setPersonaParaDetalle(persona);
    setDetalleModalOpen(true);
  };

  // Tipos de documento
  const tipoDocumentoOptions = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CUIT', label: 'CUIT' },
    { value: 'CUIL', label: 'CUIL' },
    { value: 'PAS', label: 'PASAPORTE' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.provincia) {
      fetchLocalidades(formData.provincia);
    } else {
      setLocalidades([]);
    }
  }, [formData.provincia]);

  // Escuchar evento para abrir modal desde otras partes (carpetas)
  useEffect(() => {
    const handleAbrirModal = (event) => {
      console.log('🔵 Evento abrirModalPersona RECIBIDO en PersonasList');
      console.log('Event detail:', event.detail);
      
      resetForm();
      setModalOpen(true);
      
      if (event.detail?.onGuardar) {
        console.log('✅ Guardando callback en pendingCallback');
        setPendingCallback(() => event.detail.onGuardar);
      } else {
        console.log('❌ No hay onGuardar en el evento');
      }
    };

    window.addEventListener('abrirModalPersona', handleAbrirModal);
    return () => window.removeEventListener('abrirModalPersona', handleAbrirModal);
  }, []);

  // Manejar tecla ESC para cerrar modales
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (modalOpen) setModalOpen(false);
        if (deleteConfirm) setDeleteConfirm(null);
        if (bulkDeleteConfirm) setBulkDeleteConfirm(false);
        if (isModal && onCancelar) onCancelar();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [modalOpen, deleteConfirm, bulkDeleteConfirm, isModal, onCancelar]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/personas/');
      setPersonas(response.data.results || response.data);
      setSelectedItems([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching personas:', error);
      toast.error('Error al cargar las personas');
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

  // Formatos de documento
  const formatDNI = (value) => {
    const numeros = value.replace(/\D/g, '');
    const limitado = numeros.slice(0, 8);
    
    if (limitado.length > 3) {
      const partes = [];
      for (let i = limitado.length; i > 0; i -= 3) {
        partes.unshift(limitado.slice(Math.max(0, i - 3), i));
      }
      return partes.join('.');
    }
    return limitado;
  };

  const formatCUITCUIL = (value) => {
    const soloNumeros = value.replace(/[^\d]/g, '');
    const limitado = soloNumeros.slice(0, 11);
    
    if (limitado.length <= 2) {
      return limitado;
    } else if (limitado.length <= 10) {
      return `${limitado.slice(0, 2)}-${limitado.slice(2)}`;
    } else {
      return `${limitado.slice(0, 2)}-${limitado.slice(2, 10)}-${limitado.slice(10)}`;
    }
  };

  const formatDocumento = (tipo, numero) => {
    if (!numero) return '';
    const soloNumeros = numero.replace(/\D/g, '');
    
    if (tipo === 'DNI') {
      if (soloNumeros.length > 3) {
        const partes = [];
        for (let i = soloNumeros.length; i > 0; i -= 3) {
          partes.unshift(soloNumeros.slice(Math.max(0, i - 3), i));
        }
        return partes.join('.');
      }
      return soloNumeros;
    }
    
    if (tipo === 'CUIT' || tipo === 'CUIL') {
      if (soloNumeros.length === 11) {
        return `${soloNumeros.slice(0,2)}-${soloNumeros.slice(2,10)}-${soloNumeros.slice(10)}`;
      }
      return soloNumeros;
    }
    return numero;
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getTipoPersonaNombre = (value) => {
    const opt = TIPO_PERSONA_OPTIONS.find(o => o.value === value);
    return opt ? opt.label : '';
  };

  // Manejar selección de items
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredPersonas.map(p => p.id));
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

  // Eliminación individual con UNDO
  const handleDelete = async (id, nombreCompleto) => {
    const personaEliminada = personas.find(p => p.id === id);
    try {
      await api.delete(`/personas/${id}/`);
      setDeleteConfirm(null);
      fetchData();
      if (personaEliminada) {
        pushUndo({ entidad: 'persona', datos: personaEliminada, restoreFn: async () => { await api.post('/personas/', personaEliminada); fetchData(); } });
      }
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">Persona eliminada</span>
          {personaEliminada && (
            <button onClick={async () => { await undoLast(); toast.dismiss(t.id); }}
              className="text-xs bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded uppercase">
              DESHACER
            </button>
          )}
        </div>
      ), { duration: 8000 });
    } catch (error) {
      console.error('Error deleting persona:', error);
      toast.error('Error al eliminar');
    }
  };

  // Eliminación múltiple con UNDO
  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const eliminadas = personas.filter(p => selectedItems.includes(p.id));
      
      for (const id of selectedItems) {
        await api.delete(`/personas/${id}/`);
      }
      
      setSelectedItems([]);
      setSelectAll(false);
      setBulkDeleteConfirm(false);
      fetchData();
      pushUndo({ entidad: 'personas', datos: eliminadas, restoreFn: async () => { await Promise.all(eliminadas.map(p => api.post('/personas/', p))); fetchData(); } });
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">{eliminadas.length} personas eliminadas</span>
          <button onClick={async () => { await undoLast(); toast.dismiss(t.id); }}
            className="text-xs bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded uppercase">
            DESHACER
          </button>
        </div>
      ), { duration: 10000 });
    } catch (error) {
      console.error('Error deleting personas:', error);
      toast.error('Error al eliminar algunas personas');
    } finally {
      setLoading(false);
    }
  };

  const filteredPersonas = personas
    .filter(persona => {
      const matchesSearch = 
        persona.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        persona.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        persona.numero_documento?.includes(searchTerm) ||
        persona.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo = !filters.tipo_persona || persona.tipo_persona === filters.tipo_persona;
      return matchesSearch && matchesTipo;
    })
    .sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'tipo_persona') {
        aVal = getTipoPersonaNombre(a.tipo_persona);
        bVal = getTipoPersonaNombre(b.tipo_persona);
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

    if (!formData.nombre || !formData.apellido) {
      toast.error('Nombre y Apellido son obligatorios');
      return;
    }

    try {
      const documentoParaEnviar = formData.numero_documento ? formData.numero_documento.replace(/\D/g, '') : '';

      const dataToSend = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        tipo_persona: formData.tipo_persona || null,
        tipo_documento: formData.tipo_documento,
        numero_documento: documentoParaEnviar || null,
        email: formData.email || '',
        telefono: formData.telefono || '',
        direccion: formData.direccion || '',
        ciudad: formData.localidad || '',
        provincia: formData.provincia || '',
      };

      let response;

      if (editingPersona) {
        await api.put(`/personas/${editingPersona.id}/`, dataToSend);
        toast.success('Persona actualizada');
        
        if (isModal && onGuardar) {
          console.log('🟢 Llamando a onGuardar con ID (edición):', editingPersona.id);
          onGuardar(editingPersona.id);
        }
      } else {
        console.log('📝 Creando nueva persona...');
        response = await api.post('/personas/', dataToSend);
        console.log('✅ Persona creada con ID:', response.data.id);
        toast.success('Persona creada');
        
        if (isModal && onGuardar) {
          console.log('🟢 Llamando a onGuardar con ID:', response.data.id);
          onGuardar(response.data.id);
        }
      }

      if (!isModal) {
        setModalOpen(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.error('Error saving persona:', error);
      toast.error('Error al guardar: ' + (error.response?.data?.error || 'Verifica los datos'));
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellido: '',
      tipo_persona: '',
      tipo_documento: 'DNI',
      numero_documento: '',
      email: '',
      telefono: '',
      direccion: '',
      provincia: '',
      localidad: '',
    });
    setEditingPersona(null);
    setLocalidades([]);
  };

  const openEditModal = (persona) => {
    setEditingPersona(persona);
    setFormData({
      nombre: persona.nombre,
      apellido: persona.apellido,
      tipo_persona: persona.tipo_persona || '',
      tipo_documento: persona.tipo_documento,
      numero_documento: formatDocumento(persona.tipo_documento, persona.numero_documento),
      email: persona.email || '',
      telefono: persona.telefono || '',
      direccion: persona.direccion || '',
      provincia: persona.provincia || '',
      localidad: persona.ciudad || '',
    });
    setModalOpen(true);
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp size={14} className="inline ml-1" /> : 
      <ChevronDown size={14} className="inline ml-1" />;
  };

  // Si es modal, mostrar solo el formulario
  if (isModal) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
          <h2 className="text-base font-bold uppercase">NUEVA PERSONA</h2>
          <button onClick={onCancelar} className="p-1 hover:text-accent">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">APELLIDO *</label>
              <input 
                type="text" 
                value={formData.apellido} 
                onChange={(e) => setFormData({...formData, apellido: e.target.value.toUpperCase()})} 
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">NOMBRE *</label>
              <input 
                type="text" 
                value={formData.nombre} 
                onChange={(e) => setFormData({...formData, nombre: e.target.value.toUpperCase()})} 
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">TIPO DOCUMENTO</label>
              <select 
                value={formData.tipo_documento} 
                onChange={(e) => { 
                  const nuevoTipo = e.target.value; 
                  setFormData({...formData, tipo_documento: nuevoTipo, numero_documento: ''}); 
                }} 
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              >
                {tipoDocumentoOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">NÚMERO</label>
              <input 
                type="text" 
                value={formData.numero_documento} 
                onChange={(e) => { 
                  let value = e.target.value; 
                  if (formData.tipo_documento === 'DNI') { 
                    value = formatDNI(value); 
                  } else if (formData.tipo_documento === 'CUIT' || formData.tipo_documento === 'CUIL') { 
                    value = formatCUITCUIL(value); 
                  } else { 
                    value = value.replace(/\D/g, ''); 
                  } 
                  setFormData({...formData, numero_documento: value}); 
                }} 
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent font-mono" 
                placeholder={formData.tipo_documento === 'DNI' ? '12.345.678' : '20-12345678-9'} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">TIPO PERSONA</label>
              <select
                value={formData.tipo_persona}
                onChange={(e) => setFormData({...formData, tipo_persona: e.target.value})}
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              >
                <option value="">SELECCIONAR</option>
                {TIPO_PERSONA_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">EMAIL</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 uppercase">TELÉFONO</label>
            <input 
              type="text" 
              value={formData.telefono} 
              onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" 
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 uppercase">DIRECCIÓN</label>
            <input 
              type="text" 
              value={formData.direccion} 
              onChange={(e) => setFormData({...formData, direccion: e.target.value})} 
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" 
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 uppercase">PROVINCIA</label>
            <select
              value={formData.provincia}
              onChange={(e) => setFormData({ ...formData, provincia: e.target.value, localidad: '' })}
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

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancelar}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase"
            >
              CREAR
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Vista normal (no modal)
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold uppercase flex items-center gap-2">
          <Users className="text-accent" size={20} />
          PERSONAS
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
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="flex-1 sm:flex-none bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 uppercase text-xs transition-colors"
          >
            <Plus size={16} />
            NUEVA PERSONA
          </button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-dark-surface p-3 rounded-lg shadow space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="BUSCAR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-elevated border-none focus:ring-1 focus:ring-accent uppercase text-xs"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filters.tipo_persona}
            onChange={(e) => setFilters({...filters, tipo_persona: e.target.value})}
            className="w-full sm:w-auto px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-elevated border-none focus:ring-1 focus:ring-accent uppercase text-xs"
          >
            <option value="">TODOS LOS TIPOS</option>
            {TIPO_PERSONA_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilters({ tipo_persona: '' });
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
          <table className="w-full min-w-[650px]">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider w-8">
                  <input
                    type="checkbox"
                    checked={selectAll && filteredPersonas.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-accent focus:ring-accent"
                  />
                </th>
                <th onClick={() => handleSort('apellido')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent">
                  APELLIDO <SortIcon columnKey="apellido" />
                </th>
                <th onClick={() => handleSort('nombre')} className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-accent">
                  NOMBRE <SortIcon columnKey="nombre" />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell">
                  DOCUMENTO
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider hidden lg:table-cell">
                  TIPO
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium uppercase tracking-wider">
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan="6" className="px-2 py-3 text-center text-xs">Cargando...</td></tr>
              ) : filteredPersonas.length === 0 ? (
                <tr><td colSpan="6" className="px-2 py-6 text-center text-gray-500 text-xs">No hay personas</td></tr>
              ) : (
                filteredPersonas.map(persona => (
                  <tr key={persona.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(persona.id)}
                        onChange={() => handleSelectItem(persona.id)}
                        className="rounded border-gray-300 text-accent focus:ring-accent"
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm">{persona.apellido}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm">{persona.nombre}</td>
                    <td className="px-2 py-2 whitespace-nowrap hidden md:table-cell font-mono text-xs">
                      {formatDocumento(persona.tipo_documento, persona.numero_documento)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap hidden lg:table-cell text-xs">
                      {getTipoPersonaNombre(persona.tipo_persona)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right space-x-1">
                      <button
                        onClick={() => openDetalleModal(persona)}
                        className="p-1 hover:text-accent transition-colors"
                        title="Ver detalles"
                      >
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEditModal(persona)} className="p-1 hover:text-accent">
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm({ 
                          id: persona.id, 
                          nombre: `${persona.apellido}, ${persona.nombre}` 
                        })} 
                        className="p-1 hover:text-red-500"
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

      {/* Modal de persona normal */}
      {modalOpen && !isModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
              <h2 className="text-base font-bold uppercase">
                {editingPersona ? 'EDITAR PERSONA' : 'NUEVA PERSONA'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:text-accent">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3">
              {/* Mismo formulario que en la vista modal */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">APELLIDO *</label>
                  <input 
                    type="text" 
                    value={formData.apellido} 
                    onChange={(e) => setFormData({...formData, apellido: e.target.value.toUpperCase()})} 
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">NOMBRE *</label>
                  <input 
                    type="text" 
                    value={formData.nombre} 
                    onChange={(e) => setFormData({...formData, nombre: e.target.value.toUpperCase()})} 
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">TIPO DOCUMENTO</label>
                  <select 
                    value={formData.tipo_documento} 
                    onChange={(e) => { 
                      const nuevoTipo = e.target.value; 
                      setFormData({...formData, tipo_documento: nuevoTipo, numero_documento: ''}); 
                    }} 
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                  >
                    {tipoDocumentoOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">NÚMERO</label>
                  <input 
                    type="text" 
                    value={formData.numero_documento} 
                    onChange={(e) => { 
                      let value = e.target.value; 
                      if (formData.tipo_documento === 'DNI') { 
                        value = formatDNI(value); 
                      } else if (formData.tipo_documento === 'CUIT' || formData.tipo_documento === 'CUIL') { 
                        value = formatCUITCUIL(value); 
                      } else { 
                        value = value.replace(/\D/g, ''); 
                      } 
                      setFormData({...formData, numero_documento: value}); 
                    }} 
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent font-mono" 
                    placeholder={formData.tipo_documento === 'DNI' ? '12.345.678' : '20-12345678-9'} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">TIPO PERSONA</label>
                  <select
                    value={formData.tipo_persona}
                    onChange={(e) => setFormData({...formData, tipo_persona: e.target.value})}
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                  >
                    <option value="">SELECCIONAR</option>
                    {TIPO_PERSONA_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase">EMAIL</label>
                  <input 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 uppercase">TELÉFONO</label>
                <input 
                  type="text" 
                  value={formData.telefono} 
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 uppercase">DIRECCIÓN</label>
                <input 
                  type="text" 
                  value={formData.direccion} 
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})} 
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 uppercase">PROVINCIA</label>
                <select
                  value={formData.provincia}
                  onChange={(e) => setFormData({ ...formData, provincia: e.target.value, localidad: '' })}
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
                  {editingPersona ? 'ACTUALIZAR' : 'CREAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Confirmar eliminación"
        message={`¿Eliminar a ${deleteConfirm?.nombre}?`}
        onConfirm={() => handleDelete(deleteConfirm.id, deleteConfirm.nombre)}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        title="Confirmar eliminación múltiple"
        message={`¿Eliminar ${selectedItems.length} personas?`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      {/* Modal de detalles */}
      {detalleModalOpen && (
        <DetallePersonaModal
          persona={personaParaDetalle}
          onClose={() => setDetalleModalOpen(false)}
        />
      )}
    </div>
  );
};

export default PersonasList;
