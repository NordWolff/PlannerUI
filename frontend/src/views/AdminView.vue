<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTeamsStore } from '@/stores/teams'
import { useBoardsStore } from '@/stores/boards'
import { usePlannersStore } from '@/stores/planners'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'
import { generateAvatar } from '@/utils/avatar'
import BaseModal from '@/components/common/BaseModal.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'

const route = useRoute()
const authStore = useAuthStore()
const teamsStore = useTeamsStore()
const boardsStore = useBoardsStore()
const plannersStore = usePlannersStore()
const toast = useToast()

const activeTab = ref(null) // wird in onMounted gesetzt
const users = ref([])
const loadingUsers = ref(false)
const adminRequests = ref([])
const loadingRequests = ref(false)

const tabs = computed(() => {
  const base = [
    { key: 'alle-planner', label: authStore.isAdmin ? 'Alle Planner' : 'Meine Planner' },
    { key: 'planner',      label: 'Planner-Zugang' },
    { key: 'teams',        label: 'Teams' },
    { key: 'boards',       label: 'Boards' },
  ]
  if (authStore.isAdmin) {
    return [
      { key: 'requests',  label: 'Anfragen' },
      { key: 'support',   label: 'Support-Tickets' },
      ...base,
      { key: 'users',     label: 'Benutzer' },
      { key: 'settings',  label: 'Einstellungen' },
    ]
  }
  return base
})

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin',           desc: 'Vollzugriff auf alle Bereiche' },
  { value: 'owner', label: 'Owner',           desc: 'Kann Teams und Projekte verwalten' },
  { value: 'user',  label: 'Benutzer',        desc: 'Standardzugriff' },
]

