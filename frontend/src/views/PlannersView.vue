<template>
  <div class="max-w-4xl mx-auto py-10 px-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Planner auswählen</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">Wähle einen Planner, um fortzufahren.</p>

    <div v-if="plannersStore.loading" class="text-gray-400 text-sm">Lade Planner…</div>

    <div v-else-if="plannersStore.planners.length === 0" class="text-gray-400 text-sm">
      Du hast noch keinen Zugang zu einem Planner. Bitte wende dich an den Administrator.
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="planner in sorted"
        :key="planner.id"
        class="relative group bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
        :class="isFavorite(planner.id)
          ? 'border-amber-400 dark:border-amber-500 ring-1 ring-amber-300 dark:ring-amber-600'
          : 'border-gray-200 dark:border-gray-700'"
      >
        <!-- Favorit-Stern -->
        <button
          @click.stop="toggleFavorite(planner.id)"
          :title="isFavorite(planner.id) ? 'Als Favorit entfernen' : 'Als Startplanner setzen'"
          class="absolute top-3 right-3 p-1 rounded-lg transition-colors"
          :class="isFavorite(planner.id)
            ? 'text-amber-400 hover:text-amber-500'
            : 'text-gray-300 hover:text-amber-400 dark:text-gray-600 dark:hover:text-amber-400 opacity-0 group-hover:opacity-100'"
        >
          <svg class="w-5 h-5" :fill="isFavorite(planner.id) ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>

        <!-- Favorit-Label -->
        <div v-if="isFavorite(planner.id)" class="flex items-center gap-1 mb-3">
          <svg class="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
          </svg>
          <span class="text-xs font-medium text-amber-600 dark:text-amber-400">Startplanner</span>
        </div>
        <div v-else class="h-1 rounded-full bg-indigo-500 mb-4 w-12"></div>

        <!-- Karteninhalt (klickbar) -->
        <button class="text-left w-full focus:outline-none" @click="openPlanner(planner.id)">
          <h2 class="font-semibold text-gray-900 dark:text-white mb-1 pr-6">{{ planner.name }}</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">{{ planner.description }}</p>
          <div class="flex items-center gap-3 text-xs text-gray-400">
            <span>{{ planner.members?.length ?? 0 }} Mitglieder</span>
            <span>·</span>
            <span>{{ planner.teamCount ?? 0 }} Teams</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Admin: neuen Planner erstellen -->
    <div v-if="authStore.isAdmin" class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      <router-link
        to="/planner-admin"
        class="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
      >
        + Planner verwalten (Admin)
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlannersStore } from '@/stores/planners'
import { useAuthStore } from '@/stores/auth'

const plannersStore = usePlannersStore()
const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  plannersStore.fetchPlanners()
})

// Favorit-Planner zuerst sortieren
const sorted = computed(() => {
  const fav = authStore.favoritePlannerId
  if (!fav) return plannersStore.planners
  return [...plannersStore.planners].sort((a, b) => {
    if (a.id === fav) return -1
    if (b.id === fav) return 1
    return 0
  })
})

function isFavorite(id) {
  return authStore.favoritePlannerId === id
}

async function toggleFavorite(id) {
  const newId = isFavorite(id) ? null : id
  await authStore.setFavoritePlanner(newId)
}

function openPlanner(id) {
  plannersStore.setActivePlanner(id)
  router.push(`/planner/${id}/dashboard`)
}
</script>
