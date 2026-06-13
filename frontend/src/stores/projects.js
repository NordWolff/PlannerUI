import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref([])
  const loading = ref(false)

  async function fetchProjects(filters = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/projects', { params: filters })
      projects.value = data
    } finally {
      loading.value = false
    }
  }

  async function createProject(projectData) {
    const { data } = await api.post('/projects', projectData)
    projects.value.push(data)
    return data
  }

  async function updateProject(id, projectData) {
    const { data } = await api.put(`/projects/${id}`, projectData)
    const idx = projects.value.findIndex(p => p.id === id)
    if (idx !== -1) projects.value[idx] = data
    return data
  }

  async function deleteProject(id) {
    await api.delete(`/projects/${id}`)
    projects.value = projects.value.filter(p => p.id !== id)
  }

  function toggleFavorite(id) {
    const idx = projects.value.findIndex(p => p.id === id)
    if (idx !== -1) projects.value[idx] = { ...projects.value[idx], isFavorite: !projects.value[idx].isFavorite }
  }

  return { projects, loading, fetchProjects, createProject, updateProject, deleteProject, toggleFavorite }
})
