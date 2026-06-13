<script setup>
import { computed } from 'vue'
import KanbanColumn from './KanbanColumn.vue'

const props = defineProps({ tickets: { type: Array, default: () => [] } })
const emit = defineEmits(['ticket-click', 'status-change'])

const columns = [
  { status: 'draft', label: 'Draft' },
  { status: 'planned', label: 'Geplant' },
  { status: 'in_progress', label: 'In Arbeit' },
  { status: 'review', label: 'Review' },
  { status: 'done', label: 'Abschluss' }
]

const ticketsByStatus = computed(() => {
  const map = {}
  columns.forEach(col => { map[col.status] = [] })
  props.tickets.forEach(ticket => {
    const s = ticket.status || 'draft'
    if (map[s]) map[s].push(ticket)
    else map['draft'].push(ticket)
  })
  return map
})
</script>

<template>
  <div class="flex gap-4 overflow-x-auto pb-4">
    <KanbanColumn
      v-for="column in columns"
      :key="column.status"
      :column="column"
      :tickets="ticketsByStatus[column.status] || []"
      @ticket-click="$emit('ticket-click', $event)"
      @drop="$emit('status-change', $event)"
    />
  </div>
</template>
