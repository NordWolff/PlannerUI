<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  if (localStorage.getItem('darkMode') === 'true') {
    document.documentElement.classList.add('dark')
  }
  authStore.fetchMe()
})
</script>

<template>
  <router-view />
</template>
