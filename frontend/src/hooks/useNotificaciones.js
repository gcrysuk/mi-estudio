import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const POLL_MS = 10 * 1000;

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionesSistema, setNotificacionesSistema] = useState([]);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const refetch = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [resVenc, resSist] = await Promise.all([
        api.get('/movimientos/notificaciones/pendientes/'),
        api.get('/movimientos/notificaciones_sistema/?no_leidas=true'),
      ]);
      setNotificaciones(resVenc.data.results ?? resVenc.data ?? []);
      const nuevasSistema = resSist.data.results ?? [];
      setNotificacionesSistema(prev => {
        const prevIds = new Set(prev.map(n => n.id));
        const hayMevNueva = nuevasSistema.some(
          n => (n.tipo === 'mev_nuevo_movimiento' || n.tipo === 'mev_cambio_estado') && !prevIds.has(n.id)
        );
        if (hayMevNueva) window._mev_last_sync = Date.now();
        return nuevasSistema;
      });
    } catch {
      // silencioso
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, POLL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotificaciones([]);
      setNotificacionesSistema([]);
    }
  }, [isAuthenticated]);

  const marcarLeida = useCallback(async (id) => {
    try {
      await api.post(`/movimientos/notificaciones/${id}/marcar_leida/`);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
    } catch {
      toast.error('Error al marcar notificación');
    }
  }, []);

  const marcarLeidaSistema = useCallback(async (id) => {
    try {
      await api.patch(`/movimientos/notificaciones_sistema/${id}/marcar_leida/`);
      setNotificacionesSistema(prev => prev.filter(n => n.id !== id));
    } catch {
      toast.error('Error al marcar notificación');
    }
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    try {
      await Promise.all([
        ...notificaciones.map(n => api.post(`/movimientos/notificaciones/${n.id}/marcar_leida/`)),
        api.patch('/movimientos/notificaciones_sistema/marcar_todas_leidas/'),
      ]);
      setNotificaciones([]);
      setNotificacionesSistema([]);
    } catch {
      //
    }
  }, [notificaciones]);

  return {
    notificaciones,
    notificacionesSistema,
    count: notificaciones.length + notificacionesSistema.length,
    marcarLeida,
    marcarLeidaSistema,
    marcarTodasLeidas,
    refetch,
  };
}
