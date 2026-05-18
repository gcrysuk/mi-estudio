import { useState, useEffect } from 'react';
import { X, Save, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import BuscadorConfig from '../buscadores/BuscadorConfig';

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

const OrganismoForm = ({ organismo = null, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [localidades, setLocalidades] = useState([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [formData, setFormData] = useState({
    nombre:       organismo?.nombre       ?? '',
    descripcion:  organismo?.descripcion  ?? '',
    jurisdiccion: organismo?.jurisdiccion ?? '',
    direccion:    organismo?.direccion    ?? '',
    provincia:    organismo?.provincia    ?? '',
    localidad:    organismo?.localidad    ?? '',
    materia_obj:  organismo?.materia
      ? { id: organismo.materia, nombre: organismo.materia_nombre }
      : null,
    activo:       organismo?.activo       ?? true,
  });

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (formData.provincia) {
      fetchLocalidades(formData.provincia);
    } else {
      setLocalidades([]);
    }
  }, [formData.provincia]);

  const fetchLocalidades = async (provincia) => {
    setLoadingLocalidades(true);
    setLocalidades([]);
    try {
      const url = `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(provincia)}&max=5000&campos=nombre`;
      const res = await fetch(url);
      const data = await res.json();
      const nombres = (data.localidades || [])
        .map(l => l.nombre)
        .sort((a, b) => a.localeCompare(b));
      setLocalidades(nombres);
    } catch {
      setLocalidades([]);
    } finally {
      setLoadingLocalidades(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        nombre:       formData.nombre,
        descripcion:  formData.descripcion,
        jurisdiccion: formData.jurisdiccion,
        direccion:    formData.direccion,
        provincia:    formData.provincia,
        localidad:    formData.localidad,
        materia:      formData.materia_obj?.id || null,
        activo:       formData.activo,
      };
      let response;
      if (organismo?.id) {
        response = await api.put(`/organismos/${organismo.id}/`, payload);
        toast.success('Organismo actualizado');
      } else {
        response = await api.post('/organismos/', payload);
        toast.success('Organismo creado');
      }
      onSave?.(response.data);
      onClose();
    } catch (error) {
      toast.error('Error al guardar: ' + (error.response?.data?.nombre?.[0] ?? 'Verificá los datos'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
          <h2 className="text-sm font-bold uppercase flex items-center gap-2">
            <Building2 size={15} className="text-accent" />
            {organismo ? 'Editar Organismo' : 'Nuevo Organismo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:text-accent rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium uppercase mb-0.5">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={e => set('nombre', e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              placeholder="Ej: Juzgado Civil N° 1"
              required
            />
          </div>

          {/* Materia */}
          <div>
            <label className="block text-xs font-medium uppercase mb-0.5">Materia</label>
            <BuscadorConfig
              endpoint="/organismos/materias/"
              placeholder="Buscar materia..."
              label="materia"
              value={formData.materia_obj}
              onChange={(v) => set('materia_obj', v)}
            />
          </div>

          {/* Jurisdicción */}
          <div>
            <label className="block text-xs font-medium uppercase mb-0.5">Jurisdicción</label>
            <input
              type="text"
              value={formData.jurisdiccion}
              onChange={e => set('jurisdiccion', e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              placeholder="Ej: Nacional, Provincial"
            />
          </div>

          {/* Provincia + Localidad */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium uppercase mb-0.5">Provincia</label>
              <select
                value={formData.provincia}
                onChange={e => setFormData(prev => ({ ...prev, provincia: e.target.value, localidad: '' }))}
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              >
                <option value="">Seleccionar</option>
                {PROVINCIAS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase mb-0.5">
                Localidad
                {loadingLocalidades && <span className="ml-1 text-gray-400 normal-case font-normal">(cargando...)</span>}
              </label>
              <select
                value={formData.localidad}
                onChange={e => set('localidad', e.target.value)}
                disabled={!formData.provincia || loadingLocalidades}
                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!formData.provincia
                    ? 'Primero seleccioná una provincia'
                    : loadingLocalidades
                    ? 'Cargando localidades...'
                    : 'Seleccionar'}
                </option>
                {localidades.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-xs font-medium uppercase mb-0.5">Dirección</label>
            <input
              type="text"
              value={formData.direccion}
              onChange={e => set('direccion', e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              placeholder="Ej: Calle 13 e/ 47 y 48"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium uppercase mb-0.5">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-elevated focus:ring-1 focus:ring-accent"
              placeholder="Información adicional..."
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors uppercase flex items-center gap-1"
            >
              <Save size={13} />
              {loading ? 'Guardando...' : organismo ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganismoForm;
