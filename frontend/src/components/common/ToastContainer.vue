<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const styles = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-yellow-500',
  info: 'bg-blue-600',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <Transition
        v-for="toast in toasts"
        :key="toast.id"
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-8"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-8"
      >
        <div
          class="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm max-w-sm pointer-events-auto"
          :class="styles[toast.type]"
        >
          <span class="font-bold shrink-0 mt-0.5">{{ icons[toast.type] }}</span>
          <span class="flex-1 leading-snug">{{ toast.message }}</span>
          <button class="shrink-0 opacity-70 hover:opacity-100 transition-opacity ml-1" @click="remove(toast.id)">✕</button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
