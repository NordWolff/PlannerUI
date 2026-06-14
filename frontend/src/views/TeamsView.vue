<script setup>
import { onMounted, ref, computed, reactive } from 'vue'
import { useTeamsStore } from '@/stores/teams'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import BaseModal from '@/components/common/BaseModal.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import api from '@/services/api'

const teamsStore = useTeamsStore()
const authStore = useAuthStore()
const toast = useToast()

const search = ref('')
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const teamForm = reactive({ name: '', description: '' })
const editingTeam = ref(null)

// Mitglied hinzufügen
const memberSearch = ref('')
const memberSearchResults = ref([])
const selectedMember = ref(null)
const newMemberRole = ref('member')
let debounceTimer = null

// Ownership übertragen
const transferTarget = ref(null)
const showTransferModal = ref(false)

const allUsers = ref([])

onMounted(async () => {
  await teamsStore.fetchTeams()
  try {
    const { data } = await api.get('/users')
    allUsers.value = data
  } catch { /* nicht kritisch */ }
})

function getUser(userId) {
  return allUsers.value.find(u => u.id === userId)
}

// Aktuelles Team hat bereits einen Owner?
const teamHasOwner = computed(() =>
  teamsStore.currentTeam?.members?.some(m => m.role === 'owner') ?? false
)

// Mitglieder sortiert: Owner zuerst
const sortedMembers = computed(() => {
  const members = teamsStore.currentTeam?.members ?? []
  return [...members].sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0))
})

const filteredTeams = computed(() =>
  teamsStore.teams.filter(t => t.name.toLowerCase().includes(search.value.toLowerCase()))
)

// Suche: Admin-Benutzer und bereits vorhandene Mitglieder ausfiltern
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
    await teamsStore.createTeam(teamForm)
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

async function confirmTransfer() {
  if (!transferTarget.value) return
  try {
    await api.put(
      `/teams/${teamsStore.currentTeam.id}/members/${transferTarget.value.userId}/role`,
      { role: 'owner' }
    )
    // Store lokal aktualisieren
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
</script>

<template>
  <div class="space-y-6">
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
            <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <span class="text-indigo-600 dark:text-indigo-400 font-bold text-sm">{{ team.name?.charAt(0).toUpperCase() }}</span>
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

        <!-- Owner-Vorschau auf der Karte -->
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

    <!-- Team erstellen / bearbeiten -->
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

    <!-- Team-Detail / Mitglieder -->
    <BaseModal v-if="showDetailModal && teamsStore.currentTeam" :title="teamsStore.currentTeam.name" size="lg" @close="showDetailModal = false">
      <div class="p-6 space-y-6">

        <!-- Mitgliederliste -->
        <div>
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mitglieder</h4>

          <div v-if="!teamsStore.currentTeam.members?.length" class="py-6 text-center text-sm text-gray-400">
            Noch keine Mitglieder — füge zuerst einen Product Owner hinzu.
          </div>

          <div class="space-y-2">
            <div v-for="member in sortedMembers" :key="member.userId"
              class="flex items-center justify-between p-3 rounded-xl transition-colors"
              :class="member.role === 'owner'
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                : 'bg-gray-50 dark:bg-gray-700/50'">
              <div class="flex items-center gap-3">
                <img :src="`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(getUser(member.userId)?.username || member.userId)}`"
                  class="w-9 h-9 rounded-full bg-gray-200 shrink-0" alt="Avatar" />
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ getUser(member.userId)?.username || member.userId }}
                    </p>
                    <!-- Owner-Badge -->
                    <span v-if="member.role === 'owner'"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      Product Owner
                    </span>
                  </div>
                  <p class="text-xs text-gray-400">{{ getUser(member.userId)?.email }}</p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <!-- Ownership übertragen (nur für Mitglieder sichtbar, wenn Admin) -->
                <button v-if="authStore.isAdmin && member.role === 'member'"
                  @click="openTransfer(member)"
                  class="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium whitespace-nowrap"
                  title="Als Product Owner setzen">
                  PO setzen
                </button>
                <!-- Entfernen (nicht für Owner) -->
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

        <!-- Mitglied hinzufügen -->
        <div class="border-t border-gray-100 dark:border-gray-700 pt-4">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mitglied hinzufügen</h4>

          <!-- Hinweis: kein Owner -->
          <div v-if="!teamHasOwner" class="mb-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
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
                  class="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer"
                  @mousedown.prevent="selectUser(u)">
                  <img :src="`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.username)}`"
                    class="w-6 h-6 rounded-full" alt="" />
                  <span class="font-medium text-gray-900 dark:text-white">{{ u.username }}</span>
                  <span class="text-gray-400 text-xs ml-auto">{{ u.email }}</span>
                </li>
              </ul>
            </div>

            <!-- Rolle: Owner nur wenn noch keiner vorhanden -->
            <select v-model="newMemberRole" class="input-field w-auto">
              <option value="member">Mitglied</option>
              <option v-if="!teamHasOwner" value="owner">Product Owner</option>
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

    <!-- Ownership übertragen Bestätigung -->
    <BaseModal v-if="showTransferModal && transferTarget" title="Ownership übertragen" @close="showTransferModal = false">
      <div class="p-6 space-y-4">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Soll <strong>{{ getUser(transferTarget.userId)?.username }}</strong> der neue
          <strong>Product Owner</strong> dieses Teams werden?
        </p>
        <p class="text-xs text-gray-400">
          Der bisherige Owner wird automatisch zum einfachen Mitglied.
        </p>
      </div>
      <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="showTransferModal = false" class="btn-secondary">Abbrechen</button>
        <button @click="confirmTransfer" class="btn-primary">Ownership übertragen</button>
      </div>
    </BaseModal>
  </div>
</template>
