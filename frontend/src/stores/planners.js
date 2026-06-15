import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { useProjectsStore } from './projects'
import { useBoardsStore } from './boards'
import { useSprintsStore } from './sprints'
import { useTicketsStore } from './tickets'

const ACTIVE_PLANNER_KEY = 'planner_active_id'

export const usePlannersStore = defineStore('planners', () => {
  const planners = ref([])
  const activePlannerId = ref(localStorage.getItem(ACTIVE_PLANNER_KEY) || null)
  const loading = ref(false)

  const activePlanner = computed(() =>
    planners.value.find(p => p.id === activePlannerId.value) ?? null
  )

  async function fetchPlanners() {
    loading.value = true
    try {
      const { data } = await api.get('/planners')
      planners.value = data
      // Falls gespeicherter Planner nicht (mehr) zugänglich ist, zurücksetzen
      if (activePlannerId.value && !data.find(p => p.id === activePlannerId.value)) {
        setActivePlanner(null)
      }
    } finally {
      loading.value = false
    }
  }

  function setActivePlanner(id) {
    if (id !== activePlannerId.value) {
      useProjectsStore().clear()
      useBoardsStore().clear()
      useSprintsStore().clear()
      useTicketsStore().clear()
    }
    activePlannerId.value = id
    if (id) {
      localStorage.setItem(ACTIVE_PLANNER_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_PLANNER_KEY)
    }
  }

  async function createPlanner(plannerData) {
    const { data } = await api.post('/planners', plannerData)
    planners.value.push(data)
    return data
  }

  async function updatePlanner(id, plannerData) {
    const { data } = await api.put(`/planners/${id}`, plannerData)
    const idx = planners.value.findIndex(p => p.id === id)
    if (idx !== -1) planners.value[idx] = data
    return data
  }

  async function deletePlanner(id) {
    await api.delete(`/planners/${id}`)
    planners.value = planners.value.filter(p => p.id !== id)
    if (activePlannerId.value === id) setActivePlanner(null)
  }

  async function updateMembers(id, members) {
    const { data } = await api.put(`/planners/${id}/members`, { members })
    const idx = planners.value.findIndex(p => p.id === id)
    if (idx !== -1) planners.value[idx] = data
    return data
  }

  async function updateTeams(id, teamIds) {
    const { data } = await api.put(`/planners/${id}/teams`, { teamIds })
    const idx = planners.value.findIndex(p => p.id === id)
    if (idx !== -1) planners.value[idx] = data
    return data
  }

  async function updateSettings(id, { ticketPrefix }) {
    const { data } = await api.put(`/planners/${id}/settings`, { ticketPrefix })
    const idx = planners.value.findIndex(p => p.id === id)
    if (idx !== -1) planners.value[idx] = data
    return data
  }

  return {
    planners, activePlannerId, activePlanner, loading,
    fetchPlanners, setActivePlanner,
    createPlanner, updatePlanner, deletePlanner,
    updateMembers, updateTeams, updateSettings,
  }
})
