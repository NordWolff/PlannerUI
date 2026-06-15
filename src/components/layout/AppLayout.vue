<script setup>
import AppHeader from './AppHeader.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useHeartbeat } from '@/composables/useHeartbeat'

useHeartbeat()
</script>

<template>
  <div class="app-bg">
    <AppHeader />
    <main class="pt-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-view />
      </div>
    </main>
    <ToastContainer />
  </div>
</template>
