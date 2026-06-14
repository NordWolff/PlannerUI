<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useTicketsStore } from '@/stores/tickets'
import { useProjectsStore } from '@/stores/projects'
import { useSprintsStore } from '@/stores/sprints'
import { useAuthStore } from '@/stores/auth'
import BaseModal from '@/components/common/BaseModal.vue'
import ChecklistItem from './ChecklistItem.vue'
import { useUsers } from '@/composables/useUsers'

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

const REACTIONS = ['👍', '👎', '❤️']

const form = reactive({
  title: props.ticket.title,
  description: props.ticket.description || '',
  status: props.ticket.status || 'draft',
  priority: props.ticket.priority || 'medium',
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
  const [hist, cmts] = await Promise.all([
    ticketsStore.fetchHistory(props.ticket.id),
    ticketsStore.fetchComments(props.ticket.id),
  ])
  history.value = hist
  comments.value = cmts
})

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
    <div class="flex border-b border-gray-200 dark:border-gray-700 px-6">
      <button
        v-for="tab in ['details', 'checklist', 'comments', 'history']"
        :key="tab"
        @click="activeTab = tab"
        class="px-4 py-3 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === tab
          ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'"
      >
        <span v-if="tab === 'details'">Details</span>
        <span v-else-if="tab === 'checklist'">Checkliste</span>
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

        <div class="grid grid-cols-2 gap-4">
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

      <!-- Kommentare Tab -->
      <div v-else-if="activeTab === 'comments'" class="space-y-4">
        <!-- Kommentar-Liste -->
        <div v-if="!comments.length" class="py-8 text-center text-sm text-gray-400">Noch keine Kommentare</div>
        <div v-for="comment in comments" :key="comment.id" class="flex gap-3">
          <img
            :src="`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comment.author?.username || '?')}`"
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
              :src="`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authStore.user?.username || '?')}`"
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
