<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const showDropdown = ref(false)
const showRequestModal = ref(false)
const submittingRequest = ref(false)

const requestForm = reactive({ title: '', description: '', type: 'feature' })

const baseLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/my-team', label: 'Mein Team' },
  { to: '/teams', label: 'Teams' },
  { to: '/projects', label: 'Projekte' },
  { to: '/kanban', label: 'Kanban' },
  { to: '/reports', label: 'Reports' },
  { to: '/chat', label: 'Chat' },
]

const navLinks = computed(() =>
  authStore.isAdmin ? [...baseLinks, { to: '/admin', label: 'Admin' }] : baseLinks
)

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

function logout() {
  authStore.logout()
  router.push('/login')
}

function openRequestModal() {
  showDropdown.value = false
  requestForm.title = ''
  requestForm.description = ''
  requestForm.type = 'feature'
  showRequestModal.value = true
}

async function submitRequest() {
  if (!requestForm.title.trim() || submittingRequest.value) return
  submittingRequest.value = true
  try {
    await api.post('/admin-requests', { ...requestForm })
    toast.success('Anfrage erfolgreich gesendet')
    showRequestModal.value = false
  } catch {
    toast.error('Anfrage konnte nicht gesendet werden')
  } finally {
    submittingRequest.value = false
  }
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

    <!-- Navigation -->
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

    <!-- Anfrage-Button (alle Benutzer) -->
    <button
      @click="openRequestModal"
      class="hidden sm:flex items-center gap-1.5 mr-3 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
      title="Feature oder Bug an Admin melden"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Anfrage
    </button>

    <!-- User-Profil -->
    <div class="flex-none relative">
      <button @click="showDropdown = !showDropdown" class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <img :src="avatarUrl(authStore.user)" class="w-8 h-8 rounded-full bg-gray-200" :alt="authStore.user?.username" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">{{ authStore.user?.username }}</span>
      </button>

      <div v-if="showDropdown" class="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
        <button @click="openRequestModal" class="flex items-center gap-2 w-full px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 sm:hidden">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          Anfrage senden
        </button>
        <router-link to="/settings" @click="showDropdown = false" class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          Einstellungen
        </router-link>
        <router-link v-if="authStore.isAdmin" to="/admin" @click="showDropdown = false" class="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700">
          Admin-Bereich
        </router-link>
        <hr class="border-gray-200 dark:border-gray-700 my-1" />
        <button @click="logout" class="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
          Abmelden
        </button>
      </div>
    </div>

    <div v-if="showDropdown" class="fixed inset-0 z-30" @click="showDropdown = false" />
  </header>

  <!-- Anfrage-Modal -->
  <Teleport to="body">
    <div v-if="showRequestModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="showRequestModal = false" />
      <div class="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Anfrage an Admin</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Feature-Wunsch oder Bug melden</p>
          </div>
          <button @click="showRequestModal = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">&times;</button>
        </div>

        <!-- Formular -->
        <div class="p-6 space-y-4">
          <!-- Typ -->
          <div class="flex gap-3">
            <button
              v-for="t in [{ id: 'feature', label: '✨ Feature', cls: 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' }, { id: 'bug', label: '🐛 Bug', cls: 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' }]"
              :key="t.id"
              @click="requestForm.type = t.id"
              class="flex-1 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors"
              :class="requestForm.type === t.id
                ? t.cls
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'"
            >
              {{ t.label }}
            </button>
          </div>

          <!-- Titel -->
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Titel *</label>
            <input
              v-model="requestForm.title"
              type="text"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Kurze Beschreibung…"
              maxlength="120"
              @keydown.enter="submitRequest"
            />
          </div>

          <!-- Beschreibung -->
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Details</label>
            <textarea
              v-model="requestForm.description"
              rows="4"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Was genau soll passieren? Wie reproduzierst du den Bug?"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button @click="showRequestModal = false" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
            Abbrechen
          </button>
          <button
            @click="submitRequest"
            :disabled="!requestForm.title.trim() || submittingRequest"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg transition-colors"
          >
            {{ submittingRequest ? 'Senden…' : 'Anfrage senden' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
