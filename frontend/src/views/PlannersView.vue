<template>
  <div class="max-w-5xl mx-auto py-10 px-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Meine Planner</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Wähle einen Planner oder erstelle deinen eigenen.</p>
      </div>
      <button @click="openCreate" class="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Neuen Planner erstellen
      </button>
    </div>

    <div v-if="plannersStore.loading" class="text-gray-400 text-sm">Lade Planner…</div>

    <template v-else>
      <!-- Eigene Planner -->
      <section v-if="ownedPlanners.length > 0" class="mb-8">
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Meine Planner</h2>
          <span class="text-xs bg-primary/10 text-primary dark:text-primary-dark rounded-full px-2 py-0.5 font-medium">{{ ownedPlanners.length }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="planner in ownedPlanners"
            :key="planner.id"
            class="relative group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary-dark/40 hover:shadow-md transition-all overflow-hidden"
          >
            <!-- Farbstreifen -->
            <div class="h-1 w-full" :style="{ backgroundColor: planner.color || '#E20074' }"></div>
            <div class="p-5">
              <!-- Aktionen: Favorit dauerhaft, Edit/Delete nur beim Hover -->
              <div class="absolute top-4 right-3 flex items-center gap-1" @click.stop>
                <button
                  @click="toggleFavorite(planner.id)"
                  :title="isFavorite(planner.id) ? 'Als Favorit entfernen' : 'Als Startplanner setzen'"
                  class="p-1.5 rounded-md transition-colors"
                  :class="isFavorite(planner.id) ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'"
                >
                  <svg class="w-3.5 h-3.5" :fill="isFavorite(planner.id) ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
                <button @click="openEdit(planner)" class="p-1.5 text-gray-400 hover:text-primary dark:hover:text-primary-dark hover:bg-primary/10 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Bearbeiten">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button @click="confirmDelete(planner)" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Löschen">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <!-- Badge -->
              <div class="flex items-center gap-2 mb-3">
                <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary-dark/10 dark:text-primary-dark">
                  <svg class="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  Eigener Planner
                </span>
                <span v-if="planner.ticketPrefix" class="text-xs font-mono text-gray-400 dark:text-gray-500 ml-auto pr-10">{{ planner.ticketPrefix }}-*</span>
              </div>

              <button class="text-left w-full focus:outline-none" @click="openPlanner(planner.id)">
                <h2 class="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-primary dark:group-hover:text-primary-dark transition-colors">{{ planner.name }}</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 min-h-[2rem]">{{ planner.description || 'Keine Beschreibung' }}</p>
                <div class="flex items-center gap-3 text-xs text-gray-400">
                  <span>{{ planner.members?.length ?? 0 }} Mitglieder</span>
                  <span>·</span>
                  <span>{{ planner.teamCount ?? 0 }} Teams</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Mitgliedschaften (eingeladen) -->
      <section v-if="memberPlanners.length > 0" class="mb-8">
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mitgliedschaften</h2>
          <span class="text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full px-2 py-0.5 font-medium">{{ memberPlanners.length }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="planner in memberPlanners"
            :key="planner.id"
            class="relative group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all overflow-hidden cursor-pointer"
            @click="openPlanner(planner.id)"
          >
            <div class="h-1 w-full" :style="{ backgroundColor: planner.color || '#6366f1' }"></div>
            <div class="p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Mitglied
                </span>
                <!-- Favorit -->
                <button
                  @click.stop="toggleFavorite(planner.id)"
                  :title="isFavorite(planner.id) ? 'Als Favorit entfernen' : 'Als Startplanner setzen'"
                  class="ml-auto p-1 rounded-lg transition-colors"
                  :class="isFavorite(planner.id) ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'"
                >
                  <svg class="w-4 h-4" :fill="isFavorite(planner.id) ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              </div>
              <h2 class="font-semibold text-gray-900 dark:text-white mb-1">{{ planner.name }}</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 min-h-[2rem]">{{ planner.description || 'Keine Beschreibung' }}</p>
              <div class="flex items-center gap-3 text-xs text-gray-400">
                <span>{{ planner.members?.length ?? 0 }} Mitglieder</span>
                <span>·</span>
                <span>{{ planner.teamCount ?? 0 }} Teams</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Leer-Zustand -->
      <div v-if="ownedPlanners.length === 0 && memberPlanners.length === 0" class="text-center py-20">
        <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Noch keine Planner</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Erstelle deinen ersten Planner oder warte auf eine Einladung.</p>
        <button @click="openCreate" class="btn-primary px-6 py-2 rounded-lg text-sm font-medium">
          Jetzt Planner erstellen
        </button>
      </div>
    </template>

    <!-- Erstellen/Bearbeiten Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeModal">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal"></div>
        <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md z-10">
          <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ editingPlanner ? 'Planner bearbeiten' : 'Neuen Planner erstellen' }}
            </h2>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form @submit.prevent="save" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span class="text-red-500">*</span></label>
              <input v-model="form.name" type="text" placeholder="z. B. Mein Projekt-Planner" class="input-field w-full" required autofocus @input="autoPrefix" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
              <textarea v-model="form.description" rows="2" placeholder="Wofür ist dieser Planner?" class="input-field w-full resize-none"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket-Präfix</label>
              <input v-model="form.ticketPrefix" type="text" placeholder="z. B. ABC" maxlength="5" class="input-field w-full uppercase" @input="form.ticketPrefix = form.ticketPrefix.toUpperCase()" />
              <p class="text-xs text-gray-400 mt-1">Präfix für Ticket-IDs (z. B. ABC-123)</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Farbe</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="c in colors" :key="c"
                  type="button"
                  @click="form.color = c"
                  class="w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center"
                  :class="form.color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'"
                  :style="{ backgroundColor: c }"
                >
                  <svg v-if="form.color === c" class="w-3.5 h-3.5 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>
            <div v-if="modalError" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{{ modalError }}</div>
            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="closeModal" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Abbrechen</button>
              <button type="submit" :disabled="saving || !form.name.trim()" class="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                <svg v-if="saving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {{ editingPlanner ? 'Speichern' : 'Erstellen' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Onboarding-Wizard nach Planner-Erstellung -->
    <Teleport to="body">
      <PlannerOnboardingModal
        v-if="onboardingPlanner"
        :planner="onboardingPlanner"
        @done="onOnboardingDone"
      />
    </Teleport>

    <!-- Lösch-Dialog -->
    <Teleport to="body">
      <div v-if="deletingPlanner" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="deletingPlanner = null"></div>
        <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm z-10 p-6">
          <div class="flex items-start gap-4 mb-5">
            <div class="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">Planner löschen?</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                <strong class="text-gray-700 dark:text-gray-200">{{ deletingPlanner.name }}</strong> und alle Projekte &amp; Tickets werden unwiederbringlich gelöscht.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <button @click="deletingPlanner = null" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Abbrechen</button>
            <button @click="doDelete" :disabled="deleting" class="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50">
              Endgültig löschen
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlannersStore } from '@/stores/planners'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import PlannerOnboardingModal from '@/components/common/PlannerOnboardingModal.vue'

const router = useRouter()
const plannersStore = usePlannersStore()
const authStore = useAuthStore()
const { success: toastSuccess, error: toastError } = useToast()

const showModal = ref(false)
const saving = ref(false)
const modalError = ref('')
const editingPlanner = ref(null)
const deletingPlanner = ref(null)
const deleting = ref(false)
const onboardingPlanner = ref(null)

const colors = ['#E20074', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#64748b']

const emptyForm = () => ({ name: '', description: '', ticketPrefix: '', color: '#E20074' })
const form = ref(emptyForm())

onMounted(async () => {
  await plannersStore.fetchPlanners()
  const fav = authStore.favoritePlannerId
  if (fav && plannersStore.planners.find(p => p.id === fav)) {
    router.push(`/planner/${fav}/dashboard`)
  }
})

const ownedPlanners = computed(() =>
  plannersStore.planners.filter(p => p.createdBy === authStore.user?.id)
)

const memberPlanners = computed(() =>
  plannersStore.planners.filter(p => p.createdBy !== authStore.user?.id)
)

function isFavorite(id) {
  return authStore.favoritePlannerId === id
}

async function toggleFavorite(id) {
  await authStore.setFavoritePlanner(isFavorite(id) ? null : id)
}

function autoPrefix() {
  if (editingPlanner.value) return
  const words = form.value.name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    form.value.ticketPrefix = words.slice(0, 3).map(w => w[0]).join('').toUpperCase()
  } else if (words.length === 1) {
    form.value.ticketPrefix = words[0].slice(0, 3).toUpperCase()
  }
}

function openCreate() {
  editingPlanner.value = null
  form.value = emptyForm()
  modalError.value = ''
  showModal.value = true
}

function openEdit(planner) {
  editingPlanner.value = planner
  form.value = { name: planner.name, description: planner.description || '', ticketPrefix: planner.ticketPrefix || '', color: planner.color || '#E20074' }
  modalError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingPlanner.value = null
  modalError.value = ''
}

async function save() {
  if (!form.value.name.trim()) return
  saving.value = true
  modalError.value = ''
  try {
    if (editingPlanner.value) {
      await plannersStore.updatePlanner(editingPlanner.value.id, form.value)
      toastSuccess('Planner aktualisiert')
    } else {
      const created = await plannersStore.createPlanner(form.value)
      toastSuccess('Planner erstellt')
      closeModal()
      onboardingPlanner.value = created
      return
    }
    closeModal()
  } catch (err) {
    modalError.value = err?.response?.data?.error || 'Fehler beim Speichern'
  } finally {
    saving.value = false
  }
}

function confirmDelete(planner) {
  deletingPlanner.value = planner
}

async function doDelete() {
  if (!deletingPlanner.value) return
  deleting.value = true
  try {
    await plannersStore.deletePlanner(deletingPlanner.value.id)
    toastSuccess('Planner gelöscht')
    deletingPlanner.value = null
  } catch (err) {
    toastError(err?.response?.data?.error || 'Fehler beim Löschen')
  } finally {
    deleting.value = false
  }
}

function openPlanner(id) {
  plannersStore.setActivePlanner(id)
  router.push(`/planner/${id}/dashboard`)
}

function onOnboardingDone({ planner }) {
  onboardingPlanner.value = null
  openPlanner(planner.id)
}
</script>
