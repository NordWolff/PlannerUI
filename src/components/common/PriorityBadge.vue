<script setup>
defineProps({ priority: String })

const labels = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' }
const colors = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}
</script>

<template>
  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="colors[priority] || colors.medium">
    {{ labels[priority] || priority }}
  </span>
</template>
