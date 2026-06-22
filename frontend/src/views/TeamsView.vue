<script setup>
import { onMounted, ref, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useTeamsStore } from '@/stores/teams'
import { useSprintsStore } from '@/stores/sprints'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { usePlannersStore } from '@/stores/planners'
import BaseModal from '@/components/common/BaseModal.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import api from '@/services/api'
import { generateAvatar } from '@/utils/avatar'

const route        = useRoute()
const teamsStore     = useTeamsStore()
const sprintsStore   = useSprintsStore()
const authStore      = useAuthStore()
const plannersStore  = usePlannersStore()
const toast          = useToast()

const canManage = computed(() => {
  if (authStore.isAdmin) return true
  const uid = authStore.user?.id
  return plannersStore.activePlanner?.members?.find(m => m.userId === uid)?.role === 'owner'
})
const canStartOrComplete = computed(() => canManage.value || !!plannersStore.activePlannerId)

// System-Support Planner benötigt keinen Product Owner
const isSystemSupportTeam = computed(() => {
  const pid = teamsStore.currentTeam?.plannerId
  if (!pid) return false
  const all = [...plannersStore.planners, ...plannersStore.allPlanners]
  return all.some(p => p.id === pid && p.isSystemSupport)
})

// ── Teams ─────────────────────────────────────────────────────────────────────
const search = ref('')
const showCreateModal  = ref(false)
const showDetailModal  = ref(false)
const TEAM_ROLE_LABELS = { owner: 'Product Owner', member: 'Mitglied', entwickler: 'Entwickler', organisator: 'Organisator', gast: 'Gast' }

const teamForm = reactive({ name: '', description: '' })
const editingTeam = ref(null)

const memberSearch = ref('')
const memberSearchResults = ref([])
const selectedMember = ref(null)
const newMemberRole = ref('member')
let debounceTimer = null

const transferTarget = ref(null)
const showTransferModal = ref(false)

const allUsers = ref([])

onMounted(async () => {
  const plannerId = route.params.plannerId
  const filter = plannerId ? { plannerId } : {}
  await Promise.all([teamsStore.fetchTeams(filter), sprintsStore.fetchSprints(filter), plannersStore.fetchPlanners()])
  try {
    const { data } = await api.get('/users')
    allUsers.value = data
  } catch { /* nicht kritisch */ }
})

function getUser(userId) {
  return allUsers.value.find(u => u.id === userId)
}

const teamHasOwner = computed(() =>
  teamsStore.currentTeam?.members?.some(m => m.role === 'owner') ?? false
)

const sortedMembers = computed(() => {
  const members = teamsStore.currentTeam?.members ?? []
  return [...members].sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0))
})

const filteredTeams = computed(() =>
  teamsStore.teams.filter(t => t.name.toLowerCase().includes(search.value.toLowerCase()))
)

async function searchUsers(q) {
  if (q.length < 2) { memberSearchResults.value = []; return }
  try {
    const { data } = await api.get('/users/search', { params: { q } })
    const existingIds = new Set(teamsStore.currentTeam?.members?.map(m => m.userId) ?? [])
    memberSearchResults.value = data
      .filter(u => u.role !== 'admin' && !existingIds.has(u.id))
      .slice(0, 5)
  } catch { memberSearchResults.value = [] }
}

function onMemberInput() {
  selectedMember.value = null
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => searchUsers(memberSearch.value), 300)
}

function selectUser(user) {
  selectedMember.value = user
  memberSearch.value = user.username
  memberSearchResults.value = []
}

function clearSearchResults() {
  setTimeout(() => { memberSearchResults.value = [] }, 200)
}

function openCreate() {
  editingTeam.value = null
  teamForm.name = ''
  teamForm.description = ''
  showCreateModal.value = true
}

function openEdit(team) {
  editingTeam.value = team
  teamForm.name = team.name
  teamForm.description = team.description || ''
  showCreateModal.value = true
}

function openDetail(team) {
  teamsStore.setCurrentTeam(team)
  memberSearch.value = ''
  selectedMember.value = null
  newMemberRole.value = 'member'
  showDetailModal.value = true
}

