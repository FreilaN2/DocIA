import axios from 'axios';

// Vite detecta automáticamente si hiciste 'npm run build' (PROD = true)
const IS_PRODUCTION = import.meta.env.PROD;

const api = axios.create({
  // En producción (Railway/cPanel) el backend y frontend están en el mismo dominio,
  // por lo que usar '' hará que Axios use el dominio actual automáticamente.
  baseURL: IS_PRODUCTION 
    ? '/api' 
    : 'http://127.0.0.1:8000',
});

// Interceptor para incluir el token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // Blindaje para evitar el error 401 en LiteSpeed/cPanel
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Create a separate instance for Admin Panel to isolate sessions
export const adminApi = axios.create({
  baseURL: IS_PRODUCTION 
    ? '/api' 
    : 'http://127.0.0.1:8000',
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;