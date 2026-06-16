<script setup>
import { onMounted, ref, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useDashboardStore } from '@/stores/dashboard'
import { useBoardsStore } from '@/stores/boards'
import { usePlannersStore } from '@/stores/planners'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const route = useRoute()
const dashboardStore = useDashboardStore()
const boardsStore = useBoardsStore()
const plannersStore = usePlannersStore()

const showBoardModal = ref(false)
const editingBoard = ref(null)
const boardForm = reactive({ name: '', description: '', startDate: '', endDate: '' })

onMounted(() => {
  const plannerId = route.params.plannerId
  return Promise.all([
    dashboardStore.fetchStats(plannerId),
    dashboardStore.fetchActivity(plannerId),
    boardsStore.fetchBoards(plannerId ? { plannerId } : {}),
  ])
})

const kpiCards = [
  { label: 'Teams', key: 'teams', icon: '👥', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
  { label: 'Projekte', key: 'projects', icon: '📁', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
  { label: 'Tickets', key: 'tickets', icon: '🎫', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { label: 'Boards', key: 'boards', icon: '📋', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' },
]

const statusLabels = { draft: 'Draft', planned: 'Geplant', in_progress: 'In Arbeit', review: 'Review', done: 'Abschluss' }

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
</script>

<template>
  <div class="space-y-6">
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
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" :class="kpi.color.split(' ').slice(1).join(' ')">
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
              <div class="h-full bg-primary rounded-full" :style="{ width: `${(count / (dashboardStore.stats.tickets || 1)) * 100}%` }" />
            </div>
          </div>
          <div v-if="!dashboardStore.stats.byStatus || !Object.keys(dashboardStore.stats.byStatus).length"
            class="py-4 text-center text-sm text-gray-400">Keine Tickets</div>
        </div>
      </BaseCard>
    </div>

    <!-- Neueste Tickets -->
    <BaseCard title="Neueste Tickets" :padding="false">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th class="px-6 py-3">Titel</th>
              <th class="px-6 py-3">Status</th>
              <th class="px-6 py-3">Zuletzt aktualisiert</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="ticket in dashboardStore.activity.slice(0, 8)" :key="ticket.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td class="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">{{ ticket.title }}</td>
              <td class="px-6 py-3"><StatusBadge :status="ticket.status" /></td>
              <td class="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">{{ new Date(ticket.updatedAt).toLocaleDateString('de-DE') }}</td>
            </tr>
            <tr v-if="!dashboardStore.activity.length">
              <td colspan="3" class="px-6 py-8 text-center text-sm text-gray-400">Keine Tickets vorhanden</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

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
