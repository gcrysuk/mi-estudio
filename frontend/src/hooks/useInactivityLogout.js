import { useEffect } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../stores/authStore';

const TIMEOUT_MS  = 30 * 60 * 1000; // 30 min
const WARNING_MS  = 28 * 60 * 1000; // 28 min (aviso 2 min antes)
const EVENTS      = ['mousemove', 'keydown', 'click', 'scroll'];

export function useInactivityLogout() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const logout          = useAuthStore(state => state.logout);

  useEffect(() => {
    if (!isAuthenticated) return;

    let logoutTimer;
    let warningTimer;
    let warningToastId;

    const reset = () => {
      clearTimeout(logoutTimer);
      clearTimeout(warningTimer);
      if (warningToastId) {
        toast.dismiss(warningToastId);
        warningToastId = null;
      }

      warningTimer = setTimeout(() => {
        warningToastId = toast('Tu sesión expirará en 2 minutos por inactividad', {
          duration: 2 * 60 * 1000,
          icon: '⚠️',
        });
      }, WARNING_MS);

      logoutTimer = setTimeout(() => {
        logout();
        toast('Sesión cerrada por inactividad', { icon: '🔒', duration: 4000 });
      }, TIMEOUT_MS);
    };

    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(logoutTimer);
      clearTimeout(warningTimer);
    };
  }, [isAuthenticated, logout]);
}
