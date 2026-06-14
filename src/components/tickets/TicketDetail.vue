<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useTicketsStore } from '@/stores/tickets'
import { useProjectsStore } from '@/stores/projects'
import { useSprintsStore } from '@/stores/sprints'
import { useAuthStore } from '@/stores/auth'
import { useUsers } from '@/composables/useUsers'
import { generateAvatar } from '@/utils/avatar'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import TicketTypeIcon from '@/components/common/TicketTypeIcon.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import ChecklistItem from './ChecklistItem.vue'

const props = defineProps({ ticket: { type: Object, required: true } })
const emit = defineEmits(['back', 'saved', 'deleted'])

const ticketsStore = useTicketsStore()
const projectsStore = useProjectsStore()
const sprintsStore = useSprintsStore()
const authStore = useAuthStore()
const { users: allUsers, fetchUsers, getUser, avatarUrl } = useUsers()

// ── Form state ──────────────────────────────────────────────────────────
const form = reactive({
  title: props.ticket.title,
  description: props.ticket.description || '',
  status: props.ticket.status || 'draft',
  priority: props.ticket.priority || 'medium',
  type: props.ticket.type || 'task',
  assigneeId: props.ticket.assigneeId ?? null,
  projectId: props.ticket.projectId || null,
  sprintId: props.ticket.sprintId || null,
})

// Track last saved values so cancel reverts to them (not the original prop)
const saved = reactive({ ...form })

const editingField = ref(null)
const activeTab = ref('checklist')

const titleInputRef = ref(null)
const descriptionInputRef = ref(null)

// ── Inline edit ─────────────────────────────────────────────────────────
async function startEdit(field) {
  editingField.value = field
  await nextTick()
  if (field === 'title') titleInputRef.value?.focus()
  if (field === 'description') descriptionInputRef.value?.focus()
}

async function saveField(field) {
  if (editingField.value !== field) return
  try {
    await ticketsStore.updateTicket(props.ticket.id, { [field]: form[field] })
    saved[field] = form[field]
    emit('saved')
  } catch { /* silent */ }
  editingField.value = null
}

function cancelEdit(field) {
  if (editingField.value !== field) return
  form[field] = saved[field]
  editingField.value = null
}

// For select fields: save immediately on change, then blur is a no-op
async function saveSelect(field) {
  await saveField(field)
}

// ── Options ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'planned', label: 'Geplant' },
  { value: 'in_progress', label: 'In Arbeit' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Abschluss' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
  { value: 'critical', label: 'Kritisch' },
]

const TYPE_OPTIONS = [
  { value: 'task', label: 'Aufgabe' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'improvement', label: 'Verbesserung' },
  { value: 'question', label: 'Frage' },
  { value: 'epic', label: 'Epic' },
]

// ── Checklist ──────────────────────────────────────────────────────────
const localChecklist = ref([...(props.ticket.checklist || [])])
const newChecklistText = ref('')

const checklistProgress = computed(() => {
  if (!localChecklist.value.length) return 0
  return Math.round((localChecklist.value.filter(i => i.done).length / localChecklist.value.length) * 100)
})

async function toggleChecklistItem(itemId) {
  const updated = await ticketsStore.toggleChecklist(props.ticket.id, itemId)
  if (updated) localChecklist.value = updated.checklist || []
}

function removeLocalChecklistItem(itemId) {
  localChecklist.value = localChecklist.value.filter(i => i.id !== itemId)
}

async function addChecklistItem() {
  if (!newChecklistText.value.trim()) return
  const updated = await ticketsStore.addChecklistItem(props.ticket.id, newChecklistText.value.trim())
  if (updated) localChecklist.value = updated.checklist || []
  newChecklistText.value = ''
}

// ── Comments ────────────────────────────────────────────────────────────
const comments = ref([])
const newCommentText = ref('')
const submittingComment = ref(false)
const REACTIONS = ['👍', '👎', '❤️']

