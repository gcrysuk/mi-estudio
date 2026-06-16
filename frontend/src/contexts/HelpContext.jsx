import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const HelpContext = createContext({ ayudaActiva: true, toggleAyuda: () => {} });

const LS_KEY = 'ayuda_contextual';

export const HelpProvider = ({ children }) => {
  const [ayudaActiva, setAyudaActiva] = useState(
    () => localStorage.getItem(LS_KEY) !== 'false'
  );
  const notifConfigRef = useRef({});
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/usuarios/perfil/')
      .then(res => {
        const config = res.data?.notificacion_config ?? {};
        notifConfigRef.current = config;
        if (typeof config.ayuda_contextual === 'boolean') {
          setAyudaActiva(config.ayuda_contextual);
          localStorage.setItem(LS_KEY, String(config.ayuda_contextual));
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const toggleAyuda = useCallback(() => {
    setAyudaActiva(prev => {
      const next = !prev;
      localStorage.setItem(LS_KEY, String(next));
      const merged = { ...notifConfigRef.current, ayuda_contextual: next };
      notifConfigRef.current = merged;
      api.patch('/usuarios/perfil/', { notificacion_config: merged }).catch(() => {});
      return next;
    });
  }, []);

  return (
    <HelpContext.Provider value={{ ayudaActiva, toggleAyuda }}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = () => useContext(HelpContext);
