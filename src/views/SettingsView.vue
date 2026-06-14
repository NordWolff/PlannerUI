<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import BaseCard from '@/components/common/BaseCard.vue'

const authStore = useAuthStore()
const toast = useToast()

const darkMode = ref(localStorage.getItem('darkMode') === 'true')
function toggleDarkMode() {
  darkMode.value = !darkMode.value
  localStorage.setItem('darkMode', darkMode.value)
  document.documentElement.classList.toggle('dark', darkMode.value)
  toast.info(darkMode.value ? 'Dark Mode aktiviert' : 'Light Mode aktiviert')
}

const language = ref(localStorage.getItem('language') || 'de')
function setLanguage(lang) {
  language.value = lang
  localStorage.setItem('language', lang)
  toast.success('Sprache gespeichert')
}

const avatarStyles = [
  { id: 'initials', label: 'Initialen' },
  { id: 'avataaars', label: 'Avataaars' },
  { id: 'bottts', label: 'Bottts' },
  { id: 'identicon', label: 'Identicon' },
  { id: 'pixel-art', label: 'Pixel Art' },
  { id: 'lorelei', label: 'Lorelei' }
]
const selectedStyle = ref('initials')
const avatarSeed = ref(authStore.user?.username || 'user')
const avatarUrl = (style) => `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(avatarSeed.value)}`

// Mein Team - Standard-Ansicht
const myTeamViewMode = ref(localStorage.getItem('myTeamViewMode') || 'table')
function setMyTeamViewMode(mode) {
  myTeamViewMode.value = mode
  localStorage.setItem('myTeamViewMode', mode)
  toast.success('Standard-Ansicht gespeichert')
}

const profileForm = ref({ username: '', email: '' })

onMounted(() => {
  profileForm.value.username = authStore.user?.username || ''
  profileForm.value.email = authStore.user?.email || ''
})

async function saveAvatar() {
  const ok = await authStore.updateProfile({ avatar: avatarUrl(selectedStyle.value) })
  if (ok) toast.success('Avatar gespeichert')
  else toast.error(authStore.error || 'Fehler beim Speichern des Avatars')
}

async function saveProfile() {
  const ok = await authStore.updateProfile(profileForm.value)
  if (ok) toast.success('Profil gespeichert')
  else toast.error(authStore.error || 'Fehler beim Speichern')
}
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Einstellungen</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">App-Einstellungen und Profil</p>
    </div>

    <BaseCard title="Erscheinungsbild">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Dunkles Design aktivieren</p>
        </div>
        <button @click="toggleDarkMode"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          :class="darkMode ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'">
          <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform"
            :class="darkMode ? 'translate-x-6' : 'translate-x-1'" />
        </button>
      </div>
    </BaseCard>

    <BaseCard title="Mein Team">
      <div class="space-y-2">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">Standard-Ansicht</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Legt fest, welche Ansicht beim Öffnen von „Mein Team" aktiv ist</p>
        </div>
        <div class="flex gap-3">
          <button
            @click="setMyTeamViewMode('table')"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors"
            :class="myTeamViewMode === 'table'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-transparent'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Liste
          </button>
          <button
            @click="setMyTeamViewMode('kanban')"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors"
            :class="myTeamViewMode === 'kanban'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-transparent'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Board
          </button>
        </div>
      </div>
    </BaseCard>

    <BaseCard title="Sprache">
      <div class="flex gap-3">
        <button @click="setLanguage('de')" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="language === 'de' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'">
          Deutsch
        </button>
        <button @click="setLanguage('en')" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="language === 'en' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'">
          English
        </button>
      </div>
    </BaseCard>

    <BaseCard title="Avatar">
      <div class="space-y-4">
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <button v-for="style in avatarStyles" :key="style.id" @click="selectedStyle = style.id"
            class="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all"
            :class="selectedStyle === style.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-600'">
            <img :src="avatarUrl(style.id)" :alt="style.label" class="w-12 h-12 rounded-full" />
            <span class="text-xs text-gray-600 dark:text-gray-400">{{ style.label }}</span>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <img :src="avatarUrl(selectedStyle)" class="w-16 h-16 rounded-full bg-gray-100" alt="Vorschau" />
          <button @click="saveAvatar" class="btn-primary">Avatar speichern</button>
        </div>
      </div>
    </BaseCard>

    <BaseCard title="Profil">
      <form @submit.prevent="saveProfile" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benutzername</label>
          <input v-model="profileForm.username" type="text" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-Mail-Adresse</label>
          <input v-model="profileForm.email" type="email" class="input-field" />
        </div>
        <button type="submit" :disabled="authStore.loading" class="btn-primary">
          {{ authStore.loading ? 'Speichern...' : 'Profil speichern' }}
        </button>
      </form>
    </BaseCard>
  </div>
</template>
