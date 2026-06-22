<script setup>
import { ref } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useSprintsStore } from '@/stores/sprints'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  planner: { type: Object, required: true },
})
const emit = defineEmits(['done'])

const projectsStore = useProjectsStore()
const sprintsStore = useSprintsStore()
const toast = useToast()

const step = ref(1)
const saving = ref(false)
const createdProject = ref(null)

const projectForm = ref({ name: '', description: '' })
const sprintForm = ref({ name: 'Sprint 1', startDate: isoToday(), endDate: isoOffset(14) })

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}
function isoOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function saveProject() {
  if (!projectForm.value.name.trim()) return
  saving.value = true
  try {
    const project = await projectsStore.createProject({
      name: projectForm.value.name.trim(),
      description: projectForm.value.description.trim() || undefined,
      plannerId: props.planner.id,
    })
    createdProject.value = project
    step.value = 2
  } catch {
    toast.error('Projekt konnte nicht erstellt werden')
  } finally {
    saving.value = false
  }
}

async function saveSprint() {
  if (!sprintForm.value.name.trim()) return
  saving.value = true
  try {
    await sprintsStore.createSprint({
      name: sprintForm.value.name.trim(),
      startDate: sprintForm.value.startDate,
      endDate: sprintForm.value.endDate,
      projectId: createdProject.value.id,
      plannerId: props.planner.id,
      status: 'planned',
    })
    toast.success('Sprint erstellt')
    emit('done', { planner: props.planner, project: createdProject.value })
  } catch {
    toast.error('Sprint konnte nicht erstellt werden')
  } finally {
    saving.value = false
  }
}

function skipSprint() {
  emit('done', { planner: props.planner, project: createdProject.value })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div class="w-full max-w-lg bg-gray-800 rounded-2xl p-8 shadow-2xl border border-white/[0.06]">

      <!-- Header -->
      <div class="mb-8">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Planner einrichten</p>
        <h2 class="text-xl font-semibold text-white">
          {{ step === 1 ? 'Erstes Projekt anlegen' : 'Sprint erstellen?' }}
        </h2>
        <p class="text-sm text-gray-400 mt-0.5">für „{{ planner.name }}"</p>
      </div>

      <!-- Step-Indikator -->
      <div class="flex items-center justify-center mb-8">
        <div class="flex items-center gap-1">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300"
            :class="step >= 1 ? 'bg-primary text-white ring-2 ring-primary/30' : 'bg-gray-700 text-gray-400'">1</span>
          <span class="text-xs text-gray-500 ml-1.5">Projekt</span>
        </div>
        <div class="w-16 mx-3 border-t-2 transition-colors duration-500"
          :class="step >= 2 ? 'border-primary' : 'border-gray-700'" />
        <div class="flex items-center gap-1">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300"
            :class="step >= 2 ? 'bg-primary text-white ring-2 ring-primary/30' : 'bg-gray-700 text-gray-400'">2</span>
          <span class="text-xs text-gray-500 ml-1.5">Sprint</span>
        </div>
      </div>

      <!-- Schritte mit Slide-Animation -->
      <Transition name="slide" mode="out-in">

        <!-- Schritt 1: Projekt -->
        <div v-if="step === 1" key="step1">
          <form @submit.prevent="saveProject" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">
                Projektname <span class="text-primary">*</span>
              </label>
              <input
                v-model="projectForm.name"
                type="text"
                class="input-field w-full"
                placeholder="z. B. Website-Relaunch"
                autofocus
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">
                Beschreibung <span class="text-gray-500 font-normal">(optional)</span>
              </label>
              <textarea
                v-model="projectForm.description"
                class="input-field w-full resize-none h-24"
                placeholder="Kurze Beschreibung des Projekts…"
              />
            </div>
            <div class="flex flex-col items-center gap-2 mt-8">
              <button
                type="submit"
                class="btn-primary w-full"
                :disabled="!projectForm.name.trim() || saving"
              >
                {{ saving ? 'Wird erstellt…' : 'Projekt anlegen →' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Schritt 2: Sprint -->
        <div v-else-if="step === 2" key="step2">
          <div class="space-y-5">
            <p class="text-sm text-gray-400">
              Projekt <span class="font-medium text-white">„{{ createdProject?.name }}"</span>
              wurde angelegt. Möchtest du direkt einen ersten Sprint erstellen?
            </p>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">
                Sprint-Name <span class="text-primary">*</span>
              </label>
              <input v-model="sprintForm.name" type="text" class="input-field w-full" placeholder="z. B. Sprint 1" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Start</label>
                <input v-model="sprintForm.startDate" type="date" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Ende</label>
                <input v-model="sprintForm.endDate" type="date" class="input-field w-full" />
              </div>
            </div>
            <div class="flex flex-col items-center gap-2 mt-8">
              <button
                @click="saveSprint"
                class="btn-primary w-full"
                :disabled="!sprintForm.name.trim() || saving"
              >
                {{ saving ? 'Wird erstellt…' : 'Sprint erstellen & fertig' }}
              </button>
              <button
                @click="skipSprint"
                class="text-sm text-gray-400 hover:text-white transition-colors mt-1"
              >
                Jetzt überspringen
              </button>
            </div>
          </div>
        </div>

      </Transition>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease-out;
}
.slide-enter-from {
  transform: translateX(40px);
  opacity: 0;
}
.slide-leave-to {
  transform: translateX(-40px);
  opacity: 0;
}
</style>
