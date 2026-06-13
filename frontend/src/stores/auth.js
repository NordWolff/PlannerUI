import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref('')

  async function login(email, password) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.post('/auth/login', { email, password })
      token.value = data.token
      user.value = data.user
      localStorage.setItem('token', data.token)
      return true
    } catch (e) {
      error.value = e.response?.data?.error || 'Login fehlgeschlagen'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(username, email, password) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.post('/auth/register', { username, email, password })
      token.value = data.token
      user.value = data.user
      localStorage.setItem('token', data.token)
      return true
    } catch (e) {
      error.value = e.response?.data?.error || 'Registrierung fehlgeschlagen'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await api.get('/auth/me')
      user.value = data
    } catch {
      logout()
    }
  }

  async function updateProfile(data) {
    loading.value = true
    error.value = ''
    try {
      const { data: updated } = await api.put('/auth/me', data)
      user.value = updated
      return true
    } catch (e) {
      error.value = e.response?.data?.error || 'Fehler beim Aktualisieren'
      return false
    } finally {
      loading.value = false
    }
  }

  return { user, token, loading, error, login, register, logout, fetchMe, updateProfile }
})
