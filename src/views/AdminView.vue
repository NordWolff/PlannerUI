<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTeamsStore } from '@/stores/teams'
import { useBoardsStore } from '@/stores/boards'
import { usePlannersStore } from '@/stores/planners'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'
import { generateAvatar } from '@/utils/avatar'

const route = useRoute()
const authStore = useAuthStore()
const teamsStore = useTeamsStore()
const boardsStore = useBoardsStore()
const plannersStore = usePlannersStore()
const toast = useToast()

const activeTab = ref('requests')
const users = ref([])
const loadingUsers = ref(false)
const adminRequests = ref([])
const loadingRequests = ref(false)

const tabs = [
  { key: 'requests',  label: 'Anfragen' },
  { key: 'planner',   label: 'Planner-Zugang' },
  { key: 'users',     label: 'Benutzer' },
  { key: 'teams',     label: 'Teams' },
  { key: 'boards',    label: 'Boards' },
  { key: 'settings',  label: 'Einstellungen' },
]

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin',    desc: 'Vollzugriff auf alle Bereiche' },
  { value: 'owner', label: 'Owner',    desc: 'Kann Teams und Projekte verwalten' },
  { value: 'user',  label: 'Benutzer', desc: 'Standardzugriff' },
]

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  owner: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  user:  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const REQUEST_STATUS = {
  open:        { label: 'Offen',       cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  in_progress: { label: 'In Arbeit',   cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  done:        { label: 'Erledigt',    cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  rejected:    { label: 'Abgelehnt',   cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
}

const REQUEST_TYPE = {
  feature: { label: '✨ Feature', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  bug:     { label: '🐛 Bug',     cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}

// Einstellungen
const ticketSettings = ref(null)
const prefixInput = ref('')
const counterInput = ref('')
const savingPrefix = ref(false)
const savingCounter = ref(false)

// Team-Modal
const showTeamModal = ref(false)
const editingTeam = ref(null)
const teamForm = reactive({ name: '', description: '' })

// Board-Modal
const showBoardModal = ref(false)
const editingBoard = ref(null)
const boardForm = reactive({ name: '', description: '', startDate: '', endDate: '' })

// ─── Laden ────────────────────────────────────────────────────────────────────

async function loadUsers() {
  loadingUsers.value = true
  try {
    const { data } = await api.get('/users')
    users.value = data
  } catch {
    toast.error('Benutzer konnten nicht geladen werden')
  } finally {
    loadingUsers.value = false
  }
}

async function loadRequests() {
  loadingRequests.value = true
  try {
    const { data } = await api.get('/admin-requests')
    adminRequests.value = data
  } catch (e) {
    console.error('loadRequests:', e)
    toast.error('Anfragen konnten nicht geladen werden')
  } finally {
    loadingRequests.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'requests') loadRequests()
})

async function loadSettings() {
  try {
    const { data } = await api.get('/settings')
    ticketSettings.value = data
    prefixInput.value = data.ticketPrefix
    counterInput.value = data.ticketCounter
  } catch {
    toast.error('Einstellungen konnten nicht geladen werden')
  }
}

// ─── Planner-Zugang ───────────────────────────────────────────────────────────

const activePlanner = computed(() =>
  plannersStore.planners.find(p => p.id === route.params.plannerId) ?? null
)

const plannerMembers = computed(() => activePlanner.value?.members ?? [])

const usersNotInPlanner = computed(() => {
  const existing = plannerMembers.value.map(m => m.userId)
  return users.value.filter(u => u.role !== 'admin' && !existing.includes(u.id))
})

const newPlannerMember = reactive({ userId: '', role: 'member' })

async function addPlannerMember() {
  if (!newPlannerMember.userId || !activePlanner.value) return
  const updated = [...plannerMembers.value, { userId: newPlannerMember.userId, role: newPlannerMember.role }]
  try {
    await plannersStore.updateMembers(activePlanner.value.id, updated)
    newPlannerMember.userId = ''
    newPlannerMember.role = 'member'
    toast.success('Mitglied hinzugefügt')
  } catch { toast.error('Fehler beim Hinzufügen') }
}

async function removePlannerMember(userId) {
  if (!activePlanner.value) return
  const updated = plannerMembers.value.filter(m => m.userId !== userId)
  try {
    await plannersStore.updateMembers(activePlanner.value.id, updated)
    toast.info('Mitglied entfernt')
  } catch { toast.error('Fehler beim Entfernen') }
}

async function changePlannerRole(userId, role) {
  if (!activePlanner.value) return
  const updated = plannerMembers.value.map(m => m.userId === userId ? { ...m, role } : m)
  try {
    await plannersStore.updateMembers(activePlanner.value.id, updated)
  } catch { toast.error('Fehler beim Ändern der Rolle') }
}

function plannerUserName(userId) {
  return users.value.find(u => u.id === userId)?.username ?? userId
}

function plannerUserEmail(userId) {
  return users.value.find(u => u.id === userId)?.email ?? ''
}

onMounted(async () => {
  const pid = route.params.plannerId
  await Promise.all([loadUsers(), loadRequests(), teamsStore.fetchTeams(pid ? { plannerId: pid } : {}), boardsStore.fetchBoards(pid ? { plannerId: pid } : {}), loadSettings(), plannersStore.fetchPlanners()])
})

// ─── Benutzer ─────────────────────────────────────────────────────────────────

async function changeRole(user, newRole) {
  const prevRole = user.role
  user.role = newRole
  try {
    await api.put(`/users/${user.id}/role`, { role: newRole })
    toast.success(`Rolle von ${user.username} auf "${newRole}" gesetzt`)
  } catch (e) {
    user.role = prevRole
    toast.error(e.response?.data?.error || 'Rolle konnte nicht geändert werden')
  }
}

// ─── Anfragen ─────────────────────────────────────────────────────────────────

async function updateRequestStatus(request, status) {
  try {
    const { data } = await api.put(`/admin-requests/${request.id}`, { status })
    Object.assign(request, data)
    toast.success('Status aktualisiert')
  } catch {
    toast.error('Status konnte nicht geändert werden')
  }
}

async function saveAdminNote(request) {
  try {
    await api.put(`/admin-requests/${request.id}`, { adminNote: request.adminNote })
    toast.success('Notiz gespeichert')
  } catch {
    toast.error('Notiz konnte nicht gespeichert werden')
  }
}

async function deleteRequest(id) {
  if (!confirm('Anfrage wirklich löschen?')) return
  try {
    await api.delete(`/admin-requests/${id}`)
    adminRequests.value = adminRequests.value.filter(r => r.id !== id)
    toast.success('Anfrage gelöscht')
  } catch {
    toast.error('Anfrage konnte nicht gelöscht werden')
  }
}

const openRequests = () => adminRequests.value.filter(r => r.status === 'open').length

// ─── Teams ────────────────────────────────────────────────────────────────────

function openCreateTeam() {
  editingTeam.value = null
  teamForm.name = ''
  teamForm.description = ''
  showTeamModal.value = true
}

function openEditTeam(team) {
  editingTeam.value = team
  teamForm.name = team.name
  teamForm.description = team.description || ''
  showTeamModal.value = true
}

async function saveTeam() {
  if (!teamForm.name.trim()) return
  const pid = route.params.plannerId
  try {
    if (editingTeam.value) {
      await teamsStore.updateTeam(editingTeam.value.id, { name: teamForm.name, description: teamForm.description })
      toast.success('Team aktualisiert')
    } else {
      await teamsStore.createTeam({ name: teamForm.name, description: teamForm.description, plannerId: pid || null })
      toast.success('Team erstellt')
    }
    showTeamModal.value = false
  } catch {
    toast.error('Fehler beim Speichern')
  }
}

async function deleteTeam(id) {
  if (!confirm('Team wirklich löschen?')) return
  try {
    await teamsStore.deleteTeam(id)
    toast.success('Team gelöscht')
  } catch {
    toast.error('Team konnte nicht gelöscht werden')
  }
}

// ─── Boards ───────────────────────────────────────────────────────────────────

function openCreateBoard() {
  editingBoard.value = null
  boardForm.name = ''
  boardForm.description = ''
  boardForm.startDate = ''
  boardForm.endDate = ''
  showBoardModal.value = true
}

function openEditBoard(board) {
  editingBoard.value = board
  boardForm.name = board.name
  boardForm.description = board.description || ''
  boardForm.startDate = board.startDate?.substring(0, 10) || ''
  boardForm.endDate = board.endDate?.substring(0, 10) || ''
  showBoardModal.value = true
}

async function saveBoard() {
  if (!boardForm.name.trim()) return
  try {
    if (editingBoard.value) {
      await boardsStore.updateBoard(editingBoard.value.id, boardForm)
      toast.success('Board aktualisiert')
    } else {
      await boardsStore.createBoard(boardForm)
      toast.success('Board erstellt')
    }
    showBoardModal.value = false
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Speichern')
  }
}

async function deleteBoard(id) {
  if (!confirm('Board wirklich löschen?')) return
  try {
    await boardsStore.deleteBoard(id)
    toast.success('Board gelöscht')
  } catch {
    toast.error('Board konnte nicht gelöscht werden')
  }
}

// ─── Einstellungen ────────────────────────────────────────────────────────────

async function savePrefix() {
  savingPrefix.value = true
  try {
    const { data } = await api.put('/settings/ticket-prefix', { prefix: prefixInput.value })
    ticketSettings.value = data
    toast.success(`Präfix auf "${data.ticketPrefix}" gesetzt`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Speichern')
  } finally {
    savingPrefix.value = false
  }
}

async function saveCounter() {
  savingCounter.value = true
  try {
    const { data } = await api.put('/settings/ticket-counter', { counter: counterInput.value })
    ticketSettings.value = data
    toast.success(`Zähler auf ${data.ticketCounter} gesetzt`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Speichern')
  } finally {
    savingCounter.value = false
  }
}

function previewNumber(prefix, counter) {
  return `${(prefix || 'TKT').toUpperCase()}-${String(parseInt(counter) || 1).padStart(4, '0')}`
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="max-w-5xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Admin-Bereich</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">Systemverwaltung und Benutzeranfragen</p>
      </div>
      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
        Admin
      </span>
    </div>

    <!-- Tab-Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav class="flex gap-1">
        <button v-for="tab in tabs" :key="tab.key"
          class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative"
          :class="activeTab === tab.key
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          @click="activeTab = tab.key">
          {{ tab.label }}
          <span v-if="tab.key === 'requests' && openRequests() > 0"
            class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {{ openRequests() }}
          </span>
        </button>
      </nav>
    </div>

    <!-- ── Anfragen ─────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'requests'">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Benutzer können Feature-Wünsche und Bugs an den Admin melden.
        </p>
        <button
          @click="loadRequests"
          :disabled="loadingRequests"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': loadingRequests }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Aktualisieren
        </button>
      </div>
      <p v-if="loadingRequests" class="text-gray-400 text-sm">Lade Anfragen…</p>
      <div v-else-if="!adminRequests.length" class="py-12 text-center">
        <div class="text-4xl mb-3">📬</div>
        <p class="text-gray-500 dark:text-gray-400 font-medium">Keine Anfragen vorhanden</p>
        <p class="text-gray-400 text-sm mt-1">Benutzer können über den „Anfrage"-Button oben Feedback senden.</p>
      </div>
      <div v-else class="space-y-3">
        <div v-for="req in adminRequests" :key="req.id"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <!-- Avatar -->
            <img
              v-if="req.submittedByUser"
              :src="generateAvatar(req.submittedByUser.username)"
              class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0 mt-0.5"
              :title="req.submittedByUser.username"
              alt=""
            />
            <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0 mt-0.5 flex items-center justify-center text-xs text-gray-500" v-else>?</div>

            <div class="flex-1 min-w-0">
              <!-- Kopfzeile -->
              <div class="flex items-start justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="REQUEST_TYPE[req.type]?.cls">
                    {{ REQUEST_TYPE[req.type]?.label }}
                  </span>
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ req.title }}</h3>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <select
                    :value="req.status"
                    @change="updateRequestStatus(req, $event.target.value)"
                    class="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option v-for="(s, key) in REQUEST_STATUS" :key="key" :value="key">{{ s.label }}</option>
                  </select>
                  <button @click="deleteRequest(req.id)" class="text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Löschen">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Meta -->
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="text-xs text-gray-400">von {{ req.submittedByUser?.username || 'Unbekannt' }}</span>
                <span class="text-gray-300 dark:text-gray-600">·</span>
                <span class="text-xs text-gray-400">{{ formatDate(req.createdAt) }}</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="REQUEST_STATUS[req.status]?.cls">
                  {{ REQUEST_STATUS[req.status]?.label }}
                </span>
              </div>

              <!-- Beschreibung -->
              <p v-if="req.description" class="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">{{ req.description }}</p>

              <!-- Admin-Notiz -->
              <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <label class="block text-xs text-gray-400 mb-1">Admin-Notiz</label>
                <div class="flex gap-2">
                  <input
                    v-model="req.adminNote"
                    type="text"
                    class="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Interne Notiz zur Anfrage…"
                    @keydown.enter="saveAdminNote(req)"
                  />
                  <button @click="saveAdminNote(req)" class="px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Planner-Zugang ─────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'planner'">
      <div v-if="!activePlanner" class="py-12 text-center text-sm text-gray-400">
        Kein Planner ausgewählt.
      </div>
      <div v-else class="space-y-6">
        <!-- Planner-Info -->
        <div class="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
          <span class="font-mono text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded">
            {{ activePlanner.ticketPrefix ?? 'TKT' }}
          </span>
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">{{ activePlanner.name }}</p>
            <p v-if="activePlanner.description" class="text-xs text-gray-500 dark:text-gray-400">{{ activePlanner.description }}</p>
          </div>
          <span class="ml-auto text-xs text-indigo-500 dark:text-indigo-400">{{ plannerMembers.length }} Mitglieder</span>
        </div>

        <!-- Mitglied hinzufügen -->
        <div class="flex flex-wrap gap-2 items-end">
          <div class="flex-1 min-w-48">
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Benutzer hinzufügen</label>
            <select v-model="newPlannerMember.userId" class="input-field">
              <option value="">-- Benutzer wählen --</option>
              <option v-for="u in usersNotInPlanner" :key="u.id" :value="u.id">
                {{ u.username }} ({{ u.email }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rolle</label>
            <select v-model="newPlannerMember.role" class="input-field w-44">
              <option value="member">Mitglied</option>
              <option value="owner">Verantwortlicher</option>
            </select>
          </div>
          <button @click="addPlannerMember" :disabled="!newPlannerMember.userId" class="btn-primary">
            Hinzufügen
          </button>
        </div>

        <!-- Mitgliederliste -->
        <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-700/50">
              <tr class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th class="px-4 py-3">Benutzer</th>
                <th class="px-4 py-3">E-Mail</th>
                <th class="px-4 py-3">System-Rolle</th>
                <th class="px-4 py-3">Planner-Rolle</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-if="!plannerMembers.length">
                <td colspan="5" class="px-4 py-8 text-center text-sm text-gray-400 italic">Keine Mitglieder</td>
              </tr>
              <tr v-for="m in plannerMembers" :key="m.userId"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <img :src="generateAvatar(plannerUserName(m.userId))"
                      class="w-7 h-7 rounded-full bg-gray-200" alt="" />
                    <span class="text-sm font-medium text-gray-900 dark:text-white">{{ plannerUserName(m.userId) }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{{ plannerUserEmail(m.userId) }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="ROLE_COLORS[users.find(u => u.id === m.userId)?.role] || ROLE_COLORS.user">
                    {{ users.find(u => u.id === m.userId)?.role ?? '–' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <select :value="m.role" @change="changePlannerRole(m.userId, $event.target.value)"
                    class="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="member">Mitglied</option>
                    <option value="owner">Verantwortlicher</option>
                  </select>
                </td>
                <td class="px-4 py-3 text-right">
                  <button @click="removePlannerMember(m.userId)"
                    class="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors">
                    Entfernen
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── Benutzer ─────────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'users'">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Weise Benutzern Rollen zu.
        <strong>Admin</strong> hat Vollzugriff,
        <strong>Owner</strong> kann Teams und Projekte verwalten,
        <strong>Benutzer</strong> hat Standardzugriff.
      </p>
      <p v-if="loadingUsers" class="text-gray-400 text-sm">Lade Benutzer…</p>
      <div v-else class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-3">Benutzer</th>
              <th class="px-4 py-3">E-Mail</th>
              <th class="px-4 py-3">Aktuelle Rolle</th>
              <th class="px-4 py-3">Rolle ändern</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="u in users" :key="u.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <img :src="generateAvatar(u.username)"
                    class="w-7 h-7 rounded-full bg-gray-200" alt="" />
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ u.username }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{{ u.email }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="ROLE_COLORS[u.role] || ROLE_COLORS.user">
                  {{ u.role }}
                </span>
              </td>
              <td class="px-4 py-3">
                <select :value="u.role" @change="changeRole(u, $event.target.value)"
                  class="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4 grid grid-cols-3 gap-3">
        <div v-for="r in ROLE_OPTIONS" :key="r.value"
          class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-1" :class="ROLE_COLORS[r.value]">{{ r.label }}</span>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ r.desc }}</p>
        </div>
      </div>
    </div>

    <!-- ── Teams ────────────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'teams'">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">Teams erstellen, bearbeiten und löschen.</p>
        <button @click="openCreateTeam" class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
          + Team erstellen
        </button>
      </div>
      <p v-if="teamsStore.loading" class="text-gray-400 text-sm">Lade Teams…</p>
      <p v-else-if="!teamsStore.teams.length" class="text-gray-400 text-sm">Keine Teams vorhanden.</p>
      <ul v-else class="space-y-3">
        <li v-for="team in teamsStore.teams" :key="team.id"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="font-medium text-gray-900 dark:text-white">{{ team.name }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ team.description || '' }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ team.members?.length ?? 0 }} Mitglieder</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button @click="openEditTeam(team)" class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium">Bearbeiten</button>
            <button @click="deleteTeam(team.id)" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 font-medium">Löschen</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- ── Boards ───────────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'boards'">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">Boards erstellen, bearbeiten und löschen.</p>
        <button @click="openCreateBoard" class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
          + Board erstellen
        </button>
      </div>
      <p v-if="boardsStore.loading" class="text-gray-400 text-sm">Lade Boards…</p>
      <p v-else-if="!boardsStore.boards.length" class="text-gray-400 text-sm">Keine Boards vorhanden.</p>
      <ul v-else class="space-y-3">
        <li v-for="board in boardsStore.boards" :key="board.id"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="font-medium text-gray-900 dark:text-white">{{ board.name }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ board.description }}</p>
            <p v-if="board.startDate || board.endDate" class="text-xs text-gray-400 mt-0.5">
              {{ board.startDate?.substring(0, 10) }} – {{ board.endDate?.substring(0, 10) }}
            </p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button @click="openEditBoard(board)" class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium">Bearbeiten</button>
            <button @click="deleteBoard(board.id)" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 font-medium">Löschen</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- ── Einstellungen ────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'settings'" class="space-y-6 max-w-lg">
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-5">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Ticket-Nummerierung</h2>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Präfix <span class="text-xs text-gray-400 ml-1">(max. 10 Zeichen)</span>
          </label>
          <div class="flex gap-2">
            <input v-model="prefixInput" type="text" maxlength="10" placeholder="z. B. TKT, FEED, PROJ"
              class="input-field flex-1 uppercase" style="text-transform:uppercase" />
            <button @click="savePrefix" :disabled="savingPrefix || !prefixInput" class="btn-primary shrink-0">
              {{ savingPrefix ? 'Speichern…' : 'Setzen' }}
            </button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nächster Zähler
          </label>
          <div class="flex gap-2">
            <input v-model.number="counterInput" type="number" min="1" class="input-field flex-1" />
            <button @click="saveCounter" :disabled="savingCounter || !counterInput" class="btn-primary shrink-0">
              {{ savingCounter ? 'Speichern…' : 'Setzen' }}
            </button>
          </div>
        </div>
        <div class="pt-2 border-t border-gray-100 dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Vorschau nächste Ticketnummer</p>
          <span class="inline-block font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-lg">
            {{ ticketSettings ? ticketSettings.nextTicketNumber : previewNumber(prefixInput, counterInput) }}
          </span>
        </div>
        <div class="text-xs text-gray-400 space-y-1">
          <p class="font-medium text-gray-500 dark:text-gray-400">Beispiele:</p>
          <p>Präfix <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">FEED</code> → FEED-0001, FEED-0002 …</p>
          <p>Präfix <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">TKG</code> → TKG-0001, TKG-0002 …</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Team-Modal -->
  <Teleport to="body">
    <div v-if="showTeamModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="showTeamModal = false" />
      <div class="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ editingTeam ? 'Team bearbeiten' : 'Neues Team' }}
          </h2>
          <button @click="showTeamModal = false" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Name *</label>
            <input v-model="teamForm.name" type="text" class="input-field" placeholder="Team-Name…" @keyup.enter="saveTeam" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Beschreibung</label>
            <textarea v-model="teamForm.description" rows="2" class="input-field resize-none" placeholder="Optionale Beschreibung…" />
          </div>
        </div>
        <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button @click="showTeamModal = false" class="btn-secondary">Abbrechen</button>
          <button @click="saveTeam" :disabled="!teamForm.name.trim()" class="btn-primary">
            {{ editingTeam ? 'Speichern' : 'Erstellen' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Board-Modal -->
  <Teleport to="body">
    <div v-if="showBoardModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="showBoardModal = false" />
      <div class="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ editingBoard ? 'Board bearbeiten' : 'Neues Board' }}
          </h2>
          <button @click="showBoardModal = false" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Name *</label>
            <input v-model="boardForm.name" type="text" class="input-field" placeholder="Board-Name…" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Beschreibung</label>
            <textarea v-model="boardForm.description" rows="2" class="input-field resize-none" placeholder="Optionale Beschreibung…" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Startdatum</label>
              <input v-model="boardForm.startDate" type="date" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Enddatum</label>
              <input v-model="boardForm.endDate" type="date" class="input-field" />
            </div>
          </div>
        </div>
        <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button @click="showBoardModal = false" class="btn-secondary">Abbrechen</button>
          <button @click="saveBoard" :disabled="!boardForm.name.trim()" class="btn-primary">
            {{ editingBoard ? 'Speichern' : 'Erstellen' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
