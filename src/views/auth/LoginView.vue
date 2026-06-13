<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const form = reactive({ email: '', password: '' })

async function login() {
  const ok = await authStore.login(form.email, form.password)
  if (ok) router.push('/my-team')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-indigo-600 dark:text-indigo-400">Planner</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">Melde dich an, um fortzufahren</p>
      </div>

      <div class="card">
        <form @submit.prevent="login" class="space-y-4">
          <div v-if="authStore.error" class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
            <p class="text-sm text-red-600 dark:text-red-400">{{ authStore.error }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-Mail-Adresse</label>
            <input v-model="form.email" type="email" required class="input-field" placeholder="admin@planner.dev" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Passwort</label>
            <input v-model="form.password" type="password" required class="input-field" placeholder="••••••••" />
          </div>

          <button type="submit" :disabled="authStore.loading" class="btn-primary w-full">
            {{ authStore.loading ? 'Anmelden...' : 'Anmelden' }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Noch kein Konto?
          <router-link to="/register" class="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Registrieren</router-link>
        </p>
      </div>

      <p class="mt-4 text-center text-xs text-gray-400">Demo: admin@planner.dev / admin123</p>
    </div>
  </div>
</template>
