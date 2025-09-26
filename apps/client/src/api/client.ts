import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

api.interceptors.request.use((config) => {
  // Eğer çağrı özel bir Authorization header ile gelmişse (örn. admin_token), üzerine yazmayalım
  const hasAuthHeader = !!(config.headers as any)?.Authorization;
  if (!hasAuthHeader) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const url: string | undefined = error?.config?.url;
    if (status === 401 || (status === 404 && url && url.includes('/auth/me'))) {
      try { localStorage.removeItem('token'); } catch {}
    }
    return Promise.reject(error);
  }
);


