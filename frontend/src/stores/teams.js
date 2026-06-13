import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useTeamsStore = defineStore('teams', () => {
  const teams = ref([])
  const currentTeam = ref(null)
  const loading = ref(false)

  async function fetchTeams() {
    loading.value = true
    try {
      const { data } = await api.get('/teams')
      teams.value = data
    } finally {
      loading.value = false
    }
  }

  async function createTeam(teamData) {
    const { data } = await api.post('/teams', teamData)
    teams.value.push(data)
    return data
  }

  async function updateTeam(id, teamData) {
    const { data } = await api.put(`/teams/${id}`, teamData)
    const idx = teams.value.findIndex(t => t.id === id)
    if (idx !== -1) teams.value[idx] = data
    return data
  }

  async function deleteTeam(id) {
    await api.delete(`/teams/${id}`)
    teams.value = teams.value.filter(t => t.id !== id)
  }

  async function addMember(teamId, userId, role = 'member') {
    const { data } = await api.post(`/teams/${teamId}/members`, { userId, role })
    const idx = teams.value.findIndex(t => t.id === teamId)
    if (idx !== -1) teams.value[idx] = data
    if (currentTeam.value?.id === teamId) currentTeam.value = data
  }

  async function removeMember(teamId, userId) {
    await api.delete(`/teams/${teamId}/members/${userId}`)
    await fetchTeams()
    if (currentTeam.value?.id === teamId) {
      currentTeam.value = teams.value.find(t => t.id === teamId) || null
    }
  }

  function setCurrentTeam(team) {
    currentTeam.value = team
  }

  return { teams, currentTeam, loading, fetchTeams, createTeam, updateTeam, deleteTeam, addMember, removeMember, setCurrentTeam }
})
