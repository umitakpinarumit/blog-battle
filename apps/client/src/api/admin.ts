import axios from 'axios'

export const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
})

adminApi.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (token) {
    config.headers = config.headers || {}
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  return config
})


