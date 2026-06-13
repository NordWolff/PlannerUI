<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const showDropdown = ref(false)

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/my-team', label: 'Mein Team' },
  { to: '/teams', label: 'Teams' },
  { to: '/projects', label: 'Projekte' },
  { to: '/kanban', label: 'Kanban' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Einstellungen' },
]

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

function logout() {
  authStore.logout()
  router.push('/login')
}

const avatarUrl = (user) =>
  user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.username || 'U')}`
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-40 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 sm:px-6">
    <!-- Logo -->
    <div class="flex-none mr-6">
      <span class="text-lg font-bold text-indigo-600 dark:text-indigo-400">Planner</span>
    </div>

    <!-- Navigation (zentriert) -->
    <nav class="flex-1 flex justify-center">
      <div class="flex gap-1">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
          :class="isActive(link.to)
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'"
        >
          {{ link.label }}
        </router-link>
      </div>
    </nav>

    <!-- User-Profil -->
    <div class="flex-none ml-6 relative">
      <button @click="showDropdown = !showDropdown" class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <img :src="avatarUrl(authStore.user)" class="w-8 h-8 rounded-full bg-gray-200" :alt="authStore.user?.username" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">{{ authStore.user?.username }}</span>
      </button>

      <div v-if="showDropdown" class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
        <router-link to="/settings" @click="showDropdown = false" class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          Einstellungen
        </router-link>
        <hr class="border-gray-200 dark:border-gray-700 my-1" />
        <button @click="logout" class="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
          Abmelden
        </button>
      </div>
    </div>

    <!-- Klick außerhalb schließt Dropdown -->
    <div v-if="showDropdown" class="fixed inset-0 z-30" @click="showDropdown = false" />
  </header>
</template>
