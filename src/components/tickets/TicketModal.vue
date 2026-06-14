<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useTicketsStore } from '@/stores/tickets'
import { useProjectsStore } from '@/stores/projects'
import { useSprintsStore } from '@/stores/sprints'
import BaseModal from '@/components/common/BaseModal.vue'
import ChecklistItem from './ChecklistItem.vue'

const props = defineProps({ ticket: { type: Object, required: true } })
const emit = defineEmits(['close', 'saved', 'deleted'])

const ticketsStore = useTicketsStore()
const projectsStore = useProjectsStore()
const sprintsStore = useSprintsStore()

const activeTab = ref('details')
const newChecklistText = ref('')
const history = ref([])

const form = reactive({
  title: props.ticket.title,
  description: props.ticket.description || '',
  status: props.ticket.status || 'draft',
  priority: props.ticket.priority || 'medium',
  assigneeId: props.ticket.assigneeId || null,
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
  await Promise.all([projectsStore.fetchProjects(), sprintsStore.fetchSprints()])
  history.value = await ticketsStore.fetchHistory(props.ticket.id)
})

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
        v-for="tab in ['details', 'checklist', 'history']"
        :key="tab"
        @click="activeTab = tab"
        class="px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize"
        :class="activeTab === tab
          ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'"
      >
        {{ tab === 'details' ? 'Details' : tab === 'checklist' ? 'Checkliste' : 'Verlauf' }}
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
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Projekt</label>
            <select v-model="form.projectId" class="input-field">
              <option :value="null">-- Kein Projekt --</option>
              <option v-for="p in projectsStore.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Sprint</label>
            <select v-model="form.sprintId" class="input-field">
              <option :value="null">-- Kein Sprint --</option>
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
