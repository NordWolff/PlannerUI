<script setup>
import TicketCard from './TicketCard.vue'

const props = defineProps({
  column: { type: Object, required: true },
  tickets: { type: Array, default: () => [] }
})
const emit = defineEmits(['ticket-click', 'drop'])

const isDragOver = ref(false)

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  isDragOver.value = true
}

function onDragLeave() { isDragOver.value = false }

function onDrop(e) {
  e.preventDefault()
  isDragOver.value = false
  const ticketId = e.dataTransfer.getData('ticketId')
  if (ticketId) emit('drop', { ticketId, status: props.column.status })
}

import { ref } from 'vue'

const columnColors = {
  draft: 'border-t-gray-400',
  planned: 'border-t-blue-400',
  in_progress: 'border-t-yellow-400',
  review: 'border-t-purple-400',
  done: 'border-t-green-400'
}

const headerColors = {
  draft: 'text-gray-600 dark:text-gray-400',
  planned: 'text-blue-600 dark:text-blue-400',
  in_progress: 'text-yellow-600 dark:text-yellow-400',
  review: 'text-purple-600 dark:text-purple-400',
  done: 'text-green-600 dark:text-green-400'
}
</script>

<template>
  <div
    class="flex flex-col bg-gray-100 dark:bg-gray-800/50 rounded-xl border-t-4 flex-1 min-w-0 transition-all"
    :class="[columnColors[column.status] || 'border-t-gray-400', isDragOver ? 'ring-2 ring-indigo-400' : '']"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="flex items-center justify-between px-4 py-3">
      <h3 class="font-semibold text-sm" :class="headerColors[column.status]">{{ column.label }}</h3>
      <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
        {{ tickets.length }}
      </span>
    </div>

    <div class="flex-1 px-3 pb-3 space-y-2 min-h-[200px]">
      <TicketCard
        v-for="ticket in tickets"
        :key="ticket.id"
        :ticket="ticket"
        @click="$emit('ticket-click', ticket)"
      />
      <div v-if="!tickets.length" class="h-20 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        <p class="text-xs text-gray-400">Hierhin ziehen</p>
      </div>
    </div>
  </div>
</template>
