import axios from 'axios';

// Vite detecta automáticamente si hiciste 'npm run build' (PROD = true)
const IS_PRODUCTION = import.meta.env.PROD;

const api = axios.create({
  // En producción (Railway/cPanel) el backend y frontend están en el mismo dominio,
  // por lo que usar '' hará que Axios use el dominio actual automáticamente.
  // La base URL se maneja ahora en el interceptor para evitar conflictos con barras iniciales (/)
  baseURL: IS_PRODUCTION 
    ? '' 
    : 'http://127.0.0.1:8000',
});

// Interceptor para agregar /api en producción y el token
api.interceptors.request.use((config) => {
  // Prepend /api en producción a todas las rutas relativas
  if (IS_PRODUCTION && config.url && !config.url.startsWith('http')) {
    config.url = config.url.startsWith('/') ? `/api${config.url}` : `/api/${config.url}`;
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    // Blindaje para evitar el error 401 en LiteSpeed/cPanel
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuesta para limpiar sesiones fantasma cuando el token es inválido o expiró (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthAttempt =
      requestUrl.includes('/login') ||
      requestUrl.includes('/register') ||
      requestUrl.includes('/auth/google');

    if (error.response?.status === 401 && !isAuthAttempt) {
      const hadSession = Boolean(localStorage.getItem('token') || localStorage.getItem('user'));
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (hadSession) {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('authChange'));

        const protectedPaths = ['/profile', '/editor/pro', '/pago/exitoso'];
        if (protectedPaths.some((p) => window.location.pathname.startsWith(p))) {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

// Create a separate instance for Admin Panel to isolate sessions
export const adminApi = axios.create({
  baseURL: IS_PRODUCTION 
    ? '' 
    : 'http://127.0.0.1:8000',
});

adminApi.interceptors.request.use((config) => {
  if (IS_PRODUCTION && config.url && !config.url.startsWith('http')) {
    config.url = config.url.startsWith('/') ? `/api${config.url}` : `/api/${config.url}`;
  }

  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthAttempt = requestUrl.includes('/login');

    if ((error.response?.status === 401 || error.response?.status === 403) && !isAuthAttempt) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.dispatchEvent(new Event('storage'));
    }
    return Promise.reject(error);
  }
);

export default api;