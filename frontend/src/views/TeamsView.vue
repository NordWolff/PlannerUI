<script setup>
import { onMounted, ref, computed, reactive } from 'vue'
import { useTeamsStore } from '@/stores/teams'
import BaseModal from '@/components/common/BaseModal.vue'
import SearchInput from '@/components/common/SearchInput.vue'

const teamsStore = useTeamsStore()
const search = ref('')
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const newMemberUserId = ref('')
const newMemberRole = ref('member')
const teamForm = reactive({ name: '', description: '' })
const editingTeam = ref(null)

onMounted(() => teamsStore.fetchTeams())

const filteredTeams = computed(() =>
  teamsStore.teams.filter(t => t.name.toLowerCase().includes(search.value.toLowerCase()))
)

function openCreate() {
  editingTeam.value = null
  teamForm.name = ''
  teamForm.description = ''
  showCreateModal.value = true
}

function openEdit(team) {
  editingTeam.value = team
  teamForm.name = team.name
  teamForm.description = team.description || ''
  showCreateModal.value = true
}

function openDetail(team) {
  teamsStore.setCurrentTeam(team)
  newMemberUserId.value = ''
  showDetailModal.value = true
}

async function saveTeam() {
  if (editingTeam.value) {
    await teamsStore.updateTeam(editingTeam.value.id, teamForm)
  } else {
    await teamsStore.createTeam(teamForm)
  }
  showCreateModal.value = false
}

async function deleteTeam(id) {
  if (!confirm('Team wirklich löschen?')) return
  await teamsStore.deleteTeam(id)
}

async function addMember() {
  if (!newMemberUserId.value.trim()) return
  await teamsStore.addMember(teamsStore.currentTeam.id, newMemberUserId.value, newMemberRole.value)
  newMemberUserId.value = ''
}

async function removeMember(userId) {
  await teamsStore.removeMember(teamsStore.currentTeam.id, userId)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Teams</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Alle Teams verwalten</p>
      </div>
      <button @click="openCreate" class="btn-primary">+ Team erstellen</button>
    </div>

    <SearchInput v-model="search" placeholder="Teams suchen..." />

    <div v-if="teamsStore.loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="card animate-pulse h-40" />
    </div>

    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="team in filteredTeams" :key="team.id"
        class="card hover:shadow-md transition-shadow cursor-pointer"
        @click="openDetail(team)">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <span class="text-indigo-600 dark:text-indigo-400 font-bold text-sm">{{ team.name?.charAt(0).toUpperCase() }}</span>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ team.name }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ team.members?.length || 0 }} Mitglieder</p>
            </div>
          </div>
          <div class="flex gap-1" @click.stop>
            <button @click="openEdit(team)" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button @click="deleteTeam(team.id)" class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
        <p v-if="team.description" class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{{ team.description }}</p>
      </div>

      <div v-if="!filteredTeams.length" class="col-span-full py-12 text-center">
        <p class="text-gray-400">Keine Teams gefunden</p>
        <button @click="openCreate" class="btn-primary mt-4">Erstes Team erstellen</button>
      </div>
    </div>

    <BaseModal v-if="showCreateModal" :title="editingTeam ? 'Team bearbeiten' : 'Neues Team'" @close="showCreateModal = false">
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input v-model="teamForm.name" type="text" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
          <textarea v-model="teamForm.description" rows="3" class="input-field resize-none" />
        </div>
      </div>
      <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="showCreateModal = false" class="btn-secondary">Abbrechen</button>
        <button @click="saveTeam" :disabled="!teamForm.name" class="btn-primary">Speichern</button>
      </div>
    </BaseModal>

    <BaseModal v-if="showDetailModal && teamsStore.currentTeam" :title="teamsStore.currentTeam.name" size="lg" @close="showDetailModal = false">
      <div class="p-6">
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mitglieder</h4>
        <div class="space-y-2 mb-6">
          <div v-for="member in teamsStore.currentTeam.members" :key="member.userId"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div class="flex items-center gap-3">
              <img :src="`https://api.dicebear.com/7.x/initials/svg?seed=${member.userId}`"
                class="w-8 h-8 rounded-full bg-gray-200" alt="Avatar" />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ member.userId }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ member.role }}</p>
              </div>
            </div>
            <button @click="removeMember(member.userId)" class="text-red-500 hover:text-red-700 text-xs">Entfernen</button>
          </div>
          <div v-if="!teamsStore.currentTeam.members?.length" class="py-4 text-center text-sm text-gray-400">Keine Mitglieder</div>
        </div>

        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mitglied hinzufügen</h4>
        <div class="flex gap-2">
          <input v-model="newMemberUserId" type="text" placeholder="Benutzer-ID" class="input-field flex-1" />
          <select v-model="newMemberRole" class="input-field w-auto">
            <option value="member">Mitglied</option>
            <option value="owner">Owner</option>
          </select>
          <button @click="addMember" class="btn-primary">Hinzufügen</button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
