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
const projectForm = reactive({ name: '', description: '', status: 'active', teamId: null, sprintIds: [] })

// Sprint-Dropdown pro Tabellenzeile
const openSprintDropdown = ref(null)

onMounted(() => Promise.all([projectsStore.fetchProjects(), teamsStore.fetchTeams(), sprintsStore.fetchSprints()]))

const filtered = computed(() =>
  projectsStore.projects.filter(p => p.name.toLowerCase().includes(search.value.toLowerCase()))
)

function openCreate() {
  editingProject.value = null
  Object.assign(projectForm, { name: '', description: '', status: 'active', teamId: null, sprintIds: [] })
  showModal.value = true
}

function openEdit(project) {
  editingProject.value = project
  Object.assign(projectForm, {
    name: project.name,
    description: project.description || '',
    status: project.status || 'active',
    teamId: project.teamId || null,
    sprintIds: Array.isArray(project.sprintIds) ? [...project.sprintIds] : [],
  })
  showModal.value = true
}

async function saveProject() {
  if (editingProject.value) {
    await projectsStore.updateProject(editingProject.value.id, { ...projectForm })
    toast.success('Projekt aktualisiert')
  } else {
    await projectsStore.createProject({ ...projectForm })
    toast.success('Projekt erstellt')
  }
  showModal.value = false
}

async function deleteProject(id) {
  if (!confirm('Projekt wirklich löschen?')) return
  await projectsStore.deleteProject(id)
  toast.info('Projekt gelöscht')
}

async function toggleSprintInRow(project, sprintId) {
  const current = Array.isArray(project.sprintIds) ? [...project.sprintIds] : []
  const next = current.includes(sprintId)
    ? current.filter(id => id !== sprintId)
    : [...current, sprintId]
  await projectsStore.updateProject(project.id, { sprintIds: next })
}

function sprintNames(project) {
  const ids = Array.isArray(project.sprintIds) ? project.sprintIds : []
  return ids.map(id => sprintsStore.sprints.find(s => s.id === id)?.name).filter(Boolean)
}

const teamName = (teamId) => teamsStore.teams.find(t => t.id === teamId)?.name || '-'

function toggleFormSprint(sprintId) {
  const idx = projectForm.sprintIds.indexOf(sprintId)
  if (idx === -1) projectForm.sprintIds.push(sprintId)
  else projectForm.sprintIds.splice(idx, 1)
}
</script>

<template>
  <div class="space-y-6" @click="openSprintDropdown = null">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Projekte</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Alle Projekte verwalten</p>
      </div>
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
              <th class="px-6 py-3">Sprints</th>
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

              <!-- Sprint-Spalte: Badges + Dropdown -->
              <td class="px-6 py-4" @click.stop>
                <div class="relative">
                  <button
                    @click="openSprintDropdown = openSprintDropdown === project.id ? null : project.id"
                    class="flex flex-wrap gap-1 items-center min-w-[120px] min-h-[28px] text-left"
                  >
                    <span v-if="!sprintNames(project).length"
                      class="text-xs text-gray-400 dark:text-gray-500 italic">Kein Sprint</span>
                    <span v-for="name in sprintNames(project)" :key="name"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                      {{ name }}
                    </span>
                    <svg class="w-3 h-3 text-gray-400 ml-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <!-- Sprint-Dropdown -->
                  <div v-if="openSprintDropdown === project.id"
                    class="absolute left-0 top-full mt-1 z-30 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                    <label v-for="sprint in sprintsStore.sprints" :key="sprint.id"
                      class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer">
                      <input type="checkbox"
                        :checked="(project.sprintIds ?? []).includes(sprint.id)"
                        @change="toggleSprintInRow(project, sprint.id)"
                        class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500" />
                      {{ sprint.name }}
                    </label>
                    <p v-if="!sprintsStore.sprints.length" class="px-3 py-2 text-xs text-gray-400">Keine Sprints vorhanden</p>
                  </div>
                </div>
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

    <!-- Erstellen / Bearbeiten Modal -->
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
        <div class="grid grid-cols-2 gap-4">
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
        </div>

        <!-- Sprints: Checkboxen -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sprints</label>
          <div class="rounded-lg border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
            <label v-for="sprint in sprintsStore.sprints" :key="sprint.id"
              class="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors">
              <input type="checkbox"
                :checked="projectForm.sprintIds.includes(sprint.id)"
                @change="toggleFormSprint(sprint.id)"
                class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500" />
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ sprint.name }}</span>
            </label>
            <div v-if="!sprintsStore.sprints.length" class="px-4 py-3 text-sm text-gray-400 italic">
              Keine Sprints vorhanden
            </div>
          </div>
          <p v-if="projectForm.sprintIds.length" class="text-xs text-indigo-600 dark:text-indigo-400 mt-1.5">
            {{ projectForm.sprintIds.length }} Sprint{{ projectForm.sprintIds.length !== 1 ? 's' : '' }} ausgewählt
          </p>
        </div>
      </div>
      <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="showModal = false" class="btn-secondary">Abbrechen</button>
        <button @click="saveProject" :disabled="!projectForm.name" class="btn-primary">Speichern</button>
      </div>
    </BaseModal>
  </div>
</template>
