import ConfigManager from '../../components/common/ConfigManager';

const EstadoMovimientoManager = ({ onClose, onSave }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-bold uppercase">ESTADOS DE MOVIMIENTO</h2>
          <button onClick={onClose} className="p-1 hover:text-accent">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <ConfigManager
            title="ESTADO"
            endpoint="/movimientos/estados/"
            fields={[
              { key: 'nombre', label: 'Nombre', type: 'text', required: true },
              { key: 'color', label: 'Color', type: 'color', default: '#4FC3F7' },
              { key: 'orden', label: 'Orden', type: 'number', default: 0 }
            ]}
            onSave={onSave}
          />
        </div>
      </div>
    </div>
  );
};

export default EstadoMovimientoManager;
