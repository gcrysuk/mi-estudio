import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MovimientoForm from '../../pages/movimientos/MovimientoForm';

const Layout = () => {
  const [showMovimientoForm, setShowMovimientoForm] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="flex justify-center">
            <div className="w-full max-w-[95%] lg:max-w-[90%] p-2 sm:p-4">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* FAB - Agregar Movimiento */}
      <button
        onClick={() => setShowMovimientoForm(true)}
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 40 }}
        className="flex items-center gap-2 h-14 px-5 bg-accent hover:bg-accent-hover text-white rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 text-sm font-semibold"
      >
        <Plus size={20} strokeWidth={2.5} />
        Agregar Movimiento
      </button>

      {showMovimientoForm && (
        <MovimientoForm
          onClose={() => setShowMovimientoForm(false)}
          onSave={() => setShowMovimientoForm(false)}
        />
      )}
    </div>
  );
};

export default Layout;
