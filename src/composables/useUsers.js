import { ref } from 'vue'
import api from '@/services/api'
import { generateAvatar } from '@/utils/avatar'

const users = ref([])
let fetched = false

export function useUsers() {
  async function fetchUsers(force = false) {
    if (fetched && !force) return
    try {
      const { data } = await api.get('/users')
      users.value = data
      fetched = true
    } catch { /* silent */ }
  }

  async function refreshUsers() {
    await fetchUsers(true)
  }

  function getUser(id) {
    return users.value.find(u => u.id === id) ?? null
  }

  function avatarUrl(id) {
    const u = getUser(id)
    return generateAvatar(u?.username)
  }

  function getOnlineStatus(id) {
    return getUser(id)?.onlineStatus ?? 'offline'
  }

  return { users, fetchUsers, refreshUsers, getUser, avatarUrl, getOnlineStatus }
}
