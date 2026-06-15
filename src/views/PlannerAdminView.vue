<script setup>
import { onMounted, ref, computed, reactive } from 'vue'
import { usePlannersStore } from '@/stores/planners'
import { useTeamsStore } from '@/stores/teams'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useUsers } from '@/composables/useUsers'
import BaseModal from '@/components/common/BaseModal.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'

const plannersStore = usePlannersStore()
const teamsStore    = useTeamsStore()
const authStore     = useAuthStore()
const toast         = useToast()
const { users, fetchUsers } = useUsers()

// ── Planner-Liste ──────────────────────────────────────────────────────────
const search = ref('')
const filtered = computed(() => {
  const q = search.value.toLowerCase()
  const list = plannersStore.planners.filter(p => p.name.toLowerCase().includes(q))
  const mine = list.filter(p => p.createdBy === authStore.user?.id)
  const others = list.filter(p => p.createdBy !== authStore.user?.id)
  return [...mine, ...others]
})

// ── Erstell-Modal (einfach) ────────────────────────────────────────────────
const showCreateModal = ref(false)
const createForm = reactive({ name: '', description: '' })

async function saveCreate() {
  if (!createForm.name.trim()) return
  try {
    await plannersStore.createPlanner({ name: createForm.name, description: createForm.description, members: [] })
    toast.success('Planner erstellt')
    showCreateModal.value = false
    Object.assign(createForm, { name: '', description: '' })
  } catch { toast.error('Fehler beim Erstellen') }
}

// ── Detail-Modal ───────────────────────────────────────────────────────────
const detailPlanner = ref(null)
const activeTab = ref('info')

const infoForm = reactive({ name: '', description: '' })

function openDetail(planner) {
  detailPlanner.value = planner
  activeTab.value = 'info'
  Object.assign(infoForm, { name: planner.name, description: planner.description || '' })
  newMember.userId = ''
  newMember.role = 'member'
  newTeamForm.name = ''
  newTeamForm.description = ''
  ticketPrefixInput.value = planner.ticketPrefix ?? 'TKT'
  teamsStore.fetchTeams({ plannerId: planner.id })
}

function closeDetail() { detailPlanner.value = null }

// ── Tab: Info ──────────────────────────────────────────────────────────────
async function saveInfo() {
  try {
    await plannersStore.updatePlanner(detailPlanner.value.id, { name: infoForm.name, description: infoForm.description })
    detailPlanner.value = plannersStore.planners.find(p => p.id === detailPlanner.value.id)
    toast.success('Gespeichert')
  } catch { toast.error('Fehler beim Speichern') }
}

// ── Tab: Mitglieder ────────────────────────────────────────────────────────
const newMember = reactive({ userId: '', role: 'member' })

const plannerMembers = computed(() => detailPlanner.value?.members ?? [])

const availableUsersToAdd = computed(() => {
  const existing = plannerMembers.value.map(m => m.userId)
  return users.value.filter(u => u.role !== 'admin' && !existing.includes(u.id))
})

async function addMember() {
  if (!newMember.userId) return
  const updated = [...plannerMembers.value, { userId: newMember.userId, role: newMember.role }]
  try {
    await plannersStore.updateMembers(detailPlanner.value.id, updated)
    detailPlanner.value = plannersStore.planners.find(p => p.id === detailPlanner.value.id)
    newMember.userId = ''
    newMember.role = 'member'
    toast.success('Mitglied hinzugefügt')
  } catch { toast.error('Fehler') }
}

async function removeMember(userId) {
  const updated = plannerMembers.value.filter(m => m.userId !== userId)
  try {
    await plannersStore.updateMembers(detailPlanner.value.id, updated)
    detailPlanner.value = plannersStore.planners.find(p => p.id === detailPlanner.value.id)
    toast.info('Mitglied entfernt')
  } catch { toast.error('Fehler') }
}

