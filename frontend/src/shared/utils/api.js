// frontend/src/shared/utils/api.js
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// Injeta o token JWT em todas as requisições automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('logos:token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redireciona para login se o token expirar (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('logos:token')
      localStorage.removeItem('logos:user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
