import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref({ teams: 0, projects: 0, tickets: 0, boards: 0 })
  const activity = ref([])
  const loading = ref(false)

  async function fetchStats() {
    loading.value = true
    try {
      const { data } = await api.get('/dashboard/stats')
      stats.value = {
        teams: data.teams?.total ?? 0,
        projects: data.projects?.total ?? 0,
        tickets: data.tickets?.total ?? 0,
        boards: data.boards?.total ?? 0,
        byStatus: data.tickets?.byStatus ?? {},
        currentSprint: data.sprints?.current ?? null
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchActivity() {
    const { data } = await api.get('/dashboard/activity')
    activity.value = data
  }

  return { stats, activity, loading, fetchStats, fetchActivity }
})
