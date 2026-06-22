<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import { usePlannersStore } from '@/stores/planners'
import { generateAvatar } from '@/utils/avatar'
import TicketTypeIcon from '@/components/common/TicketTypeIcon.vue'

const emit = defineEmits(['open-ticket', 'navigate'])
const router = useRouter()
const plannersStore = usePlannersStore()

const query = ref('')
const results = ref({ tickets: [], projects: [], users: [] })
const loading = ref(false)
const isOpen = ref(false)
const containerRef = ref(null)
let debounceTimer = null

const STATUS_LABELS = { draft: 'Draft', planned: 'Geplant', in_progress: 'In Arbeit', review: 'Review', done: 'Abschluss' }
const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  planned: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400',
  review: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
  done: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
}

const hasResults = computed(() =>
  results.value.tickets.length + results.value.projects.length + results.value.users.length > 0
)
const isEmpty = computed(() =>
  !loading.value && query.value.trim().length >= 2 && !hasResults.value
)

async function onInput() {
  const q = query.value.trim()
  clearTimeout(debounceTimer)
  if (q.length < 2) {
    results.value = { tickets: [], projects: [], users: [] }
    isOpen.value = false
    return
  }
  isOpen.value = true
  loading.value = true
  debounceTimer = setTimeout(async () => {
    try {
      const pid = plannersStore.activePlannerId
      const { data } = await api.get('/search', { params: { q, plannerId: pid, limit: 10 } })
      results.value = data
    } catch {
      results.value = { tickets: [], projects: [], users: [] }
    } finally {
      loading.value = false
    }
  }, 300)
}

function openTicket(ticket) {
  emit('open-ticket', ticket)
  close()
}

function openProject(project) {
  router.push(`/planner/${project.plannerId}/kanban`)
  emit('navigate')
  close()
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    close()
    e.stopPropagation()
  }
}

function close() {
  isOpen.value = false
  query.value = ''
  results.value = { tickets: [], projects: [], users: [] }
  clearTimeout(debounceTimer)
}

function onClickOutside(e) {
  if (containerRef.value && !containerRef.value.contains(e.target)) close()
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
  clearTimeout(debounceTimer)
})
</script>

<template>
  <div ref="containerRef" class="relative w-52 xl:w-64">
    <!-- Suchfeld -->
    <div class="relative">
      <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
      </svg>
      <input
        v-model="query"
        type="text"
        placeholder="Suchen…"
        class="w-full pl-8 pr-3 py-1.5 text-sm bg-black/5 dark:bg-white/[0.08] border border-transparent focus:border-primary dark:focus:border-primary-dark focus:bg-white dark:focus:bg-gray-800 rounded-lg outline-none transition-all placeholder-gray-400 text-gray-900 dark:text-white"
        @input="onInput"
        @keydown="onKeydown"
      />
      <div v-if="loading" class="absolute right-2.5 top-1/2 -translate-y-1/2">
        <svg class="w-3.5 h-3.5 animate-spin text-primary dark:text-primary-dark" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    </div>

    <!-- Ergebnis-Dropdown -->
    <div v-if="isOpen"
      class="absolute top-full mt-2 left-0 right-0 min-w-[320px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[420px] overflow-y-auto">

      <!-- Keine Treffer -->
      <div v-if="isEmpty" class="px-4 py-6 text-center text-sm text-gray-400">
        Keine Treffer für „{{ query.trim() }}"
      </div>

      <!-- Laden -->
      <div v-if="loading && !hasResults" class="px-4 py-5 text-center">
        <div class="flex items-center justify-center gap-2 text-sm text-gray-400">
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Suche läuft…
        </div>
      </div>

      <!-- Tickets -->
      <template v-if="results.tickets.length">
        <div class="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Tickets ({{ results.tickets.length }})
        </div>
        <button v-for="ticket in results.tickets" :key="ticket.id"
          @click="openTicket(ticket)"
          class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-left transition-colors">
          <TicketTypeIcon :type="ticket.type || 'task'" class="shrink-0" />
          <span class="font-mono text-xs text-primary dark:text-primary-dark shrink-0">{{ ticket.ticketNumber }}</span>
          <span class="text-sm text-gray-900 dark:text-white truncate flex-1">{{ ticket.title }}</span>
          <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium" :class="STATUS_COLORS[ticket.status]">
            {{ STATUS_LABELS[ticket.status] || ticket.status }}
          </span>
        </button>
      </template>

      <!-- Projekte -->
      <template v-if="results.projects.length">
        <div class="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
          :class="results.tickets.length ? 'pt-2 mt-1 border-t border-gray-100 dark:border-gray-700' : 'pt-3'">
          Projekte ({{ results.projects.length }})
        </div>
        <button v-for="project in results.projects" :key="project.id"
          @click="openProject(project)"
          class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-left transition-colors">
          <svg class="w-3.5 h-3.5 shrink-0 text-primary dark:text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span class="text-sm text-gray-900 dark:text-white truncate flex-1">{{ project.name }}</span>
          <span v-if="project.description" class="text-xs text-gray-400 truncate max-w-[120px]">{{ project.description }}</span>
        </button>
      </template>

      <!-- Benutzer -->
      <template v-if="results.users.length">
        <div class="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
          :class="(results.tickets.length || results.projects.length) ? 'pt-2 mt-1 border-t border-gray-100 dark:border-gray-700' : 'pt-3'">
          Benutzer ({{ results.users.length }})
        </div>
        <div v-for="user in results.users" :key="user.id"
          class="flex items-center gap-2.5 px-3 py-2.5 cursor-default select-none">
          <img :src="generateAvatar(user.username)" class="w-7 h-7 rounded-full shrink-0" alt="" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ user.username }}</p>
            <p class="text-xs text-gray-400 truncate">{{ user.email }}</p>
          </div>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">
            {{ { admin: 'Admin', owner: 'Owner', user: 'Mitglied' }[user.role] || user.role }}
          </span>
        </div>
      </template>

      <div class="h-1" />
    </div>
  </div>
</template>
