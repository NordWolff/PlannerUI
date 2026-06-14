import { ref } from 'vue'
import api from '@/services/api'
import { generateAvatar } from '@/utils/avatar'

const users = ref([])
let fetched = false

export function useUsers() {
  async function fetchUsers() {
    if (fetched) return
    try {
      const { data } = await api.get('/users')
      users.value = data
      fetched = true
    } catch { /* silent */ }
  }

  function getUser(id) {
    return users.value.find(u => u.id === id) ?? null
  }

  function avatarUrl(id) {
    const u = getUser(id)
    return generateAvatar(u?.username)
  }

  return { users, fetchUsers, getUser, avatarUrl }
}
