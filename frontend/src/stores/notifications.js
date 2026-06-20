import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref([])
  const loading = ref(false)

  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

  async function fetchNotifications() {
    loading.value = true
    try {
      const { data } = await api.get('/notifications')
      notifications.value = data
    } catch {
      // silent — kein Toast, da im Hintergrund gepolt
    } finally {
      loading.value = false
    }
  }

  async function markRead(id) {
    const n = notifications.value.find(n => n.id === id)
    if (n) n.read = true
    try {
      await api.put(`/notifications/${id}/read`)
    } catch {
      if (n) n.read = false
    }
  }

  async function markAllRead() {
    notifications.value.forEach(n => { n.read = true })
    try {
      await api.put('/notifications/read-all')
    } catch {
      await fetchNotifications()
    }
  }

  async function remove(id) {
    notifications.value = notifications.value.filter(n => n.id !== id)
    try {
      await api.delete(`/notifications/${id}`)
    } catch {
      await fetchNotifications()
    }
  }

  return { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead, remove }
})
