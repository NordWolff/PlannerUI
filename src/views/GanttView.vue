<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import { useTicketsStore } from '@/stores/tickets'
import StatusBadge from '@/components/common/StatusBadge.vue'

const route = useRoute()
const projectsStore = useProjectsStore()
const ticketsStore = useTicketsStore()

// ── Ansichts-Modus ────────────────────────────────────────────────────────────
const viewMode = ref('month') // 'week' | 'month' | 'quarter'
const PX_PER_DAY = { week: 28, month: 12, quarter: 4 }
const pxPerDay = computed(() => PX_PER_DAY[viewMode.value])

// ── Dependency-Pfeile ─────────────────────────────────────────────────────────
const showDeps = ref(false)

// ── Linke Spalte ein-/ausklappen ─────────────────────────────────────────────
const sidebarCollapsed = ref(localStorage.getItem('ganttSidebarCollapsed') === 'true')
function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('ganttSidebarCollapsed', String(sidebarCollapsed.value))
}

// ── Aufgeklappte Projekte ─────────────────────────────────────────────────────
const expandedProjects = ref(new Set())
function toggleExpand(projectId) {
  if (expandedProjects.value.has(projectId)) {
    expandedProjects.value.delete(projectId)
  } else {
    expandedProjects.value.add(projectId)
  }
}

// ── Zeitraum ──────────────────────────────────────────────────────────────────
function toDateStr(date) {
  return date.toISOString().slice(0, 10)
}

const today = new Date()
today.setHours(0, 0, 0, 0)

// Standard-Zeitraum: 2 Monate zurück bis 4 Monate vorwärts
const timelineStart = ref(new Date(today))
const timelineEnd = ref(new Date(today))

function initTimelineRange() {
  const s = new Date(today); s.setMonth(s.getMonth() - 2); s.setDate(1)
  const e = new Date(today); e.setMonth(e.getMonth() + 4); e.setDate(1)
  timelineStart.value = s
  timelineEnd.value = e
}
initTimelineRange()

const startStr = computed({
  get: () => toDateStr(timelineStart.value),
  set: (v) => { timelineStart.value = new Date(v) }
})
const endStr = computed({
  get: () => toDateStr(timelineEnd.value),
  set: (v) => { timelineEnd.value = new Date(v) }
})

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

const totalDays = computed(() => Math.max(1, daysBetween(timelineStart.value, timelineEnd.value)))
const timelineWidth = computed(() => totalDays.value * pxPerDay.value)

// ── Zeitachsen-Ticks ──────────────────────────────────────────────────────────
const monthTicks = computed(() => {
  const ticks = []
  const d = new Date(timelineStart.value)
  d.setDate(1)
  while (d <= timelineEnd.value) {
    const left = daysBetween(timelineStart.value, d) * pxPerDay.value
    if (left >= 0) {
      ticks.push({
        left,
        label: d.toLocaleString('de-DE', { month: 'short', year: '2-digit' }),
      })
    }
    d.setMonth(d.getMonth() + 1)
  }
  return ticks
})

// ── Heute-Linie ───────────────────────────────────────────────────────────────
const todayLeft = computed(() => daysBetween(timelineStart.value, today) * pxPerDay.value)

// ── Hilfsfunktionen für Projektbalken ─────────────────────────────────────────
function projectLeft(project) {
  if (!project.startDate) return 0
  return Math.max(0, daysBetween(timelineStart.value, new Date(project.startDate)) * pxPerDay.value)
}

function projectWidth(project) {
  if (!project.startDate) return 120
  const end = project.endDate ? new Date(project.endDate) : new Date(today.getTime() + 30 * 86400000)
  const start = new Date(project.startDate)
  return Math.max(60, daysBetween(start, end) * pxPerDay.value)
}

// ── Projekte mit Datum ────────────────────────────────────────────────────────
const projectsWithDate = computed(() =>
  projectsStore.projects.filter(p => p.startDate)
)

// ── Tickets pro Projekt ───────────────────────────────────────────────────────
function ticketsForProject(projectId) {
  return ticketsStore.tickets.filter(t => t.projectId === projectId)
}

// ── Drag-to-Move ──────────────────────────────────────────────────────────────
const dragging = ref(null) // { projectId, startX, origLeft }
const dragOffsets = ref({}) // { [projectId]: px offset }

