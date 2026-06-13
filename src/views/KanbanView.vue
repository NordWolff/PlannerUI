<script setup>
import { onMounted, ref, computed } from 'vue'
import { useTicketsStore } from '@/stores/tickets'
import { useBoardsStore } from '@/stores/boards'
import { useTeamsStore } from '@/stores/teams'
import { useProjectsStore } from '@/stores/projects'
import KanbanBoard from '@/components/kanban/KanbanBoard.vue'
import TicketModal from '@/components/tickets/TicketModal.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { reactive } from 'vue'

const ticketsStore = useTicketsStore()
const boardsStore = useBoardsStore()
const teamsStore = useTeamsStore()
const projectsStore = useProjectsStore()

const selectedBoardId = ref(null)
const selectedTeamId = ref(null)
const selectedProjectId = ref(null)
const selectedTicket = ref(null)
const showNewTicketModal = ref(false)
const newTicketForm = reactive({ title: '', description: '', priority: 'medium' })

onMounted(async () => {
  await Promise.all([boardsStore.fetchBoards(), teamsStore.fetchTeams(), projectsStore.fetchProjects()])
  if (boardsStore.boards.length) selectedBoardId.value = boardsStore.boards[0].id
  await loadTickets()
})

async function loadTickets() {
  const filters = {}
  if (selectedBoardId.value) filters.boardId = selectedBoardId.value
  if (selectedTeamId.value) filters.teamId = selectedTeamId.value
  if (selectedProjectId.value) filters.projectId = selectedProjectId.value
  await ticketsStore.fetchTickets(filters)
}

async function handleStatusChange({ ticketId, status }) {
  await ticketsStore.updateStatus(ticketId, status)
}

async function createTicket() {
  await ticketsStore.createTicket({ ...newTicketForm, boardId: selectedBoardId.value })
  showNewTicketModal.value = false
  newTicketForm.title = ''
  newTicketForm.description = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Kanban</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Tickets per Drag & Drop verschieben</p>
      </div>
      <button @click="showNewTicketModal = true" class="btn-primary">+ Ticket erstellen</button>
    </div>

    <!-- Filter -->
    <div class="flex flex-wrap gap-3">
      <select v-model="selectedBoardId" @change="loadTickets" class="input-field w-auto">
        <option :value="null">Alle Boards</option>
        <option v-for="board in boardsStore.boards" :key="board.id" :value="board.id">{{ board.name }}</option>
      </select>
      <select v-model="selectedTeamId" @change="loadTickets" class="input-field w-auto">
        <option :value="null">Alle Teams</option>
        <option v-for="team in teamsStore.teams" :key="team.id" :value="team.id">{{ team.name }}</option>
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

    <BaseModal v-if="showNewTicketModal" title="Neues Ticket" @close="showNewTicketModal = false">
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titel</label>
          <input v-model="newTicketForm.title" type="text" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
          <textarea v-model="newTicketForm.description" rows="3" class="input-field resize-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorität</label>
          <select v-model="newTicketForm.priority" class="input-field">
            <option value="low">Niedrig</option>
            <option value="medium">Mittel</option>
            <option value="high">Hoch</option>
            <option value="critical">Kritisch</option>
          </select>
        </div>
      </div>
      <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="showNewTicketModal = false" class="btn-secondary">Abbrechen</button>
        <button @click="createTicket" :disabled="!newTicketForm.title" class="btn-primary">Erstellen</button>
      </div>
    </BaseModal>
  </div>
</template>
