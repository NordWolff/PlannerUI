<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePlannersStore } from '@/stores/planners'
import api from '@/services/api'
import BaseCard from '@/components/common/BaseCard.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'

const route = useRoute()
const plannersStore = usePlannersStore()

const filterStatus = ref('')
const filterPriority = ref('')

// Reports zeigt standardmäßig nur Planner, in denen man Mitglied ist — 'all' aggregiert über alle eigenen Planner.
const selectedPlannerId = ref(route.params.plannerId || 'all')

const loading = ref(false)
const tickets = ref([])
const stats = ref({ teams: 0, projects: 0, tickets: 0, boards: 0 })

function plannerIdsToQuery() {
  if (selectedPlannerId.value !== 'all') return [selectedPlannerId.value]
  return plannersStore.planners.map(p => p.id)
}

async function fetchForPlanners(path) {
  const ids = plannerIdsToQuery()
  if (!ids.length) return []
  const results = await Promise.all(ids.map(id => api.get(path, { params: { plannerId: id } })))
  return results.flatMap(r => r.data)
}

async function loadReportData() {
  loading.value = true
  try {
    const [ticketData, teamsData, projectsData, boardsData] = await Promise.all([
      fetchForPlanners('/tickets'),
      fetchForPlanners('/teams'),
      fetchForPlanners('/projects'),
      fetchForPlanners('/boards'),
    ])
    tickets.value = ticketData
    stats.value = {
      teams: teamsData.length,
      projects: projectsData.length,
      tickets: ticketData.length,
      boards: boardsData.length,
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await plannersStore.fetchPlanners()
  await loadReportData()
})

watch(selectedPlannerId, loadReportData)

const filtered = computed(() =>
  tickets.value.filter(t => {
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
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Statistiken und Auswertungen für deine Planner</p>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Planner</label>
        <select v-model="selectedPlannerId" class="input-field text-sm py-1.5 w-56">
          <option value="all">Alle meine Planner</option>
          <option v-for="p in plannersStore.planners" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="kpi in kpiCards" :key="kpi.key" class="card">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="kpi.bg">
            <span class="text-2xl font-bold" :class="kpi.text">{{ stats[kpi.key] ?? 0 }}</span>
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
            <tr v-if="loading"><td colspan="3" class="px-6 py-10 text-center text-gray-400">Laden...</td></tr>
            <tr v-for="ticket in filtered" :key="ticket.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td class="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">{{ ticket.title }}</td>
              <td class="px-6 py-3"><StatusBadge :status="ticket.status" /></td>
              <td class="px-6 py-3"><PriorityBadge v-if="ticket.priority" :priority="ticket.priority" /></td>
            </tr>
            <tr v-if="!loading && !filtered.length">
              <td colspan="3" class="px-6 py-10 text-center text-sm text-gray-400">Keine Tickets gefunden</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
