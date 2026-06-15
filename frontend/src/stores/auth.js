import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

const COOKIE_NAME = 'planner_token'
const SESSION_KEY = 'planner_token'
const REMEMBER_EMAIL_KEY = 'planner_email'
const REMEMBER_FLAG_KEY  = 'planner_remember'

function setCookie(name, value, days) {
  const exp = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`
}
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}
function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
}

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)
  const token   = ref(getCookie(COOKIE_NAME) || sessionStorage.getItem(SESSION_KEY) || null)
  const loading = ref(false)
  const error   = ref('')

  const savedEmail    = computed(() => localStorage.getItem(REMEMBER_EMAIL_KEY) || '')
  const savedRemember = computed(() => localStorage.getItem(REMEMBER_FLAG_KEY) === '1')

  async function login(email, password, rememberMe = false) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.post('/auth/login', { email, password })
      token.value = data.token
      user.value  = data.user

      if (rememberMe) {
        setCookie(COOKIE_NAME, data.token, 30)
        sessionStorage.removeItem(SESSION_KEY)
        localStorage.setItem(REMEMBER_EMAIL_KEY, email)
        localStorage.setItem(REMEMBER_FLAG_KEY, '1')
      } else {
        sessionStorage.setItem(SESSION_KEY, data.token)
        deleteCookie(COOKIE_NAME)
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
        localStorage.removeItem(REMEMBER_FLAG_KEY)
      }
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
      user.value  = data.user
      sessionStorage.setItem(SESSION_KEY, data.token)
      deleteCookie(COOKIE_NAME)
      return true
    } catch (e) {
      error.value = e.response?.data?.error || 'Registrierung fehlgeschlagen'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    api.post('/auth/logout').catch(() => {}) // fire-and-forget, Token noch gültig
    token.value = null
    user.value  = null
    deleteCookie(COOKIE_NAME)
    sessionStorage.removeItem(SESSION_KEY)
    // E-Mail und Remember-Flag bleiben erhalten, damit das Formular vorausgefüllt bleibt
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

  async function setFavoritePlanner(plannerId) {
    const { data } = await api.put(`/users/${user.value.id}/favorites`, { plannerId })
    user.value = data
  }

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin         = computed(() => user.value?.role === 'admin')
  const favoritePlannerId = computed(() => user.value?.favorites?.plannerId ?? null)

  return {
    user, token, loading, error,
    isAuthenticated, isAdmin, favoritePlannerId,
    savedEmail, savedRemember,
    login, register, logout, fetchMe, updateProfile, setFavoritePlanner,
  }
})
