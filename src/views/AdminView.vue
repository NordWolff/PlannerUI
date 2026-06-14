<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTeamsStore } from '@/stores/teams'
import { useBoardsStore } from '@/stores/boards'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'

const authStore = useAuthStore()
const teamsStore = useTeamsStore()
const boardsStore = useBoardsStore()
const toast = useToast()

const activeTab = ref('users')
const users = ref([])
const loadingUsers = ref(false)

const tabs = [
  { key: 'users', label: 'Benutzer' },
  { key: 'teams', label: 'Teams' },
  { key: 'boards', label: 'Boards' },
  { key: 'settings', label: 'Einstellungen' },
]

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', desc: 'Vollzugriff auf alle Bereiche' },
  { value: 'owner', label: 'Owner', desc: 'Kann Teams und Projekte verwalten' },
  { value: 'user', label: 'Benutzer', desc: 'Standardzugriff' },
]

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  owner: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  user: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

// Einstellungen
const ticketSettings = ref(null)
const prefixInput = ref('')
const counterInput = ref('')
const savingPrefix = ref(false)
const savingCounter = ref(false)

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

async function deleteTeam(id) {
  if (!confirm('Team wirklich löschen?')) return
  try {
    await teamsStore.deleteTeam(id)
    toast.success('Team gelöscht')
  } catch {
    toast.error('Team konnte nicht gelöscht werden')
  }
}

async function deleteBoard(id) {
  if (!confirm('Board wirklich löschen?')) return
  try {
    await api.delete(`/boards/${id}`)
    boardsStore.boards = boardsStore.boards.filter(b => b.id !== id)
    toast.success('Board gelöscht')
  } catch {
    toast.error('Board konnte nicht gelöscht werden')
  }
}

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

const previewNumber = (prefix, counter) => {
  const n = parseInt(counter) || 1
  return `${(prefix || 'TKT').toUpperCase()}-${String(n).padStart(4, '0')}`
}

onMounted(async () => {
  if (!authStore.isAdmin) return
  await Promise.all([loadUsers(), teamsStore.fetchTeams(), boardsStore.fetchBoards(), loadSettings()])
})
</script>

<template>
  <div class="max-w-5xl">
    <div v-if="!authStore.isAdmin" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
      <p class="text-red-700 dark:text-red-400 font-semibold text-lg">Kein Zugriff</p>
      <p class="text-red-500 mt-1 text-sm">Dieser Bereich ist nur für Administratoren.</p>
    </div>

    <template v-else>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Admin-Bereich</h1>

      <div class="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav class="flex gap-1">
          <button v-for="tab in tabs" :key="tab.key"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === tab.key
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
            @click="activeTab = tab.key">
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Benutzer & Rollen -->
      <div v-if="activeTab === 'users'">
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
                    <img :src="`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.username)}`"
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

        <!-- Rollen-Legende -->
        <div class="mt-4 grid grid-cols-3 gap-3">
          <div v-for="r in ROLE_OPTIONS" :key="r.value"
            class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-1" :class="ROLE_COLORS[r.value]">{{ r.label }}</span>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ r.desc }}</p>
          </div>
        </div>
      </div>

      <!-- Teams -->
      <div v-else-if="activeTab === 'teams'">
        <p v-if="teamsStore.loading" class="text-gray-400 text-sm">Lade Teams…</p>
        <p v-else-if="!teamsStore.teams.length" class="text-gray-400 text-sm">Keine Teams vorhanden.</p>
        <ul v-else class="space-y-3">
          <li v-for="team in teamsStore.teams" :key="team.id"
            class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ team.name }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ team.members?.length ?? 0 }} Mitglieder</p>
            </div>
            <button @click="deleteTeam(team.id)"
              class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium">
              Löschen
            </button>
          </li>
        </ul>
      </div>

      <!-- Boards -->
      <div v-else-if="activeTab === 'boards'">
        <p v-if="boardsStore.loading" class="text-gray-400 text-sm">Lade Boards…</p>
        <p v-else-if="!boardsStore.boards.length" class="text-gray-400 text-sm">Keine Boards vorhanden.</p>
        <ul v-else class="space-y-3">
          <li v-for="board in boardsStore.boards" :key="board.id"
            class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ board.name }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ board.description }}</p>
            </div>
            <button @click="deleteBoard(board.id)"
              class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium">
              Löschen
            </button>
          </li>
        </ul>
      </div>

      <!-- Einstellungen -->
      <div v-else-if="activeTab === 'settings'" class="space-y-6 max-w-lg">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Ticket-Nummerierung</h2>

          <!-- Präfix -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Präfix
              <span class="text-xs text-gray-400 ml-1">(Buchstaben, Zahlen, Bindestrich — max. 10 Zeichen)</span>
            </label>
            <div class="flex gap-2">
              <input v-model="prefixInput" type="text" maxlength="10" placeholder="z. B. TKT, FEED, PROJ"
                class="input-field flex-1 uppercase" style="text-transform:uppercase" />
              <button @click="savePrefix" :disabled="savingPrefix || !prefixInput"
                class="btn-primary shrink-0">
                {{ savingPrefix ? 'Speichern…' : 'Setzen' }}
              </button>
            </div>
          </div>

          <!-- Startzähler -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nächster Zähler
              <span class="text-xs text-gray-400 ml-1">(ab welcher Nummer das nächste Ticket erzeugt wird)</span>
            </label>
            <div class="flex gap-2">
              <input v-model.number="counterInput" type="number" min="1"
                class="input-field flex-1" />
              <button @click="saveCounter" :disabled="savingCounter || !counterInput"
                class="btn-primary shrink-0">
                {{ savingCounter ? 'Speichern…' : 'Setzen' }}
              </button>
            </div>
          </div>

          <!-- Vorschau -->
          <div class="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Vorschau nächste Ticketnummer</p>
            <span class="inline-block font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-lg">
              {{ ticketSettings ? ticketSettings.nextTicketNumber : previewNumber(prefixInput, counterInput) }}
            </span>
          </div>

          <!-- Beispiele -->
          <div class="text-xs text-gray-400 space-y-1">
            <p class="font-medium text-gray-500 dark:text-gray-400">Beispiele:</p>
            <p>Präfix <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">FEED</code> → FEED-0001, FEED-0002 …</p>
            <p>Präfix <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">TKG</code> → TKG-0001, TKG-0002 …</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
