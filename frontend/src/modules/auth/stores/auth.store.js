// frontend/src/modules/auth/stores/auth.store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/shared/utils/api'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {

  // ── State ──────────────────────────────────────────────────
  const user  = ref(JSON.parse(localStorage.getItem('logos:user') || 'null'))
  const token = ref(localStorage.getItem('logos:token') || null)

  // ── Getters ────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value)

  // ── Actions ────────────────────────────────────────────────
  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    _persist(data)
  }

  async function register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password })
    _persist(data)
  }

  async function logout() {
    try { await api.post('/auth/logout') } catch { /* ignora */ }
    _clear()
    router.push({ name: 'Login' })
  }

  async function fetchMe() {
    try {
      const { data } = await api.get('/auth/me')
      user.value = data.user
      localStorage.setItem('logos:user', JSON.stringify(data.user))
    } catch {
      _clear()
    }
  }

  function _persist({ token: t, user: u }) {
    token.value = t
    user.value  = u
    localStorage.setItem('logos:token', t)
    localStorage.setItem('logos:user',  JSON.stringify(u))
  }

  function _clear() {
    token.value = null
    user.value  = null
    localStorage.removeItem('logos:token')
    localStorage.removeItem('logos:user')
  }

  return { user, token, isAuthenticated, login, register, logout, fetchMe }
})
