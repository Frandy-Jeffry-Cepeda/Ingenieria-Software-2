import axios from 'axios';

// En producción (Docker/Coolify) nginx expone el backend bajo /api.
// Se puede sobreescribir en build con VITE_API_URL si el backend vive en otro dominio.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('nombre');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const getUsuarios = (rol) =>
  api.get('/usuarios', { params: rol ? { rol } : {} }).then((r) => r.data);
export const getUsuario = (id) => api.get(`/usuarios/${id}`).then((r) => r.data);
export const crearUsuario = (datos) => api.post('/usuarios', datos).then((r) => r.data);
export const actualizarUsuario = (id, datos) =>
  api.patch(`/usuarios/${id}`, datos).then((r) => r.data);

export const getCompras = () => api.get('/compras').then((r) => r.data);
export const getCompra = (id) => api.get(`/compras/${id}`).then((r) => r.data);
export const crearCompra = (datos) => api.post('/compras', datos).then((r) => r.data);

export const getEquipos = (filtros) =>
  api.get('/equipos', { params: filtros }).then((r) => r.data);
export const getResumen = () => api.get('/equipos/resumen').then((r) => r.data);
export const getEquipo = (id) => api.get(`/equipos/${id}`).then((r) => r.data);
export const getMovimientos = (id) =>
  api.get(`/equipos/${id}/movimientos`).then((r) => r.data);
export const actualizarEquipo = (id, datos) =>
  api.patch(`/equipos/${id}`, datos).then((r) => r.data);
export const entregarEquipo = (id, datos) =>
  api.post(`/equipos/${id}/entrega`, datos).then((r) => r.data);
export const devolverEquipo = (id, datos) =>
  api.post(`/equipos/${id}/devolucion`, datos).then((r) => r.data);
export const darDeBajaEquipo = (id, datos) =>
  api.post(`/equipos/${id}/baja`, datos).then((r) => r.data);
export const enviarMantenimientoEquipo = (id, datos) =>
  api.post(`/equipos/${id}/mantenimiento`, datos).then((r) => r.data);
export const getOrdenesMantenimiento = (id) =>
  api.get(`/equipos/${id}/mantenimiento`).then((r) => r.data);
