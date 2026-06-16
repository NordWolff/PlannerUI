<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const form = reactive({ username: '', email: '', password: '' })

async function register() {
  const ok = await authStore.register(form.username, form.email, form.password)
  if (ok) router.push('/my-team')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary dark:text-primary-dark">T-Compass</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">Neues Konto erstellen</p>
      </div>

      <div class="card">
        <form @submit.prevent="register" class="space-y-4">
          <div v-if="authStore.error" class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
            <p class="text-sm text-red-600 dark:text-red-400">{{ authStore.error }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benutzername</label>
            <input v-model="form.username" type="text" required class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-Mail-Adresse</label>
            <input v-model="form.email" type="email" required class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Passwort</label>
            <input v-model="form.password" type="password" required minlength="6" class="input-field" />
          </div>

          <button type="submit" :disabled="authStore.loading" class="btn-primary w-full">
            {{ authStore.loading ? 'Registrieren...' : 'Registrieren' }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Bereits ein Konto?
          <router-link to="/login" class="text-primary dark:text-primary-dark font-medium hover:underline">Anmelden</router-link>
        </p>
      </div>
    </div>
  </div>
</template>
