<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useTicketsStore } from '@/stores/tickets'
import { useTeamsStore } from '@/stores/teams'
import { useSprintsStore } from '@/stores/sprints'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import TicketTypeIcon from '@/components/common/TicketTypeIcon.vue'
import TicketModal from '@/components/tickets/TicketModal.vue'
import { useUsers } from '@/composables/useUsers'

const ticketsStore = useTicketsStore()
const teamsStore = useTeamsStore()
const sprintsStore = useSprintsStore()
const authStore = useAuthStore()
const { getUser, avatarUrl, fetchUsers } = useUsers()

const selectedTeamId = ref(null)
const selectedSprintId = ref(null)
const selectedTicket = ref(null)
const viewMode = ref(localStorage.getItem('myTeamViewMode') || 'table')

watch(viewMode, (m) => localStorage.setItem('myTeamViewMode', m))

// Sobald User und Teams verfügbar sind, das eigene Team vorbelegen.
// watch mit immediate:true deckt beide Fälle ab:
// - direkt nach Login (user schon gesetzt, teams kommen nach fetch)
// - nach Seiten-Reload (user kommt via fetchMe async nach)
watch(
  [() => authStore.user, () => teamsStore.teams],
  ([user, teams]) => {
    if (user && teams.length && selectedTeamId.value === null) {
      const myTeam = teams.find(t => t.members?.some(m => m.userId === user.id))
      if (myTeam) {
        selectedTeamId.value = myTeam.id
        loadTickets()
      }
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await Promise.all([teamsStore.fetchTeams(), sprintsStore.fetchSprints(), fetchUsers()])
  const current = await sprintsStore.fetchCurrentSprint()
  if (current) selectedSprintId.value = current.id
  await loadTickets()
})

async function loadTickets() {
  const filters = {}
  if (selectedTeamId.value) filters.teamId = selectedTeamId.value
  if (selectedSprintId.value) filters.sprintId = selectedSprintId.value
  await ticketsStore.fetchTickets(filters)
}

const myTickets = computed(() =>
  ticketsStore.tickets.filter(t => t.assigneeId === authStore.user?.id)
)

const allStatuses = ['draft', 'planned', 'in_progress', 'review', 'done']
const statusLabels = { draft: 'Draft', planned: 'Geplant', in_progress: 'In Arbeit', review: 'Review', done: 'Abschluss' }

const ticketsByStatus = computed(() => {
  const map = {}
  allStatuses.forEach(s => { map[s] = [] })
  myTickets.value.forEach(t => {
    if (map[t.status]) map[t.status].push(t)
  })
  return map
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Mein Team</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Deine zugewiesenen Tickets</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <select v-model="selectedTeamId" @change="loadTickets" class="input-field w-auto">
          <option :value="null">Alle Teams</option>
          <option v-for="team in teamsStore.teams" :key="team.id" :value="team.id">{{ team.name }}</option>
        </select>
        <select v-model="selectedSprintId" @change="loadTickets" class="input-field w-auto">
          <option :value="null">Alle Sprints</option>
          <option v-for="sprint in sprintsStore.sprints" :key="sprint.id" :value="sprint.id">
            {{ sprint.name }}{{ sprint.id === sprintsStore.currentSprint?.id ? ' (Aktuell)' : '' }}
          </option>
        </select>
        <div class="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button @click="viewMode = 'table'" class="px-3 py-2 text-sm transition-colors" :class="viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'">Liste</button>
          <button @click="viewMode = 'kanban'" class="px-3 py-2 text-sm transition-colors" :class="viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'">Board</button>
        </div>
      </div>
    </div>

    <div v-if="ticketsStore.loading" class="card py-12 text-center text-gray-400">Laden...</div>

    <!-- Tabellen-Ansicht -->
    <div v-else-if="viewMode === 'table'" class="card overflow-hidden p-0">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th class="px-6 py-3">Titel</th>
              <th class="px-6 py-3">Status</th>
              <th class="px-6 py-3">Priorität</th>
              <th class="px-6 py-3">Zugewiesen</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="ticket in myTickets" :key="ticket.id" @click="selectedTicket = ticket" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
              <td class="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">{{ ticket.title }}</td>
              <td class="px-6 py-3"><StatusBadge :status="ticket.status" /></td>
              <td class="px-6 py-3"><PriorityBadge v-if="ticket.priority" :priority="ticket.priority" /></td>
              <td class="px-6 py-3">
                <template v-if="ticket.assigneeId">
                  <img
                    :src="avatarUrl(ticket.assigneeId)"
                    :title="getUser(ticket.assigneeId)?.username"
                    class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600"
                    :alt="getUser(ticket.assigneeId)?.username"
                  />
                </template>
                <div v-else class="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-500" title="Nicht zugewiesen" />
              </td>
            </tr>
            <tr v-if="!myTickets.length">
              <td colspan="4" class="px-6 py-10 text-center text-sm text-gray-400">Keine Tickets zugewiesen</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mini-Kanban -->
    <div v-else class="flex gap-4 overflow-x-auto pb-4">
      <div v-for="status in allStatuses" :key="status" class="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-3 min-w-[240px] w-60">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">{{ statusLabels[status] }} ({{ ticketsByStatus[status]?.length || 0 }})</h3>
        <div class="space-y-2">
          <div v-for="ticket in ticketsByStatus[status]" :key="ticket.id" @click="selectedTicket = ticket"
            class="bg-white dark:bg-gray-700 rounded-lg p-3 text-sm cursor-pointer hover:shadow-md border border-gray-200 dark:border-gray-600 transition-shadow">
            <div class="flex items-start justify-between gap-2">
              <p class="font-medium text-gray-900 dark:text-white line-clamp-2 flex-1">{{ ticket.title }}</p>
              <template v-if="ticket.assigneeId">
                <img
                  :src="avatarUrl(ticket.assigneeId)"
                  :title="getUser(ticket.assigneeId)?.username"
                  class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0 mt-0.5"
                  :alt="getUser(ticket.assigneeId)?.username"
                />
              </template>
              <div v-else class="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-500 shrink-0 mt-0.5" title="Nicht zugewiesen" />
            </div>
            <div class="flex items-center justify-between mt-2">
              <PriorityBadge v-if="ticket.priority" :priority="ticket.priority" />
              <span v-else />
              <TicketTypeIcon :type="ticket.type || 'task'" />
            </div>
          </div>
          <div v-if="!ticketsByStatus[status]?.length" class="py-4 text-center text-xs text-gray-400">Leer</div>
        </div>
      </div>
    </div>

    <TicketModal v-if="selectedTicket" :ticket="selectedTicket"
      @close="selectedTicket = null"
      @saved="selectedTicket = null; loadTickets()"
      @deleted="selectedTicket = null; loadTickets()" />
  </div>
</template>
