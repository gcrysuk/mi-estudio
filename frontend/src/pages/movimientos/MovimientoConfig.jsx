import { useState } from 'react';
import { X, Tag, Circle } from 'lucide-react';
import TipoMovimientoManager from './TipoMovimientoManager';
import EstadoMovimientoManager from './EstadoMovimientoManager';

const MovimientoConfig = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('tipos');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold uppercase">CONFIGURACIÓN DE MOVIMIENTOS</h2>
          <button onClick={onClose} className="p-1 hover:text-accent">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          <button
            onClick={() => setActiveTab('tipos')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'tipos'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Tag size={18} />
            <span className="font-medium uppercase text-sm">TIPOS</span>
          </button>
          <button
            onClick={() => setActiveTab('estados')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'estados'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Circle size={18} />
            <span className="font-medium uppercase text-sm">ESTADOS</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'tipos' ? (
            <TipoMovimientoManager onClose={onClose} />
          ) : (
            <EstadoMovimientoManager onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MovimientoConfig;
