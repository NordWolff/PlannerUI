<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTicketsStore } from '@/stores/tickets'
import { useBoardsStore } from '@/stores/boards'
import { useProjectsStore } from '@/stores/projects'
import KanbanBoard from '@/components/kanban/KanbanBoard.vue'
import TicketModal from '@/components/tickets/TicketModal.vue'

const route = useRoute()
const router = useRouter()

const ticketsStore = useTicketsStore()
const boardsStore = useBoardsStore()
const projectsStore = useProjectsStore()

const selectedBoardId = ref(null)
const selectedProjectId = ref(null)
const selectedTicket = ref(null)

onMounted(async () => {
  const plannerId = route.params.plannerId
  const filter = plannerId ? { plannerId } : {}
  await Promise.all([
    boardsStore.fetchBoards(filter),
    projectsStore.fetchProjects(filter),
  ])
  if (boardsStore.boards.length) selectedBoardId.value = boardsStore.boards[0].id
  await loadTickets()
})

async function loadTickets() {
  const filters = {}
  const plannerId = route.params.plannerId
  if (plannerId) filters.plannerId = plannerId
  if (selectedBoardId.value) filters.boardId = selectedBoardId.value
  if (selectedProjectId.value) filters.projectId = selectedProjectId.value
  await ticketsStore.fetchTickets(filters)
}

async function handleStatusChange({ ticketId, status }) {
  await ticketsStore.updateStatus(ticketId, status)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Kanban</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Tickets per Drag & Drop verschieben</p>
      </div>
      <button @click="router.push(`/planner/${route.params.plannerId}/gantt`)"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-400 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Zeitstrahl
      </button>
    </div>

    <!-- Filter -->
    <div class="flex flex-wrap gap-3">
      <select v-model="selectedBoardId" @change="loadTickets" class="input-field w-auto">
        <option :value="null">Alle Boards</option>
        <option v-for="board in boardsStore.boards" :key="board.id" :value="board.id">{{ board.name }}</option>
      </select>
      <select v-model="selectedProjectId" @change="loadTickets" class="input-field w-auto">
        <option :value="null">Alle Projekte</option>
        <option v-for="project in projectsStore.projects" :key="project.id" :value="project.id">{{ project.name }}</option>
      </select>
    </div>

    <!-- Board-Tabs -->
    <div v-if="boardsStore.boards.length > 1" class="flex gap-1 border-b border-gray-200 dark:border-gray-700">
      <button v-for="board in boardsStore.boards" :key="board.id"
        @click="selectedBoardId = board.id; loadTickets()"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="selectedBoardId === board.id
          ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'">
        {{ board.name }}
      </button>
    </div>

    <div v-if="ticketsStore.loading" class="py-12 text-center text-gray-400">Tickets werden geladen...</div>

    <KanbanBoard v-else :tickets="ticketsStore.tickets" @ticket-click="selectedTicket = $event" @status-change="handleStatusChange" />

    <TicketModal v-if="selectedTicket" :ticket="selectedTicket" @close="selectedTicket = null" @saved="selectedTicket = null; loadTickets()" @deleted="selectedTicket = null; loadTickets()" />

  </div>
</template>