async function saveTeam() {
  if (editingTeam.value) {
    await teamsStore.updateTeam(editingTeam.value.id, teamForm)
    toast.success('Team aktualisiert')
  } else {
    await teamsStore.createTeam({ ...teamForm, plannerId: route.params.plannerId || null })
    toast.success('Team erstellt')
  }
  showCreateModal.value = false
}

async function deleteTeam(id) {
  if (!confirm('Team wirklich löschen?')) return
  await teamsStore.deleteTeam(id)
  toast.info('Team gelöscht')
}

async function addMember() {
  if (!selectedMember.value) return
  try {
    await teamsStore.addMember(teamsStore.currentTeam.id, selectedMember.value.id, newMemberRole.value)
    toast.success(`${selectedMember.value.username} wurde hinzugefügt`)
    memberSearch.value = ''
    selectedMember.value = null
    newMemberRole.value = 'member'
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Hinzufügen')
  }
}

async function removeMember(userId) {
  try {
    await teamsStore.removeMember(teamsStore.currentTeam.id, userId)
    toast.info('Mitglied entfernt')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Entfernen')
  }
}

function openTransfer(member) {
  transferTarget.value = member
  showTransferModal.value = true
}

async function changeRole(member, newRole) {
  if (member.role === newRole) return
  try {
    await api.put(
      `/teams/${teamsStore.currentTeam.id}/members/${member.userId}/role`,
      { role: newRole }
    )
    const team = teamsStore.teams.find(t => t.id === teamsStore.currentTeam.id)
    if (team) {
      const m = team.members.find(m => m.userId === member.userId)
      if (m) m.role = newRole
      teamsStore.setCurrentTeam({ ...team })
    }
    toast.success('Rolle geändert')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Ändern der Rolle')
  }
}

