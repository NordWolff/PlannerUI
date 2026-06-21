<script setup>
import { onMounted, ref, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useDashboardStore } from '@/stores/dashboard'
import { useBoardsStore } from '@/stores/boards'
import { usePlannersStore } from '@/stores/planners'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useSprintsStore } from '@/stores/sprints'
import { useUsers } from '@/composables/useUsers'
import api from '@/services/api'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import TicketTypeIcon from '@/components/common/TicketTypeIcon.vue'
import TicketDetail from '@/components/tickets/TicketDetail.vue'

const route = useRoute()
const dashboardStore = useDashboardStore()
const boardsStore = useBoardsStore()
const plannersStore = usePlannersStore()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const sprintsStore = useSprintsStore()
const { fetchUsers } = useUsers()

// ── Board-Modal ───────────────────────────────────────────────────────────────
const showBoardModal = ref(false)
const editingBoard = ref(null)
const boardForm = reactive({ name: '', description: '', startDate: '', endDate: '' })

// ── Meine Tickets ─────────────────────────────────────────────────────────────
const myTickets = ref([])
const loadingMyTickets = ref(false)
const selectedTicket = ref(null)
const statusFilter = ref('all')

const STATUS_FILTERS = [
  { key: 'all',         label: 'Alle' },
  { key: 'draft',       label: 'Entwurf' },
  { key: 'planned',     label: 'Geplant' },
  { key: 'in_progress', label: 'In Arbeit' },
  { key: 'review',      label: 'Review' },
  { key: 'done',        label: 'Erledigt' },
]

const filteredMyTickets = computed(() => {
  if (statusFilter.value === 'all') return myTickets.value
  return myTickets.value.filter(t => t.status === statusFilter.value)
})

const statusCountMap = computed(() => {
  const map = {}
  for (const t of myTickets.value) {
    map[t.status] = (map[t.status] || 0) + 1
  }
  return map
})

async function loadMyTickets() {
  loadingMyTickets.value = true
  try {
    const plannerId = route.params.plannerId
    const { data } = await api.get('/tickets', {
      params: { ...(plannerId ? { plannerId } : {}), myTickets: 'true' },
    })
    myTickets.value = data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  } catch {
    // silent
  } finally {
    loadingMyTickets.value = false
  }
}

function openTicketDetail(ticket) {
  selectedTicket.value = ticket
}

async function handleTicketSaved() {
  // Ticket in der Liste aktualisieren
  try {
    const { data } = await api.get(`/tickets/${selectedTicket.value.id}`)
    const idx = myTickets.value.findIndex(t => t.id === data.id)
    if (idx !== -1) myTickets.value[idx] = data
    selectedTicket.value = data
  } catch { /* silent */ }
}

async function handleTicketDeleted() {
  myTickets.value = myTickets.value.filter(t => t.id !== selectedTicket.value?.id)
  selectedTicket.value = null
}

