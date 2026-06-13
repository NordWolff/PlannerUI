<script setup>
defineProps({
  title: { type: String, default: '' },
  padding: { type: Boolean, default: true }
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
    <div v-if="title" class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
    </div>
    <div :class="padding ? 'p-6' : ''">
      <slot />
    </div>
  </div>
</template>
