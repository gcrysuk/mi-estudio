// frontend/src/components/personas/DetallePersonaModal.jsx
import { X, User, Hash, Mail, Phone, MapPin, Building2, Calendar } from 'lucide-react';

const DetallePersonaModal = ({ persona, onClose }) => {
  if (!persona) return null;

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDocumento = (tipo, numero) => {
    if (!numero) return '-';
    // Aquí puedes poner la misma lógica de formateo que en PersonasList
    if (tipo === 'DNI') {
        return numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    if (tipo === 'CUIT' || tipo === 'CUIL') {
        if (numero.length === 11) {
            return `${numero.slice(0,2)}-${numero.slice(2,10)}-${numero.slice(10)}`;
        }
    }
    return numero;
  };

  const DetalleRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700">
      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-accent" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{label}</p>
        <p className="text-sm font-medium">{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface">
          <h2 className="text-lg font-bold uppercase flex items-center gap-2">
            <User size={20} className="text-accent" />
            DETALLES DE PERSONA
          </h2>
          <button onClick={onClose} className="p-1 hover:text-accent">
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4">
          {/* Nombre completo */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 uppercase">NOMBRE COMPLETO</p>
            <p className="text-base font-bold">{`${persona.apellido}, ${persona.nombre}`}</p>
          </div>

          {/* Grid de detalles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <DetalleRow 
                icon={Hash} 
                label="TIPO DOCUMENTO" 
                value={persona.tipo_documento} 
              />
              <DetalleRow 
                icon={Hash} 
                label="NÚMERO DOCUMENTO" 
                value={formatDocumento(persona.tipo_documento, persona.numero_documento)} 
              />
              <DetalleRow 
                icon={Building2} 
                label="TIPO PERSONA" 
                value={persona.tipo_persona_nombre || 'No asignado'} 
              />
            </div>

            <div className="space-y-1">
              <DetalleRow 
                icon={Mail} 
                label="EMAIL" 
                value={persona.email} 
              />
              <DetalleRow 
                icon={Phone} 
                label="TELÉFONO" 
                value={persona.telefono} 
              />
              <DetalleRow 
                icon={Calendar} 
                label="FECHA REGISTRO" 
                value={formatFecha(persona.fecha_registro)} 
              />
            </div>

            <div className="md:col-span-2">
              <DetalleRow 
                icon={MapPin} 
                label="DIRECCIÓN" 
                value={`${persona.direccion || ''} ${persona.ciudad ? `- ${persona.ciudad}` : ''} ${persona.provincia ? `(${persona.provincia})` : ''}`.trim() || 'No especificada'} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetallePersonaModal;
