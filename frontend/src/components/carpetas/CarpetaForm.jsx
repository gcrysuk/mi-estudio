// frontend/src/components/carpetas/CarpetaForm.jsx
import { useState, useEffect } from 'react';
import { X, Save, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import BuscadorPersona from '../buscadores/BuscadorPersona';
import BuscadorOrganismo from '../buscadores/BuscadorOrganismo';

const CarpetaForm = ({ carpeta = null, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [tiposCarpeta, setTiposCarpeta] = useState([]);
  const [estadosCarpeta, setEstadosCarpeta] = useState([]);
  const [objetosCarpeta, setObjetosCarpeta] = useState([]);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    // Datos básicos
    nombre: '',
    caratula_generada: false,
    
    // Relaciones (objetos completos para los buscadores)
    persona: null,           // Objeto persona completo para el buscador
    contraparte_obj: null,   // Objeto persona para contraparte
    organismo: null,         // Objeto organismo completo
    
    // IDs para enviar al backend
    persona_id: null,
    organismo_id: null,
    
    // Texto libre para contraparte (si no se selecciona una persona)
    contraparte: '',
    
    // Campos configurables (IDs)
    estado: '',
    tipo: '',
    objeto: '',
    
    // Otros campos
    parte: 'cliente',
    numero_expediente: '',
    descripcion: '',
    es_publico: false
  });

  // Cargar datos configurables al montar el componente
  useEffect(() => {
    fetchConfiguraciones();
    
    // Si estamos editando, cargar los datos de la carpeta
    if (carpeta) {
      cargarDatosCarpeta();
    }
  }, [carpeta]);

  const fetchConfiguraciones = async () => {
    try {
      const [tiposRes, estadosRes, objetosRes] = await Promise.all([
        api.get('/carpetas/tipos/'),
        api.get('/carpetas/estados/'),
        api.get('/carpetas/objetos/')
      ]);
      
      setTiposCarpeta(tiposRes.data);
      setEstadosCarpeta(estadosRes.data);
      setObjetosCarpeta(objetosRes.data);
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    }
  };

  const cargarDatosCarpeta = async () => {
    try {
      // Si tenemos la carpeta completa en props
      setFormData({
        nombre: carpeta.nombre || '',
        caratula_generada: carpeta.caratula_generada || false,
        
        // Para los buscadores, necesitamos los objetos completos
        // Si solo tenemos IDs, debemos cargar los detalles
        persona: carpeta.persona_detalle || null,
        contraparte_obj: null, // Necesitarías cargar la persona si es un objeto
        organismo: carpeta.organismo ? { 
          id: carpeta.organismo, 
          nombre: carpeta.organismo_nombre 
        } : null,
        
        persona_id: carpeta.persona || null,
        organismo_id: carpeta.organismo || null,
        
        contraparte: carpeta.contraparte || '',
        estado: carpeta.estado || '',
        tipo: carpeta.tipo || '',
        objeto: carpeta.objeto || '',
        parte: carpeta.parte || 'cliente',
        numero_expediente: carpeta.numero_expediente || '',
        descripcion: carpeta.descripcion || '',
        es_publico: carpeta.es_publico || false
      });
    } catch (error) {
      console.error('Error cargando datos de carpeta:', error);
      toast.error('Error al cargar los datos de la carpeta');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Preparar datos para enviar al backend
      const dataToSend = {
        nombre: formData.nombre,
        caratula_generada: formData.caratula_generada,
        
        // Enviar IDs, no objetos completos
        persona: formData.persona?.id || formData.persona_id,
        organismo: formData.organismo?.id || formData.organismo_id,
        
        // Para contraparte, si hay objeto seleccionado, guardamos el nombre formateado
        contraparte: formData.contraparte_obj ? 
          `${formData.contraparte_obj.apellido}, ${formData.contraparte_obj.nombre}` : 
          formData.contraparte,
        
        // Campos configurables
        estado: formData.estado || null,
        tipo: formData.tipo || null,
        objeto: formData.objeto || null,
        
        // Otros campos
        parte: formData.parte,
        numero_expediente: formData.numero_expediente,
        descripcion: formData.descripcion,
        es_publico: formData.es_publico
      };

      let response;
      if (carpeta?.id) {
        // Editar
        response = await api.put(`/carpetas/${carpeta.id}/`, dataToSend);
        toast.success('Carpeta actualizada');
      } else {
        // Crear nueva
        response = await api.post('/carpetas/', dataToSend);
        toast.success('Carpeta creada');
      }

      onSave?.(response.data);
      onClose();
    } catch (error) {
      console.error('Error guardando carpeta:', error);
      toast.error('Error al guardar: ' + (error.response?.data?.error || 'Verifica los datos'));
    } finally {
      setLoading(false);
    }
  };

  // Opciones para el select de "parte"
  const parteOptions = [
    { value: 'cliente', label: 'Cliente' },
    { value: 'contraparte', label: 'Contraparte' },
    { value: 'otro', label: 'Otro' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
          <h2 className="text-lg font-bold uppercase">
            {carpeta ? 'EDITAR CARPETA' : 'NUEVA CARPETA'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 hover:text-accent transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Nombre de la carpeta */}
          <div>
            <label className="block text-xs font-medium mb-1 uppercase">
              NOMBRE DE LA CARPETA *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              required
              placeholder="Ej: Juicio laboral Pérez"
            />
          </div>

          {/* Cliente/Parte con buscador */}
          <div>
            <label className="block text-xs font-medium mb-1 uppercase">
              CLIENTE / PARTE
            </label>
            <BuscadorPersona
              value={formData.persona}
              onChange={(persona) => setFormData({
                ...formData, 
                persona: persona,
                persona_id: persona?.id || null
              })}
              placeholder="Buscar cliente por nombre, apellido o documento..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Selecciona la persona principal de esta carpeta
            </p>
          </div>

          {/* Contraparte - con buscador y opción de texto libre */}
          <div>
            <label className="block text-xs font-medium mb-1 uppercase">
              CONTRAPARTE
            </label>
            <div className="space-y-2">
              <BuscadorPersona
                value={formData.contraparte_obj}
                onChange={(persona) => setFormData({
                  ...formData,
                  contraparte_obj: persona,
                  contraparte: persona ? `${persona.apellido}, ${persona.nombre}` : ''
                })}
                placeholder="Buscar contraparte..."
              />
              
              {/* Separador o texto "o" */}
              <div className="flex items-center gap-2">
                <hr className="flex-1 border-gray-300 dark:border-gray-600" />
                <span className="text-xs text-gray-500">O</span>
                <hr className="flex-1 border-gray-300 dark:border-gray-600" />
              </div>

              {/* Campo de texto libre para contraparte */}
              <input
                type="text"
                value={formData.contraparte}
                onChange={(e) => setFormData({
                  ...formData,
                  contraparte: e.target.value,
                  contraparte_obj: null // Limpiar objeto si escribimos manualmente
                })}
                placeholder="Escribir contraparte manualmente..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                disabled={!!formData.contraparte_obj}
              />
            </div>
          </div>

          {/* Relación con la parte */}
          <div>
            <label className="block text-xs font-medium mb-1 uppercase">
              RELACIÓN
            </label>
            <select
              value={formData.parte}
              onChange={(e) => setFormData({...formData, parte: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
            >
              {parteOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Organismo con buscador */}
          <div>
            <label className="block text-xs font-medium mb-1 uppercase">
              ORGANISMO
            </label>
            <BuscadorOrganismo
              value={formData.organismo}
              onChange={(organismo) => setFormData({
                ...formData,
                organismo: organismo,
                organismo_id: organismo?.id || null
              })}
              placeholder="Buscar organismo..."
            />
          </div>

          {/* Número de expediente */}
          <div>
            <label className="block text-xs font-medium mb-1 uppercase">
              NÚMERO DE EXPEDIENTE
            </label>
            <input
              type="text"
              value={formData.numero_expediente}
              onChange={(e) => setFormData({...formData, numero_expediente: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent font-mono"
              placeholder="Ej: 12345/2024"
            />
          </div>

          {/* Campos configurables en grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Tipo de carpeta */}
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">
                TIPO
              </label>
              <div className="flex gap-1">
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                >
                  <option value="">SELECCIONAR</option>
                  {tiposCarpeta.filter(t => t.activo).map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {/* Abrir modal de gestión de tipos */}}
                  className="px-2 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                  title="Configurar tipos"
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">
                ESTADO
              </label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({...formData, estado: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              >
                <option value="">SELECCIONAR</option>
                {estadosCarpeta.filter(e => e.activo).map(estado => (
                  <option key={estado.id} value={estado.id}>{estado.nombre}</option>
                ))}
              </select>
            </div>

            {/* Objeto */}
            <div>
              <label className="block text-xs font-medium mb-1 uppercase">
                OBJETO
              </label>
              <select
                value={formData.objeto}
                onChange={(e) => setFormData({...formData, objeto: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              >
                <option value="">SELECCIONAR</option>
                {objetosCarpeta.filter(o => o.activo).map(objeto => (
                  <option key={objeto.id} value={objeto.id}>{objeto.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium mb-1 uppercase">
              DESCRIPCIÓN
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              placeholder="Descripción adicional de la carpeta..."
            />
          </div>

          {/* Checkbox para carpeta pública */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="es_publico"
              checked={formData.es_publico}
              onChange={(e) => setFormData({...formData, es_publico: e.target.checked})}
              className="rounded border-gray-300 text-accent focus:ring-accent"
            />
            <label htmlFor="es_publico" className="text-sm">
              Carpeta pública (visible para todos los usuarios)
            </label>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
              disabled={loading}
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase flex items-center gap-2"
              disabled={loading}
            >
              <Save size={16} />
              {loading ? 'GUARDANDO...' : (carpeta ? 'ACTUALIZAR' : 'CREAR')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CarpetaForm;