async function changeMemberRole(userId, role) {
  const updated = plannerMembers.value.map(m => m.userId === userId ? { ...m, role } : m)
  try {
    await plannersStore.updateMembers(detailPlanner.value.id, updated)
    detailPlanner.value = plannersStore.planners.find(p => p.id === detailPlanner.value.id)
  } catch { toast.error('Fehler') }
}

// ── Tab: Teams ─────────────────────────────────────────────────────────────
const expandedTeamId = ref(null)
const editingTeam = ref(null)
const editTeamForm = reactive({ name: '', description: '' })
const newTeamForm = reactive({ name: '', description: '' })
const addMemberTeamId = ref(null)
const newTeamMember = reactive({ userId: '', role: 'member' })

const plannerTeams = computed(() => teamsStore.teams)

function startEditTeam(team) {
  editingTeam.value = team.id
  Object.assign(editTeamForm, { name: team.name, description: team.description || '' })
}

async function saveEditTeam(teamId) {
  try {
    await teamsStore.updateTeam(teamId, { name: editTeamForm.name, description: editTeamForm.description })
    editingTeam.value = null
    toast.success('Team aktualisiert')
  } catch { toast.error('Fehler') }
}

async function createTeam() {
  if (!newTeamForm.name.trim()) return
  try {
    await teamsStore.createTeam({
      name: newTeamForm.name,
      description: newTeamForm.description,
      plannerId: detailPlanner.value.id,
    })
    await plannersStore.fetchPlanners()
    detailPlanner.value = plannersStore.planners.find(p => p.id === detailPlanner.value.id)
    newTeamForm.name = ''
    newTeamForm.description = ''
    toast.success('Team erstellt')
  } catch { toast.error('Fehler') }
}

async function deleteTeam(teamId) {
  if (!confirm('Team wirklich löschen?')) return
  try {
    await teamsStore.deleteTeam(teamId)
    await plannersStore.fetchPlanners()
    detailPlanner.value = plannersStore.planners.find(p => p.id === detailPlanner.value.id)
    toast.info('Team gelöscht')
  } catch { toast.error('Fehler') }
}

async function addTeamMember(teamId) {
  if (!newTeamMember.userId) return
  try {
    await teamsStore.addMember(teamId, newTeamMember.userId, newTeamMember.role)
    newTeamMember.userId = ''
    newTeamMember.role = 'member'
    addMemberTeamId.value = null
    toast.success('Mitglied hinzugefügt')
  } catch { toast.error('Fehler') }
}

async function removeTeamMember(teamId, userId) {
  try {
    await teamsStore.removeMember(teamId, userId)
    toast.info('Mitglied entfernt')
  } catch { toast.error('Fehler') }
}

const usersNotInTeam = (team) => {
  const existing = (team.members ?? []).map(m => m.userId)
  return users.value.filter(u => u.role !== 'admin' && !existing.includes(u.id))
}

// ── Tab: Einstellungen ─────────────────────────────────────────────────────
const ticketPrefixInput = ref('')

async function saveSettings() {
  const val = ticketPrefixInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!val) { toast.error('Präfix darf nicht leer sein'); return }
  try {
    await plannersStore.updateSettings(detailPlanner.value.id, { ticketPrefix: val })
    detailPlanner.value = plannersStore.planners.find(p => p.id === detailPlanner.value.id)
    ticketPrefixInput.value = detailPlanner.value.ticketPrefix
    toast.success('Einstellungen gespeichert')
  } catch { toast.error('Fehler') }
}

// ── Planner löschen ────────────────────────────────────────────────────────
async function deletePlanner(planner) {
  if (!confirm(`Planner „${planner.name}" wirklich löschen?`)) return
  try {
    await plannersStore.deletePlanner(planner.id)
    if (detailPlanner.value?.id === planner.id) closeDetail()
    toast.info('Planner gelöscht')
  } catch { toast.error('Fehler') }
}

// ── Hilfsfunktionen ────────────────────────────────────────────────────────
function userName(id) { return users.value.find(u => u.id === id)?.username ?? id }

