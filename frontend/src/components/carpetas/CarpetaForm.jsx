import { useState, useEffect } from 'react';
import { X, Save, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import BuscadorPersona from '../buscadores/BuscadorPersona';
import BuscadorOrganismo from '../buscadores/BuscadorOrganismo';
import BuscadorConfig from '../buscadores/BuscadorConfig';
import OrganismoForm from '../organismos/OrganismoForm';

const CarpetaForm = ({ carpeta = null, onClose, onSave, nombreInicial = '' }) => {
  const [loading, setLoading] = useState(false);
  const [showOrganismoForm, setShowOrganismoForm] = useState(false);

  // ── Participantes ────────────────────────────────────────────────────────
  // { key, id, tipo, persona_id, nombre_display, nombre_manual, isNew }
  const [participantes, setParticipantes] = useState([]);
  const [toDeletePart, setToDeletePart] = useState([]); // backend IDs to DELETE

  // Temporary buscador selection state (per tipo)
  const [clienteTemp, setClienteTemp] = useState(null);
  const [contraparteTemp, setContraparteTemp] = useState(null);
  const [nombreManual, setNombreManual] = useState('');

  const [formData, setFormData] = useState({
    nombre: nombreInicial,
    caratula_generada: false,
    organismo: null,
    organismo_id: null,
    estado_obj: null,
    tipo_obj: null,
    objeto_obj: null,
    parte: 'actor',
    numero_expediente: '',
    descripcion: '',
    mev_url: '',
  });

  // Default estado "activa" on new carpeta
  useEffect(() => {
    if (carpeta) return;
    api.get('/carpetas/estados/').then(res => {
      const activa = res.data.find(e => e.nombre.toLowerCase() === 'activa');
      if (activa) setFormData(prev => ({ ...prev, estado_obj: activa }));
    });
  }, []); // eslint-disable-line

  // Load existing carpeta
  useEffect(() => {
    if (!carpeta) return;
    setFormData({
      nombre: carpeta.nombre || '',
      caratula_generada: carpeta.caratula_generada || false,
      organismo: carpeta.organismo ? { id: carpeta.organismo, nombre: carpeta.organismo_nombre } : null,
      organismo_id: carpeta.organismo || null,
      estado_obj: carpeta.estado ? { id: carpeta.estado, nombre: carpeta.estado_nombre, color: carpeta.estado_color } : null,
      tipo_obj:   carpeta.tipo   ? { id: carpeta.tipo,   nombre: carpeta.tipo_nombre   } : null,
      objeto_obj: carpeta.objeto ? { id: carpeta.objeto, nombre: carpeta.objeto_nombre } : null,
      parte: carpeta.parte || 'actor',
      numero_expediente: carpeta.numero_expediente || '',
      descripcion: carpeta.descripcion || '',
      mev_url: carpeta.mev_url || '',
    });

    if (carpeta.participantes?.length) {
      setParticipantes(
        carpeta.participantes.map(p => ({
          key: `existing-${p.id}`,
          id: p.id,
          tipo: p.tipo,
          persona_id: p.persona,
          nombre_display: p.persona_nombre,
          nombre_manual: p.nombre_manual || '',
          isNew: false,
        }))
      );
    } else {
      // Migrate legacy single-persona fields if no participantes yet
      const legacy = [];
      if (carpeta.persona_detalle) {
        legacy.push({
          key: 'legacy-persona',
          id: null,
          tipo: 'cliente',
          persona_id: carpeta.persona_detalle.id,
          nombre_display: `${carpeta.persona_detalle.apellido}, ${carpeta.persona_detalle.nombre}`,
          nombre_manual: '',
          isNew: true,
        });
      }
      if (carpeta.contraparte) {
        legacy.push({
          key: 'legacy-contraparte',
          id: null,
          tipo: 'contraparte',
          persona_id: null,
          nombre_display: carpeta.contraparte,
          nombre_manual: carpeta.contraparte,
          isNew: true,
        });
      }
      setParticipantes(legacy);
    }
  }, [carpeta]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const agregarParticipante = (tipo, persona, manual = '') => {
    if (!persona && !manual.trim()) return;
    const nombre_display = persona
      ? `${persona.apellido}, ${persona.nombre}`
      : manual.trim();
    setParticipantes(prev => [...prev, {
      key: `new-${Date.now()}-${Math.random()}`,
      id: null,
      tipo,
      persona_id: persona?.id || null,
      nombre_display,
      nombre_manual: persona ? '' : manual.trim(),
      isNew: true,
    }]);
    if (tipo === 'cliente') setClienteTemp(null);
    if (tipo === 'contraparte') { setContraparteTemp(null); setNombreManual(''); }
  };

  const quitarParticipante = (p) => {
    if (p.id) setToDeletePart(prev => [...prev, p.id]);
    setParticipantes(prev => prev.filter(x => x.key !== p.key));
  };

  const syncParticipantes = async (carpetaId) => {
    await Promise.all(toDeletePart.map(id =>
      api.delete(`/carpetas/${carpetaId}/quitar_participante/${id}/`)
    ));
    await Promise.all(
      participantes.filter(p => p.isNew).map(p =>
        api.post(`/carpetas/${carpetaId}/agregar_participante/`, {
          tipo: p.tipo,
          persona_id: p.persona_id,
          nombre_manual: p.nombre_manual,
        })
      )
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        nombre: formData.nombre,
        caratula_generada: formData.caratula_generada,
        organismo: formData.organismo?.id || formData.organismo_id || null,
        estado: formData.estado_obj?.id || null,
        tipo:   formData.tipo_obj?.id   || null,
        objeto: formData.objeto_obj?.id || null,
        parte: formData.parte,
        numero_expediente: formData.numero_expediente,
        descripcion: formData.descripcion,
        mev_url: formData.mev_url || '',
        // Clear legacy single-person fields
        persona: null,
        contraparte: '',
      };

      let carpetaId;
      if (carpeta?.id) {
        await api.put(`/carpetas/${carpeta.id}/`, dataToSend);
        carpetaId = carpeta.id;
        toast.success('Carpeta actualizada');
      } else {
        const res = await api.post('/carpetas/', dataToSend);
        carpetaId = res.data.id;
        toast.success('Carpeta creada');
      }

      await syncParticipantes(carpetaId);
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error guardando carpeta:', error);
      if (!error._403handled) {
        toast.error('Error al guardar: ' + (error.response?.data?.detail || error.response?.data?.error || 'Verifica los datos'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Sub-component: lista de participantes ─────────────────────────────────

  const ListaParticipantes = ({ tipo }) => {
    const items = participantes.filter(p => p.tipo === tipo);
    if (!items.length) return null;
    return (
      <ul className="mb-1 space-y-0.5">
        {items.map(p => (
          <li key={p.key} className="flex items-center justify-between px-2 py-1 text-xs bg-gray-50 dark:bg-dark-elevated rounded">
            <span className="flex items-center gap-1.5">
              <Users size={11} className="text-gray-400 flex-shrink-0" />
              {p.nombre_display}
            </span>
            <button
              type="button"
              onClick={() => quitarParticipante(p)}
              className="text-gray-400 hover:text-red-500 transition-colors ml-2"
            >
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>
    );
  };

  const parteOptions = [
    { value: 'actor',     label: 'Actor' },
    { value: 'demandado', label: 'Demandado' },
    { value: 'otro',      label: 'Otro' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
          <h2 className="text-base font-bold uppercase">
            {carpeta ? 'EDITAR CARPETA' : 'NUEVA CARPETA'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:text-accent transition-colors" disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2">

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium mb-0.5 uppercase">NOMBRE DE LA CARPETA *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              required
              placeholder="Ej: Juicio laboral Pérez"
            />
          </div>

          {/* CLIENTES / PARTES */}
          <div>
            <label className="block text-xs font-medium mb-1 uppercase">CLIENTE / PARTE</label>
            <ListaParticipantes tipo="cliente" />
            <div className="flex gap-1">
              <div className="flex-1">
                <BuscadorPersona
                  value={clienteTemp}
                  onChange={setClienteTemp}
                  placeholder="Buscar cliente..."
                />
              </div>
              <button
                type="button"
                onClick={() => agregarParticipante('cliente', clienteTemp)}
                disabled={!clienteTemp}
                className="px-2 py-1 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-40 flex items-center gap-1"
                title="Agregar cliente"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* CONTRAPARTES */}
          <div>
            <label className="block text-xs font-medium mb-1 uppercase">CONTRAPARTE</label>
            <ListaParticipantes tipo="contraparte" />
            {/* Buscar por persona */}
            <div className="flex gap-1 mb-1">
              <div className="flex-1">
                <BuscadorPersona
                  value={contraparteTemp}
                  onChange={setContraparteTemp}
                  placeholder="Buscar contraparte..."
                />
              </div>
              <button
                type="button"
                onClick={() => agregarParticipante('contraparte', contraparteTemp)}
                disabled={!contraparteTemp}
                className="px-2 py-1 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-40 flex items-center gap-1"
                title="Agregar contraparte"
              >
                <Plus size={13} />
              </button>
            </div>
            {/* Nombre manual */}
            <div className="flex gap-1">
              <input
                type="text"
                value={nombreManual}
                onChange={(e) => setNombreManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); agregarParticipante('contraparte', null, nombreManual); }
                }}
                placeholder="O ingresar nombre manualmente..."
                className="flex-1 px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => agregarParticipante('contraparte', null, nombreManual)}
                disabled={!nombreManual.trim()}
                className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 flex items-center gap-1"
                title="Agregar nombre manual"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Parte | Organismo */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">PARTE</label>
              <select
                value={formData.parte}
                onChange={(e) => setFormData({ ...formData, parte: e.target.value })}
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
                onChange={(organismo) => setFormData({ ...formData, organismo, organismo_id: organismo?.id || null })}
                onCrearNuevo={() => setShowOrganismoForm(true)}
                placeholder="Buscar organismo..."
              />
            </div>
          </div>

          {/* Tipo | Estado | Objeto */}
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

          {/* Nº Expediente | Descripción */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">Nº EXPEDIENTE</label>
              <input
                type="text"
                value={formData.numero_expediente}
                onChange={(e) => setFormData({ ...formData, numero_expediente: e.target.value })}
                className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent font-mono"
                placeholder="Ej: 12345/2024"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-0.5 uppercase">DESCRIPCIÓN</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={2}
                className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent resize-none"
                placeholder="Descripción adicional..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-0.5 uppercase">URL EN MEV <span className="normal-case font-normal text-gray-400">(opcional)</span></label>
              <input
                type="url"
                value={formData.mev_url}
                onChange={(e) => setFormData({ ...formData, mev_url: e.target.value })}
                className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
                placeholder="https://mev.scba.gov.ar/procesales.asp?nidCausa=..."
              />
              {formData.mev_url && (
                <p className="text-[10px] text-indigo-500 mt-0.5">
                  MEV configurada — se sincronizará automáticamente a las 8:00 AM
                </p>
              )}
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
            setFormData(prev => ({ ...prev, organismo: nuevoOrganismo, organismo_id: nuevoOrganismo.id }));
            setShowOrganismoForm(false);
          }}
        />
      )}
    </div>
  );
};

export default CarpetaForm;
