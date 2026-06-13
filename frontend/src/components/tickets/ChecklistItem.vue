<script setup>
defineProps({ item: { type: Object, required: true } })
defineEmits(['toggle', 'delete'])
</script>

<template>
  <div class="flex items-center gap-3 py-1.5 group">
    <input
      type="checkbox"
      :checked="item.done"
      @change="$emit('toggle', item.id)"
      class="w-4 h-4 text-indigo-600 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
    />
    <span class="flex-1 text-sm text-gray-700 dark:text-gray-300" :class="item.done ? 'line-through text-gray-400' : ''">
      {{ item.text }}
    </span>
    <button @click="$emit('delete', item.id)" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>
