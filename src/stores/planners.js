import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { useProjectsStore } from './projects'
import { useBoardsStore } from './boards'
import { useSprintsStore } from './sprints'
import { useTicketsStore } from './tickets'
import { useTeamsStore } from './teams'

const ACTIVE_PLANNER_KEY = 'planner_active_id'

export const usePlannersStore = defineStore('planners', () => {
  const planners = ref([])
  // Nur für Admin-Systemverwaltung (Admin-Bereich → „Alle Planner"): enthält wirklich ALLE Planner,
  // unabhängig von eigener Mitgliedschaft. `planners` bleibt überall sonst auf eigene Mitgliedschaft beschränkt.
  const allPlanners = ref([])
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

  async function fetchAllPlanners() {
    loading.value = true
    try {
      const { data } = await api.get('/planners', { params: { all: true } })
      allPlanners.value = data
    } finally {
      loading.value = false
    }
  }

  function syncPlanner(data) {
    const idx1 = planners.value.findIndex(p => p.id === data.id)
    if (idx1 !== -1) planners.value[idx1] = data
    const idx2 = allPlanners.value.findIndex(p => p.id === data.id)
    if (idx2 !== -1) allPlanners.value[idx2] = data
  }

  function setActivePlanner(id) {
    if (id !== activePlannerId.value) {
      useProjectsStore().clear()
      useBoardsStore().clear()
      useSprintsStore().clear()
      useTicketsStore().clear()
      useTeamsStore().clear()
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
    allPlanners.value.push(data)
    return data
  }

  async function updatePlanner(id, plannerData) {
    const { data } = await api.put(`/planners/${id}`, plannerData)
    syncPlanner(data)
    return data
  }

  async function deletePlanner(id) {
    await api.delete(`/planners/${id}`)
    planners.value = planners.value.filter(p => p.id !== id)
    allPlanners.value = allPlanners.value.filter(p => p.id !== id)
    if (activePlannerId.value === id) setActivePlanner(null)
  }

  async function updateMembers(id, members) {
    const { data } = await api.put(`/planners/${id}/members`, { members })
    syncPlanner(data)
    return data
  }

  async function updateSettings(id, { ticketPrefix }) {
    const { data } = await api.put(`/planners/${id}/settings`, { ticketPrefix })
    syncPlanner(data)
    return data
  }

  return {
    planners, allPlanners, activePlannerId, activePlanner, loading,
    fetchPlanners, fetchAllPlanners, setActivePlanner,
    createPlanner, updatePlanner, deletePlanner,
    updateMembers, updateSettings,
  }
})
