<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePlannersStore } from '@/stores/planners'
import { useToast } from '@/composables/useToast'
import BaseCard from '@/components/common/BaseCard.vue'
import ChangelogModal from '@/components/common/ChangelogModal.vue'
import { generateAvatar, getUserAvatar } from '@/utils/avatar'
import { currentVersion } from '@/data/changelog'
import api from '@/services/api'

const showChangelog = ref(false)

const authStore = useAuthStore()
const plannersStore = usePlannersStore()
const toast = useToast()

const SYSTEM_ROLE_LABELS = { admin: 'Administrator', user: 'Benutzer' }
const PLANNER_ROLE_LABELS = { owner: 'Product Owner', member: 'Mitglied' }

const myPlannerRoles = computed(() =>
  plannersStore.planners.map(p => ({
    id: p.id,
    name: p.name,
    role: p.members?.find(m => m.userId === authStore.user?.id)?.role ?? 'member',
  }))
)

const darkMode = ref(localStorage.getItem('darkMode') !== 'false')
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

const myAvatar = computed(() => getUserAvatar(authStore.user))
const avatarUploading = ref(false)

async function onAvatarPick(e) {
  const file = e.target.files?.[0]
  if (!file) return
  avatarUploading.value = true
  try {
    await authStore.uploadAvatar(file)
    toast.success('Profilbild gespeichert')
  } catch {
    toast.error('Bild konnte nicht hochgeladen werden')
  } finally {
    avatarUploading.value = false
    e.target.value = ''
  }
}

async function removeAvatar() {
  try {
    await authStore.removeAvatar()
    toast.success('Profilbild entfernt')
  } catch {
    toast.error('Fehler beim Entfernen')
  }
}

// Online-Datenschutz
const privacyHideOnline = ref(authStore.user?.privacyHideOnline ?? false)
async function togglePrivacyHideOnline() {
  privacyHideOnline.value = !privacyHideOnline.value
  try {
    const { data } = await api.put('/auth/me/privacy', { privacyHideOnline: privacyHideOnline.value })
    authStore.user = data
    toast.success(privacyHideOnline.value ? 'Online-Status wird verborgen' : 'Online-Status ist sichtbar')
  } catch {
    privacyHideOnline.value = !privacyHideOnline.value // revert
    toast.error('Einstellung konnte nicht gespeichert werden')
  }
}

// Mein Team - Standard-Ansicht
const myTeamViewMode = ref(localStorage.getItem('myTeamViewMode') || 'table')
function setMyTeamViewMode(mode) {
  myTeamViewMode.value = mode
  localStorage.setItem('myTeamViewMode', mode)
  toast.success('Standard-Ansicht gespeichert')
}

const profileForm = ref({ username: '', email: '', displayName: '', orgUnit: '' })

onMounted(async () => {
  profileForm.value.username = authStore.user?.username || ''
  profileForm.value.email = authStore.user?.email || ''
  profileForm.value.displayName = authStore.user?.displayName || ''
  profileForm.value.orgUnit = authStore.user?.orgUnit || ''
  if (!plannersStore.planners.length) await plannersStore.fetchPlanners()
})

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
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          :class="darkMode ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'">
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
              ? 'bg-primary text-white border-primary'
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
              ? 'bg-primary text-white border-primary'
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

    <BaseCard title="Datenschutz">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">Online-Status verbergen</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Andere Benutzer sehen dich als
            <span class="inline-flex items-center gap-1">
              <span class="inline-block w-2 h-2 rounded-full bg-yellow-400"></span>gelbe Ampel
            </span>
            statt online oder offline
          </p>
        </div>
        <button
          @click="togglePrivacyHideOnline"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          :class="privacyHideOnline ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform"
            :class="privacyHideOnline ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>
    </BaseCard>

    <BaseCard title="Sprache">
      <div class="flex gap-3">
        <button @click="setLanguage('de')" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="language === 'de' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'">
          Deutsch
        </button>
        <button @click="setLanguage('en')" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="language === 'en' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'">
          English
        </button>
      </div>
    </BaseCard>

    <BaseCard title="Profilbild">
      <div class="flex items-center gap-4">
        <div class="relative shrink-0">
          <img :src="myAvatar" class="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 object-cover" alt="Mein Avatar" />
          <div v-if="avatarUploading" class="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
            <svg class="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        </div>
        <div class="flex-1 space-y-2">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ authStore.user?.avatarCustomUrl ? 'Eigenes Profilbild aktiv.' : 'Automatisch aus Benutzernamen generiert.' }}
          </p>
          <div class="flex gap-2 flex-wrap">
            <label class="btn-secondary text-sm cursor-pointer">
              <span>{{ authStore.user?.avatarCustomUrl ? 'Bild ersetzen' : 'Bild hochladen' }}</span>
              <input type="file" class="hidden" accept="image/jpeg,image/png,image/gif,image/webp" @change="onAvatarPick" />
            </label>
            <button v-if="authStore.user?.avatarCustomUrl" @click="removeAvatar"
              class="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              Entfernen
            </button>
          </div>
        </div>
      </div>
    </BaseCard>

    <BaseCard title="Profil">
      <form @submit.prevent="saveProfile" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benutzername</label>
            <input v-model="profileForm.username" type="text" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anzeigename</label>
            <input v-model="profileForm.displayName" type="text" class="input-field" placeholder="Vollständiger Name…" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-Mail-Adresse</label>
          <input v-model="profileForm.email" type="email" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organisationseinheit</label>
          <input v-model="profileForm.orgUnit" type="text" class="input-field" placeholder="z. B. Engineering, Design, Vertrieb…" />
        </div>
        <button type="submit" :disabled="authStore.loading" class="btn-primary">
          {{ authStore.loading ? 'Speichern...' : 'Profil speichern' }}
        </button>
      </form>
    </BaseCard>

    <!-- Meine Rollen -->
    <BaseCard title="Meine Rollen">
      <div class="space-y-4">
        <!-- Systemrolle -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">Systemrolle</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Gilt app-weit, wird vom Administrator vergeben</p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold"
            :class="authStore.user?.role === 'admin'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'">
            {{ SYSTEM_ROLE_LABELS[authStore.user?.role] ?? authStore.user?.role }}
          </span>
        </div>

        <!-- Planner-Rollen -->
        <div v-if="myPlannerRoles.length">
          <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">Planner-Rollen</p>
          <div class="space-y-2">
            <div v-for="p in myPlannerRoles" :key="p.id"
              class="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <span class="text-sm text-gray-700 dark:text-gray-300 truncate mr-3">{{ p.name }}</span>
              <span class="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="p.role === 'owner'
                  ? 'bg-primary-light text-primary dark:bg-primary-active/30 dark:text-primary-dark'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-300'">
                {{ PLANNER_ROLE_LABELS[p.role] ?? p.role }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <BaseCard title="Über T-Compass">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">Version</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">v{{ currentVersion }}</p>
        </div>
        <button @click="showChangelog = true" class="text-sm text-primary dark:text-primary-dark hover:underline font-medium">
          Changelog ansehen
        </button>
      </div>
    </BaseCard>
  </div>

  <ChangelogModal v-if="showChangelog" @close="showChangelog = false" />
</template>
