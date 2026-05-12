import { X, User, FolderOpen, Calendar, FileText, Building2, Tag, Circle } from 'lucide-react';

const DetalleCarpetaModal = ({ carpeta, onClose }) => {
  if (!carpeta) return null;

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            <FolderOpen size={20} className="text-accent" />
            DETALLES DE CARPETA
          </h2>
          <button onClick={onClose} className="p-1 hover:text-accent">
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4">
          {/* Título principal */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 uppercase">NOMBRE / CARÁTULA</p>
            <p className="text-base font-bold">{carpeta.nombre}</p>
          </div>

          {/* Grid de detalles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <DetalleRow 
                icon={User} 
                label="CLIENTE" 
                value={carpeta.persona_nombre || 'No asignado'} 
              />
              <DetalleRow 
                icon={User} 
                label="CONTRAPARTE" 
                value={carpeta.contraparte || 'No asignado'} 
              />
              <DetalleRow 
                icon={Tag} 
                label="PARTE" 
                value={carpeta.parte} 
              />
            </div>

            <div className="space-y-1">
              <DetalleRow 
                icon={FileText} 
                label="N° EXPEDIENTE" 
                value={carpeta.numero_expediente || 'No asignado'} 
              />
              <DetalleRow 
                icon={Building2} 
                label="ORGANISMO" 
                value={carpeta.organismo_nombre || 'No asignado'} 
              />
              <DetalleRow 
                icon={Calendar} 
                label="FECHA INICIO" 
                value={formatFecha(carpeta.fecha_inicio)} 
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <DetalleRow 
                icon={Circle} 
                label="ESTADO" 
                value={
                  <span 
                    className="px-2 py-1 text-xs rounded-full text-white inline-block"
                    style={{ backgroundColor: carpeta.estado_color || '#4FC3F7' }}
                  >
                    {carpeta.estado_nombre || 'Sin estado'}
                  </span>
                } 
              />
              <DetalleRow 
                icon={Tag} 
                label="TIPO" 
                value={carpeta.tipo_nombre || 'No asignado'} 
              />
              <DetalleRow 
                icon={Tag} 
                label="OBJETO" 
                value={carpeta.objeto_nombre || 'No asignado'} 
              />
            </div>

            {carpeta.descripcion && (
              <div className="md:col-span-2">
                <DetalleRow 
                  icon={FileText} 
                  label="DESCRIPCIÓN" 
                  value={carpeta.descripcion} 
                />
              </div>
            )}
          </div>

          {/* Fechas de sistema */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
            <p>Última actualización: {formatFecha(carpeta.ultima_actualizacion)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalleCarpetaModal;
