<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlannersStore } from '@/stores/planners'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'
import TicketModal from '@/components/tickets/TicketModal.vue'
import ChangelogModal from '@/components/common/ChangelogModal.vue'
import { currentVersion } from '@/data/changelog'
import { useTicketsStore } from '@/stores/tickets'
import { useProjectsStore } from '@/stores/projects'
import { useBoardsStore } from '@/stores/boards'
import { useTeamsStore } from '@/stores/teams'
import { useSprintsStore } from '@/stores/sprints'
import { useUsers } from '@/composables/useUsers'
import { generateAvatar } from '@/utils/avatar'
import { useNotificationsStore } from '@/stores/notifications'

const authStore     = useAuthStore()
const plannersStore = usePlannersStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const ticketsStore  = useTicketsStore()
const projectsStore = useProjectsStore()
const boardsStore   = useBoardsStore()
const teamsStore    = useTeamsStore()
const sprintsStore  = useSprintsStore()
const { users: allUsers, fetchUsers } = useUsers()

// ─── Erstellen-Button ─────────────────────────────────────────────────────────
const showCreateDropdown = ref(false)
const createDropdownRef  = ref(null)
const showCreateModal    = ref(false)

// Schließt den Erstellen-Dropdown bei Klick außerhalb — der "fixed inset-0"-Overlay
// lag im Stacking-Kontext über dem Button selbst und fing dessen eigenen Toggle-Klick ab,
// sodass ein erneuter Klick auf den Button nicht mehr schloss (nur ein weiterer Klick daneben).
function onCreateDropdownDocClick(e) {
  if (showCreateDropdown.value && createDropdownRef.value && !createDropdownRef.value.contains(e.target)) {
    showCreateDropdown.value = false
  }
}
onMounted(() => {
  document.addEventListener('click', onCreateDropdownDocClick)
  notificationsStore.fetchNotifications()
  notificationPollInterval = setInterval(() => notificationsStore.fetchNotifications(), 30000)
})
onUnmounted(() => {
  document.removeEventListener('click', onCreateDropdownDocClick)
  clearInterval(notificationPollInterval)
})
const createTab          = ref('ticket')
const creatingItem       = ref(false)

const ticketForm  = reactive({ title: '', description: '', priority: 'medium', type: 'task', assigneeId: null, boardId: null })
const projectForm = reactive({ name: '', description: '', status: 'active', plannerId: null, sprintIds: [] })

async function openCreate(tab) {
  createTab.value = tab
  showCreateDropdown.value = false
  showDropdown.value = false
  if (tab === 'request') {
    requestForm.title = ''
    requestForm.description = ''
    requestForm.type = 'feature'
  }
  showCreateModal.value = true
  if (tab !== 'request') {
    const pid = plannersStore.activePlannerId
    const plannerFilter = pid ? { plannerId: pid } : {}
    await Promise.all([fetchUsers(), teamsStore.fetchTeams(plannerFilter), boardsStore.fetchBoards(plannerFilter), sprintsStore.fetchSprints(plannerFilter)])
    if (!ticketForm.boardId && boardsStore.boards.length) ticketForm.boardId = boardsStore.boards[0].id
    projectForm.plannerId = pid
  }
}

function resetTicketForm() {
  Object.assign(ticketForm, { title: '', description: '', priority: 'medium', type: 'task', assigneeId: null, boardId: boardsStore.boards[0]?.id || null })
}
function resetProjectForm() {
  Object.assign(projectForm, { name: '', description: '', status: 'active', plannerId: plannersStore.activePlannerId, sprintIds: [] })
}

function toggleHeaderSprint(sprintId) {
  const idx = projectForm.sprintIds.indexOf(sprintId)
  if (idx === -1) projectForm.sprintIds.push(sprintId)
  else projectForm.sprintIds.splice(idx, 1)
}