// Rollen für Planner-Mitgliedschaft (planner-level, unabhängig von globaler Rolle)
const PLANNER_MEMBER_ROLE_OPTIONS = [
  { value: 'owner', label: 'Verantwortlicher', desc: 'Kann den Planner vollständig verwalten' },
  { value: 'admin', label: 'Admin',            desc: 'Kann Mitglieder und Einstellungen verwalten' },
  { value: 'user',  label: 'Mitglied',         desc: 'Standardzugriff auf den Planner' },
]

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  owner: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  user:  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const REQUEST_STATUS = {
  open:        { label: 'Offen',       cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  in_progress: { label: 'In Arbeit',   cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  done:        { label: 'Erledigt',    cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  rejected:    { label: 'Abgelehnt',   cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
}

const REQUEST_TYPE = {
  feature: { label: '✨ Feature', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  bug:     { label: '🐛 Bug',     cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}

// Einstellungen
const ticketSettings = ref(null)
const prefixInput = ref('')
const counterInput = ref('')
const savingPrefix = ref(false)
const savingCounter = ref(false)

// Planner-Präfixe
const plannerPrefixEdits = ref({})
const savingPlannerPrefixId = ref(null)

function initPlannerPrefixEdits() {
  plannersStore.allPlanners.forEach(p => {
    plannerPrefixEdits.value[p.id] = p.ticketPrefix ?? 'TKT'
  })
}

async function savePlannerPrefix(plannerId) {
  const raw = plannerPrefixEdits.value[plannerId] ?? ''
  const val = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!val) { toast.error('Präfix darf nicht leer sein'); return }
  plannerPrefixEdits.value[plannerId] = val
  savingPlannerPrefixId.value = plannerId
  try {
    await plannersStore.updateSettings(plannerId, { ticketPrefix: val })
    toast.success('Planner-Präfix gespeichert')
  } catch { toast.error('Fehler beim Speichern') }
  finally { savingPlannerPrefixId.value = null }
}

// Team-Modal
const showTeamModal = ref(false)
const editingTeam = ref(null)
const teamForm = reactive({ name: '', description: '' })

// Board-Modal
const showBoardModal = ref(false)
const editingBoard = ref(null)
const boardForm = reactive({ name: '', description: '', startDate: '', endDate: '', plannerId: '' })

// ─── Laden ────────────────────────────────────────────────────────────────────

async function loadUsers() {
  loadingUsers.value = true
  try {
    const { data } = await api.get('/users')
    users.value = data
  } catch {
    toast.error('Benutzer konnten nicht geladen werden')
  } finally {
    loadingUsers.value = false
  }
}

async function loadRequests() {
  loadingRequests.value = true
  try {
    const { data } = await api.get('/admin-requests')
    adminRequests.value = data
  } catch (e) {
    console.error('loadRequests:', e)
    toast.error('Anfragen konnten nicht geladen werden')
  } finally {
    loadingRequests.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'requests') loadRequests()
  if (tab === 'support')  loadSupportTickets()
})

async function loadSettings() {
  try {
    const { data } = await api.get('/settings')
    ticketSettings.value = data
    prefixInput.value = data.ticketPrefix
    counterInput.value = data.ticketCounter
  } catch {
    toast.error('Einstellungen konnten nicht geladen werden')
  }
}

// ─── Planner-Zugang ───────────────────────────────────────────────────────────

const activePlanner = computed(() =>
  plannersStore.planners.find(p => p.id === route.params.plannerId) ?? null
)

const plannerMembers = computed(() => activePlanner.value?.members ?? [])

const usersNotInPlanner = computed(() => {
  const existing = plannerMembers.value.map(m => m.userId)
  return users.value.filter(u => u.role !== 'admin' && !existing.includes(u.id))
})

const newPlannerMember = reactive({ userId: '', role: 'user' })

async function addPlannerMember() {
  if (!newPlannerMember.userId || !activePlanner.value) return
  const updated = [...plannerMembers.value, { userId: newPlannerMember.userId, role: newPlannerMember.role }]
  try {
    await plannersStore.updateMembers(activePlanner.value.id, updated)
    newPlannerMember.userId = ''
    newPlannerMember.role = 'user'
    toast.success('Mitglied hinzugefügt')
  } catch { toast.error('Fehler beim Hinzufügen') }
}

async function removePlannerMember(userId) {
  if (!activePlanner.value) return
  const updated = plannerMembers.value.filter(m => m.userId !== userId)
  try {
    await plannersStore.updateMembers(activePlanner.value.id, updated)
    toast.info('Mitglied entfernt')
  } catch { toast.error('Fehler beim Entfernen') }
}

async function changePlannerRole(userId, role) {
  if (!activePlanner.value) return
  const updated = plannerMembers.value.map(m => m.userId === userId ? { ...m, role } : m)
  try {
    await plannersStore.updateMembers(activePlanner.value.id, updated)
  } catch { toast.error('Fehler beim Ändern der Rolle') }
}

function plannerUserName(userId) {
  return users.value.find(u => u.id === userId)?.username ?? userId
}

function plannerUserEmail(userId) {
  return users.value.find(u => u.id === userId)?.email ?? ''
}

onMounted(async () => {
  activeTab.value = authStore.isAdmin ? 'requests' : 'alle-planner'

  const base = [plannersStore.fetchPlanners(), loadTeamsForFilter(), loadBoardsForFilter(), loadUsers()]
  if (authStore.isAdmin) {
    await Promise.all([...base, loadRequests(), loadSettings(), plannersStore.fetchAllPlanners()])
  } else {
    await Promise.all(base)
  }
  initPlannerPrefixEdits()
})

// ─── Alle Planner (Planner anlegen/verwalten) ──────────────────────────────────

// Planner, die der aktuelle User verwalten darf:
// Erstellt von ihm ODER Mitglied-Rolle 'admin' im Planner
const managedPlanners = computed(() => {
  if (authStore.isAdmin) return plannersStore.allPlanners
  return plannersStore.planners
})

function paUserCanManage(planner) {
  if (authStore.isAdmin) return true
  const uid = authStore.user?.id
  const member = (planner.members ?? []).find(m => m.userId === uid)
  return member?.role === 'admin'
}

function paUserRole(planner) {
  const uid = authStore.user?.id
  const member = (planner.members ?? []).find(m => m.userId === uid)
  return member?.role ?? null
}

const paSearch = ref('')
const paFiltered = computed(() => {
  const q = paSearch.value.toLowerCase()
  const list = managedPlanners.value.filter(p => p.name.toLowerCase().includes(q))
  const mine = list.filter(p => p.createdBy === authStore.user?.id)
  const others = list.filter(p => p.createdBy !== authStore.user?.id)
  return [...mine, ...others]
})

const paShowCreateModal = ref(false)
const paCreateForm = reactive({ name: '', description: '', ticketPrefix: '', color: '#E20074' })

const paCreateColors = ['#E20074', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#64748b']

function paAutoPrefix() {
  const words = paCreateForm.name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    paCreateForm.ticketPrefix = words.slice(0, 3).map(w => w[0]).join('').toUpperCase()
  } else if (words.length === 1) {
    paCreateForm.ticketPrefix = words[0].slice(0, 3).toUpperCase()
  } else {
    paCreateForm.ticketPrefix = ''
  }
}

async function paSaveCreate() {
  if (!paCreateForm.name.trim()) return
  try {
    await plannersStore.createPlanner({
      name: paCreateForm.name,
      description: paCreateForm.description,
      ticketPrefix: paCreateForm.ticketPrefix || undefined,
      color: paCreateForm.color,
    })
    toast.success('Planner erstellt')
    paShowCreateModal.value = false
    Object.assign(paCreateForm, { name: '', description: '', ticketPrefix: '', color: '#E20074' })
  } catch { toast.error('Fehler beim Erstellen') }
}

const paDetailPlanner = ref(null)
const paActiveTab = ref('info')
const paInfoForm = reactive({ name: '', description: '', color: '#E20074' })
const paInfoColors = ['#E20074', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#64748b']
const paNewMember = reactive({ userId: '', role: 'user' })
const paExpandedTeamId = ref(null)
const paEditingTeam = ref(null)
const paEditTeamForm = reactive({ name: '', description: '' })
const paNewTeamForm = reactive({ name: '', description: '' })
const paAddMemberTeamId = ref(null)
const paNewTeamMember = reactive({ userId: '', role: 'user' })
const paTicketPrefixInput = ref('')

function paOpenDetail(planner) {
  paDetailPlanner.value = planner
  paActiveTab.value = 'info'
  Object.assign(paInfoForm, { name: planner.name, description: planner.description || '', color: planner.color || '#E20074' })
  paNewMember.userId = ''
  paNewMember.role = 'user'
  paNewTeamForm.name = ''
  paNewTeamForm.description = ''
  paTicketPrefixInput.value = planner.ticketPrefix ?? 'TKT'
  teamsStore.fetchTeams({ plannerId: planner.id })
}

function paCloseDetail() {
  paDetailPlanner.value = null
  const pid = route.params.plannerId
  teamsStore.fetchTeams(pid ? { plannerId: pid } : {})
}

async function paSaveInfo() {
  try {
    await plannersStore.updatePlanner(paDetailPlanner.value.id, { name: paInfoForm.name, description: paInfoForm.description, color: paInfoForm.color })
    paDetailPlanner.value = plannersStore.allPlanners.find(p => p.id === paDetailPlanner.value.id)
    toast.success('Gespeichert')
  } catch { toast.error('Fehler beim Speichern') }
}

const paPlannerMembers = computed(() => paDetailPlanner.value?.members ?? [])

// Darf der aktuelle User Rollen in diesem Planner verwalten?
// Ja wenn: System-Admin ODER Ersteller des Planners ODER Planner-Mitglied mit Rolle 'admin'
const paCanManageRoles = computed(() => {
  if (authStore.isAdmin) return true
  if (!paDetailPlanner.value) return false
  const uid = authStore.user?.id
  const member = (paDetailPlanner.value.members ?? []).find(m => m.userId === uid)
  return member?.role === 'admin'
})

const canManageActivePlannerRoles = computed(() => {
  if (authStore.isAdmin) return true
  if (!activePlanner.value) return false
  const uid = authStore.user?.id
  const member = (activePlanner.value.members ?? []).find(m => m.userId === uid)
  return member?.role === 'admin'
})

const paAvailableUsersToAdd = computed(() => {
  const existing = paPlannerMembers.value.map(m => m.userId)
  return users.value.filter(u => u.role !== 'admin' && !existing.includes(u.id))
})

async function paAddMember() {
  if (!paNewMember.userId) return
  const updated = [...paPlannerMembers.value, { userId: paNewMember.userId, role: paNewMember.role }]
  try {
    await plannersStore.updateMembers(paDetailPlanner.value.id, updated)
    paDetailPlanner.value = plannersStore.allPlanners.find(p => p.id === paDetailPlanner.value.id)
    paNewMember.userId = ''
    paNewMember.role = 'user'
    toast.success('Mitglied hinzugefügt')
  } catch { toast.error('Fehler') }
}

async function paRemoveMember(userId) {
  const updated = paPlannerMembers.value.filter(m => m.userId !== userId)
  try {
    await plannersStore.updateMembers(paDetailPlanner.value.id, updated)
    paDetailPlanner.value = plannersStore.allPlanners.find(p => p.id === paDetailPlanner.value.id)
    toast.info('Mitglied entfernt')
  } catch { toast.error('Fehler') }
}

async function paChangeMemberRole(userId, role) {
  const updated = paPlannerMembers.value.map(m => m.userId === userId ? { ...m, role } : m)
  try {
    await plannersStore.updateMembers(paDetailPlanner.value.id, updated)
    paDetailPlanner.value = plannersStore.allPlanners.find(p => p.id === paDetailPlanner.value.id)
  } catch { toast.error('Fehler') }
}

const paPlannerTeams = computed(() => teamsStore.teams)

function paStartEditTeam(team) {
  paEditingTeam.value = team.id
  Object.assign(paEditTeamForm, { name: team.name, description: team.description || '' })
}

async function paSaveEditTeam(teamId) {
  try {
    await teamsStore.updateTeam(teamId, { name: paEditTeamForm.name, description: paEditTeamForm.description })
    paEditingTeam.value = null
    toast.success('Team aktualisiert')
  } catch { toast.error('Fehler') }
}

async function paCreateTeam() {
  if (!paNewTeamForm.name.trim()) return
  try {
    await teamsStore.createTeam({
      name: paNewTeamForm.name,
      description: paNewTeamForm.description,
      plannerId: paDetailPlanner.value.id,
    })
    await plannersStore.fetchAllPlanners()
    paDetailPlanner.value = plannersStore.allPlanners.find(p => p.id === paDetailPlanner.value.id)
    paNewTeamForm.name = ''
    paNewTeamForm.description = ''
    toast.success('Team erstellt')
  } catch { toast.error('Fehler') }
}

async function paDeleteTeam(teamId) {
  if (!confirm('Team wirklich löschen?')) return
  try {
    await teamsStore.deleteTeam(teamId)
    await plannersStore.fetchAllPlanners()
    paDetailPlanner.value = plannersStore.allPlanners.find(p => p.id === paDetailPlanner.value.id)
    toast.info('Team gelöscht')
  } catch { toast.error('Fehler') }
}

async function paAddTeamMember(teamId) {
  if (!paNewTeamMember.userId) return
  try {
    await teamsStore.addMember(teamId, paNewTeamMember.userId, paNewTeamMember.role)
    paNewTeamMember.userId = ''
    paNewTeamMember.role = 'user'
    paAddMemberTeamId.value = null
    toast.success('Mitglied hinzugefügt')
  } catch { toast.error('Fehler') }
}

async function paRemoveTeamMember(teamId, userId) {
  try {
    await teamsStore.removeMember(teamId, userId)
    toast.info('Mitglied entfernt')
  } catch { toast.error('Fehler') }
}

function paUsersNotInTeam(team) {
  const existing = (team.members ?? []).map(m => m.userId)
  return users.value.filter(u => u.role !== 'admin' && !existing.includes(u.id))
}

async function paSaveSettings() {
  const val = paTicketPrefixInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!val) { toast.error('Präfix darf nicht leer sein'); return }
  try {
    await plannersStore.updateSettings(paDetailPlanner.value.id, { ticketPrefix: val })
    paDetailPlanner.value = plannersStore.allPlanners.find(p => p.id === paDetailPlanner.value.id)
    paTicketPrefixInput.value = paDetailPlanner.value.ticketPrefix
    toast.success('Einstellungen gespeichert')
  } catch { toast.error('Fehler') }
}

async function paDeletePlanner(planner) {
  if (!confirm(`Planner „${planner.name}" wirklich löschen?`)) return
  try {
    await plannersStore.deletePlanner(planner.id)
    if (paDetailPlanner.value?.id === planner.id) paCloseDetail()
    toast.info('Planner gelöscht')
  } catch { toast.error('Fehler') }
}

const PA_ROLE_LABELS = { owner: 'Verantwortlicher', admin: 'Admin', user: 'Mitglied', member: 'Mitglied' }

function paUserName(id) { return users.value.find(u => u.id === id)?.username ?? id }

// ─── Benutzer ─────────────────────────────────────────────────────────────────

const userSearch = ref('')

const filteredUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(u =>
    u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  )
})

async function changeRole(user, newRole) {
  const prevRole = user.role
  user.role = newRole
  try {
    await api.put(`/users/${user.id}/role`, { role: newRole })
    toast.success(`Rolle von ${user.username} auf "${newRole}" gesetzt`)
  } catch (e) {
    user.role = prevRole
    toast.error(e.response?.data?.error || 'Rolle konnte nicht geändert werden')
  }
}

// ─── Anfragen ─────────────────────────────────────────────────────────────────

async function updateRequestStatus(request, status) {
  try {
    const { data } = await api.put(`/admin-requests/${request.id}`, { status })
    Object.assign(request, data)
    toast.success('Status aktualisiert')
  } catch {
    toast.error('Status konnte nicht geändert werden')
  }
}

async function saveAdminNote(request) {
  try {
    await api.put(`/admin-requests/${request.id}`, { adminNote: request.adminNote })
    toast.success('Notiz gespeichert')
  } catch {
    toast.error('Notiz konnte nicht gespeichert werden')
  }
}

async function deleteRequest(id) {
  if (!confirm('Anfrage wirklich löschen?')) return
  try {
    await api.delete(`/admin-requests/${id}`)
    adminRequests.value = adminRequests.value.filter(r => r.id !== id)
    toast.success('Anfrage gelöscht')
  } catch {
    toast.error('Anfrage konnte nicht gelöscht werden')
  }
}

const openRequests = () => adminRequests.value.filter(r => r.status === 'open').length

// ─── Teams ────────────────────────────────────────────────────────────────────

// Planner-Filter: 'all' zeigt Teams aller Planner, sonst nur die des gewählten Planners.
// Default ist der aktuell aktive Planner (Kontext, in dem der Admin-Bereich geöffnet wurde).
const teamsFilterPlannerId = ref(route.params.plannerId || 'all')

const teamsFilterPlannerOptions = computed(() =>
  authStore.isAdmin ? plannersStore.allPlanners : plannersStore.planners
)

function plannerName(plannerId) {
  const list = authStore.isAdmin ? plannersStore.allPlanners : plannersStore.planners
  return list.find(p => p.id === plannerId)?.name ?? '—'
}

function canManageTeam(team) {
  if (authStore.isAdmin) return true
  if (!team.plannerId) return false
  const planner = plannersStore.planners.find(p => p.id === team.plannerId)
  return planner?.createdBy === authStore.user?.id
}

const canCreateTeamForCurrentFilter = computed(() => {
  if (authStore.isAdmin) return true
  if (teamsFilterPlannerId.value === 'all') return false
  const planner = plannersStore.planners.find(p => p.id === teamsFilterPlannerId.value)
  return planner?.createdBy === authStore.user?.id
})

async function loadTeamsForFilter() {
  const pid = teamsFilterPlannerId.value
  await teamsStore.fetchTeams(pid && pid !== 'all' ? { plannerId: pid } : {})
}

watch(teamsFilterPlannerId, loadTeamsForFilter)

function openCreateTeam() {
  editingTeam.value = null
  teamForm.name = ''
  teamForm.description = ''
  showTeamModal.value = true
}

function openEditTeam(team) {
  editingTeam.value = team
  teamForm.name = team.name
  teamForm.description = team.description || ''
  showTeamModal.value = true
}

async function saveTeam() {
  if (!teamForm.name.trim()) return
  const pid = teamsFilterPlannerId.value !== 'all' ? teamsFilterPlannerId.value : route.params.plannerId
  try {
    if (editingTeam.value) {
      await teamsStore.updateTeam(editingTeam.value.id, { name: teamForm.name, description: teamForm.description })
      toast.success('Team aktualisiert')
    } else {
      await teamsStore.createTeam({ name: teamForm.name, description: teamForm.description, plannerId: pid || null })
      toast.success('Team erstellt')
    }
    showTeamModal.value = false
    await loadTeamsForFilter()
  } catch {
    toast.error('Fehler beim Speichern')
  }
}

async function deleteTeam(id) {
  if (!confirm('Team wirklich löschen?')) return
  try {
    await teamsStore.deleteTeam(id)
    toast.success('Team gelöscht')
  } catch {
    toast.error('Team konnte nicht gelöscht werden')
  }
}

// ─── Boards ───────────────────────────────────────────────────────────────────

const boardsFilterPlannerId = ref(route.params.plannerId || 'all')

const boardsFilterPlannerOptions = computed(() =>
  authStore.isAdmin ? plannersStore.allPlanners : plannersStore.planners
)

function canManageBoard(board) {
  if (authStore.isAdmin) return true
  if (!board.plannerId) return false
  const planner = plannersStore.planners.find(p => p.id === board.plannerId)
  return planner?.createdBy === authStore.user?.id
}

const canCreateBoardForCurrentFilter = computed(() => {
  if (authStore.isAdmin) return true
  if (boardsFilterPlannerId.value === 'all') return false
  const planner = plannersStore.planners.find(p => p.id === boardsFilterPlannerId.value)
  return planner?.createdBy === authStore.user?.id
})

async function loadBoardsForFilter() {
  const pid = boardsFilterPlannerId.value
  await boardsStore.fetchBoards(pid && pid !== 'all' ? { plannerId: pid } : {})
}

watch(boardsFilterPlannerId, loadBoardsForFilter)

function openCreateBoard() {
  editingBoard.value = null
  boardForm.name = ''
  boardForm.description = ''
  boardForm.startDate = ''
  boardForm.endDate = ''
  boardForm.plannerId = boardsFilterPlannerId.value !== 'all' ? boardsFilterPlannerId.value : (route.params.plannerId || '')
  showBoardModal.value = true
}

function openEditBoard(board) {
  editingBoard.value = board
  boardForm.name = board.name
  boardForm.description = board.description || ''
  boardForm.startDate = board.startDate?.substring(0, 10) || ''
  boardForm.endDate = board.endDate?.substring(0, 10) || ''
  boardForm.plannerId = board.plannerId || ''
  showBoardModal.value = true
}

async function saveBoard() {
  if (!boardForm.name.trim()) return
  try {
    if (editingBoard.value) {
      await boardsStore.updateBoard(editingBoard.value.id, boardForm)
      toast.success('Board aktualisiert')
    } else {
      await boardsStore.createBoard(boardForm)
      toast.success('Board erstellt')
    }
    showBoardModal.value = false
    await loadBoardsForFilter()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Speichern')
  }
}

async function deleteBoard(id) {
  if (!confirm('Board wirklich löschen?')) return
  try {
    await boardsStore.deleteBoard(id)
    toast.success('Board gelöscht')
  } catch {
    toast.error('Board konnte nicht gelöscht werden')
  }
}

// ─── Einstellungen ────────────────────────────────────────────────────────────

async function savePrefix() {
  savingPrefix.value = true
  try {
    const { data } = await api.put('/settings/ticket-prefix', { prefix: prefixInput.value })
    ticketSettings.value = data
    toast.success(`Präfix auf "${data.ticketPrefix}" gesetzt`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Speichern')
  } finally {
    savingPrefix.value = false
  }
}

async function saveCounter() {
  savingCounter.value = true
  try {
    const { data } = await api.put('/settings/ticket-counter', { counter: counterInput.value })
    ticketSettings.value = data
    toast.success(`Zähler auf ${data.ticketCounter} gesetzt`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Fehler beim Speichern')
  } finally {
    savingCounter.value = false
  }
}

function previewNumber(prefix, counter) {
  return `${(prefix || 'TKT').toUpperCase()}-${String(parseInt(counter) || 1).padStart(4, '0')}`
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Support-Tickets ──────────────────────────────────────────────────────────

const TICKET_STATUS_LABELS = {
  draft:       { label: 'Entwurf',   cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  planned:     { label: 'Geplant',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'In Arbeit', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  review:      { label: 'Review',    cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  done:        { label: 'Erledigt',  cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
}

const TICKET_PRIORITY_LABELS = {
  low:      { label: 'Niedrig',  cls: 'text-gray-400' },
  medium:   { label: 'Mittel',   cls: 'text-blue-400' },
  high:     { label: 'Hoch',     cls: 'text-orange-400' },
  critical: { label: 'Kritisch', cls: 'text-red-500' },
}

const supportTickets = ref([])
const loadingSupport = ref(false)
const supportSprints = ref([])
const supportProjects = ref([])
const selectedTicket = ref(null)
const showTicketSlideOver = ref(false)
const savingTicket = ref(false)
const ticketEditForm = reactive({ status: '', assigneeId: null, projectId: null, sprintId: null })
const lightboxUrl = ref(null)

const supportPlanner = computed(() =>
  plannersStore.allPlanners.find(p => p.isSystemSupport) ?? null
)

const supportPlannerAdmins = computed(() => {
  if (!supportPlanner.value) return users.value.filter(u => u.role === 'admin')
  return (supportPlanner.value.members ?? [])
    .map(m => users.value.find(u => u.id === m.userId))
    .filter(Boolean)
})

async function loadSupportTickets() {
  if (!supportPlanner.value) {
    toast.error('System-Support Planner nicht gefunden')
    return
  }
  loadingSupport.value = true
  try {
    const [ticketsRes, sprintsRes, projectsRes] = await Promise.all([
      api.get('/tickets', { params: { plannerId: supportPlanner.value.id } }),
      api.get('/sprints', { params: { plannerId: supportPlanner.value.id } }),
      api.get('/projects', { params: { plannerId: supportPlanner.value.id } }),
    ])
    supportTickets.value = ticketsRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    supportSprints.value = sprintsRes.data
    supportProjects.value = projectsRes.data
  } catch {
    toast.error('Support-Tickets konnten nicht geladen werden')
  } finally {
    loadingSupport.value = false
  }
}

function openTicketSlideOver(ticket) {
  selectedTicket.value = ticket
  Object.assign(ticketEditForm, {
    status: ticket.status,
    assigneeId: ticket.assigneeId ?? null,
    projectId: ticket.projectId ?? null,
    sprintId: ticket.sprintId ?? null,
  })
  showTicketSlideOver.value = true
}

function closeTicketSlideOver() {
  showTicketSlideOver.value = false
  selectedTicket.value = null
}

async function saveSupportTicket() {
  if (!selectedTicket.value || savingTicket.value) return
  savingTicket.value = true
  try {
    const { data } = await api.put(`/tickets/${selectedTicket.value.id}`, {
      status: ticketEditForm.status,
      assigneeId: ticketEditForm.assigneeId || null,
      projectId: ticketEditForm.projectId || null,
      sprintId: ticketEditForm.sprintId || null,
    })
    const idx = supportTickets.value.findIndex(t => t.id === data.id)
    if (idx !== -1) supportTickets.value[idx] = data
    selectedTicket.value = data
    toast.success('Ticket gespeichert')
  } catch {
    toast.error('Fehler beim Speichern')
  } finally {
    savingTicket.value = false
  }
}

function isImageMime(mime) {
  return ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime)
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="max-w-5xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Verwaltung</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
          {{ authStore.isAdmin ? 'Systemverwaltung und Benutzeranfragen' : 'Deine Planner und Mitgliedschaften verwalten' }}
        </p>
      </div>
      <span v-if="authStore.isAdmin" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
        System-Admin
      </span>
    </div>

    <!-- Tab-Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav class="flex gap-1">
        <button v-for="tab in tabs" :key="tab.key"
          class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative"
          :class="activeTab === tab.key
            ? 'border-primary text-primary dark:text-primary-dark'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          @click="activeTab = tab.key">
          {{ tab.label }}
          <span v-if="tab.key === 'requests' && openRequests() > 0"
            class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {{ openRequests() }}
          </span>
        </button>
      </nav>
    </div>

    <!-- ── Anfragen ─────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'requests'">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Benutzer können Feature-Wünsche und Bugs an den Admin melden.
        </p>
        <button
          @click="loadRequests"
          :disabled="loadingRequests"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': loadingRequests }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Aktualisieren
        </button>
      </div>
      <p v-if="loadingRequests" class="text-gray-400 text-sm">Lade Anfragen…</p>
      <div v-else-if="!adminRequests.length" class="py-12 text-center">
        <div class="text-4xl mb-3">📬</div>
        <p class="text-gray-500 dark:text-gray-400 font-medium">Keine Anfragen vorhanden</p>
        <p class="text-gray-400 text-sm mt-1">Benutzer können über den „Anfrage"-Button oben Feedback senden.</p>
      </div>
      <div v-else class="space-y-3">
        <div v-for="req in adminRequests" :key="req.id"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <!-- Avatar -->
            <img
              v-if="req.submittedByUser"
              :src="generateAvatar(req.submittedByUser.username)"
              class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0 mt-0.5"
              :title="req.submittedByUser.username"
              alt=""
            />
            <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0 mt-0.5 flex items-center justify-center text-xs text-gray-500" v-else>?</div>

            <div class="flex-1 min-w-0">
              <!-- Kopfzeile -->
              <div class="flex items-start justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="REQUEST_TYPE[req.type]?.cls">
                    {{ REQUEST_TYPE[req.type]?.label }}
                  </span>
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ req.title }}</h3>
                  <button v-if="req.ticketNumber"
                    @click.stop="activeTab = 'support'"
                    class="font-mono text-xs text-primary dark:text-primary-dark hover:underline px-1.5 py-0.5 rounded bg-primary-light dark:bg-primary-active/20 transition-colors"
                    title="Im Support-Ticket-Tab öffnen">
                    {{ req.ticketNumber }} →
                  </button>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <select
                    :value="req.status"
                    @change="updateRequestStatus(req, $event.target.value)"
                    class="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option v-for="(s, key) in REQUEST_STATUS" :key="key" :value="key">{{ s.label }}</option>
                  </select>
                  <button @click="deleteRequest(req.id)" class="text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Löschen">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Meta -->
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="text-xs text-gray-400">von {{ req.submittedByUser?.username || 'Unbekannt' }}</span>
                <span class="text-gray-300 dark:text-gray-600">·</span>
                <span class="text-xs text-gray-400">{{ formatDate(req.createdAt) }}</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="REQUEST_STATUS[req.status]?.cls">
                  {{ REQUEST_STATUS[req.status]?.label }}
                </span>
              </div>

              <!-- Beschreibung -->
              <p v-if="req.description" class="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">{{ req.description }}</p>

              <!-- Admin-Notiz -->
              <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <label class="block text-xs text-gray-400 mb-1">Admin-Notiz</label>
                <div class="flex gap-2">
                  <input
                    v-model="req.adminNote"
                    type="text"
                    class="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Interne Notiz zur Anfrage…"
                    @keydown.enter="saveAdminNote(req)"
                  />
                  <button @click="saveAdminNote(req)" class="px-2 py-1 text-xs text-primary dark:text-primary-dark border border-primary-light dark:border-primary-hover rounded-lg hover:bg-primary-light dark:hover:bg-primary-active/20 transition-colors">
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Support-Tickets ────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'support'">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Eingehende SUP-Tickets aus dem System-Support Planner bearbeiten.
        </p>
        <button @click="loadSupportTickets" :disabled="loadingSupport"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
          <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': loadingSupport }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Aktualisieren
        </button>
      </div>

      <p v-if="loadingSupport" class="text-gray-400 text-sm py-8 text-center">Lade Support-Tickets…</p>
      <div v-else-if="!supportTickets.length" class="py-12 text-center">
        <div class="text-4xl mb-3">🎫</div>
        <p class="text-gray-500 dark:text-gray-400 font-medium">Keine Support-Tickets vorhanden</p>
        <p class="text-gray-400 text-sm mt-1">Eingereichte Anfragen erscheinen hier als SUP-Tickets.</p>
      </div>
      <div v-else class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-400 uppercase tracking-wide">
              <th class="text-left px-4 py-3 font-medium">Ticket</th>
              <th class="text-left px-4 py-3 font-medium">Titel</th>
              <th class="text-left px-4 py-3 font-medium hidden md:table-cell">Einreicher</th>
              <th class="text-left px-4 py-3 font-medium">Status</th>
              <th class="text-left px-4 py-3 font-medium hidden lg:table-cell">Priorität</th>
              <th class="text-left px-4 py-3 font-medium hidden lg:table-cell">Datum</th>
              <th class="text-left px-4 py-3 font-medium hidden md:table-cell">Zugewiesen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ticket in supportTickets" :key="ticket.id"
              class="border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              @click="openTicketSlideOver(ticket)">
              <td class="px-4 py-3">
                <span class="font-mono text-xs text-primary dark:text-primary-dark font-medium">{{ ticket.ticketNumber }}</span>
              </td>
              <td class="px-4 py-3 max-w-[220px]">
                <span class="truncate block text-gray-900 dark:text-white font-medium">{{ ticket.title }}</span>
                <span v-if="ticket.attachments?.length" class="text-xs text-gray-400">📎 {{ ticket.attachments.length }}</span>
              </td>
              <td class="px-4 py-3 hidden md:table-cell">
                <div class="flex items-center gap-2">
                  <UserAvatar :username="users.find(u => u.id === ticket.createdBy)?.username ?? '?'" size="xs" />
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ users.find(u => u.id === ticket.createdBy)?.username ?? '—' }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="TICKET_STATUS_LABELS[ticket.status]?.cls ?? 'bg-gray-100 text-gray-600'">
                  {{ TICKET_STATUS_LABELS[ticket.status]?.label ?? ticket.status }}
                </span>
              </td>
              <td class="px-4 py-3 hidden lg:table-cell">
                <span class="text-xs font-medium" :class="TICKET_PRIORITY_LABELS[ticket.priority]?.cls ?? 'text-gray-400'">
                  {{ TICKET_PRIORITY_LABELS[ticket.priority]?.label ?? ticket.priority }}
                </span>
              </td>
              <td class="px-4 py-3 hidden lg:table-cell">
                <span class="text-xs text-gray-400">{{ formatDate(ticket.createdAt) }}</span>
              </td>
              <td class="px-4 py-3 hidden md:table-cell">
                <UserAvatar v-if="ticket.assigneeId"
                  :username="users.find(u => u.id === ticket.assigneeId)?.username ?? '?'"
                  size="xs" :title="users.find(u => u.id === ticket.assigneeId)?.username" />
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Alle Planner ─────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'alle-planner'" class="space-y-6">
      <div class="flex items-center justify-between gap-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">Planner anlegen, Zugänge und Teams verwalten.</p>
        <button @click="paShowCreateModal = true" class="btn-primary shrink-0">+ Neuer Planner</button>
      </div>

      <SearchInput v-model="paSearch" placeholder="Planner suchen..." />

      <div v-if="plannersStore.loading" class="py-8 text-center text-gray-400 text-sm">Lade…</div>
      <div v-else-if="!paFiltered.length" class="py-12 text-center text-sm text-gray-400">Keine Planner vorhanden</div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div v-for="planner in paFiltered" :key="planner.id" class="card flex flex-col gap-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-primary-light dark:bg-primary-active/40 text-primary-hover dark:text-primary-dark-hover">
                  {{ planner.ticketPrefix ?? 'TKT' }}
                </span>
                <h2 class="font-semibold text-gray-900 dark:text-white truncate">{{ planner.name }}</h2>
                <span v-if="planner.createdBy === authStore.user?.id"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  Mein Planner
                </span>
                <span v-else-if="paUserRole(planner)"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                  :class="{
                    'bg-primary/10 text-primary dark:bg-primary-dark/10 dark:text-primary-dark': paUserRole(planner) === 'admin',
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': paUserRole(planner) === 'owner',
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300': paUserRole(planner) === 'user',
                  }">
                  {{ PA_ROLE_LABELS[paUserRole(planner)] ?? paUserRole(planner) }}
                </span>
              </div>
              <p v-if="planner.description" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{{ planner.description }}</p>
              <p class="text-xs text-gray-400 mt-0.5">
                Erstellt von:
                <span class="font-medium text-gray-600 dark:text-gray-300">{{ paUserName(planner.createdBy) }}</span>
              </p>
            </div>
            <div v-if="paUserCanManage(planner)" class="flex gap-2 shrink-0">
              <button @click="paOpenDetail(planner)"
                class="text-xs px-2.5 py-1 rounded-lg border border-primary-dark-hover dark:border-primary-hover text-primary dark:text-primary-dark hover:bg-primary-light dark:hover:bg-primary-active/20 transition-colors">
                Verwalten
              </button>
              <button @click="paDeletePlanner(planner)"
                class="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                Löschen
              </button>
            </div>
          </div>

          <div class="flex gap-3 text-xs text-gray-400">
            <span>{{ planner.members?.length ?? 0 }} Mitglieder</span>
            <span>·</span>
            <span>{{ planner.teamCount ?? 0 }} Teams</span>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            <UserAvatar v-for="m in (planner.members ?? []).slice(0, 8)" :key="m.userId"
              :username="paUserName(m.userId)" size="xs" :title="`${paUserName(m.userId)} (${PA_ROLE_LABELS[m.role] ?? m.role})`" />
            <span v-if="(planner.members?.length ?? 0) > 8" class="text-xs text-gray-400">
              +{{ planner.members.length - 8 }}
            </span>
            <span v-if="!(planner.members?.length)" class="text-xs text-gray-400 italic">Keine Mitglieder</span>
          </div>
        </div>
      </div>

      <!-- ── Erstell-Modal ──────────────────────────────────────────────── -->
      <BaseModal v-if="paShowCreateModal" title="Neuer Planner" @close="paShowCreateModal = false">
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span class="text-red-500">*</span></label>
            <input v-model="paCreateForm.name" type="text" class="input-field" placeholder="z. B. Entwicklungs-Planner" autofocus @input="paAutoPrefix" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
            <textarea v-model="paCreateForm.description" rows="2" class="input-field resize-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket-Präfix</label>
            <input v-model="paCreateForm.ticketPrefix" type="text" maxlength="5" class="input-field uppercase" placeholder="z. B. DEV"
              @input="paCreateForm.ticketPrefix = paCreateForm.ticketPrefix.toUpperCase()" />
            <p class="text-xs text-gray-400 mt-1">Präfix für Ticket-IDs (z. B. DEV-123)</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Farbe</label>
            <div class="flex flex-wrap gap-2">
              <button v-for="c in paCreateColors" :key="c" type="button"
                @click="paCreateForm.color = c"
                class="w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center"
                :class="paCreateForm.color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'"
                :style="{ backgroundColor: c }">
                <svg v-if="paCreateForm.color === c" class="w-3.5 h-3.5 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button @click="paShowCreateModal = false" class="btn-secondary">Abbrechen</button>
          <button @click="paSaveCreate" :disabled="!paCreateForm.name.trim()" class="btn-primary">Erstellen</button>
        </div>
      </BaseModal>

      <!-- ── Detail-Modal ───────────────────────────────────────────────── -->
      <BaseModal v-if="paDetailPlanner" :title="`${paDetailPlanner.name} — Verwaltung`" size="xl" @close="paCloseDetail">

        <div class="flex border-b border-gray-200 dark:border-gray-700 px-6 pt-1 gap-1 overflow-x-auto">
          <button v-for="tab in [
              { id: 'info',       label: 'Info' },
              { id: 'members',    label: 'Mitglieder', count: paDetailPlanner.members?.length },
              { id: 'teams',      label: 'Teams',      count: paDetailPlanner.teamCount ?? 0 },
              { id: 'settings',   label: 'Einstellungen' },
            ]" :key="tab.id"
            @click="paActiveTab = tab.id"
            class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors"
            :class="paActiveTab === tab.id
              ? 'border-primary text-primary dark:border-primary-dark dark:text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'">
            {{ tab.label }}
            <span v-if="tab.count !== undefined"
              class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-1.5 py-0.5">
              {{ tab.count }}
            </span>
          </button>
        </div>

        <!-- ── Tab: Info ────────────────────────────────────────────────── -->
        <div v-if="paActiveTab === 'info'" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input v-model="paInfoForm.name" type="text" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
            <textarea v-model="paInfoForm.description" rows="3" class="input-field resize-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Farbe</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="c in paInfoColors" :key="c"
                type="button"
                @click="paInfoForm.color = c"
                class="w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center"
                :class="paInfoForm.color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'"
                :style="{ backgroundColor: c }"
              >
                <svg v-if="paInfoForm.color === c" class="w-3.5 h-3.5 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="flex justify-end">
            <button @click="paSaveInfo" :disabled="!paInfoForm.name.trim()" class="btn-primary">Speichern</button>
          </div>
        </div>

        <!-- ── Tab: Mitglieder ──────────────────────────────────────────── -->
        <div v-if="paActiveTab === 'members'" class="p-6 space-y-4">
          <!-- Mitglied hinzufügen — nur für Planner-Admins -->
          <div v-if="paCanManageRoles" class="flex gap-2 flex-wrap items-end">
            <div class="flex-1 min-w-40">
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Benutzer</label>
              <select v-model="paNewMember.userId" class="input-field">
                <option value="">-- Benutzer wählen --</option>
                <option v-for="u in paAvailableUsersToAdd" :key="u.id" :value="u.id">
                  {{ u.username }} ({{ u.email }})
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rolle</label>
              <select v-model="paNewMember.role" class="input-field w-44">
                <option v-for="r in PLANNER_MEMBER_ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
            <button @click="paAddMember" :disabled="!paNewMember.userId" class="btn-primary">Hinzufügen</button>
          </div>

          <div class="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
            <div v-if="!paPlannerMembers.length" class="px-4 py-6 text-sm text-gray-400 text-center italic">
              Keine Mitglieder
            </div>
            <div v-for="m in paPlannerMembers" :key="m.userId"
              class="flex items-center gap-3 px-4 py-3">
              <UserAvatar :username="paUserName(m.userId)" size="sm" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ paUserName(m.userId) }}</p>
                <p class="text-xs text-gray-400">
                  {{ users.find(u => u.id === m.userId)?.email ?? '' }}
                </p>
              </div>

              <!-- Rolle ändern: nur für Planner-Admins -->
              <select v-if="paCanManageRoles"
                :value="m.role" @change="paChangeMemberRole(m.userId, $event.target.value)"
                class="text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:ring-primary focus:border-primary">
                <option v-for="r in PLANNER_MEMBER_ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
              <!-- Lesend: Rolle als Badge -->
              <span v-else
                class="text-xs px-2.5 py-1 rounded-full font-medium"
                :class="{
                  'bg-primary/10 text-primary dark:bg-primary-dark/10 dark:text-primary-dark': m.role === 'admin',
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': m.role === 'owner',
                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300': m.role === 'user' || m.role === 'member',
                }">
                {{ PA_ROLE_LABELS[m.role] ?? m.role }}
              </span>

              <!-- Entfernen: nur für Planner-Admins -->
              <button v-if="paCanManageRoles"
                @click="paRemoveMember(m.userId)"
                class="text-red-400 hover:text-red-600 transition-colors p-1 rounded">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- ── Tab: Teams ───────────────────────────────────────────────── -->
        <div v-if="paActiveTab === 'teams'" class="p-6 space-y-4">

          <details class="rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
            <summary class="px-4 py-3 text-sm font-medium text-primary dark:text-primary-dark cursor-pointer select-none hover:bg-primary-light dark:hover:bg-primary-active/10 rounded-lg">
              + Neues Team erstellen
            </summary>
            <div class="px-4 pb-4 pt-2 space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Team-Name *</label>
                <input v-model="paNewTeamForm.name" type="text" class="input-field" placeholder="z. B. Backend-Team" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Beschreibung</label>
                <input v-model="paNewTeamForm.description" type="text" class="input-field" />
              </div>
              <button @click="paCreateTeam" :disabled="!paNewTeamForm.name.trim()" class="btn-primary text-sm">Team erstellen</button>
            </div>
          </details>

          <div v-if="paPlannerTeams.length" class="space-y-2">
            <div v-for="team in paPlannerTeams" :key="team.id"
              class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

              <div class="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                <button @click="paExpandedTeamId = paExpandedTeamId === team.id ? null : team.id"
                  class="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                  <svg class="w-4 h-4 transition-transform" :class="paExpandedTeamId === team.id ? 'rotate-90' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <div class="flex-1 min-w-0">
                  <template v-if="paEditingTeam === team.id">
                    <div class="flex gap-2">
                      <input v-model="paEditTeamForm.name" class="input-field text-sm py-1 flex-1" @keyup.enter="paSaveEditTeam(team.id)" />
                      <input v-model="paEditTeamForm.description" class="input-field text-sm py-1 flex-1" placeholder="Beschreibung" />
                    </div>
                  </template>
                  <template v-else>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ team.name }}</p>
                    <p v-if="team.description" class="text-xs text-gray-400 truncate">{{ team.description }}</p>
                  </template>
                </div>
                <div class="flex gap-1.5 shrink-0">
                  <template v-if="paEditingTeam === team.id">
                    <button @click="paSaveEditTeam(team.id)" class="text-xs text-green-600 hover:underline">Speichern</button>
                    <button @click="paEditingTeam = null" class="text-xs text-gray-400 hover:underline">Abbrechen</button>
                  </template>
                  <template v-else>
                    <button @click="paStartEditTeam(team)" class="text-xs text-primary dark:text-primary-dark hover:underline">Bearbeiten</button>
                    <button @click="paDeleteTeam(team.id)" class="text-xs text-red-500 hover:underline">Löschen</button>
                  </template>
                </div>
              </div>

              <div v-if="paExpandedTeamId === team.id" class="px-4 pb-3 pt-2 space-y-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <div v-for="m in (team.members ?? [])" :key="m.userId"
                    class="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">
                    <UserAvatar :username="paUserName(m.userId)" size="xs" />
                    <span class="text-gray-700 dark:text-gray-300">{{ paUserName(m.userId) }}</span>
                    <span class="text-gray-400">· {{ m.role === 'owner' ? 'Owner' : 'Mitglied' }}</span>
                    <button @click="paRemoveTeamMember(team.id, m.userId)"
                      class="text-red-400 hover:text-red-600 ml-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  <span v-if="!(team.members?.length)" class="text-xs text-gray-400 italic">Keine Mitglieder</span>
                </div>

                <div v-if="paAddMemberTeamId === team.id" class="flex gap-2 flex-wrap items-end pt-1">
                  <select v-model="paNewTeamMember.userId" class="input-field text-sm flex-1 min-w-36">
                    <option value="">-- Benutzer wählen --</option>
                    <option v-for="u in paUsersNotInTeam(team)" :key="u.id" :value="u.id">{{ u.username }}</option>
                  </select>
                  <select v-model="paNewTeamMember.role" class="input-field text-sm w-32">
                    <option value="member">Mitglied</option>
                    <option value="owner">Owner</option>
                  </select>
                  <button @click="paAddTeamMember(team.id)" :disabled="!paNewTeamMember.userId" class="btn-primary text-sm py-1.5">Hinzufügen</button>
                  <button @click="paAddMemberTeamId = null; paNewTeamMember.userId = ''" class="btn-secondary text-sm py-1.5">Abbrechen</button>
                </div>
                <button v-else @click="paAddMemberTeamId = team.id; paNewTeamMember.userId = ''; paNewTeamMember.role = 'user'"
                  class="text-xs text-primary dark:text-primary-dark hover:underline">
                  + Mitglied hinzufügen
                </button>
              </div>
            </div>
          </div>

          <div v-else-if="!teamsStore.loading" class="py-8 text-center text-sm text-gray-400 italic">
            Noch keine Teams in diesem Planner
          </div>
          <div v-else class="py-4 text-center text-sm text-gray-400">Lade Teams…</div>
        </div>

        <!-- ── Tab: Einstellungen ────────────────────────────────────────── -->
        <div v-if="paActiveTab === 'settings'" class="p-6 space-y-6">
          <div class="max-w-sm">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket-Präfix</label>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Präfix für neue Ticket-Nummern in diesem Planner, z. B. <code class="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">ENT</code> → <code class="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">ENT-0042</code>
            </p>
            <div class="flex gap-2">
              <input v-model="paTicketPrefixInput" type="text" maxlength="8"
                class="input-field w-32 font-mono uppercase"
                placeholder="TKT"
                @input="paTicketPrefixInput = paTicketPrefixInput.toUpperCase().replace(/[^A-Z0-9]/g, '')" />
              <button @click="paSaveSettings" class="btn-primary">Speichern</button>
            </div>
            <p class="text-xs text-gray-400 mt-1.5">
              Aktueller Zähler: <span class="font-mono">{{ paDetailPlanner.ticketCounter ?? 1 }}</span>
            </p>
          </div>
        </div>

        <div class="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button @click="paCloseDetail" class="btn-secondary">Schließen</button>
        </div>
      </BaseModal>
    </div>

    <!-- ── Planner-Zugang ─────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'planner'">
      <div v-if="!activePlanner" class="py-12 text-center text-sm text-gray-400">
        Kein Planner ausgewählt.
      </div>
      <div v-else class="space-y-6">
        <!-- Planner-Info -->
        <div class="flex items-center gap-3 p-4 rounded-xl bg-primary-light dark:bg-primary-active/20 border border-primary-light dark:border-primary-active">
          <span class="font-mono text-sm font-semibold text-primary-hover dark:text-primary-dark-hover bg-primary-light dark:bg-primary-active/40 px-2 py-0.5 rounded">
            {{ activePlanner.ticketPrefix ?? 'TKT' }}
          </span>
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">{{ activePlanner.name }}</p>
            <p v-if="activePlanner.description" class="text-xs text-gray-500 dark:text-gray-400">{{ activePlanner.description }}</p>
          </div>
          <span class="ml-auto text-xs text-primary dark:text-primary-dark">{{ plannerMembers.length }} Mitglieder</span>
        </div>

        <!-- Mitglied hinzufügen — nur für Planner-Admins -->
        <div v-if="canManageActivePlannerRoles" class="flex flex-wrap gap-2 items-end">
          <div class="flex-1 min-w-48">
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Benutzer hinzufügen</label>
            <select v-model="newPlannerMember.userId" class="input-field">
              <option value="">-- Benutzer wählen --</option>
              <option v-for="u in usersNotInPlanner" :key="u.id" :value="u.id">
                {{ u.username }} ({{ u.email }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rolle</label>
            <select v-model="newPlannerMember.role" class="input-field w-44">
              <option v-for="r in PLANNER_MEMBER_ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
          <button @click="addPlannerMember" :disabled="!newPlannerMember.userId" class="btn-primary">
            Hinzufügen
          </button>
        </div>

        <!-- Mitgliederliste -->
        <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-700/50">
              <tr class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th class="px-4 py-3">Benutzer</th>
                <th class="px-4 py-3">E-Mail</th>
                <th class="px-4 py-3">System-Rolle</th>
                <th class="px-4 py-3">Planner-Rolle</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-if="!plannerMembers.length">
                <td colspan="5" class="px-4 py-8 text-center text-sm text-gray-400 italic">Keine Mitglieder</td>
              </tr>
              <tr v-for="m in plannerMembers" :key="m.userId"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <img :src="generateAvatar(plannerUserName(m.userId))"
                      class="w-7 h-7 rounded-full bg-gray-200" alt="" />
                    <span class="text-sm font-medium text-gray-900 dark:text-white">{{ plannerUserName(m.userId) }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{{ plannerUserEmail(m.userId) }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="ROLE_COLORS[users.find(u => u.id === m.userId)?.role] || ROLE_COLORS.user">
                    {{ users.find(u => u.id === m.userId)?.role ?? '–' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <select v-if="canManageActivePlannerRoles"
                    :value="m.role" @change="changePlannerRole(m.userId, $event.target.value)"
                    class="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option v-for="r in PLANNER_MEMBER_ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
                  </select>
                  <span v-else
                    class="text-xs px-2.5 py-1 rounded-full font-medium"
                    :class="{
                      'bg-primary/10 text-primary dark:bg-primary-dark/10 dark:text-primary-dark': m.role === 'admin',
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': m.role === 'owner',
                      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300': m.role === 'user' || m.role === 'member',
                    }">
                    {{ PA_ROLE_LABELS[m.role] ?? m.role }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button v-if="canManageActivePlannerRoles"
                    @click="removePlannerMember(m.userId)"
                    class="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors">
                    Entfernen
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── Benutzer ─────────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'users'">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Weise Benutzern Rollen zu.
        <strong>Admin</strong> hat Vollzugriff,
        <strong>Owner</strong> kann Teams und Projekte verwalten,
        <strong>Benutzer</strong> hat Standardzugriff.
      </p>
      <SearchInput v-model="userSearch" placeholder="Benutzer oder E-Mail suchen..." class="mb-4 max-w-sm" />
      <p v-if="loadingUsers" class="text-gray-400 text-sm">Lade Benutzer…</p>
      <p v-else-if="!filteredUsers.length" class="py-8 text-center text-sm text-gray-400 italic">Keine Benutzer gefunden</p>
      <div v-else class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-3">Benutzer</th>
              <th class="px-4 py-3">E-Mail</th>
              <th class="px-4 py-3">Aktuelle Rolle</th>
              <th class="px-4 py-3">Rolle ändern</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <img :src="generateAvatar(u.username)"
                    class="w-7 h-7 rounded-full bg-gray-200" alt="" />
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ u.username }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{{ u.email }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="ROLE_COLORS[u.role] || ROLE_COLORS.user">
                  {{ u.role }}
                </span>
              </td>
              <td class="px-4 py-3">
                <select :value="u.role" @change="changeRole(u, $event.target.value)"
                  class="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary">
                  <option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4 grid grid-cols-3 gap-3">
        <div v-for="r in ROLE_OPTIONS" :key="r.value"
          class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-1" :class="ROLE_COLORS[r.value]">{{ r.label }}</span>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ r.desc }}</p>
        </div>
      </div>
    </div>

    <!-- ── Teams ────────────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'teams'">
      <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p class="text-sm text-gray-500 dark:text-gray-400">Teams erstellen, bearbeiten und löschen.</p>
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Planner</label>
          <select v-model="teamsFilterPlannerId" class="input-field text-sm py-1.5 w-56">
            <option value="all">Alle Planner</option>
            <option v-for="p in teamsFilterPlannerOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <button v-if="canCreateTeamForCurrentFilter" @click="openCreateTeam"
            class="px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shrink-0">
            + Team erstellen
          </button>
        </div>
      </div>
      <p v-if="teamsStore.loading" class="text-gray-400 text-sm">Lade Teams…</p>
      <p v-else-if="!teamsStore.teams.length" class="text-gray-400 text-sm">Keine Teams vorhanden.</p>
      <ul v-else class="space-y-3">
        <li v-for="team in teamsStore.teams" :key="team.id"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-medium text-gray-900 dark:text-white">{{ team.name }}</p>
              <span v-if="teamsFilterPlannerId === 'all'"
                class="text-xs px-1.5 py-0.5 rounded bg-primary-light dark:bg-primary-active/30 text-primary dark:text-primary-dark">
                {{ plannerName(team.plannerId) }}
              </span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ team.description || '' }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ team.members?.length ?? 0 }} Mitglieder</p>
          </div>
          <div v-if="canManageTeam(team)" class="flex gap-2 shrink-0">
            <button @click="openEditTeam(team)" class="text-sm text-primary dark:text-primary-dark hover:text-primary-active font-medium">Bearbeiten</button>
            <button @click="deleteTeam(team.id)" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 font-medium">Löschen</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- ── Boards ───────────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'boards'">
      <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p class="text-sm text-gray-500 dark:text-gray-400">Boards erstellen, bearbeiten und löschen.</p>
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Planner</label>
          <select v-model="boardsFilterPlannerId" class="input-field text-sm py-1.5 w-56">
            <option value="all">Alle Planner</option>
            <option v-for="p in boardsFilterPlannerOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <button v-if="canCreateBoardForCurrentFilter" @click="openCreateBoard"
            class="px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shrink-0">
            + Board erstellen
          </button>
        </div>
      </div>
      <p v-if="boardsStore.loading" class="text-gray-400 text-sm">Lade Boards…</p>
      <p v-else-if="!boardsStore.boards.length" class="text-gray-400 text-sm">Keine Boards vorhanden.</p>
      <ul v-else class="space-y-3">
        <li v-for="board in boardsStore.boards" :key="board.id"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-medium text-gray-900 dark:text-white">{{ board.name }}</p>
              <span v-if="boardsFilterPlannerId === 'all'"
                class="text-xs px-1.5 py-0.5 rounded bg-primary-light dark:bg-primary-active/20 text-primary dark:text-primary-dark">
                {{ plannerName(board.plannerId) }}
              </span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ board.description }}</p>
            <p v-if="board.startDate || board.endDate" class="text-xs text-gray-400 mt-0.5">
              {{ board.startDate?.substring(0, 10) }} – {{ board.endDate?.substring(0, 10) }}
            </p>
          </div>
          <div v-if="canManageBoard(board)" class="flex gap-2 shrink-0">
            <button @click="openEditBoard(board)" class="text-sm text-primary dark:text-primary-dark hover:text-primary-active font-medium">Bearbeiten</button>
            <button @click="deleteBoard(board.id)" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 font-medium">Löschen</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- ── Einstellungen ────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'settings'" class="space-y-6 max-w-2xl">

      <!-- Planner-Präfixe -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
        <div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Ticket-Präfix je Planner</h2>
          <p class="text-xs text-gray-400 mt-0.5">Jeder Planner hat eine eigene Ticket-Nummerierung. Der Zähler läuft unabhängig.</p>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div v-if="!plannersStore.allPlanners.length" class="px-4 py-4 text-sm text-gray-400 italic text-center">
            Keine Planner vorhanden
          </div>
          <div v-for="planner in plannersStore.allPlanners" :key="planner.id"
            class="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ planner.name }}</p>
              <p class="text-xs text-gray-400 mt-0.5">
                Zählerstand: <span class="font-mono">{{ planner.ticketCounter ?? 1 }}</span>
                · Nächste Nr.: <span class="font-mono text-primary">{{ (plannerPrefixEdits[planner.id] || planner.ticketPrefix || 'TKT').toUpperCase().replace(/[^A-Z0-9]/g,'') }}-{{ String(planner.ticketCounter ?? 1).padStart(4, '0') }}</span>
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <input
                :value="plannerPrefixEdits[planner.id] ?? planner.ticketPrefix ?? 'TKT'"
                @input="plannerPrefixEdits[planner.id] = $event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')"
                type="text" maxlength="8"
                class="input-field w-24 font-mono uppercase text-center py-1.5 text-sm"
                placeholder="TKT"
                @keyup.enter="savePlannerPrefix(planner.id)"
              />
              <button
                @click="savePlannerPrefix(planner.id)"
                :disabled="savingPlannerPrefixId === planner.id"
                class="btn-primary text-sm py-1.5 px-3 shrink-0">
                {{ savingPlannerPrefixId === planner.id ? '…' : 'Setzen' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Globaler Fallback -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-5">
        <div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Globaler Fallback</h2>
          <p class="text-xs text-gray-400 mt-0.5">Wird verwendet, wenn ein Ticket keinem Planner zugeordnet ist.</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Präfix <span class="text-xs text-gray-400 ml-1">(max. 10 Zeichen)</span>
          </label>
          <div class="flex gap-2">
            <input v-model="prefixInput" type="text" maxlength="10" placeholder="z. B. TKT, FEED, PROJ"
              class="input-field flex-1 uppercase" style="text-transform:uppercase" />
            <button @click="savePrefix" :disabled="savingPrefix || !prefixInput" class="btn-primary shrink-0">
              {{ savingPrefix ? 'Speichern…' : 'Setzen' }}
            </button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nächster Zähler
          </label>
          <div class="flex gap-2">
            <input v-model.number="counterInput" type="number" min="1" class="input-field flex-1" />
            <button @click="saveCounter" :disabled="savingCounter || !counterInput" class="btn-primary shrink-0">
              {{ savingCounter ? 'Speichern…' : 'Setzen' }}
            </button>
          </div>
        </div>
        <div class="pt-2 border-t border-gray-100 dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Vorschau nächste Ticketnummer</p>
          <span class="inline-block font-mono text-lg font-bold text-primary dark:text-primary-dark bg-primary-light dark:bg-primary-active/20 px-3 py-1 rounded-lg">
            {{ ticketSettings ? ticketSettings.nextTicketNumber : previewNumber(prefixInput, counterInput) }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Team-Modal -->
  <Teleport to="body">
    <div v-if="showTeamModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="showTeamModal = false" />
      <div class="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ editingTeam ? 'Team bearbeiten' : 'Neues Team' }}
          </h2>
          <button @click="showTeamModal = false" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Name *</label>
            <input v-model="teamForm.name" type="text" class="input-field" placeholder="Team-Name…" @keyup.enter="saveTeam" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Beschreibung</label>
            <textarea v-model="teamForm.description" rows="2" class="input-field resize-none" placeholder="Optionale Beschreibung…" />
          </div>
        </div>
        <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button @click="showTeamModal = false" class="btn-secondary">Abbrechen</button>
          <button @click="saveTeam" :disabled="!teamForm.name.trim()" class="btn-primary">
            {{ editingTeam ? 'Speichern' : 'Erstellen' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Support Ticket Slide-Over -->
  <Teleport to="body">
    <div v-if="showTicketSlideOver" class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-black/40" @click="closeTicketSlideOver" />
      <div class="relative w-full md:w-[560px] bg-gray-900 border-l border-gray-700 flex flex-col h-full shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <div class="min-w-0 flex-1">
            <span class="font-mono text-xs text-primary-dark font-medium">{{ selectedTicket?.ticketNumber }}</span>
            <h2 class="text-sm font-semibold text-white mt-0.5 truncate">{{ selectedTicket?.title }}</h2>
          </div>
          <button @click="closeTicketSlideOver" class="text-gray-400 hover:text-white text-2xl leading-none ml-4 shrink-0">&times;</button>
        </div>

        <!-- Body -->
        <div v-if="selectedTicket" class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Einreicher & Originalnachricht -->
          <div class="bg-gray-800 rounded-xl p-4 space-y-2">
            <div class="flex items-center gap-2">
              <UserAvatar :username="users.find(u => u.id === selectedTicket.createdBy)?.username ?? '?'" size="sm" />
              <div>
                <p class="text-sm text-white font-medium">{{ users.find(u => u.id === selectedTicket.createdBy)?.username ?? 'Unbekannt' }}</p>
                <p class="text-xs text-gray-400">{{ users.find(u => u.id === selectedTicket.createdBy)?.email ?? '' }}</p>
              </div>
            </div>
            <p class="text-xs text-gray-400">Eingereicht: {{ formatDate(selectedTicket.createdAt) }}</p>
            <p v-if="selectedTicket.description" class="text-sm text-gray-300 whitespace-pre-wrap mt-2 pt-2 border-t border-gray-700">{{ selectedTicket.description }}</p>
          </div>

          <!-- Bearbeitungsfelder -->
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Status</label>
              <select v-model="ticketEditForm.status" class="input-field">
                <option v-for="(s, key) in TICKET_STATUS_LABELS" :key="key" :value="key">{{ s.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Zugewiesen an</label>
              <select v-model="ticketEditForm.assigneeId" class="input-field">
                <option :value="null">— Nicht zugewiesen —</option>
                <option v-for="u in supportPlannerAdmins" :key="u.id" :value="u.id">{{ u.username }}</option>
              </select>
            </div>
            <div v-if="supportProjects.length">
              <label class="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Projekt</label>
              <select v-model="ticketEditForm.projectId" class="input-field">
                <option :value="null">— Kein Projekt —</option>
                <option v-for="p in supportProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Sprint</label>
              <select v-model="ticketEditForm.sprintId" class="input-field">
                <option :value="null">— Kein Sprint —</option>
                <option v-for="s in supportSprints" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
          </div>

          <!-- Anhänge -->
          <div v-if="selectedTicket.attachments?.length">
            <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              Anhänge ({{ selectedTicket.attachments.length }})
            </h3>
            <div class="space-y-2">
              <template v-for="att in selectedTicket.attachments" :key="att.id">
                <div v-if="isImageMime(att.mimeType)" class="flex items-center gap-3">
                  <img
                    :src="`http://localhost:3000${att.url}`"
                    class="w-16 h-16 object-cover rounded-lg border border-gray-700 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                    :alt="att.originalName"
                    @click="lightboxUrl = `http://localhost:3000${att.url}`"
                  />
                  <div class="min-w-0">
                    <p class="text-sm text-gray-300 truncate">{{ att.originalName }}</p>
                    <p class="text-xs text-gray-500">{{ formatFileSize(att.size) }}</p>
                  </div>
                </div>
                <a v-else
                  :href="`http://localhost:3000${att.url}`"
                  target="_blank"
                  class="flex items-center gap-3 p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group"
                >
                  <div class="w-8 h-8 rounded bg-gray-700 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-primary-dark group-hover:underline truncate">{{ att.originalName }}</p>
                    <p class="text-xs text-gray-500">{{ formatFileSize(att.size) }}</p>
                  </div>
                  <svg class="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </template>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="shrink-0 px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button @click="closeTicketSlideOver" class="btn-secondary">Schließen</button>
          <button @click="saveSupportTicket" :disabled="savingTicket" class="btn-primary">
            {{ savingTicket ? 'Speichern…' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Lightbox -->
  <Teleport to="body">
    <div v-if="lightboxUrl" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
      @click="lightboxUrl = null">
      <img :src="lightboxUrl" class="max-w-full max-h-full object-contain p-4" alt="" @click.stop />
      <button @click="lightboxUrl = null"
        class="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300">&times;</button>
    </div>
  </Teleport>

  <!-- Board-Modal -->
  <Teleport to="body">
    <div v-if="showBoardModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="showBoardModal = false" />
      <div class="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ editingBoard ? 'Board bearbeiten' : 'Neues Board' }}
          </h2>
          <button @click="showBoardModal = false" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Name *</label>
            <input v-model="boardForm.name" type="text" class="input-field" placeholder="Board-Name…" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Beschreibung</label>
            <textarea v-model="boardForm.description" rows="2" class="input-field resize-none" placeholder="Optionale Beschreibung…" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Planner</label>
            <select v-model="boardForm.plannerId" class="input-field">
              <option value="">— Kein Planner —</option>
              <option v-for="p in plannersStore.allPlanners" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Startdatum</label>
              <input v-model="boardForm.startDate" type="date" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Enddatum</label>
              <input v-model="boardForm.endDate" type="date" class="input-field" />
            </div>
          </div>
        </div>
        <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button @click="showBoardModal = false" class="btn-secondary">Abbrechen</button>
          <button @click="saveBoard" :disabled="!boardForm.name.trim()" class="btn-primary">
            {{ editingBoard ? 'Speichern' : 'Erstellen' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
