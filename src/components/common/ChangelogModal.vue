<script setup>
import { changelog } from '@/data/changelog'
import BaseModal from '@/components/common/BaseModal.vue'

defineEmits(['close'])
</script>

<template>
  <BaseModal title="Changelog" size="md" @close="$emit('close')">
    <div class="p-6 max-h-[70vh] overflow-y-auto space-y-6">
      <div v-for="entry in changelog" :key="entry.version">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-primary-light dark:bg-primary-active/20 text-primary dark:text-primary-dark">
            v{{ entry.version }}
          </span>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ entry.title }}</h3>
        </div>
        <ul class="list-disc list-inside space-y-0.5 ml-1">
          <li v-for="(item, idx) in entry.items" :key="idx" class="text-sm text-gray-600 dark:text-gray-400">{{ item }}</li>
        </ul>
      </div>
    </div>
  </BaseModal>
</template>