const ROLE_LABELS = { owner: 'Verantwortlicher', member: 'Mitglied' }

onMounted(() => Promise.all([
  plannersStore.fetchPlanners(),
  fetchUsers(),
]))
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Planner verwalten</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Planner erstellen, Zugänge und Teams verwalten</p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary">+ Neuer Planner</button>
    </div>

    <SearchInput v-model="search" placeholder="Planner suchen..." />

    <!-- Planner-Karten -->
    <div v-if="plannersStore.loading" class="py-8 text-center text-gray-400 text-sm">Lade…</div>
    <div v-else-if="!filtered.length" class="py-12 text-center text-sm text-gray-400">Keine Planner vorhanden</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div v-for="planner in filtered" :key="planner.id" class="card flex flex-col gap-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                {{ planner.ticketPrefix ?? 'TKT' }}
              </span>
              <h2 class="font-semibold text-gray-900 dark:text-white truncate">{{ planner.name }}</h2>
              <span v-if="planner.createdBy === authStore.user?.id"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                Mein Planner
              </span>
            </div>
            <p v-if="planner.description" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{{ planner.description }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              Erstellt von:
              <span class="font-medium text-gray-600 dark:text-gray-300">{{ userName(planner.createdBy) }}</span>
            </p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button @click="openDetail(planner)"
              class="text-xs px-2.5 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
              Verwalten
            </button>
            <button @click="deletePlanner(planner)"
              class="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              Löschen
            </button>
          </div>
        </div>

        <!-- Statistik-Zeile -->
        <div class="flex gap-3 text-xs text-gray-400">
          <span>{{ planner.members?.length ?? 0 }} Mitglieder</span>
          <span>·</span>
          <span>{{ planner.teamCount ?? 0 }} Teams</span>
        </div>

        <!-- Member-Avatare -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <UserAvatar v-for="m in (planner.members ?? []).slice(0, 8)" :key="m.userId"
            :username="userName(m.userId)" size="xs" :title="`${userName(m.userId)} (${ROLE_LABELS[m.role] ?? m.role})`" />
          <span v-if="(planner.members?.length ?? 0) > 8" class="text-xs text-gray-400">
            +{{ planner.members.length - 8 }}
          </span>
          <span v-if="!(planner.members?.length)" class="text-xs text-gray-400 italic">Keine Mitglieder</span>
        </div>
      </div>
    </div>

    <!-- ── Erstell-Modal ──────────────────────────────────────────────── -->
    <BaseModal v-if="showCreateModal" title="Neuer Planner" @close="showCreateModal = false">
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
          <input v-model="createForm.name" type="text" class="input-field" placeholder="z. B. Entwicklungs-Planner" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
          <textarea v-model="createForm.description" rows="2" class="input-field resize-none" />
        </div>
      </div>
      <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="showCreateModal = false" class="btn-secondary">Abbrechen</button>
        <button @click="saveCreate" :disabled="!createForm.name.trim()" class="btn-primary">Erstellen</button>
      </div>
    </BaseModal>

    <!-- ── Detail-Modal ───────────────────────────────────────────────── -->
    <BaseModal v-if="detailPlanner" :title="`${detailPlanner.name} — Verwaltung`" size="xl" @close="closeDetail">

      <!-- Tabs -->
      <div class="flex border-b border-gray-200 dark:border-gray-700 px-6 pt-1 gap-1 overflow-x-auto">
        <button v-for="tab in [
            { id: 'info',       label: 'Info' },
            { id: 'members',    label: 'Mitglieder', count: detailPlanner.members?.length },
            { id: 'teams',      label: 'Teams',      count: detailPlanner.teamCount ?? 0 },
            { id: 'settings',   label: 'Einstellungen' },
          ]" :key="tab.id"
          @click="activeTab = tab.id"
          class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors"
          :class="activeTab === tab.id
            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'">
          {{ tab.label }}
          <span v-if="tab.count !== undefined"
            class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-1.5 py-0.5">
            {{ tab.count }}
          </span>
        </button>
      </div>

      <!-- ── Tab: Info ────────────────────────────────────────────────── -->
      <div v-if="activeTab === 'info'" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input v-model="infoForm.name" type="text" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
          <textarea v-model="infoForm.description" rows="3" class="input-field resize-none" />
        </div>
        <div class="flex justify-end">
          <button @click="saveInfo" :disabled="!infoForm.name.trim()" class="btn-primary">Speichern</button>
        </div>
      </div>

      <!-- ── Tab: Mitglieder ──────────────────────────────────────────── -->
      <div v-if="activeTab === 'members'" class="p-6 space-y-4">
        <!-- Mitglied hinzufügen -->
        <div class="flex gap-2 flex-wrap items-end">
          <div class="flex-1 min-w-40">
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Benutzer</label>
            <select v-model="newMember.userId" class="input-field">
              <option value="">-- Benutzer wählen --</option>
              <option v-for="u in availableUsersToAdd" :key="u.id" :value="u.id">
                {{ u.username }} ({{ u.email }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rolle</label>
            <select v-model="newMember.role" class="input-field w-40">
              <option value="member">Mitglied</option>
              <option value="owner">Verantwortlicher</option>
            </select>
          </div>
          <button @click="addMember" :disabled="!newMember.userId" class="btn-primary">Hinzufügen</button>
        </div>

        <!-- Mitgliederliste -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
          <div v-if="!plannerMembers.length" class="px-4 py-6 text-sm text-gray-400 text-center italic">
            Keine Mitglieder
          </div>
          <div v-for="m in plannerMembers" :key="m.userId"
            class="flex items-center gap-3 px-4 py-3">
            <UserAvatar :username="userName(m.userId)" size="sm" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ userName(m.userId) }}</p>
              <p class="text-xs text-gray-400">
                {{ users.find(u => u.id === m.userId)?.email ?? '' }}
              </p>
            </div>
            <select :value="m.role" @change="changeMemberRole(m.userId, $event.target.value)"
              class="text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="member">Mitglied</option>
              <option value="owner">Verantwortlicher</option>
            </select>
            <button @click="removeMember(m.userId)"
              class="text-red-400 hover:text-red-600 transition-colors p-1 rounded">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Tab: Teams ───────────────────────────────────────────────── -->
      <div v-if="activeTab === 'teams'" class="p-6 space-y-4">

        <!-- Neues Team erstellen -->
        <details class="rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
          <summary class="px-4 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 cursor-pointer select-none hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-lg">
            + Neues Team erstellen
          </summary>
          <div class="px-4 pb-4 pt-2 space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Team-Name *</label>
              <input v-model="newTeamForm.name" type="text" class="input-field" placeholder="z. B. Backend-Team" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Beschreibung</label>
              <input v-model="newTeamForm.description" type="text" class="input-field" />
            </div>
            <button @click="createTeam" :disabled="!newTeamForm.name.trim()" class="btn-primary text-sm">Team erstellen</button>
          </div>
        </details>

        <!-- Teams dieses Planners -->
        <div v-if="plannerTeams.length" class="space-y-2">
          <div v-for="team in plannerTeams" :key="team.id"
            class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

            <!-- Team-Header -->
            <div class="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
              <button @click="expandedTeamId = expandedTeamId === team.id ? null : team.id"
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <svg class="w-4 h-4 transition-transform" :class="expandedTeamId === team.id ? 'rotate-90' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
              <div class="flex-1 min-w-0">
                <template v-if="editingTeam === team.id">
                  <div class="flex gap-2">
                    <input v-model="editTeamForm.name" class="input-field text-sm py-1 flex-1" @keyup.enter="saveEditTeam(team.id)" />
                    <input v-model="editTeamForm.description" class="input-field text-sm py-1 flex-1" placeholder="Beschreibung" />
                  </div>
                </template>
                <template v-else>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ team.name }}</p>
                  <p v-if="team.description" class="text-xs text-gray-400 truncate">{{ team.description }}</p>
                </template>
              </div>
              <div class="flex gap-1.5 shrink-0">
                <template v-if="editingTeam === team.id">
                  <button @click="saveEditTeam(team.id)" class="text-xs text-green-600 hover:underline">Speichern</button>
                  <button @click="editingTeam = null" class="text-xs text-gray-400 hover:underline">Abbrechen</button>
                </template>
                <template v-else>
                  <button @click="startEditTeam(team)" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Bearbeiten</button>
                  <button @click="deleteTeam(team.id)" class="text-xs text-red-500 hover:underline">Löschen</button>
                </template>
              </div>
            </div>

            <!-- Team-Mitglieder (aufgeklappt) -->
            <div v-if="expandedTeamId === team.id" class="px-4 pb-3 pt-2 space-y-2">
              <div class="flex items-center gap-2 flex-wrap">
                <div v-for="m in (team.members ?? [])" :key="m.userId"
                  class="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">
                  <UserAvatar :username="userName(m.userId)" size="xs" />
                  <span class="text-gray-700 dark:text-gray-300">{{ userName(m.userId) }}</span>
                  <span class="text-gray-400">· {{ m.role === 'owner' ? 'Owner' : 'Mitglied' }}</span>
                  <button @click="removeTeamMember(team.id, m.userId)"
                    class="text-red-400 hover:text-red-600 ml-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <span v-if="!(team.members?.length)" class="text-xs text-gray-400 italic">Keine Mitglieder</span>
              </div>

              <!-- Mitglied zum Team hinzufügen -->
              <div v-if="addMemberTeamId === team.id" class="flex gap-2 flex-wrap items-end pt-1">
                <select v-model="newTeamMember.userId" class="input-field text-sm flex-1 min-w-36">
                  <option value="">-- Benutzer wählen --</option>
                  <option v-for="u in usersNotInTeam(team)" :key="u.id" :value="u.id">{{ u.username }}</option>
                </select>
                <select v-model="newTeamMember.role" class="input-field text-sm w-32">
                  <option value="member">Mitglied</option>
                  <option value="owner">Owner</option>
                </select>
                <button @click="addTeamMember(team.id)" :disabled="!newTeamMember.userId" class="btn-primary text-sm py-1.5">Hinzufügen</button>
                <button @click="addMemberTeamId = null; newTeamMember.userId = ''" class="btn-secondary text-sm py-1.5">Abbrechen</button>
              </div>
              <button v-else @click="addMemberTeamId = team.id; newTeamMember.userId = ''; newTeamMember.role = 'member'"
                class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                + Mitglied hinzufügen
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="!teamsStore.loading" class="py-8 text-center text-sm text-gray-400 italic">
          Noch keine Teams in diesem Planner
        </div>
        <div v-else class="py-4 text-center text-sm text-gray-400">Lade Teams…</div>
      </div>

      <!-- ── Tab: Einstellungen ────────────────────────────────────────── -->
      <div v-if="activeTab === 'settings'" class="p-6 space-y-6">
        <div class="max-w-sm">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket-Präfix</label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Präfix für neue Ticket-Nummern in diesem Planner, z. B. <code class="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">ENT</code> → <code class="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">ENT-0042</code>
          </p>
          <div class="flex gap-2">
            <input v-model="ticketPrefixInput" type="text" maxlength="8"
              class="input-field w-32 font-mono uppercase"
              placeholder="TKT"
              @input="ticketPrefixInput = ticketPrefixInput.toUpperCase().replace(/[^A-Z0-9]/g, '')" />
            <button @click="saveSettings" class="btn-primary">Speichern</button>
          </div>
          <p class="text-xs text-gray-400 mt-1.5">
            Aktueller Zähler: <span class="font-mono">{{ detailPlanner.ticketCounter ?? 1 }}</span>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="closeDetail" class="btn-secondary">Schließen</button>
      </div>
    </BaseModal>
  </div>
</template>
