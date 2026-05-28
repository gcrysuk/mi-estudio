import api from './api'

export const getKanbanConfig = () => api.get('/movimientos/kanban/config/')
export const saveKanbanConfig = (data) => api.post('/movimientos/kanban/config/', data)
export const getKanbanBoard = () => api.get('/movimientos/kanban/board/')
export const cambiarEstadoMovimiento = (id, estadoId) =>
  api.patch(`/movimientos/${id}/cambiar_estado/`, { estado_id: estadoId })
export const getEstadosActivos = () => api.get('/movimientos/estados/')
