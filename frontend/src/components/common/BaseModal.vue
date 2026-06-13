<script setup>
defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }
})
const emit = defineEmits(['close'])

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl'
}
</script>

<template>
  <teleport to="body">
    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="emit('close')" />

        <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full" :class="sizeClasses[size] || sizeClasses.md">
          <div v-if="title" class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h2>
            <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">&times;</button>
          </div>
          <slot />
        </div>
      </div>
    </div>
  </teleport>
</template>
