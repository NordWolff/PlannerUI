<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useTicketsStore } from '@/stores/tickets'
import { useProjectsStore } from '@/stores/projects'
import { useSprintsStore } from '@/stores/sprints'
import { useAuthStore } from '@/stores/auth'
import BaseModal from '@/components/common/BaseModal.vue'
import ChecklistItem from './ChecklistItem.vue'
import { useUsers } from '@/composables/useUsers'
import { generateAvatar } from '@/utils/avatar'

const props = defineProps({ ticket: { type: Object, required: true } })
const emit = defineEmits(['close', 'saved', 'deleted'])

const ticketsStore = useTicketsStore()
const projectsStore = useProjectsStore()
const sprintsStore = useSprintsStore()
const authStore = useAuthStore()
const { users: allUsers, fetchUsers, getUser, avatarUrl } = useUsers()

const activeTab = ref('details')
const newChecklistText = ref('')
const history = ref([])
const comments = ref([])
const newCommentText = ref('')
const submittingComment = ref(false)
const attachments = ref([])
const uploadProgress = ref(null)
const isDragOver = ref(false)

const REACTIONS = ['👍', '👎', '❤️']

const TICKET_TYPES = [
  { id: 'task',        label: 'Aufgabe',       color: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300' },
  { id: 'bug',         label: 'Bug',           color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  { id: 'feature',     label: 'Feature',       color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'improvement', label: 'Verbesserung',  color: 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' },
  { id: 'question',    label: 'Frage',         color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { id: 'epic',        label: 'Epic',          color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400' },
]

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

const localChecklist = ref([...(props.ticket.checklist || [])])

const statuses = [
  { id: 'draft', label: 'Draft' },
  { id: 'planned', label: 'Geplant' },
  { id: 'in_progress', label: 'In Arbeit' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Abschluss' }
]

const priorities = [
  { id: 'low', label: 'Niedrig' },
  { id: 'medium', label: 'Mittel' },
  { id: 'high', label: 'Hoch' },
  { id: 'critical', label: 'Kritisch' }
]

onMounted(async () => {
  await Promise.all([projectsStore.fetchProjects(), sprintsStore.fetchSprints(), fetchUsers()])
  const [hist, cmts, atts] = await Promise.all([
    ticketsStore.fetchHistory(props.ticket.id),
    ticketsStore.fetchComments(props.ticket.id),
    ticketsStore.fetchAttachments(props.ticket.id),
  ])
  history.value = hist
  comments.value = cmts
  attachments.value = atts
})

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
  const files = [...e.dataTransfer.files]
  handleFileUpload(files)
}

async function removeAttachment(att) {
  await ticketsStore.deleteAttachment(props.ticket.id, att.id)
  attachments.value = attachments.value.filter(a => a.id !== att.id)
}

function isImage(att) {
  return att.mimeType === 'image/png' || att.mimeType === 'image/jpeg'
}

function fileIcon(att) {
  const m = att.mimeType
  if (m.includes('pdf')) return '📄'
  if (m.includes('word') || m.includes('wordprocessingml')) return '📝'
  if (m.includes('excel') || m.includes('spreadsheetml')) return '📊'
  if (m.includes('powerpoint') || m.includes('presentationml')) return '📑'
  return '📎'
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

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

async function save() {
  await ticketsStore.updateTicket(props.ticket.id, { ...form, checklist: localChecklist.value })
  emit('saved')
}

async function deleteTicket() {
  if (!confirm('Ticket wirklich löschen?')) return
  await ticketsStore.deleteTicket(props.ticket.id)
  emit('deleted')
}

async function toggleChecklistItem(itemId) {
  const updated = await ticketsStore.toggleChecklist(props.ticket.id, itemId)
  localChecklist.value = updated.checklist || []
}

async function addChecklistItem() {
  if (!newChecklistText.value.trim()) return
  const updated = await ticketsStore.addChecklistItem(props.ticket.id, newChecklistText.value.trim())
  localChecklist.value = updated.checklist || []
  newChecklistText.value = ''
}

function removeLocalChecklistItem(itemId) {
  localChecklist.value = localChecklist.value.filter(i => i.id !== itemId)
}

const checklistProgress = computed(() => {
  if (!localChecklist.value.length) return 0
  return Math.round((localChecklist.value.filter(i => i.done).length / localChecklist.value.length) * 100)
})
</script>

<template>
  <BaseModal size="lg" @close="emit('close')">
    <!-- Header mit Ticketnummer + Titel -->
    <div class="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div>
        <span v-if="ticket.ticketNumber" class="inline-block font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded mb-1">{{ ticket.ticketNumber }}</span>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white leading-snug max-w-xl">{{ ticket.title }}</h2>
      </div>
      <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none ml-4 shrink-0">&times;</button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gray-200 dark:border-gray-700 px-6 overflow-x-auto">
      <button
        v-for="tab in ['details', 'checklist', 'attachments', 'comments', 'history']"
        :key="tab"
        @click="activeTab = tab"
        class="shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === tab
          ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'"
      >
        <span v-if="tab === 'details'">Details</span>
        <span v-else-if="tab === 'checklist'">Checkliste</span>
        <span v-else-if="tab === 'attachments'">
          Anhänge
          <span v-if="attachments.length" class="ml-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-1.5 py-0.5">{{ attachments.length }}</span>
        </span>
        <span v-else-if="tab === 'comments'">
          Kommentare
          <span v-if="comments.length" class="ml-1 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full px-1.5 py-0.5">{{ comments.length }}</span>
        </span>
        <span v-else>Verlauf</span>
      </button>
    </div>

    <div class="p-6 max-h-[60vh] overflow-y-auto">
      <!-- Details Tab -->
      <div v-if="activeTab === 'details'" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Titel</label>
          <input v-model="form.title" type="text" class="input-field text-base font-medium" />
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Art</label>
            <select v-model="form.type" class="input-field">
              <option v-for="t in TICKET_TYPES" :key="t.id" :value="t.id">{{ t.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Status</label>
            <select v-model="form.status" class="input-field">
              <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Priorität</label>
            <select v-model="form.priority" class="input-field">
              <option v-for="p in priorities" :key="p.id" :value="p.id">{{ p.label }}</option>
            </select>
          </div>
        </div>

        <!-- Zugewiesen an -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Zugewiesen an</label>
          <select v-model="form.assigneeId" class="input-field">
            <option :value="null">— Nicht zugewiesen —</option>
            <option v-for="u in allUsers" :key="u.id" :value="u.id">{{ u.username }}</option>
          </select>
          <!-- Vorschau des zugewiesenen Benutzers -->
          <div v-if="form.assigneeId" class="flex items-center gap-2 mt-1.5">
            <img :src="avatarUrl(form.assigneeId)" class="w-5 h-5 rounded-full bg-gray-200" alt="" />
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ getUser(form.assigneeId)?.username }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Projekt</label>
            <select v-model="form.projectId" class="input-field">
              <option :value="null">— Kein Projekt —</option>
              <option v-for="p in projectsStore.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Sprint</label>
            <select v-model="form.sprintId" class="input-field">
              <option :value="null">— Kein Sprint —</option>
              <option v-for="s in sprintsStore.sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Beschreibung</label>
          <textarea v-model="form.description" rows="4" class="input-field resize-none" placeholder="Beschreibung..." />
        </div>
      </div>

      <!-- Checkliste Tab -->
      <div v-else-if="activeTab === 'checklist'" class="space-y-4">
        <div v-if="localChecklist.length" class="mb-2">
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

        <div class="flex gap-2 mt-4">
          <input
            v-model="newChecklistText"
            @keyup.enter="addChecklistItem"
            type="text"
            class="input-field flex-1"
            placeholder="Neues Element hinzufügen..."
          />
          <button @click="addChecklistItem" class="btn-primary">+</button>
        </div>
      </div>

      <!-- Anhänge Tab -->
      <div v-else-if="activeTab === 'attachments'" class="space-y-4">
        <!-- Drop-Zone -->
        <div
          class="border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
          :class="isDragOver
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @drop.prevent="onDrop"
          @click="$refs.fileInput.click()"
        >
          <div class="text-3xl mb-2">📎</div>
          <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">Dateien hier ablegen oder klicken zum Auswählen</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPEG, PDF, Word, Excel, PowerPoint — max. 10 MB</p>
          <input ref="fileInput" type="file" class="hidden" multiple accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" @change="onFileInput" />
        </div>

        <!-- Upload-Fortschritt -->
        <div v-if="uploadProgress !== null" class="flex items-center gap-3">
          <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-indigo-500 rounded-full transition-all" :style="{ width: uploadProgress + '%' }" />
          </div>
          <span class="text-xs text-gray-500 w-10 text-right">{{ uploadProgress }}%</span>
        </div>

        <!-- Dateiliste -->
        <div v-if="!attachments.length" class="text-center text-sm text-gray-400 py-4">Keine Anhänge</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-for="att in attachments" :key="att.id" class="group relative rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-700/50">
            <!-- Bild-Vorschau -->
            <template v-if="isImage(att)">
              <a :href="`http://localhost:3000${att.url}`" target="_blank" class="block aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img :src="`http://localhost:3000${att.url}`" :alt="att.originalName" class="w-full h-full object-cover" />
              </a>
            </template>
            <!-- Dokument-Icon -->
            <template v-else>
              <a :href="`http://localhost:3000${att.url}`" target="_blank" class="flex items-center justify-center aspect-video text-4xl bg-gray-100 dark:bg-gray-800">
                {{ fileIcon(att) }}
              </a>
            </template>
            <!-- Dateiname + Größe -->
            <div class="px-2 py-1.5">
              <p class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{{ att.originalName }}</p>
              <p class="text-xs text-gray-400">{{ formatBytes(att.size) }}</p>
            </div>
            <!-- Löschen-Button -->
            <button
              @click.stop="removeAttachment(att)"
              class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
              title="Anhang entfernen"
            >&times;</button>
          </div>
        </div>
      </div>

      <!-- Kommentare Tab -->
      <div v-else-if="activeTab === 'comments'" class="space-y-4">
        <!-- Kommentar-Liste -->
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
            <!-- Reaktionen -->
            <div class="flex items-center gap-1.5 mt-2 flex-wrap">
              <button
                v-for="emoji in REACTIONS"
                :key="emoji"
                @click="handleReaction(comment, emoji)"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors"
                :class="myReaction(comment, emoji)
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-600'"
              >
                <span>{{ emoji }}</span>
                <span v-if="reactionCount(comment, emoji) > 0" class="font-medium">{{ reactionCount(comment, emoji) }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Neuer Kommentar -->
        <div class="pt-3 border-t border-gray-100 dark:border-gray-700">
          <div class="flex gap-3 items-start">
            <img
              :src="generateAvatar(authStore.user?.username)"
              class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0 mt-0.5"
              alt=""
            />
            <div class="flex-1">
              <textarea
                v-model="newCommentText"
                @keydown.ctrl.enter="submitComment"
                rows="3"
                class="input-field resize-none text-sm"
                placeholder="Kommentar schreiben… (@Erwähnung möglich, Strg+Enter zum Senden)"
              />
              <div class="flex justify-end mt-2">
                <button
                  @click="submitComment"
                  :disabled="!newCommentText.trim() || submittingComment"
                  class="btn-primary text-sm disabled:opacity-40"
                >
                  Senden
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Verlauf Tab -->
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

    <!-- Footer -->
    <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <button @click="deleteTicket" class="btn-danger text-sm">Löschen</button>
      <div class="flex gap-3">
        <button @click="emit('close')" class="btn-secondary">Abbrechen</button>
        <button @click="save" class="btn-primary">Speichern</button>
      </div>
    </div>
  </BaseModal>
</template>