// ── KPI ───────────────────────────────────────────────────────────────────────
const kpiCards = [
  { label: 'Teams',    key: 'teams',    icon: '👥', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
  { label: 'Projekte', key: 'projects', icon: '📁', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
  { label: 'Tickets',  key: 'tickets',  icon: '🎫', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { label: 'Boards',   key: 'boards',   icon: '📋', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' },
]

const statusLabels = { draft: 'Entwurf', planned: 'Geplant', in_progress: 'In Arbeit', review: 'Review', done: 'Erledigt' }

// ── Board ─────────────────────────────────────────────────────────────────────
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
  const plannerId = route.params.plannerId || plannersStore.activePlannerId
  if (editingBoard.value) {
    await boardsStore.updateBoard(editingBoard.value.id, { ...boardForm, plannerId })
  } else {
    await boardsStore.createBoard({ ...boardForm, plannerId })
  }
  showBoardModal.value = false
  dashboardStore.fetchStats(plannerId)
}

async function deleteBoard(id) {
  if (!confirm('Board wirklich löschen?')) return
  await boardsStore.deleteBoard(id)
  dashboardStore.fetchStats(route.params.plannerId)
}

onMounted(async () => {
  const plannerId = route.params.plannerId
  await Promise.all([
    dashboardStore.fetchStats(plannerId),
    dashboardStore.fetchActivity(plannerId),
    boardsStore.fetchBoards(plannerId ? { plannerId } : {}),
    projectsStore.fetchProjects(plannerId ? { plannerId } : {}),
    sprintsStore.fetchSprints(plannerId ? { plannerId } : {}),
    fetchUsers(),
    loadMyTickets(),
  ])
})
</script>

<template>
  <!-- Ticket-Detail: ersetzt die ganze Seite wenn ein Ticket geöffnet ist -->
  <TicketDetail
    v-if="selectedTicket"
    :ticket="selectedTicket"
    @back="selectedTicket = null"
    @saved="handleTicketSaved"
    @deleted="handleTicketDeleted"
  />

  <div v-else class="space-y-6">
    <!-- Planner-Kontext -->
    <div v-if="plannersStore.activePlanner" class="flex items-start justify-between gap-4 p-4 bg-primary-light dark:bg-primary-active/20 border border-primary-light dark:border-primary-active rounded-xl">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ plannersStore.activePlanner.name }}</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">{{ plannersStore.activePlanner.description }}</p>
        <div class="flex gap-4 mt-2 text-xs text-primary dark:text-primary-dark">
          <span>{{ plannersStore.activePlanner.members?.length ?? 0 }} Mitglieder</span>
          <span>·</span>
          <span>{{ plannersStore.activePlanner.teamCount ?? 0 }} Teams</span>
        </div>
      </div>
      <router-link to="/planners" class="shrink-0 text-xs text-primary dark:text-primary-dark hover:underline mt-1">Planner wechseln</router-link>
    </div>
    <div v-else>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">Übersicht und Statistiken</p>
    </div>

    <!-- KPI Karten -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="kpi in kpiCards" :key="kpi.key" class="card">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            :class="kpi.color.split(' ').slice(1).join(' ')">
            {{ kpi.icon }}
          </div>
          <div>
            <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ dashboardStore.stats[kpi.key] ?? 0 }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ kpi.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Aktueller Sprint -->
    <BaseCard v-if="dashboardStore.stats.currentSprint" title="Aktueller Sprint">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-semibold text-gray-900 dark:text-white">{{ dashboardStore.stats.currentSprint.name }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ new Date(dashboardStore.stats.currentSprint.startDate).toLocaleDateString('de-DE') }} –
            {{ new Date(dashboardStore.stats.currentSprint.endDate).toLocaleDateString('de-DE') }}
          </p>
        </div>
        <span class="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium rounded-full">Aktiv</span>
      </div>
    </BaseCard>

    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Board-Management -->
      <BaseCard title="Board-Management">
        <div class="flex justify-end mb-4">
          <button @click="openCreateBoard" class="btn-primary text-sm">+ Board erstellen</button>
        </div>
        <div class="space-y-3">
          <div v-for="board in boardsStore.boards" :key="board.id"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ board.name }}</p>
              <p v-if="board.description" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs">{{ board.description }}</p>
            </div>
            <div class="flex gap-2">
              <button @click="openEditBoard(board)" class="text-xs text-primary dark:text-primary-dark hover:underline">Bearbeiten</button>
              <button @click="deleteBoard(board.id)" class="text-xs text-red-500 hover:underline">Löschen</button>
            </div>
          </div>
          <div v-if="!boardsStore.boards.length" class="py-6 text-center text-sm text-gray-400">Keine Boards vorhanden</div>
        </div>
      </BaseCard>

      <!-- Statusverteilung -->
      <BaseCard title="Ticket-Statusverteilung">
        <div class="space-y-3">
          <div v-for="(count, status) in dashboardStore.stats.byStatus" :key="status">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-600 dark:text-gray-400">{{ statusLabels[status] || status }}</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ count }}</span>
            </div>
            <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full"
                :style="{ width: `${(count / (dashboardStore.stats.tickets || 1)) * 100}%` }" />
            </div>
          </div>
          <div v-if="!dashboardStore.stats.byStatus || !Object.keys(dashboardStore.stats.byStatus).length"
            class="py-4 text-center text-sm text-gray-400">Keine Tickets</div>
        </div>
      </BaseCard>
    </div>

    <!-- ── Meine Tickets ───────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <!-- Header -->
      <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">Meine Tickets</h3>
        <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-light dark:bg-primary-active/30 text-primary dark:text-primary-dark">
          {{ myTickets.length }}
        </span>
        <button @click="loadMyTickets" :disabled="loadingMyTickets"
          class="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-40 transition-colors">
          <svg class="w-4 h-4" :class="{ 'animate-spin': loadingMyTickets }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <!-- Status-Filter Tabs -->
      <div class="px-4 pt-3 pb-0 border-b border-gray-100 dark:border-gray-700">
        <div class="flex gap-0.5 overflow-x-auto">
          <button
            v-for="f in STATUS_FILTERS" :key="f.key"
            @click="statusFilter = f.key"
            class="px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2"
            :class="statusFilter === f.key
              ? 'border-primary text-primary dark:text-primary-dark'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'">
            {{ f.label }}
            <span v-if="f.key !== 'all' && statusCountMap[f.key]"
              class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {{ statusCountMap[f.key] }}
            </span>
          </button>
        </div>
      </div>

      <!-- Ticket-Tabelle -->
      <div class="overflow-x-auto">
        <p v-if="loadingMyTickets" class="px-6 py-8 text-center text-sm text-gray-400">Lade Tickets…</p>
        <table v-else class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-3">Nr.</th>
              <th class="px-4 py-3">Titel</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 hidden sm:table-cell">Priorität</th>
              <th class="px-4 py-3 hidden md:table-cell">Aktualisiert</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr
              v-for="ticket in filteredMyTickets" :key="ticket.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              @click="openTicketDetail(ticket)">
              <td class="px-4 py-3">
                <span class="font-mono text-xs text-primary dark:text-primary-dark font-medium">{{ ticket.ticketNumber }}</span>
              </td>
              <td class="px-4 py-3 max-w-[280px]">
                <div class="flex items-center gap-2 min-w-0">
                  <TicketTypeIcon :type="ticket.type" class="w-3.5 h-3.5 shrink-0" />
                  <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ ticket.title }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <StatusBadge :status="ticket.status" />
              </td>
              <td class="px-4 py-3 hidden sm:table-cell">
                <PriorityBadge :priority="ticket.priority" />
              </td>
              <td class="px-4 py-3 hidden md:table-cell text-sm text-gray-500 dark:text-gray-400">
                {{ new Date(ticket.updatedAt).toLocaleDateString('de-DE') }}
              </td>
            </tr>
            <tr v-if="!filteredMyTickets.length">
              <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-400">
                {{ statusFilter === 'all' ? 'Keine Tickets zugewiesen oder erstellt' : 'Keine Tickets in diesem Status' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Board Modal -->
    <BaseModal v-if="showBoardModal" :title="editingBoard ? 'Board bearbeiten' : 'Neues Board'" @close="showBoardModal = false">
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input v-model="boardForm.name" type="text" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
          <textarea v-model="boardForm.description" rows="2" class="input-field resize-none" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Startdatum</label>
            <input v-model="boardForm.startDate" type="date" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enddatum</label>
            <input v-model="boardForm.endDate" type="date" class="input-field" />
          </div>
        </div>
      </div>
      <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="showBoardModal = false" class="btn-secondary">Abbrechen</button>
        <button @click="saveBoard" :disabled="!boardForm.name" class="btn-primary">Speichern</button>
      </div>
    </BaseModal>
  </div>
</template>
