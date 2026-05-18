import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import BuscadorPersona from '../buscadores/BuscadorPersona';
import BuscadorOrganismo from '../buscadores/BuscadorOrganismo';
import BuscadorConfig from '../buscadores/BuscadorConfig';
import OrganismoForm from '../organismos/OrganismoForm';

const CarpetaForm = ({ carpeta = null, onClose, onSave, nombreInicial = '' }) => {
  const [loading, setLoading] = useState(false);
  const [showOrganismoForm, setShowOrganismoForm] = useState(false);

  const [formData, setFormData] = useState({
    nombre: nombreInicial,
    caratula_generada: false,

    persona: null,
    contraparte_obj: null,
    organismo: null,

    persona_id: null,
    organismo_id: null,

    contraparte: '',

    estado_obj: null,
    tipo_obj: null,
    objeto_obj: null,

    parte: 'actor',
    numero_expediente: '',
    descripcion: ''
  });

  useEffect(() => {
    if (carpeta) {
      setFormData({
        nombre: carpeta.nombre || '',
        caratula_generada: carpeta.caratula_generada || false,

        persona: carpeta.persona_detalle || null,
        contraparte_obj: null,
        organismo: carpeta.organismo ? { id: carpeta.organismo, nombre: carpeta.organismo_nombre } : null,

        persona_id: carpeta.persona || null,
        organismo_id: carpeta.organismo || null,

        contraparte: carpeta.contraparte || '',

        estado_obj: carpeta.estado ? { id: carpeta.estado, nombre: carpeta.estado_nombre, color: carpeta.estado_color } : null,
        tipo_obj:   carpeta.tipo   ? { id: carpeta.tipo,   nombre: carpeta.tipo_nombre   } : null,
        objeto_obj: carpeta.objeto ? { id: carpeta.objeto, nombre: carpeta.objeto_nombre } : null,

        parte: carpeta.parte || 'actor',
        numero_expediente: carpeta.numero_expediente || '',
        descripcion: carpeta.descripcion || ''
      });
    }
  }, [carpeta]);

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
        
        estado: formData.estado_obj?.id || null,
        tipo:   formData.tipo_obj?.id   || null,
        objeto: formData.objeto_obj?.id || null,
        
        parte: formData.parte,
        numero_expediente: formData.numero_expediente,
        descripcion: formData.descripcion
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

  const parteOptions = [
    { value: 'actor',     label: 'Actor' },
    { value: 'demandado', label: 'Demandado' },
    { value: 'otro',      label: 'Otro' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
          <h2 className="text-base font-bold uppercase">
            {carpeta ? 'EDITAR CARPETA' : 'NUEVA CARPETA'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:text-accent transition-colors"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-3 space-y-2">

          {/* Fila 1 — Nombre */}
          <div>
            <label className="block text-xs font-medium mb-0.5 uppercase">NOMBRE DE LA CARPETA *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              required
              placeholder="Ej: Juicio laboral Pérez"
            />
          </div>

          {/* Fila 2 — Cliente | Contraparte */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">CLIENTE / PARTE</label>
              <BuscadorPersona
                value={formData.persona}
                onChange={(persona) => setFormData({
                  ...formData,
                  persona: persona,
                  persona_id: persona?.id || null
                })}
                placeholder="Buscar cliente..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">CONTRAPARTE</label>
              <BuscadorPersona
                value={formData.contraparte_obj}
                onChange={(persona) => setFormData({
                  ...formData,
                  contraparte_obj: persona,
                  contraparte: persona ? `${persona.apellido}, ${persona.nombre}` : ''
                })}
                placeholder="Buscar contraparte..."
              />
              {!formData.contraparte_obj && (
                <input
                  type="text"
                  value={formData.contraparte}
                  onChange={(e) => setFormData({ ...formData, contraparte: e.target.value })}
                  placeholder="O escribir manualmente..."
                  className="mt-1 w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                />
              )}
            </div>
          </div>

          {/* Fila 3 — Relación | Organismo */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">RELACIÓN</label>
              <select
                value={formData.parte}
                onChange={(e) => setFormData({...formData, parte: e.target.value})}
                className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              >
                {parteOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">ORGANISMO</label>
              <BuscadorOrganismo
                value={formData.organismo}
                onChange={(organismo) => setFormData({
                  ...formData,
                  organismo: organismo,
                  organismo_id: organismo?.id || null
                })}
                onCrearNuevo={() => setShowOrganismoForm(true)}
                placeholder="Buscar organismo..."
              />
            </div>
          </div>

          {/* Fila 4 — Tipo | Estado | Objeto */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">TIPO</label>
              <BuscadorConfig
                endpoint="/carpetas/tipos/"
                placeholder="Buscar tipo..."
                label="tipo"
                value={formData.tipo_obj}
                onChange={(v) => setFormData({ ...formData, tipo_obj: v })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">ESTADO</label>
              <BuscadorConfig
                endpoint="/carpetas/estados/"
                placeholder="Buscar estado..."
                label="estado"
                value={formData.estado_obj}
                onChange={(v) => setFormData({ ...formData, estado_obj: v })}
                withColor
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">OBJETO</label>
              <BuscadorConfig
                endpoint="/carpetas/objetos/"
                placeholder="Buscar objeto..."
                label="objeto"
                value={formData.objeto_obj}
                onChange={(v) => setFormData({ ...formData, objeto_obj: v })}
              />
            </div>
          </div>

          {/* Fila 5 — Nº Expediente | Descripción */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">Nº EXPEDIENTE</label>
              <input
                type="text"
                value={formData.numero_expediente}
                onChange={(e) => setFormData({...formData, numero_expediente: e.target.value})}
                className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent font-mono"
                placeholder="Ej: 12345/2024"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">DESCRIPCIÓN</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                rows={2}
                className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent resize-none"
                placeholder="Descripción adicional..."
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-1.5 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
              disabled={loading}
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase flex items-center gap-2"
              disabled={loading}
            >
              <Save size={15} />
              {loading ? 'GUARDANDO...' : (carpeta ? 'ACTUALIZAR' : 'CREAR')}
            </button>
          </div>

        </form>
      </div>

      {showOrganismoForm && (
        <OrganismoForm
          onClose={() => setShowOrganismoForm(false)}
          onSave={(nuevoOrganismo) => {
            setFormData(prev => ({
              ...prev,
              organismo: nuevoOrganismo,
              organismo_id: nuevoOrganismo.id,
            }));
            setShowOrganismoForm(false);
          }}
        />
      )}
    </div>
  );
};

export default CarpetaForm;
