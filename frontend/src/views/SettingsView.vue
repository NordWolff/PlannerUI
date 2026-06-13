<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import BaseCard from '@/components/common/BaseCard.vue'

const authStore = useAuthStore()

const darkMode = ref(localStorage.getItem('darkMode') === 'true')
function toggleDarkMode() {
  darkMode.value = !darkMode.value
  localStorage.setItem('darkMode', darkMode.value)
  document.documentElement.classList.toggle('dark', darkMode.value)
}

const language = ref(localStorage.getItem('language') || 'de')
function setLanguage(lang) {
  language.value = lang
  localStorage.setItem('language', lang)
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

const profileForm = ref({ username: '', email: '' })
const saved = ref(false)
const profileError = ref('')

onMounted(() => {
  profileForm.value.username = authStore.user?.username || ''
  profileForm.value.email = authStore.user?.email || ''
})

async function saveAvatar() {
  await authStore.updateProfile({ avatar: avatarUrl(selectedStyle.value) })
  saved.value = true
  setTimeout(() => saved.value = false, 2000)
}

async function saveProfile() {
  profileError.value = ''
  const ok = await authStore.updateProfile(profileForm.value)
  if (ok) { saved.value = true; setTimeout(() => saved.value = false, 2000) }
  else profileError.value = authStore.error || 'Fehler beim Speichern'
}
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Einstellungen</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">App-Einstellungen und Profil</p>
    </div>

    <div v-if="saved" class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
      <p class="text-sm text-green-600 dark:text-green-400">Einstellungen gespeichert</p>
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
        <div v-if="profileError" class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          <p class="text-sm text-red-600 dark:text-red-400">{{ profileError }}</p>
        </div>
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
