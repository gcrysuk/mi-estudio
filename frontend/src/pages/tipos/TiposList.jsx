import { useState } from 'react';
import { Tags } from 'lucide-react';
import ConfigManager from '../../components/common/ConfigManager';

const TABS = [
  {
    id: 'tipos_carpeta',
    label: 'Tipos de Carpeta',
    endpoint: '/carpetas/tipos/',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'orden', label: 'Orden', type: 'number', default: 0 },
    ],
  },
  {
    id: 'estados_carpeta',
    label: 'Estados de Carpeta',
    endpoint: '/carpetas/estados/',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'color', label: 'Color', type: 'color', default: '#4FC3F7' },
      { key: 'orden', label: 'Orden', type: 'number', default: 0 },
    ],
  },
  {
    id: 'objetos_carpeta',
    label: 'Objetos de Carpeta',
    endpoint: '/carpetas/objetos/',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'orden', label: 'Orden', type: 'number', default: 0 },
    ],
  },
  {
    id: 'tipos_movimiento',
    label: 'Tipos de Movimiento',
    endpoint: '/movimientos/tipos/',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'color', label: 'Color', type: 'color', default: '#4FC3F7' },
      { key: 'orden', label: 'Orden', type: 'number', default: 0 },
    ],
  },
  {
    id: 'estados_movimiento',
    label: 'Estados de Movimiento',
    endpoint: '/movimientos/estados/',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'color', label: 'Color', type: 'color', default: '#4FC3F7' },
      { key: 'orden', label: 'Orden', type: 'number', default: 0 },
    ],
  },
];

const TiposList = () => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const current = TABS.find(t => t.id === activeTab);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold uppercase flex items-center gap-2">
          <Tags className="text-accent" size={24} />
          TIPOS Y ESTADOS
        </h1>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-semibold uppercase whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {current && (
            <ConfigManager
              key={current.id}
              title={current.label.toUpperCase()}
              endpoint={current.endpoint}
              fields={current.fields}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TiposList;
