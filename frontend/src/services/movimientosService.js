import api from './api';

export const getResumen = () => api.get('/movimientos/resumen/');
