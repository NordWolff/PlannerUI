<script setup>
import { onMounted, ref, computed, reactive } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useTeamsStore } from '@/stores/teams'
import { useSprintsStore } from '@/stores/sprints'
import { useToast } from '@/composables/useToast'
import BaseModal from '@/components/common/BaseModal.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const projectsStore = useProjectsStore()
const toast = useToast()
const teamsStore = useTeamsStore()
const sprintsStore = useSprintsStore()

const search = ref('')
const showModal = ref(false)
const editingProject = ref(null)
const projectForm = reactive({ name: '', description: '', status: 'active', teamId: null, sprintId: null })

onMounted(() => Promise.all([projectsStore.fetchProjects(), teamsStore.fetchTeams(), sprintsStore.fetchSprints()]))

const filtered = computed(() =>
  projectsStore.projects.filter(p => p.name.toLowerCase().includes(search.value.toLowerCase()))
)

function openCreate() {
  editingProject.value = null
  Object.assign(projectForm, { name: '', description: '', status: 'active', teamId: null, sprintId: null })
  showModal.value = true
}

function openEdit(project) {
  editingProject.value = project
  Object.assign(projectForm, {
    name: project.name,
    description: project.description || '',
    status: project.status || 'active',
    teamId: project.teamId || null,
    sprintId: project.sprintId || null,
  })
  showModal.value = true
}

async function saveProject() {
  if (editingProject.value) {
    await projectsStore.updateProject(editingProject.value.id, projectForm)
    toast.success('Projekt aktualisiert')
  } else {
    await projectsStore.createProject(projectForm)
    toast.success('Projekt erstellt')
  }
  showModal.value = false
}

async function deleteProject(id) {
  if (!confirm('Projekt wirklich löschen?')) return
  await projectsStore.deleteProject(id)
  toast.info('Projekt gelöscht')
}

async function updateSprint(project, sprintId) {
  await projectsStore.updateProject(project.id, { sprintId: sprintId || null })
}

const teamName = (teamId) => teamsStore.teams.find(t => t.id === teamId)?.name || '-'
const sprintName = (sprintId) => sprintsStore.sprints.find(s => s.id === sprintId)?.name || null
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Projekte</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Alle Projekte verwalten</p>
      </div>
      <button @click="openCreate" class="btn-primary">+ Projekt erstellen</button>
    </div>

    <SearchInput v-model="search" placeholder="Projekte suchen..." />

    <div class="card overflow-hidden p-0">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th class="px-6 py-3">Name</th>
              <th class="px-6 py-3">Status</th>
              <th class="px-6 py-3">Team</th>
              <th class="px-6 py-3">Sprint</th>
              <th class="px-6 py-3">Favorit</th>
              <th class="px-6 py-3">Aktionen</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-if="projectsStore.loading">
              <td colspan="6" class="px-6 py-10 text-center text-gray-400">Laden...</td>
            </tr>
            <tr v-for="project in filtered" :key="project.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td class="px-6 py-4">
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ project.name }}</p>
                  <p v-if="project.description" class="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{{ project.description }}</p>
                </div>
              </td>
              <td class="px-6 py-4"><StatusBadge :status="project.status" /></td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ teamName(project.teamId) }}</td>
              <td class="px-6 py-4">
                <select :value="project.sprintId || ''" @change="updateSprint(project, $event.target.value)"
                  class="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 dark:text-white">
                  <option value="">-- Kein Sprint --</option>
                  <option v-for="sprint in sprintsStore.sprints" :key="sprint.id" :value="sprint.id">{{ sprint.name }}</option>
                </select>
              </td>
              <td class="px-6 py-4">
                <button @click="projectsStore.toggleFavorite(project.id)"
                  :class="project.isFavorite ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </button>
              </td>
              <td class="px-6 py-4">
                <div class="flex gap-2">
                  <button @click="openEdit(project)" class="text-indigo-600 dark:text-indigo-400 hover:underline text-sm">Bearbeiten</button>
                  <button @click="deleteProject(project.id)" class="text-red-500 hover:underline text-sm">Löschen</button>
                </div>
              </td>
            </tr>
            <tr v-if="!projectsStore.loading && !filtered.length">
              <td colspan="6" class="px-6 py-10 text-center text-sm text-gray-400">Keine Projekte gefunden</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal v-if="showModal" :title="editingProject ? 'Projekt bearbeiten' : 'Neues Projekt'" size="lg" @close="showModal = false">
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input v-model="projectForm.name" type="text" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
          <textarea v-model="projectForm.description" rows="3" class="input-field resize-none" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select v-model="projectForm.status" class="input-field">
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="completed">Abgeschlossen</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team</label>
            <select v-model="projectForm.teamId" class="input-field">
              <option :value="null">-- Kein Team --</option>
              <option v-for="t in teamsStore.teams" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sprint</label>
            <select v-model="projectForm.sprintId" class="input-field">
              <option :value="null">-- Kein Sprint --</option>
              <option v-for="s in sprintsStore.sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
        </div>
      </div>
      <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="showModal = false" class="btn-secondary">Abbrechen</button>
        <button @click="saveProject" :disabled="!projectForm.name" class="btn-primary">Speichern</button>
      </div>
    </BaseModal>
  </div>
</template>
