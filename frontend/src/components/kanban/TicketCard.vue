<script setup>
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import { useUsers } from '@/composables/useUsers'

const props = defineProps({ ticket: { type: Object, required: true } })
const emit = defineEmits(['click'])

const { getUser, avatarUrl } = useUsers()

function onDragStart(e) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('ticketId', props.ticket.id)
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-shadow select-none"
    draggable="true"
    @dragstart="onDragStart"
    @click="emit('click', ticket)"
  >
    <span v-if="ticket.ticketNumber" class="inline-block font-mono text-xs text-indigo-500 dark:text-indigo-400 mb-1">{{ ticket.ticketNumber }}</span>
    <p class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2">{{ ticket.title }}</p>

    <div class="flex items-center justify-between gap-2">
      <PriorityBadge v-if="ticket.priority" :priority="ticket.priority" />

      <div class="flex items-center gap-1.5 ml-auto">
        <span v-if="ticket.checklist?.length" class="text-xs text-gray-400">
          {{ ticket.checklist.filter(c => c.done).length }}/{{ ticket.checklist.length }}
        </span>

        <!-- Zugewiesener Benutzer -->
        <template v-if="ticket.assigneeId">
          <img
            :src="avatarUrl(ticket.assigneeId)"
            :title="getUser(ticket.assigneeId)?.username || ''"
            class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 ring-1 ring-white dark:ring-gray-700"
            alt="Zugewiesen"
          />
        </template>
        <div v-else
          class="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center"
          title="Nicht zugewiesen">
          <svg class="w-3 h-3 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