async function submitTicket() {
  if (!ticketForm.title.trim() || creatingItem.value) return
  creatingItem.value = true
  try {
    await ticketsStore.createTicket({ ...ticketForm })
    toast.success('Ticket erstellt')
    resetTicketForm()
    showCreateModal.value = false
  } catch { toast.error('Fehler beim Erstellen') } finally { creatingItem.value = false }
}

async function submitProject() {
  if (!projectForm.name.trim() || creatingItem.value) return
  creatingItem.value = true
  try {
    await projectsStore.createProject({ ...projectForm })
    toast.success('Projekt erstellt')
    resetProjectForm()
    showCreateModal.value = false
  } catch { toast.error('Fehler beim Erstellen') } finally { creatingItem.value = false }
}

const showDropdown = ref(false)
const showChangelog = ref(false)
const submittingRequest = ref(false)

// ─── Benachrichtigungen ───────────────────────────────────────────────────────
const notificationsStore = useNotificationsStore()
const showNotifications = ref(false)

let notificationPollInterval = null

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) notificationsStore.fetchNotifications()
}

function formatNotificationTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `vor ${diffH} Std.`
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

// Mein-Team-Dropdown
const showTeamDropdown = ref(false)
const recentTickets    = ref([])
const loadingRecent    = ref(false)
const headerTicket     = ref(null)

async function toggleTeamDropdown() {
  showTeamDropdown.value = !showTeamDropdown.value
  if (showTeamDropdown.value) {
    loadingRecent.value = true
    try {
      const { data } = await api.get('/tickets/recent', { params: { limit: 8 } })
      recentTickets.value = data
    } catch { /* */ } finally {
      loadingRecent.value = false
    }
  }
}

function formatRecent(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso)
  const min = Math.floor(ms / 60000)
  const h   = Math.floor(min / 60)
  const d   = Math.floor(h / 24)
  if (min < 1)  return 'gerade eben'
  if (min < 60) return `vor ${min} Min.`
  if (h < 24)   return `vor ${h} Std.`
  if (d === 1)  return 'gestern'
  return `vor ${d} Tagen`
}

function openHeaderTicket(ticket) {
  headerTicket.value = ticket
  showTeamDropdown.value = false
}

function goToMyTeam() {
  showTeamDropdown.value = false
  const pid = plannersStore.activePlannerId
  router.push(pid ? `/planner/${pid}/my-team` : '/planners')
}

const requestForm = reactive({ title: '', description: '', type: 'feature' })

const baseLinks = computed(() => {
  const pid = plannersStore.activePlannerId
  if (!pid) return []
  return [
    { to: `/planner/${pid}/dashboard`, label: 'Dashboard' },
    { to: `/planner/${pid}/my-team`,   label: 'Mein Team', isTeam: true },
    { to: `/planner/${pid}/teams`,     label: 'Teams' },
    { to: `/planner/${pid}/projects`,  label: 'Projekte' },
    { to: `/planner/${pid}/kanban`,    label: 'Kanban' },
    { to: `/planner/${pid}/gantt`,     label: 'Zeitstrahl' },
    { to: `/planner/${pid}/reports`,   label: 'Reports' },
    { to: `/planner/${pid}/chat`,      label: 'Chat' },
  ]
})

const navLinks = computed(() => {
  const pid = plannersStore.activePlannerId
  if (!pid) return []
  return [...baseLinks.value, { to: `/planner/${pid}/admin`, label: 'Verwaltung' }]
})

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

function logout() {
  authStore.logout()
  router.push('/login')
}

async function submitRequest() {
  if (!requestForm.title.trim() || submittingRequest.value) return
  submittingRequest.value = true
  try {
    await api.post('/admin-requests', { ...requestForm })
    toast.success('Anfrage erfolgreich gesendet')
    showCreateModal.value = false
  } catch {
    toast.error('Anfrage konnte nicht gesendet werden')
  } finally {
    submittingRequest.value = false
  }
}

const avatarUrl = (user) => generateAvatar(user?.username)
</script>

