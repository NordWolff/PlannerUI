import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useSprintsStore = defineStore('sprints', () => {
  const sprints = ref([])
  const currentSprint = ref(null)
  const loading = ref(false)

  async function fetchSprints(filters = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/sprints', { params: filters })
      sprints.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchCurrentSprint() {
    try {
      const { data } = await api.get('/sprints/current')
      currentSprint.value = data
      return data
    } catch {
      currentSprint.value = null
      return null
    }
  }

  async function createSprint(sprintData) {
    const { data } = await api.post('/sprints', sprintData)
    sprints.value.push(data)
    return data
  }

  async function updateSprint(id, sprintData) {
    const { data } = await api.put(`/sprints/${id}`, sprintData)
    const idx = sprints.value.findIndex(s => s.id === id)
    if (idx !== -1) sprints.value[idx] = data
    return data
  }

  async function deleteSprint(id) {
    await api.delete(`/sprints/${id}`)
    sprints.value = sprints.value.filter(s => s.id !== id)
  }

  async function startSprint(id) {
    const { data } = await api.post(`/sprints/${id}/start`)
    const idx = sprints.value.findIndex(s => s.id === id)
    if (idx !== -1) sprints.value[idx] = data
    return data
  }

  async function completeSprint(id) {
    const { data } = await api.post(`/sprints/${id}/complete`)
    const idx = sprints.value.findIndex(s => s.id === id)
    if (idx !== -1) sprints.value[idx] = data
    return data
  }

  function clear() { sprints.value = []; currentSprint.value = null }

  return { sprints, currentSprint, loading, fetchSprints, fetchCurrentSprint, createSprint, updateSprint, deleteSprint, startSprint, completeSprint, clear }
})
