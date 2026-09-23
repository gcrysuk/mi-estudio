import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import TrialVencido from '../../pages/billing/TrialVencido';
import { useInactivityLogout } from '../../hooks/useInactivityLogout';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import useAuthStore from '../../stores/authStore';
import api from '../../services/api';

const Layout = () => {
  useInactivityLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const notif = useNotificaciones();
  const isSuperuser = useAuthStore(state => state.user?.is_superuser);
  const [trialVencido, setTrialVencido] = useState(false);

  useEffect(() => {
    if (isSuperuser) {
      setTrialVencido(false);
      return;
    }
    api.get('/billing/suscripcion/estado/')
      .then(({ data }) => {
        setTrialVencido(data.estado === 'trial' && data.dias_trial_restantes <= 0);
      })
      .catch(() => {});
  }, [isSuperuser]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {trialVencido && <TrialVencido />}
      {/* Overlay for mobile sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMobileMenuToggle={() => setMobileOpen(prev => !prev)} notif={notif} />
        <main className="flex-1 overflow-y-auto">
          <div className="flex justify-center">
            <div className="w-full max-w-[95%] lg:max-w-[90%] p-2 sm:p-4">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