function startDrag(e, project) {
  e.preventDefault()
  dragging.value = {
    projectId: project.id,
    startX: e.clientX,
    origOffset: dragOffsets.value[project.id] ?? 0,
  }
}

function onMouseMove(e) {
  if (!dragging.value) return
  const dx = e.clientX - dragging.value.startX
  dragOffsets.value[dragging.value.projectId] = dragging.value.origOffset + dx
}

async function onMouseUp() {
  if (!dragging.value) return
  const { projectId } = dragging.value
  const project = projectsStore.projects.find(p => p.id === projectId)
  if (project?.startDate) {
    const offset = dragOffsets.value[projectId] ?? 0
    const daysDelta = Math.round(offset / pxPerDay.value)
    if (daysDelta !== 0) {
      const newStart = new Date(project.startDate)
      newStart.setDate(newStart.getDate() + daysDelta)
      const payload = { startDate: newStart.toISOString() }
      if (project.endDate) {
        const newEnd = new Date(project.endDate)
        newEnd.setDate(newEnd.getDate() + daysDelta)
        payload.endDate = newEnd.toISOString()
      }
      await projectsStore.updateProject(projectId, payload)
    }
    dragOffsets.value[projectId] = 0
  }
  dragging.value = null
}

// ── Resize ────────────────────────────────────────────────────────────────────
const resizing = ref(null)
const resizeOffsets = ref({})

function startResize(e, project) {
  e.preventDefault()
  e.stopPropagation()
  resizing.value = {
    projectId: project.id,
    startX: e.clientX,
    origOffset: resizeOffsets.value[project.id] ?? 0,
  }
}

function onMouseMoveResize(e) {
  if (!resizing.value) return
  const dx = e.clientX - resizing.value.startX
  resizeOffsets.value[resizing.value.projectId] = resizing.value.origOffset + dx
}

async function onMouseUpResize() {
  if (!resizing.value) return
  const { projectId } = resizing.value
  const project = projectsStore.projects.find(p => p.id === projectId)
  if (project?.startDate) {
    const offset = resizeOffsets.value[projectId] ?? 0
    const daysDelta = Math.round(offset / pxPerDay.value)
    if (daysDelta !== 0 && project.endDate) {
      const newEnd = new Date(project.endDate)
      newEnd.setDate(newEnd.getDate() + daysDelta)
      await projectsStore.updateProject(projectId, { endDate: newEnd.toISOString() })
    }
    resizeOffsets.value[projectId] = 0
  }
  resizing.value = null
}

// ── Globale Mouse-Events ──────────────────────────────────────────────────────
function onGlobalMouseMove(e) {
  onMouseMove(e)
  onMouseMoveResize(e)
}
function onGlobalMouseUp() {
  onMouseUp()
  onMouseUpResize()
}

onMounted(async () => {
  const plannerId = route.params.plannerId
  const filter = plannerId ? { plannerId } : {}
  await Promise.all([
    projectsStore.fetchProjects(filter),
    ticketsStore.fetchTickets(filter),
  ])
  window.addEventListener('mousemove', onGlobalMouseMove)
  window.addEventListener('mouseup', onGlobalMouseUp)
})
onUnmounted(() => {
  window.removeEventListener('mousemove', onGlobalMouseMove)
  window.removeEventListener('mouseup', onGlobalMouseUp)
})

// ── Dependency-SVG ────────────────────────────────────────────────────────────
const LEFT_PANEL = 240 // px

// Für jeden Ticket-Row eine registrierte Position (top-Offset im Scroll-Container)
const ticketRowTops = ref({}) // { [ticketId]: number }

const svgContainer = ref(null)

function registerRow(ticketId, el) {
  if (!el) return
  nextTick(() => {
    const containerRect = svgContainer.value?.getBoundingClientRect()
    if (!containerRect) return
    const rect = el.getBoundingClientRect()
    ticketRowTops.value[ticketId] = rect.top - containerRect.top
  })
}

