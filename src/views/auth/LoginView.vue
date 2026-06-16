<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlannersStore } from '@/stores/planners'

const authStore = useAuthStore()
const plannersStore = usePlannersStore()
const router = useRouter()

const form = reactive({ email: '', password: '' })
const rememberMe = ref(false)
const showPassword = ref(false)

onMounted(() => {
  if (authStore.savedRemember) {
    form.email = authStore.savedEmail
    rememberMe.value = true
  }
})

async function login() {
  const ok = await authStore.login(form.email, form.password, rememberMe.value)
  if (!ok) return
  const favId = authStore.favoritePlannerId
  if (favId) {
    await plannersStore.fetchPlanners()
    plannersStore.setActivePlanner(favId)
    router.push(`/planner/${favId}/dashboard`)
  } else {
    router.push('/planners')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
    <div class="w-full max-w-md">

      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-lg">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Planner</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1 text-sm">Melde dich an, um fortzufahren</p>
      </div>

      <div class="card">
        <form @submit.prevent="login" class="space-y-5">

          <div v-if="authStore.error"
            class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-center gap-2">
            <svg class="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm text-red-600 dark:text-red-400">{{ authStore.error }}</p>
          </div>

          <!-- E-Mail -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              E-Mail-Adresse
            </label>
            <input
              v-model="form.email"
              type="email"
              required
              autocomplete="email"
              class="input-field"
              placeholder="deine@email.de"
            />
          </div>

          <!-- Passwort -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Passwort
            </label>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                class="input-field pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabindex="-1"
              >
                <svg v-if="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Angemeldet bleiben -->
          <div class="flex items-center gap-2.5">
            <input
              id="remember"
              v-model="rememberMe"
              type="checkbox"
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary bg-white dark:bg-gray-700 cursor-pointer"
            />
            <label for="remember" class="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
              Angemeldet bleiben
              <span class="text-gray-400 dark:text-gray-500 text-xs ml-1">(30 Tage)</span>
            </label>
          </div>

          <button
            type="submit"
            :disabled="authStore.loading"
            class="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
          >
            <svg v-if="authStore.loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ authStore.loading ? 'Anmelden…' : 'Anmelden' }}
          </button>
        </form>

        <p class="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
          Noch kein Konto?
          <router-link to="/register" class="text-primary dark:text-primary-dark font-medium hover:underline">
            Registrieren
          </router-link>
        </p>
      </div>

    </div>
  </div>
</template>
