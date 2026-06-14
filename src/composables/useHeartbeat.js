import { onMounted, onUnmounted } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useUsers } from './useUsers'

const INTERVAL_MS = 60_000

export function useHeartbeat() {
  const authStore = useAuthStore()
  const { refreshUsers } = useUsers()
  let timer = null

  async function ping() {
    if (!authStore.user) return
    try {
      await api.post('/auth/heartbeat')
      await refreshUsers()
    } catch { /* silent */ }
  }

  onMounted(() => {
    ping()
    timer = setInterval(ping, INTERVAL_MS)
  })

  onUnmounted(() => {
    clearInterval(timer)
  })
}