// Alle Tickets aller aufgeklappten Projekte mit ihrem Balken-Mittelpunkt
function ticketDepLines() {
  const lines = []
  for (const pid of expandedProjects.value) {
    const tickets = ticketsForProject(pid)
    for (const ticket of tickets) {
      if (!ticket.dependencies?.length) continue
      for (const depId of ticket.dependencies) {
        const fromTop = ticketRowTops.value[depId]
        const toTop = ticketRowTops.value[ticket.id]
        if (fromTop == null || toTop == null) continue
        lines.push({ fromTop: fromTop + 10, toTop: toTop + 10, fromX: 80, toX: 80 })
      }
    }
  }
  return lines
}
</script>

<template>
  <div class="flex flex-col h-full -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
    <!-- Header -->
    <div class="sticky top-16 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Zeitstrahl</h1>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Projekte im Zeitverlauf</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Zeitraum -->
          <div class="flex items-center gap-2 text-sm">
            <label class="text-gray-500 dark:text-gray-400 text-xs">Von</label>
            <input type="date" v-model="startStr" class="input-field py-1 text-sm w-36" />
            <label class="text-gray-500 dark:text-gray-400 text-xs">Bis</label>
            <input type="date" v-model="endStr" class="input-field py-1 text-sm w-36" />
          </div>

          <!-- Zoom -->
          <div class="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
            <button v-for="m in ['week','month','quarter']" :key="m"
              @click="viewMode = m"
              class="px-3 py-1.5 transition-colors capitalize"
              :class="viewMode === m
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'">
              {{ m === 'week' ? 'Woche' : m === 'month' ? 'Monat' : 'Quartal' }}
            </button>
          </div>

          <!-- Dependency-Toggle -->
          <button @click="showDeps = !showDeps"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors"
            :class="showDeps
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Abhängigkeiten
          </button>
        </div>
      </div>
    </div>

    <!-- Gantt-Body -->
    <div class="flex flex-1 overflow-hidden relative">
      <!-- Linke fixe Spalte -->
      <div class="shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10 flex flex-col overflow-hidden transition-all duration-200"
        :class="sidebarCollapsed ? 'w-0 border-r-0' : 'w-60'">
        <!-- Kopfzeile links -->
        <div class="h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 whitespace-nowrap">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Projekt / Ticket</span>
        </div>

        <!-- Zeilen links -->
        <div class="overflow-y-auto flex-1">
          <div v-if="projectsStore.loading" class="py-8 text-center text-gray-400 text-sm">Laden...</div>
          <div v-else-if="!projectsWithDate.length" class="py-8 text-center text-gray-400 text-sm">
            Keine Projekte mit Startdatum
          </div>
          <template v-else v-for="project in projectsWithDate" :key="project.id">
            <!-- Projekt-Zeile -->
            <div class="flex items-center gap-2 px-3 h-10 border-b border-gray-100 dark:border-gray-700/50 group">
              <button @click="toggleExpand(project.id)"
                class="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors shrink-0">
                <svg class="w-3.5 h-3.5 transition-transform" :class="expandedProjects.has(project.id) ? 'rotate-90' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ project.name }}</p>
                <p class="text-xs text-gray-400 truncate">{{ project.status }}</p>
              </div>
            </div>
            <!-- Ticket-Zeilen -->
            <template v-if="expandedProjects.has(project.id)">
              <div v-for="ticket in ticketsForProject(project.id)" :key="ticket.id"
                :ref="el => registerRow(ticket.id, el)"
                class="flex items-center gap-2 px-3 pl-10 h-8 border-b border-gray-100 dark:border-gray-700/50">
                <span class="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{{ ticket.title }}</span>
              </div>
              <div v-if="!ticketsForProject(project.id).length"
                class="px-10 h-8 flex items-center text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700/50">
                Keine Tickets
              </div>
            </template>
          </template>
        </div>
      </div>

      <!-- Ein-/Ausklapp-Button für linke Spalte -->
      <button @click="toggleSidebar"
        class="absolute top-3 z-30 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200"
        :style="{ left: (sidebarCollapsed ? 0 : 240) - 12 + 'px' }"
        :title="sidebarCollapsed ? 'Projektliste einblenden' : 'Projektliste ausblenden'">
        <svg class="w-3.5 h-3.5 transition-transform duration-200" :class="sidebarCollapsed ? 'rotate-180' : ''"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Rechte scrollbare Timeline -->
      <div class="flex-1 overflow-x-auto overflow-y-auto relative" ref="svgContainer">
        <div :style="{ width: timelineWidth + 'px', position: 'relative', minHeight: '100%' }">
          <!-- Monat-Header -->
          <div class="h-10 sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative">
            <div v-for="tick in monthTicks" :key="tick.left"
              class="absolute top-0 h-full flex items-center pl-1.5 border-l border-gray-200 dark:border-gray-700"
              :style="{ left: tick.left + 'px' }">
              <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">{{ tick.label }}</span>
            </div>
          </div>

          <!-- Heutiges Datum – vertikale Linie -->
          <div v-if="todayLeft >= 0 && todayLeft <= timelineWidth"
            class="absolute top-0 bottom-0 w-0.5 bg-red-400/70 pointer-events-none z-10"
            :style="{ left: todayLeft + 'px' }">
            <div class="w-2 h-2 rounded-full bg-red-400 -ml-0.75 mt-10" />
          </div>

          <!-- Gitter-Linien -->
          <div v-for="tick in monthTicks" :key="tick.left + '_grid'"
            class="absolute top-0 bottom-0 w-px bg-gray-100 dark:bg-gray-700/50 pointer-events-none"
            :style="{ left: tick.left + 'px' }" />

          <!-- Projekt-Zeilen (Timeline) -->
          <template v-for="project in projectsWithDate" :key="project.id">
            <!-- Projektbalken-Zeile -->
            <div class="h-10 border-b border-gray-100 dark:border-gray-700/50 relative">
              <div
                class="absolute top-2 h-6 rounded-full flex items-center px-3 select-none cursor-grab active:cursor-grabbing shadow-sm"
                :class="dragging?.projectId === project.id ? 'opacity-80' : 'hover:brightness-95'"
                :style="{
                  left: (projectLeft(project) + (dragOffsets[project.id] ?? 0)) + 'px',
                  width: (projectWidth(project) + (resizeOffsets[project.id] ?? 0)) + 'px',
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  minWidth: '60px',
                }"
                @mousedown="startDrag($event, project)"
              >
                <span class="text-white text-xs font-semibold truncate flex-1 pointer-events-none select-none">
                  {{ project.name }}
                </span>
                <span v-if="project.endDate" class="text-indigo-200 text-xs ml-1 shrink-0 pointer-events-none select-none">
                  {{ new Date(project.endDate).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit' }) }}
                </span>
                <!-- Resize-Handle -->
                <div v-if="project.endDate"
                  class="absolute right-0 top-0 w-3 h-full rounded-r-full cursor-ew-resize hover:bg-white/20"
                  @mousedown="startResize($event, project)" />
              </div>
            </div>

            <!-- Ticket-Zeilen -->
            <template v-if="expandedProjects.has(project.id)">
              <div v-for="ticket in ticketsForProject(project.id)" :key="ticket.id"
                class="h-8 border-b border-gray-100 dark:border-gray-700/50 relative flex items-center">
                <!-- Ticket-Label mit Status -->
                <div class="absolute inset-y-0 flex items-center gap-2 px-2"
                  :style="{ left: projectLeft(project) + 'px' }">
                  <StatusBadge :status="ticket.status" />
                  <span class="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{{ ticket.title }}</span>
                  <!-- Dependency-Indikator -->
                  <span v-if="ticket.dependencies?.length && showDeps"
                    class="text-xs text-amber-500 font-semibold">
                    ↳ {{ ticket.dependencies.length }} Abh.
                  </span>
                </div>
              </div>
              <div v-if="!ticketsForProject(project.id).length"
                class="h-8 border-b border-gray-100 dark:border-gray-700/50" />
            </template>
          </template>

          <!-- Dependency-SVG-Overlay -->
          <svg v-if="showDeps"
            class="absolute inset-0 pointer-events-none z-20"
            :width="timelineWidth" height="100%">
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#f59e0b" />
              </marker>
            </defs>
            <g v-for="(line, i) in ticketDepLines()" :key="i">
              <path
                :d="`M ${line.fromX} ${line.fromTop} C ${line.fromX + 30} ${line.fromTop}, ${line.toX - 30} ${line.toTop}, ${line.toX} ${line.toTop}`"
                fill="none" stroke="#f59e0b" stroke-width="1.5" marker-end="url(#arrow)" opacity="0.8" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
