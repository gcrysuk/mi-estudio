import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const POLL_MS = 10 * 1000;

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [feed, setFeed] = useState([]);
  const [feedNoLeidasCount, setFeedNoLeidasCount] = useState(0);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const refetch = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [resVenc, resFeed] = await Promise.all([
        api.get('/movimientos/notificaciones/pendientes/'),
        api.get('/movimientos/notificaciones_sistema/feed/?no_leidas=true'),
      ]);
      setNotificaciones(resVenc.data.results ?? resVenc.data ?? []);
      setFeed(resFeed.data.results ?? []);
      setFeedNoLeidasCount(resFeed.data.no_leidas_count ?? 0);
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
      setFeed([]);
      setFeedNoLeidasCount(0);
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

  const marcarLeidaFeed = useCallback(async (item) => {
    try {
      await api.patch('/movimientos/notificaciones_sistema/feed_marcar_leida/', {
        origen: item.origen,
        id: item.id,
      });
      setFeed(prev => prev.filter(n => !(n.origen === item.origen && n.id === item.id)));
      setFeedNoLeidasCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error('Error al marcar notificación');
    }
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    try {
      await Promise.all([
        ...notificaciones.map(n => api.post(`/movimientos/notificaciones/${n.id}/marcar_leida/`)),
        api.patch('/movimientos/notificaciones_sistema/feed_marcar_todas_leidas/'),
      ]);
      setNotificaciones([]);
      setFeed([]);
      setFeedNoLeidasCount(0);
    } catch {
      //
    }
  }, [notificaciones]);

  return {
    notificaciones,
    feed,
    count: notificaciones.length + feedNoLeidasCount,
    marcarLeida,
    marcarLeidaFeed,
    marcarTodasLeidas,
    refetch,
  };
}
