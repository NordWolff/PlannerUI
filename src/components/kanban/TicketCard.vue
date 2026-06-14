<script setup>
import PriorityBadge from '@/components/common/PriorityBadge.vue'

const props = defineProps({ ticket: { type: Object, required: true } })
const emit = defineEmits(['click'])

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
    <div class="flex items-center justify-between">
      <PriorityBadge v-if="ticket.priority" :priority="ticket.priority" />
      <span v-if="ticket.checklist?.length" class="text-xs text-gray-400">
        {{ ticket.checklist.filter(c => c.done).length }}/{{ ticket.checklist.length }}
      </span>
    </div>
  </div>
</template>