<template>
  <header class="app-header fixed top-0 left-0 right-0 z-40 h-16 bg-white/70 dark:bg-[#0e0d14]/60 backdrop-blur-xl flex items-center px-4 sm:px-6">
    <!-- Logo + Planner-Kontext -->
    <div class="flex-none flex items-center gap-3 mr-6">
      <span class="text-lg font-bold brand-gradient">T-Compass</span>
      <template v-if="plannersStore.activePlanner">
        <span class="text-gray-300 dark:text-gray-600">|</span>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
          {{ plannersStore.activePlanner.name }}
        </span>
        <button
          @click="router.push('/planners')"
          title="Planner wechseln"
          class="text-xs text-primary hover:text-primary-hover dark:hover:text-primary-dark-hover transition-colors"
        >⇄</button>
      </template>
      <template v-else>
        <router-link to="/planners" class="text-xs text-primary hover:underline">Planner wählen →</router-link>
      </template>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 flex justify-center">
      <div class="flex gap-1">
        <template v-for="link in navLinks" :key="link.to">

          <!-- Mein Team: Dropdown -->
          <div v-if="link.isTeam" class="relative">
            <button
              @click="toggleTeamDropdown"
              class="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150"
              :class="isActive('/my-team') || showTeamDropdown
                ? 'text-gray-900 dark:text-white bg-gradient-to-r from-violet-500/10 to-pink-500/10 dark:from-violet-500/15 dark:to-pink-500/15 ring-1 ring-inset ring-pink-400/20 dark:ring-pink-400/25'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06]'"
            >
              Mein Team
              <svg class="w-3.5 h-3.5 transition-transform" :class="showTeamDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Team-Dropdown-Panel -->
            <div v-if="showTeamDropdown"
              class="absolute left-0 top-full mt-1 w-80 bg-white/80 dark:bg-[#1a1825]/85 backdrop-blur-xl rounded-xl shadow-xl border border-white/60 dark:border-white/[0.06] ring-1 ring-black/[0.05] dark:ring-white/[0.08] z-50 overflow-hidden">

              <!-- Header -->
              <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Zuletzt bearbeitet</span>
                <button @click="goToMyTeam" class="text-xs text-primary dark:text-primary-dark hover:underline font-medium">
                  Alle anzeigen →
                </button>
              </div>

              <!-- Ticket-Liste -->
              <div v-if="loadingRecent" class="py-6 text-center text-xs text-gray-400">Laden…</div>
              <div v-else-if="!recentTickets.length" class="py-6 text-center text-xs text-gray-400">Keine kürzlich bearbeiteten Tickets</div>
              <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-72 overflow-y-auto">
                <li
                  v-for="ticket in recentTickets"
                  :key="ticket.id"
                  @click="openHeaderTicket(ticket)"
                  class="flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer group transition-colors"
                >
                  <span class="font-mono text-xs text-primary dark:text-primary-dark w-20 shrink-0">{{ ticket.ticketNumber || '—' }}</span>
                  <span class="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate group-hover:text-primary dark:group-hover:text-primary-dark transition-colors">{{ ticket.title }}</span>
                  <span class="text-xs text-gray-400 shrink-0">{{ formatRecent(ticket.updatedAt) }}</span>
                </li>
              </ul>

              <!-- Footer -->
              <div class="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                <button @click="goToMyTeam" class="w-full text-center text-xs text-primary dark:text-primary-dark hover:underline py-0.5">
                  Mein-Team-Seite öffnen
                </button>
              </div>
            </div>
          </div>

          <!-- Alle anderen Links -->
          <router-link
            v-else
            :to="link.to"
            class="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150"
            :class="isActive(link.to)
              ? 'text-gray-900 dark:text-white bg-gradient-to-r from-violet-500/10 to-pink-500/10 dark:from-violet-500/15 dark:to-pink-500/15 ring-1 ring-inset ring-pink-400/20 dark:ring-pink-400/25'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06]'"
          >
            {{ link.label }}
          </router-link>

        </template>
      </div>
    </nav>

    <!-- Erstellen-Button -->
    <div class="relative mr-2" ref="createDropdownRef">
      <button
        @click="showCreateDropdown = !showCreateDropdown"
        class="btn-create flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-primary to-pink-500 hover:from-primary hover:to-pink-600 text-white transition-all duration-200 active:scale-95"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="hidden sm:inline">Erstellen</span>
        <svg class="w-3 h-3 hidden sm:block transition-transform" :class="showCreateDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div v-if="showCreateDropdown"
        class="absolute right-0 mt-1 w-44 bg-white/80 dark:bg-[#1a1825]/85 backdrop-blur-xl rounded-xl shadow-xl border border-white/60 dark:border-white/[0.06] ring-1 ring-black/[0.05] dark:ring-white/[0.08] py-1 z-50">
        <button @click="openCreate('ticket')"
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg mx-0">
          <span class="text-base">🎟</span>
          Ticket
        </button>
        <button @click="openCreate('project')"
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-900 dark:hover:text-white transition-colors">
          <span class="text-base">📁</span>
          Projekt
        </button>
        <hr class="border-black/[0.06] dark:border-white/[0.06] my-1" />
        <button @click="openCreate('request')"
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-900 dark:hover:text-white transition-colors">
          <span class="text-base">📨</span>
          Anfrage
        </button>
      </div>
    </div>

    <!-- Notification Bell -->
    <div class="flex-none relative">
      <button
        @click="toggleNotifications"
        class="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        title="Benachrichtigungen"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span v-if="notificationsStore.unreadCount > 0"
          class="absolute top-1 right-1 min-w-[1rem] h-4 px-0.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none">
          {{ notificationsStore.unreadCount > 9 ? '9+' : notificationsStore.unreadCount }}
        </span>
      </button>

      <!-- Notification Dropdown -->
      <div v-if="showNotifications"
        class="absolute right-0 mt-1 w-80 bg-white/90 dark:bg-[#1a1825]/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/60 dark:border-white/[0.06] ring-1 ring-black/[0.05] dark:ring-white/[0.08] z-50 overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/60">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Benachrichtigungen</h3>
          <button v-if="notificationsStore.unreadCount > 0"
            @click="notificationsStore.markAllRead()"
            class="text-xs text-primary dark:text-primary-dark hover:underline">
            Alle gelesen
          </button>
        </div>

        <!-- Liste -->
        <div class="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/40">
          <div v-if="!notificationsStore.notifications.length"
            class="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            <svg class="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Keine Benachrichtigungen
          </div>

          <div v-for="n in notificationsStore.notifications" :key="n.id"
            class="flex items-start gap-3 px-4 py-3 transition-colors"
            :class="n.read ? 'bg-transparent' : 'bg-primary/5 dark:bg-primary-dark/5'">

            <!-- Icon -->
            <div class="mt-0.5 flex-shrink-0">
              <div class="w-8 h-8 rounded-full flex items-center justify-center"
                :class="n.read ? 'bg-gray-100 dark:bg-gray-700' : 'bg-primary/10 dark:bg-primary-dark/10'">
                <svg class="w-4 h-4" :class="n.read ? 'text-gray-400' : 'text-primary dark:text-primary-dark'"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0" @click="!n.read && notificationsStore.markRead(n.id)">
              <p class="text-sm font-medium text-gray-900 dark:text-white leading-snug">{{ n.title }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{{ n.message }}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{ formatNotificationTime(n.createdAt) }}</p>
            </div>

            <!-- Unread dot + delete -->
            <div class="flex flex-col items-center gap-2 flex-shrink-0">
              <div v-if="!n.read" class="w-2 h-2 rounded-full bg-primary dark:bg-primary-dark mt-1"></div>
              <button @click="notificationsStore.remove(n.id)"
                class="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                title="Löschen">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer: Navigation zum Planner wenn invite -->
        <div v-if="notificationsStore.notifications.some(n => n.meta?.plannerId && !n.read)"
          class="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-white/[0.02]">
          <p class="text-xs text-gray-400 dark:text-gray-500">Klicke auf eine Einladung um sie als gelesen zu markieren.</p>
        </div>
      </div>
    </div>

    <!-- User-Profil -->
    <div class="flex-none relative">
      <button @click="showDropdown = !showDropdown" class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
        <img :src="avatarUrl(authStore.user)" class="w-8 h-8 rounded-full bg-gray-200" :alt="authStore.user?.username" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">{{ authStore.user?.username }}</span>
      </button>

      <div v-if="showDropdown" class="absolute right-0 mt-1 w-52 bg-white/80 dark:bg-[#1a1825]/85 backdrop-blur-xl rounded-xl shadow-xl border border-white/60 dark:border-white/[0.06] ring-1 ring-black/[0.05] dark:ring-white/[0.08] py-1 z-50">
        <router-link
          :to="plannersStore.activePlannerId ? `/planner/${plannersStore.activePlannerId}/settings` : '/planners'"
          @click="showDropdown = false"
          class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-900 dark:hover:text-white transition-colors">
          Einstellungen
        </router-link>
        <router-link
          :to="plannersStore.activePlannerId ? `/planner/${plannersStore.activePlannerId}/admin` : '/planners'"
          @click="showDropdown = false"
          class="flex items-center gap-2 px-4 py-2 text-sm text-primary dark:text-primary-dark hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors">
          Verwaltung
        </router-link>
        <button @click="showChangelog = true; showDropdown = false"
          class="flex items-center justify-between gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-900 dark:hover:text-white transition-colors">
          Changelog
          <span class="text-xs text-gray-400 dark:text-gray-500 font-mono">v{{ currentVersion }}</span>
        </button>
        <hr class="border-black/[0.06] dark:border-white/[0.06] my-1" />
        <button @click="logout" class="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/[0.08] dark:hover:bg-red-500/[0.12] transition-colors">
          Abmelden
        </button>
      </div>
    </div>

    <ChangelogModal v-if="showChangelog" @close="showChangelog = false" />

    <div v-if="showDropdown" class="fixed inset-0 z-30" @click="showDropdown = false" />
    <div v-if="showTeamDropdown" class="fixed inset-0 z-30" @click="showTeamDropdown = false" />
    <div v-if="showNotifications" class="fixed inset-0 z-30" @click="showNotifications = false" />
  </header>

  <!-- Ticket-Modal aus Header-Dropdown -->
  <TicketModal
    v-if="headerTicket"
    :ticket="headerTicket"
    @close="headerTicket = null"
    @saved="headerTicket = null; recentTickets = []"
    @deleted="headerTicket = null; recentTickets = []"
  />

  <!-- Erstellen-Modal -->
  <Teleport to="body">
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="showCreateModal = false" />
      <div class="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        <!-- Modal-Header mit Tabs -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div class="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              v-for="tab in [{ id: 'ticket', label: '🎟 Ticket' }, { id: 'project', label: '📁 Projekt' }, { id: 'request', label: '📨 Anfrage' }]"
              :key="tab.id"
              @click="createTab = tab.id"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
              :class="createTab === tab.id
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
            >
              {{ tab.label }}
            </button>
          </div>
          <button @click="showCreateModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">&times;</button>
        </div>

        <!-- Ticket-Formular -->
        <div v-if="createTab === 'ticket'" class="p-6 space-y-4 overflow-y-auto">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Titel *</label>
            <input v-model="ticketForm.title" type="text" class="input-field" placeholder="Ticket-Titel…" @keydown.enter="submitTicket" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Beschreibung</label>
            <textarea v-model="ticketForm.description" rows="3" class="input-field resize-none" placeholder="Optionale Beschreibung…" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Art</label>
              <select v-model="ticketForm.type" class="input-field">
                <option value="task">Aufgabe</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="improvement">Verbesserung</option>
                <option value="question">Frage</option>
                <option value="epic">Epic</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Priorität</label>
              <select v-model="ticketForm.priority" class="input-field">
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Zugewiesen an</label>
              <select v-model="ticketForm.assigneeId" class="input-field">
                <option :value="null">— Nicht zugewiesen —</option>
                <option v-for="u in allUsers" :key="u.id" :value="u.id">{{ u.username }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Board</label>
              <select v-model="ticketForm.boardId" class="input-field">
                <option :value="null">— Kein Board —</option>
                <option v-for="b in boardsStore.boards" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Projekt-Formular -->
        <div v-else-if="createTab === 'project'" class="p-6 space-y-4 overflow-y-auto">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Name *</label>
            <input v-model="projectForm.name" type="text" class="input-field" placeholder="Projektname…" @keydown.enter="submitProject" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Beschreibung</label>
            <textarea v-model="projectForm.description" rows="3" class="input-field resize-none" placeholder="Optionale Beschreibung…" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Status</label>
              <select v-model="projectForm.status" class="input-field">
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
                <option value="completed">Abgeschlossen</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Planner</label>
              <div class="input-field bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 select-none">
                {{ plannersStore.activePlanner?.name || '— Kein Planner —' }}
              </div>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Sprints</label>
            <div class="rounded-lg border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden max-h-36 overflow-y-auto">
              <label v-for="s in sprintsStore.sprints" :key="s.id"
                class="flex items-center gap-2.5 px-3 py-2 hover:bg-primary-light dark:hover:bg-primary-active/20 cursor-pointer transition-colors">
                <input type="checkbox"
                  :checked="projectForm.sprintIds.includes(s.id)"
                  @change="toggleHeaderSprint(s.id)"
                  class="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary" />
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ s.name }}</span>
              </label>
              <div v-if="!sprintsStore.sprints.length" class="px-3 py-2 text-xs text-gray-400 italic">Keine Sprints vorhanden</div>
            </div>
          </div>
        </div>

        <!-- Anfrage-Formular -->
        <div v-else class="p-6 space-y-4 overflow-y-auto">
          <p class="text-xs text-gray-500 dark:text-gray-400">Feature-Wunsch oder Bug direkt an den Admin melden.</p>
          <div class="flex gap-3">
            <button
              v-for="t in [{ id: 'feature', label: '✨ Feature', cls: 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' }, { id: 'bug', label: '🐛 Bug', cls: 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' }]"
              :key="t.id"
              @click="requestForm.type = t.id"
              class="flex-1 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors"
              :class="requestForm.type === t.id ? t.cls : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'"
            >{{ t.label }}</button>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Titel *</label>
            <input v-model="requestForm.title" type="text" class="input-field" placeholder="Kurze Beschreibung…" maxlength="120" @keydown.enter="submitRequest" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Details</label>
            <textarea v-model="requestForm.description" rows="4" class="input-field resize-none" placeholder="Was genau soll passieren? Wie reproduzierst du den Bug?" />
          </div>
        </div>

        <!-- Modal-Footer -->
        <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button @click="showCreateModal = false" class="btn-secondary">Abbrechen</button>
          <button v-if="createTab === 'ticket'" @click="submitTicket" :disabled="!ticketForm.title.trim() || creatingItem" class="btn-primary">
            {{ creatingItem ? 'Erstellen…' : 'Ticket erstellen' }}
          </button>
          <button v-else-if="createTab === 'project'" @click="submitProject" :disabled="!projectForm.name.trim() || creatingItem" class="btn-primary">
            {{ creatingItem ? 'Erstellen…' : 'Projekt erstellen' }}
          </button>
          <button v-else @click="submitRequest" :disabled="!requestForm.title.trim() || submittingRequest" class="btn-primary">
            {{ submittingRequest ? 'Senden…' : 'Anfrage senden' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

</template>
