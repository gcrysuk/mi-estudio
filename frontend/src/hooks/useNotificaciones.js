import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const POLL_MS = 5 * 60 * 1000; // 5 minutos

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const refetch = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/movimientos/notificaciones/pendientes/');
      setNotificaciones(res.data.results ?? res.data ?? []);
    } catch {
      // silencioso — no interrumpir el flujo del usuario
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, POLL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  // Limpiar al cerrar sesión
  useEffect(() => {
    if (!isAuthenticated) setNotificaciones([]);
  }, [isAuthenticated]);

  const marcarLeida = useCallback(async (id) => {
    try {
      await api.post(`/movimientos/notificaciones/${id}/marcar_leida/`);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
    } catch {
      toast.error('Error al marcar notificación');
    }
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    try {
      await Promise.all(
        notificaciones.map(n =>
          api.post(`/movimientos/notificaciones/${n.id}/marcar_leida/`)
        )
      );
      setNotificaciones([]);
    } catch {
      //
    }
  }, [notificaciones]);

  return {
    notificaciones,
    count: notificaciones.length,
    marcarLeida,
    marcarTodasLeidas,
    refetch,
  };
}
