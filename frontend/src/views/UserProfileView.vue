<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlannersStore } from '@/stores/planners'
import { generateAvatar, getUserAvatar } from '@/utils/avatar'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const plannersStore = usePlannersStore()

const profileUser = ref(null)
const loading = ref(true)
const notFound = ref(false)

const isOwnProfile = computed(() => authStore.user?.id === route.params.userId)

const avatarSrc = computed(() =>
  profileUser.value ? getUserAvatar(profileUser.value) : generateAvatar('default')
)

const ROLE_LABELS = { admin: 'Administrator', owner: 'Product Owner', user: 'Mitglied' }
const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  owner: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  user:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/users/${route.params.userId}`)
    profileUser.value = data
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

function goToSettings() {
  const pid = plannersStore.activePlannerId
  router.push(pid ? `/planner/${pid}/settings` : '/planners')
}
</script>

<template>
  <div class="max-w-2xl mx-auto py-8 px-4">

    <!-- Laden -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <svg class="w-8 h-8 animate-spin text-primary dark:text-primary-dark" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    </div>

    <!-- Nicht gefunden -->
    <div v-else-if="notFound" class="text-center py-24">
      <p class="text-4xl mb-3">👤</p>
      <p class="text-lg font-semibold text-gray-900 dark:text-white">Benutzer nicht gefunden</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Dieses Profil existiert nicht oder wurde gelöscht.</p>
      <button @click="router.back()" class="mt-6 btn-secondary text-sm">← Zurück</button>
    </div>

    <!-- Profil -->
    <template v-else-if="profileUser">
      <!-- Header-Karte -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

        <!-- Magenta-Streifen -->
        <div class="h-24 bg-gradient-to-r from-primary via-pink-500 to-primary-hover" />

        <!-- Avatar + Name -->
        <div class="px-6 pb-6">
          <div class="flex items-end justify-between -mt-12 mb-4">
            <div class="relative">
              <img
                :src="avatarSrc"
                class="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 shadow-lg"
                :alt="profileUser.username"
              />
            </div>
            <div class="flex gap-2 pb-1">
              <button v-if="isOwnProfile" @click="goToSettings"
                class="btn-secondary text-sm flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Profil bearbeiten
              </button>
              <button @click="router.back()" class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                ← Zurück
              </button>
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ profileUser.displayName || profileUser.username }}
              </h1>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="ROLE_COLORS[profileUser.role]">
                {{ ROLE_LABELS[profileUser.role] || profileUser.role }}
              </span>
              <span v-if="isOwnProfile" class="text-xs px-2 py-0.5 rounded-full bg-primary-light dark:bg-primary-active/30 text-primary dark:text-primary-dark font-medium">
                Du
              </span>
            </div>
            <p v-if="profileUser.displayName" class="text-sm text-gray-500 dark:text-gray-400">@{{ profileUser.username }}</p>
          </div>
        </div>
      </div>

      <!-- Details -->
      <div class="mt-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">

        <div v-if="profileUser.orgUnit" class="flex items-center gap-3 px-6 py-4">
          <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Organisationseinheit</p>
            <p class="text-sm text-gray-900 dark:text-white mt-0.5">{{ profileUser.orgUnit }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3 px-6 py-4">
          <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">E-Mail</p>
            <p class="text-sm text-gray-900 dark:text-white mt-0.5">{{ profileUser.email }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3 px-6 py-4">
          <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Mitglied seit</p>
            <p class="text-sm text-gray-900 dark:text-white mt-0.5">{{ formatDate(profileUser.createdAt) }}</p>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>