async function confirmTransfer() {
  if (!transferTarget.value) return
  try {
    await api.put(
      `/teams/${teamsStore.currentTeam.id}/members/${transferTarget.value.userId}/role`,
      { role: 'owner' }
    )
    const team = teamsStore.teams.find(t => t.id === teamsStore.currentTeam.id)
    if (team) {
      team.members.forEach(m => { m.role = m.userId === transferTarget.value.userId ? 'owner' : 'member' })
      teamsStore.setCurrentTeam({ ...team })
    }
    toast.success(`Ownership auf ${getUser(transferTarget.value.userId)?.username} übertragen`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Übertragen')
  } finally {
    showTransferModal.value = false
    transferTarget.value = null
  }
}

// ── Sprints ───────────────────────────────────────────────────────────────────
const showSprintModal = ref(false)
const editingSprint   = ref(null)
const sprintForm = reactive({ name: '', description: '', startDate: '', endDate: '', plannerId: '' })

const STATUS_LABEL = { planning: 'Planung', active: 'Aktiv', completed: 'Abgeschlossen' }
const STATUS_CLASS = {
  planning:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  active:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function openCreateSprint() {
  editingSprint.value = null
  Object.assign(sprintForm, {
    name: '', description: '', startDate: '', endDate: '',
    plannerId: route.params.plannerId || '',
  })
  showSprintModal.value = true
}

function openEditSprint(sprint) {
  editingSprint.value = sprint
  Object.assign(sprintForm, {
    name: sprint.name,
    description: sprint.description || '',
    startDate: sprint.startDate ? sprint.startDate.slice(0, 10) : '',
    endDate:   sprint.endDate   ? sprint.endDate.slice(0, 10)   : '',
    plannerId: sprint.plannerId || '',
  })
  showSprintModal.value = true
}

async function saveSprint() {
  const payload = {
    name: sprintForm.name,
    description: sprintForm.description,
    startDate: sprintForm.startDate || null,
    endDate:   sprintForm.endDate   || null,
    plannerId: sprintForm.plannerId || null,
  }
  try {
    if (editingSprint.value) {
      await sprintsStore.updateSprint(editingSprint.value.id, payload)
      toast.success('Sprint aktualisiert')
    } else {
      await sprintsStore.createSprint(payload)
      toast.success('Sprint erstellt')
    }
    showSprintModal.value = false
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Speichern')
  }
}

async function startSprint(sprint) {
  try {
    await sprintsStore.startSprint(sprint.id)
    toast.success(`„${sprint.name}" wurde gestartet`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Starten')
  }
}

async function completeSprint(sprint) {
  if (!confirm(`Sprint „${sprint.name}" abschließen? Dies kann nicht rückgängig gemacht werden.`)) return
  try {
    await sprintsStore.completeSprint(sprint.id)
    toast.success(`„${sprint.name}" wurde abgeschlossen`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Abschließen')
  }
}

async function deleteSprint(sprint) {
  if (!confirm(`Sprint „${sprint.name}" wirklich löschen?`)) return
  try {
    await sprintsStore.deleteSprint(sprint.id)
    toast.info('Sprint gelöscht')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Aktive Sprints können nicht gelöscht werden')
  }
}
</script>

<template>
  <div class="space-y-10">

    <!-- ── Teams ──────────────────────────────────────────────────────────── -->
    <section class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Teams</h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1">Alle Teams verwalten</p>
        </div>
        <button v-if="authStore.isAdmin" @click="openCreate" class="btn-primary">+ Team erstellen</button>
      </div>

      <SearchInput v-model="search" placeholder="Teams suchen..." />

      <div v-if="teamsStore.loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="card animate-pulse h-40" />
      </div>

      <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="team in filteredTeams" :key="team.id"
          class="card hover:shadow-md transition-shadow cursor-pointer"
          @click="openDetail(team)">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary-light dark:bg-primary-active/30 rounded-xl flex items-center justify-center">
                <span class="text-primary dark:text-primary-dark font-bold text-sm">{{ team.name?.charAt(0).toUpperCase() }}</span>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">{{ team.name }}</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ team.members?.length || 0 }} Mitglieder</p>
              </div>
            </div>
            <div v-if="authStore.isAdmin" class="flex gap-1" @click.stop>
              <button @click="openEdit(team)" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button @click="deleteTeam(team.id)" class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>

          <div v-if="team.members?.some(m => m.role === 'owner')" class="flex items-center gap-1.5 mt-2">
            <svg class="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span class="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {{ getUser(team.members.find(m => m.role === 'owner')?.userId)?.username || 'Owner' }}
            </span>
          </div>
          <div v-else class="mt-2">
            <span class="text-xs text-red-400 italic">Kein Product Owner</span>
          </div>

          <p v-if="team.description" class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">{{ team.description }}</p>
        </div>

        <div v-if="!filteredTeams.length" class="col-span-full py-12 text-center">
          <p class="text-gray-400">Keine Teams gefunden</p>
          <button v-if="authStore.isAdmin" @click="openCreate" class="btn-primary mt-4">Erstes Team erstellen</button>
        </div>
      </div>
    </section>

    <!-- ── Sprint-Verwaltung ───────────────────────────────────────────────── -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Sprints</h2>
          <p class="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Sprints definieren, starten und abschließen</p>
        </div>
        <button v-if="canManage" @click="openCreateSprint" class="btn-primary">+ Sprint erstellen</button>
      </div>

      <div v-if="sprintsStore.loading" class="space-y-3">
        <div v-for="i in 2" :key="i" class="card animate-pulse h-20" />
      </div>

      <div v-else-if="!sprintsStore.sprints.length" class="card py-10 text-center">
        <p class="text-gray-400 text-sm">Noch keine Sprints vorhanden.</p>
        <button v-if="canManage" @click="openCreateSprint" class="btn-primary mt-4">Ersten Sprint erstellen</button>
      </div>

      <div v-else class="space-y-3">
        <div v-for="sprint in sprintsStore.sprints" :key="sprint.id"
          class="card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-shadow hover:shadow-md">

          <!-- Info-Block -->
          <div class="flex items-start gap-4 flex-1 min-w-0">
            <!-- Status-Indikator -->
            <div class="mt-0.5 shrink-0"
              :class="sprint.status === 'active' ? 'text-green-500' : sprint.status === 'completed' ? 'text-blue-400' : 'text-gray-400'">
              <svg v-if="sprint.status === 'active'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
              </svg>
              <svg v-else-if="sprint.status === 'completed'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h3 class="font-semibold text-gray-900 dark:text-white truncate">{{ sprint.name }}</h3>
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="STATUS_CLASS[sprint.status] ?? STATUS_CLASS.planning">
                  {{ STATUS_LABEL[sprint.status] ?? sprint.status }}
                </span>
              </div>
              <p v-if="sprint.description" class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ sprint.description }}</p>
              <div class="flex flex-wrap gap-4 mt-1.5 text-xs text-gray-400">
                <span v-if="sprint.startDate">
                  <span class="font-medium">Start:</span> {{ fmtDate(sprint.startDate) }}
                </span>
                <span v-if="sprint.endDate">
                  <span class="font-medium">Ende:</span> {{ fmtDate(sprint.endDate) }}
                </span>
                <span v-if="!sprint.startDate && !sprint.endDate" class="italic">Keine Daten festgelegt</span>
              </div>
            </div>
          </div>

          <!-- Aktions-Buttons -->
          <div v-if="canStartOrComplete" class="flex flex-wrap items-center gap-2 shrink-0">
            <!-- Starten (alle Planner-Mitglieder) -->
            <button v-if="sprint.status === 'planning'"
              @click="startSprint(sprint)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
              </svg>
              Starten
            </button>

            <!-- Abschließen (alle Planner-Mitglieder) -->
            <button v-if="sprint.status === 'active'"
              @click="completeSprint(sprint)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              Abschließen
            </button>

            <!-- Bearbeiten — nur Admin/Owner, nicht wenn completed -->
            <button v-if="canManage && sprint.status !== 'completed'"
              @click="openEditSprint(sprint)"
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Bearbeiten">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>

            <!-- Löschen — nur Admin/Owner, nicht wenn active -->
            <button v-if="canManage && sprint.status !== 'active'"
              @click="deleteSprint(sprint)"
              class="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
              title="Löschen">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Team erstellen / bearbeiten ─────────────────────────────────────── -->
    <BaseModal v-if="showCreateModal" :title="editingTeam ? 'Team bearbeiten' : 'Neues Team'" @close="showCreateModal = false">
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input v-model="teamForm.name" type="text" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
          <textarea v-model="teamForm.description" rows="3" class="input-field resize-none" />
        </div>
        <p class="text-xs text-gray-400">Nach dem Erstellen kannst du einen Product Owner zuweisen.</p>
      </div>
      <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="showCreateModal = false" class="btn-secondary">Abbrechen</button>
        <button @click="saveTeam" :disabled="!teamForm.name" class="btn-primary">Speichern</button>
      </div>
    </BaseModal>

    <!-- ── Team-Detail / Mitglieder ────────────────────────────────────────── -->
    <BaseModal v-if="showDetailModal && teamsStore.currentTeam" :title="teamsStore.currentTeam.name" size="lg" @close="showDetailModal = false">
      <div class="p-6 space-y-6">
        <div>
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mitglieder</h4>

          <div v-if="!teamsStore.currentTeam.members?.length" class="py-6 text-center text-sm text-gray-400">
            {{ isSystemSupportTeam ? 'Noch keine Mitglieder.' : 'Noch keine Mitglieder — füge zuerst einen Product Owner hinzu.' }}
          </div>

          <div class="space-y-2">
            <div v-for="member in sortedMembers" :key="member.userId"
              class="flex items-center justify-between p-3 rounded-xl transition-colors"
              :class="member.role === 'owner'
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                : 'bg-gray-50 dark:bg-gray-700/50'">
              <div class="flex items-center gap-3">
                <img :src="generateAvatar(getUser(member.userId)?.username || member.userId)"
                  class="w-9 h-9 rounded-full bg-gray-200 shrink-0" alt="Avatar" />
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ getUser(member.userId)?.username || member.userId }}
                    </p>
                    <span v-if="member.role === 'owner'"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      Product Owner
                    </span>
                    <span v-else-if="member.role && member.role !== 'member'"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      {{ TEAM_ROLE_LABELS[member.role] || member.role }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-400">{{ getUser(member.userId)?.email }}</p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <select v-if="authStore.isAdmin && member.role !== 'owner' && !isSystemSupportTeam"
                  :value="member.role"
                  @change="changeRole(member, $event.target.value)"
                  class="text-xs input-field py-0.5 px-2 h-7 w-auto">
                  <option value="member">Mitglied</option>
                  <option value="entwickler">Entwickler</option>
                  <option value="organisator">Organisator</option>
                  <option value="gast">Gast</option>
                </select>
                <button v-if="authStore.isAdmin && member.role !== 'owner'"
                  @click="openTransfer(member)"
                  class="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium whitespace-nowrap"
                  title="Als Product Owner setzen">
                  PO setzen
                </button>
                <button v-if="member.role !== 'owner'"
                  @click="removeMember(member.userId)"
                  class="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium">
                  Entfernen
                </button>
                <span v-else class="text-xs text-gray-400 italic">nicht entfernbar</span>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-100 dark:border-gray-700 pt-4">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mitglied hinzufügen</h4>

          <div v-if="!teamHasOwner && !isSystemSupportTeam" class="mb-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            Dieses Team hat noch keinen Product Owner. Füge zuerst einen Owner hinzu.
          </div>

          <div class="flex gap-2 items-start flex-wrap">
            <div class="relative flex-1 min-w-48">
              <input v-model="memberSearch" type="text"
                placeholder="Name suchen (min. 2 Zeichen)…"
                class="input-field w-full"
                @input="onMemberInput"
                @blur="clearSearchResults" />
              <ul v-if="memberSearchResults.length"
                class="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                <li v-for="u in memberSearchResults" :key="u.id"
                  class="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-primary-light dark:hover:bg-primary-active/20 cursor-pointer"
                  @mousedown.prevent="selectUser(u)">
                  <img :src="generateAvatar(u.username)" class="w-6 h-6 rounded-full" alt="" />
                  <span class="font-medium text-gray-900 dark:text-white">{{ u.username }}</span>
                  <span class="text-gray-400 text-xs ml-auto">{{ u.email }}</span>
                </li>
              </ul>
            </div>

            <select v-model="newMemberRole" class="input-field w-auto">
              <option value="member">Mitglied</option>
              <option value="entwickler">Entwickler</option>
              <option value="organisator">Organisator</option>
              <option value="gast">Gast</option>
              <option v-if="!teamHasOwner && !isSystemSupportTeam" value="owner">Product Owner</option>
            </select>

            <button @click="addMember" :disabled="!selectedMember" class="btn-primary whitespace-nowrap">
              Hinzufügen
            </button>
          </div>

          <p v-if="selectedMember" class="text-xs text-green-600 dark:text-green-400 mt-2">
            Ausgewählt: <strong>{{ selectedMember.username }}</strong>
          </p>
        </div>
      </div>
    </BaseModal>

    <!-- ── Sprint erstellen / bearbeiten ───────────────────────────────────── -->
    <BaseModal v-if="showSprintModal" :title="editingSprint ? 'Sprint bearbeiten' : 'Neuer Sprint'" @close="showSprintModal = false">
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
          <input v-model="sprintForm.name" type="text" class="input-field" placeholder="z. B. Sprint 2" @keydown.enter="saveSprint" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
          <textarea v-model="sprintForm.description" rows="2" class="input-field resize-none" placeholder="Optional…" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Planner</label>
          <select v-model="sprintForm.plannerId" class="input-field">
            <option value="">— Kein Planner —</option>
            <option v-for="p in plannersStore.planners" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Startdatum</label>
            <input v-model="sprintForm.startDate" type="date" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enddatum</label>
            <input v-model="sprintForm.endDate" type="date" class="input-field" />
          </div>
        </div>
        <p class="text-xs text-gray-400">Der Sprint kann nach dem Erstellen über den „Starten"-Button aktiviert werden.</p>
      </div>
      <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="showSprintModal = false" class="btn-secondary">Abbrechen</button>
        <button @click="saveSprint" :disabled="!sprintForm.name" class="btn-primary">Speichern</button>
      </div>
    </BaseModal>

    <!-- ── Ownership übertragen ─────────────────────────────────────────────── -->
    <BaseModal v-if="showTransferModal && transferTarget" title="Ownership übertragen" @close="showTransferModal = false">
      <div class="p-6 space-y-4">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Soll <strong>{{ getUser(transferTarget.userId)?.username }}</strong> der neue
          <strong>Product Owner</strong> dieses Teams werden?
        </p>
        <p class="text-xs text-gray-400">Der bisherige Owner wird automatisch zum einfachen Mitglied.</p>
      </div>
      <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="showTransferModal = false" class="btn-secondary">Abbrechen</button>
        <button @click="confirmTransfer" class="btn-primary">Ownership übertragen</button>
      </div>
    </BaseModal>

  </div>
</template>
