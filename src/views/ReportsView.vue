<script setup>
import { onMounted, ref, computed } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useTicketsStore } from '@/stores/tickets'
import BaseCard from '@/components/common/BaseCard.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'

const dashboardStore = useDashboardStore()
const ticketsStore = useTicketsStore()

const filterStatus = ref('')
const filterPriority = ref('')

onMounted(() => Promise.all([dashboardStore.fetchStats(), ticketsStore.fetchTickets()]))

const filtered = computed(() =>
  ticketsStore.tickets.filter(t => {
    if (filterStatus.value && t.status !== filterStatus.value) return false
    if (filterPriority.value && t.priority !== filterPriority.value) return false
    return true
  })
)

const kpiCards = [
  { label: 'Teams', key: 'teams', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  { label: 'Projekte', key: 'projects', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  { label: 'Tickets', key: 'tickets', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
  { label: 'Boards', key: 'boards', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">Statistiken und Auswertungen</p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="kpi in kpiCards" :key="kpi.key" class="card">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="kpi.bg">
            <span class="text-2xl font-bold" :class="kpi.text">{{ dashboardStore.stats[kpi.key] ?? 0 }}</span>
          </div>
          <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ kpi.label }}</p>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <select v-model="filterStatus" class="input-field w-auto">
        <option value="">Alle Status</option>
        <option value="draft">Draft</option>
        <option value="planned">Geplant</option>
        <option value="in_progress">In Arbeit</option>
        <option value="review">Review</option>
        <option value="done">Abschluss</option>
      </select>
      <select v-model="filterPriority" class="input-field w-auto">
        <option value="">Alle Prioritäten</option>
        <option value="low">Niedrig</option>
        <option value="medium">Mittel</option>
        <option value="high">Hoch</option>
        <option value="critical">Kritisch</option>
      </select>
      <span class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg">
        {{ filtered.length }} Einträge
      </span>
    </div>

    <BaseCard title="Ticket-Übersicht" :padding="false">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th class="px-6 py-3">Titel</th>
              <th class="px-6 py-3">Status</th>
              <th class="px-6 py-3">Priorität</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-if="ticketsStore.loading"><td colspan="3" class="px-6 py-10 text-center text-gray-400">Laden...</td></tr>
            <tr v-for="ticket in filtered" :key="ticket.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td class="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">{{ ticket.title }}</td>
              <td class="px-6 py-3"><StatusBadge :status="ticket.status" /></td>
              <td class="px-6 py-3"><PriorityBadge v-if="ticket.priority" :priority="ticket.priority" /></td>
            </tr>
            <tr v-if="!ticketsStore.loading && !filtered.length">
              <td colspan="3" class="px-6 py-10 text-center text-sm text-gray-400">Keine Tickets gefunden</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