async function submitComment() {
  if (!newCommentText.value.trim() || submittingComment.value) return
  submittingComment.value = true
  try {
    const comment = await ticketsStore.addComment(props.ticket.id, newCommentText.value.trim())
    comments.value.push(comment)
    newCommentText.value = ''
  } finally {
    submittingComment.value = false
  }
}

async function handleReaction(comment, emoji) {
  const reactions = await ticketsStore.toggleReaction(props.ticket.id, comment.id, emoji)
  comment.reactions = reactions
}

function reactionCount(comment, emoji) {
  return (comment.reactions || []).filter(r => r.emoji === emoji).length
}

function myReaction(comment, emoji) {
  return (comment.reactions || []).some(r => r.emoji === emoji && r.userId === authStore.user?.id)
}

function formatCommentDate(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return 'gerade eben'
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`
  if (diff < 172800) return 'gestern'
  return `vor ${Math.floor(diff / 86400)} Tagen`
}

// ── Attachments ────────────────────────────────────────────────────────
const attachments = ref([])
const uploadProgress = ref(null)
const isDragOver = ref(false)
const fileInputRef = ref(null)

async function handleFileUpload(files) {
  for (const file of files) {
    uploadProgress.value = 0
    try {
      const att = await ticketsStore.uploadAttachment(props.ticket.id, file, p => { uploadProgress.value = p })
      attachments.value.push(att)
    } finally {
      uploadProgress.value = null
    }
  }
}

function onFileInput(e) {
  handleFileUpload([...e.target.files])
  e.target.value = ''
}

function onDrop(e) {
  isDragOver.value = false
  handleFileUpload([...e.dataTransfer.files])
}

async function removeAttachment(att) {
  await ticketsStore.deleteAttachment(props.ticket.id, att.id)
  attachments.value = attachments.value.filter(a => a.id !== att.id)
}

function isImage(att) {
  return att.mimeType?.startsWith('image/')
}

function fileIcon(att) {
  const m = att.mimeType || ''
  if (m.includes('pdf')) return '📄'
  if (m.includes('word') || m.includes('wordprocessingml')) return '📝'
  if (m.includes('excel') || m.includes('spreadsheetml')) return '📊'
  return '📎'
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ── History ────────────────────────────────────────────────────────────
const history = ref([])

// ── Delete ─────────────────────────────────────────────────────────────
async function deleteTicket() {
  if (!confirm('Ticket wirklich löschen?')) return
  await ticketsStore.deleteTicket(props.ticket.id)
  emit('deleted')
}

// ── Tabs ───────────────────────────────────────────────────────────────
const tabs = computed(() => [
  { id: 'checklist', label: 'Checkliste', badge: localChecklist.value.length || null },
  { id: 'comments', label: 'Kommentare', badge: comments.value.length || null },
  { id: 'attachments', label: 'Anhänge', badge: attachments.value.length || null },
  { id: 'history', label: 'Verlauf', badge: null },
])

// ── Lifecycle ───────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchUsers(), projectsStore.fetchProjects(), sprintsStore.fetchSprints()])
  const [hist, cmts, atts] = await Promise.all([
    ticketsStore.fetchHistory(props.ticket.id),
    ticketsStore.fetchComments(props.ticket.id),
    ticketsStore.fetchAttachments(props.ticket.id),
  ])
  history.value = hist
  comments.value = cmts
  attachments.value = atts
})
</script>

<template>
  <!-- Outermost: fills space below app header, no outer padding -->
  <div class="flex flex-col min-h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 -my-6">

    <!-- ─── Sticky top bar ─────────────────────────────────────────── -->
    <div class="sticky top-16 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4 py-3">

        <!-- ← Zurück -->
        <button
          @click="$emit('back')"
          class="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Zurück
        </button>

        <!-- Ticket number + type icon -->
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <span v-if="ticket.ticketNumber" class="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded shrink-0">
            {{ ticket.ticketNumber }}
          </span>
          <TicketTypeIcon :type="form.type" />
          <span class="text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:block">{{ form.title }}</span>
        </div>

        <!-- Assignee (top right, hover-to-edit) -->
        <div class="group relative shrink-0">
          <div
            v-if="editingField !== 'assigneeId'"
            @click="startEdit('assigneeId')"
            class="flex items-center gap-2.5 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <UserAvatar :user-id="form.assigneeId" size="lg" />
            <div class="text-right hidden sm:block">
              <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wide leading-none mb-0.5">Zugewiesen an</p>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">
                {{ getUser(form.assigneeId)?.username || '— Nicht zugewiesen —' }}
              </p>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <select
            v-else
            v-model="form.assigneeId"
            autofocus
            @change="saveSelect('assigneeId')"
            @blur="cancelEdit('assigneeId')"
            class="input-field text-sm w-44"
          >
            <option :value="null">— Nicht zugewiesen —</option>
            <option v-for="u in allUsers" :key="u.id" :value="u.id">{{ u.username }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ─── Main scrollable content ───────────────────────────────── -->
    <div class="flex-1">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <!-- Title (hover-to-edit) -->
        <div class="group mb-6" @click="startEdit('title')">
          <h1
            v-if="editingField !== 'title'"
            class="text-2xl font-bold text-gray-900 dark:text-white leading-snug
                   hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl px-3 py-2 -mx-3
                   transition-colors cursor-text flex items-start gap-2"
          >
            <span class="flex-1">{{ form.title }}</span>
            <svg class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </h1>
          <input
            v-else
            ref="titleInputRef"
            v-model="form.title"
            class="w-full text-2xl font-bold text-gray-900 dark:text-white bg-transparent
                   border-2 border-indigo-500 rounded-xl px-3 py-2 focus:outline-none"
            @blur="saveField('title')"
            @keydown.enter="saveField('title')"
            @keydown.escape="cancelEdit('title')"
          />
        </div>

        <!-- ─── Meta row: Status | Priority | Type | Project | Sprint ─── -->
        <div class="flex flex-wrap gap-2 items-center mb-8">

          <!-- Status -->
          <div class="group relative" @click="startEdit('status')">
            <div
              v-if="editingField !== 'status'"
              class="cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-600"
            >
              <StatusBadge :status="form.status" />
            </div>
            <select
              v-else
              v-model="form.status"
              autofocus
              @change="saveSelect('status')"
              @blur="cancelEdit('status')"
              class="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>

          <!-- Priority -->
          <div class="group relative" @click="startEdit('priority')">
            <div
              v-if="editingField !== 'priority'"
              class="cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-600"
            >
              <PriorityBadge :priority="form.priority" />
            </div>
            <select
              v-else
              v-model="form.priority"
              autofocus
              @change="saveSelect('priority')"
              @blur="cancelEdit('priority')"
              class="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option v-for="o in PRIORITY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>

          <!-- Type (with icon) -->
          <div class="group relative" @click="startEdit('type')">
            <div
              v-if="editingField !== 'type'"
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <TicketTypeIcon :type="form.type" />
              <span class="text-xs font-medium text-gray-600 dark:text-gray-400">{{ TYPE_OPTIONS.find(t => t.value === form.type)?.label }}</span>
            </div>
            <select
              v-else
              v-model="form.type"
              autofocus
              @change="saveSelect('type')"
              @blur="cancelEdit('type')"
              class="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option v-for="o in TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>

          <span class="text-gray-200 dark:text-gray-600 select-none px-1">|</span>

          <!-- Project -->
          <div class="group relative" @click="startEdit('projectId')">
            <div
              v-if="editingField !== 'projectId'"
              class="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <span class="text-xs text-gray-600 dark:text-gray-400">
                {{ projectsStore.projects.find(p => p.id === form.projectId)?.name || 'Kein Projekt' }}
              </span>
            </div>
            <select
              v-else
              v-model="form.projectId"
              autofocus
              @change="saveSelect('projectId')"
              @blur="cancelEdit('projectId')"
              class="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option :value="null">— Kein Projekt —</option>
              <option v-for="p in projectsStore.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>

          <!-- Sprint -->
          <div class="group relative" @click="startEdit('sprintId')">
            <div
              v-if="editingField !== 'sprintId'"
              class="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-xs text-gray-600 dark:text-gray-400">
                {{ sprintsStore.sprints.find(s => s.id === form.sprintId)?.name || 'Kein Sprint' }}
              </span>
            </div>
            <select
              v-else
              v-model="form.sprintId"
              autofocus
              @change="saveSelect('sprintId')"
              @blur="cancelEdit('sprintId')"
              class="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option :value="null">— Kein Sprint —</option>
              <option v-for="s in sprintsStore.sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
        </div>

        <!-- ─── Description (hover-to-edit) ─────────────────────────── -->
        <div class="mb-10">
          <p class="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Beschreibung</p>
          <div class="group" @click="startEdit('description')">
            <div
              v-if="editingField !== 'description'"
              class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap min-h-[72px]
                     hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl px-3 py-2.5 -mx-3
                     transition-colors cursor-text relative"
            >
              <span v-if="form.description">{{ form.description }}</span>
              <span v-else class="text-gray-400 dark:text-gray-500 italic">Keine Beschreibung. Klicken zum Bearbeiten…</span>
              <svg class="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <textarea
              v-else
              ref="descriptionInputRef"
              v-model="form.description"
              rows="6"
              class="w-full text-sm border-2 border-indigo-500 rounded-xl px-3 py-2.5 resize-none
                     focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              @blur="saveField('description')"
              @keydown.escape="cancelEdit('description')"
            />
          </div>
        </div>

        <!-- ─── Tabs ─────────────────────────────────────────────────── -->
        <div class="border-t border-gray-200 dark:border-gray-700 pt-6">

          <!-- Tab header -->
          <div class="flex gap-0 border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              :class="activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
            >
              {{ tab.label }}
              <span
                v-if="tab.badge"
                class="ml-1.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full px-1.5 py-0.5"
              >{{ tab.badge }}</span>
            </button>
          </div>

          <!-- ── Checkliste ─────────────────────────────────────────── -->
          <div v-if="activeTab === 'checklist'" class="space-y-4">
            <div v-if="localChecklist.length">
              <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Fortschritt</span>
                <span>{{ checklistProgress }}%</span>
              </div>
              <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-600 rounded-full transition-all" :style="{ width: checklistProgress + '%' }" />
              </div>
            </div>
            <div class="space-y-1">
              <ChecklistItem
                v-for="item in localChecklist"
                :key="item.id"
                :item="item"
                @toggle="toggleChecklistItem"
                @delete="removeLocalChecklistItem"
              />
            </div>
            <div v-if="!localChecklist.length" class="py-6 text-center text-sm text-gray-400">Noch keine Einträge</div>
            <div class="flex gap-2">
              <input
                v-model="newChecklistText"
                @keyup.enter="addChecklistItem"
                type="text"
                class="input-field flex-1"
                placeholder="Neues Element hinzufügen…"
              />
              <button @click="addChecklistItem" class="btn-primary px-4">+</button>
            </div>
          </div>

          <!-- ── Kommentare ─────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'comments'" class="space-y-4">
            <div v-if="!comments.length" class="py-8 text-center text-sm text-gray-400">Noch keine Kommentare</div>
            <div v-for="comment in comments" :key="comment.id" class="flex gap-3">
              <img
                :src="generateAvatar(comment.author?.username)"
                class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0 mt-0.5"
                :title="comment.author?.username"
                alt=""
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 mb-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ comment.author?.username || 'Unbekannt' }}</span>
                  <span class="text-xs text-gray-400">{{ formatCommentDate(comment.createdAt) }}</span>
                </div>
                <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{{ comment.text }}</p>
                <div class="flex items-center gap-1.5 mt-2 flex-wrap">
                  <button
                    v-for="emoji in REACTIONS"
                    :key="emoji"
                    @click="handleReaction(comment, emoji)"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors"
                    :class="myReaction(comment, emoji)
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500'"
                  >
                    <span>{{ emoji }}</span>
                    <span v-if="reactionCount(comment, emoji) > 0" class="font-medium">{{ reactionCount(comment, emoji) }}</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="pt-3 border-t border-gray-100 dark:border-gray-700">
              <div class="flex gap-3 items-start">
                <img :src="generateAvatar(authStore.user?.username)" class="w-8 h-8 rounded-full shrink-0 mt-0.5" alt="" />
                <div class="flex-1">
                  <textarea
                    v-model="newCommentText"
                    @keydown.ctrl.enter="submitComment"
                    rows="3"
                    class="input-field resize-none text-sm"
                    placeholder="Kommentar schreiben… (Strg+Enter zum Senden)"
                  />
                  <div class="flex justify-end mt-2">
                    <button
                      @click="submitComment"
                      :disabled="!newCommentText.trim() || submittingComment"
                      class="btn-primary text-sm disabled:opacity-40"
                    >Senden</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Anhänge ─────────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'attachments'" class="space-y-4">
            <div
              class="border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
              :class="isDragOver
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'"
              @dragover.prevent="isDragOver = true"
              @dragleave="isDragOver = false"
              @drop.prevent="onDrop"
              @click="fileInputRef?.click()"
            >
              <div class="text-3xl mb-2">📎</div>
              <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">Dateien ablegen oder klicken zum Auswählen</p>
              <input ref="fileInputRef" type="file" class="hidden" multiple @change="onFileInput" />
            </div>
            <div v-if="uploadProgress !== null" class="flex items-center gap-3">
              <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full transition-all" :style="{ width: uploadProgress + '%' }" />
              </div>
              <span class="text-xs text-gray-500 w-10 text-right">{{ uploadProgress }}%</span>
            </div>
            <div v-if="!attachments.length" class="text-center text-sm text-gray-400 py-4">Keine Anhänge</div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div
                v-for="att in attachments"
                :key="att.id"
                class="group relative rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-700/50"
              >
                <template v-if="isImage(att)">
                  <a :href="`http://localhost:3000${att.url}`" target="_blank" class="block aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img :src="`http://localhost:3000${att.url}`" :alt="att.originalName" class="w-full h-full object-cover" />
                  </a>
                </template>
                <template v-else>
                  <a :href="`http://localhost:3000${att.url}`" target="_blank" class="flex items-center justify-center aspect-video text-4xl bg-gray-100 dark:bg-gray-800">{{ fileIcon(att) }}</a>
                </template>
                <div class="px-2 py-1.5">
                  <p class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{{ att.originalName }}</p>
                  <p class="text-xs text-gray-400">{{ formatBytes(att.size) }}</p>
                </div>
                <button
                  @click.stop="removeAttachment(att)"
                  class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >&times;</button>
              </div>
            </div>
          </div>

          <!-- ── Verlauf ─────────────────────────────────────────────── -->
          <div v-else class="space-y-3">
            <div v-if="!history.length" class="py-8 text-center text-sm text-gray-400">Keine Verlaufseinträge</div>
            <div v-for="entry in history" :key="entry.id" class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div class="w-2 h-2 mt-2 rounded-full bg-indigo-400 flex-none" />
              <div>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  <span class="font-medium">Status</span> geändert von
                  <span class="font-medium">{{ entry.from }}</span> zu
                  <span class="font-medium text-indigo-600 dark:text-indigo-400">{{ entry.to }}</span>
                </p>
                <p class="text-xs text-gray-400 mt-0.5">{{ new Date(entry.changedAt).toLocaleString('de-DE') }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── Footer actions ──────────────────────────────────────── -->
        <div class="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button @click="deleteTicket" class="btn-danger text-sm">Ticket löschen</button>
        </div>
      </div>
    </div>
  </div>
</template>
