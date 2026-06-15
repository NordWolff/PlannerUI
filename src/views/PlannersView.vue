<template>
  <div class="max-w-4xl mx-auto py-10 px-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Planner auswählen</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">Wähle einen Planner, um fortzufahren.</p>

    <div v-if="plannersStore.loading" class="text-gray-400 text-sm">Lade Planner…</div>

    <div v-else-if="plannersStore.planners.length === 0" class="text-gray-400 text-sm">
      Du hast noch keinen Zugang zu einem Planner. Bitte wende dich an den Administrator.
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <button
        v-for="planner in plannersStore.planners"
        :key="planner.id"
        class="text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
        @click="openPlanner(planner.id)"
      >
        <div class="h-1 rounded-full bg-indigo-500 mb-4 w-12"></div>
        <h2 class="font-semibold text-gray-900 dark:text-white mb-1">{{ planner.name }}</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">{{ planner.description }}</p>
        <div class="flex items-center gap-3 text-xs text-gray-400">
          <span>{{ planner.members?.length ?? 0 }} Mitglieder</span>
          <span>·</span>
          <span>{{ planner.teamIds?.length ?? 0 }} Teams</span>
        </div>
      </button>
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
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlannersStore } from '@/stores/planners'
import { useAuthStore } from '@/stores/auth'

const plannersStore = usePlannersStore()
const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  plannersStore.fetchPlanners()
})

function openPlanner(id) {
  plannersStore.setActivePlanner(id)
  router.push(`/planner/${id}/dashboard`)
}
</script>
