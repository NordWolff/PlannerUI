<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import TicketModal from '@/components/tickets/TicketModal.vue'

const authStore = useAuthStore()

// ─── State ───────────────────────────────────────────────────────────────────
const allUsers       = ref([])
const conversations  = ref([])   // { partnerId, partner, lastMessage }
const selectedUser   = ref(null)
const messages       = ref([])
const newMessage     = ref('')
const loadingUsers   = ref(true)
const loadingMsgs    = ref(false)
const sending        = ref(false)
const search         = ref('')
const messagesEnd    = ref(null)
const unread         = ref({})   // { [userId]: count }
const selectedTicket = ref(null)
let pollingInterval  = null

// ─── Berechnete Listen ────────────────────────────────────────────────────────
const otherUsers = computed(() =>
  allUsers.value.filter((u) => u.id !== authStore.user?.id)
)

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase()
  const users = otherUsers.value.filter((u) =>
    !q || u.username.toLowerCase().includes(q)
  )
  // Benutzer mit Konversation zuerst (nach letzter Nachricht sortiert), dann alphabetisch
  const convMap = Object.fromEntries(conversations.value.map((c) => [c.partnerId, c]))
  return [...users].sort((a, b) => {
    const ca = convMap[a.id]
    const cb = convMap[b.id]
    if (ca && cb) return cb.lastMessage?.createdAt?.localeCompare(ca.lastMessage?.createdAt) || 0
    if (ca) return -1
    if (cb) return 1
    return a.username.localeCompare(b.username)
  })
})

function lastMsg(userId) {
  return conversations.value.find((c) => c.partnerId === userId)?.lastMessage || null
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function avatarUrl(username) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username || '?')}`
}

function isOwn(msg) {
  return msg.authorId === authStore.user?.id
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatText(text, ticketRefs = []) {
  const refMap = Object.fromEntries((ticketRefs || []).map((r) => [r.ticketNumber, r]))
  return escapeHtml(text)
    .replace(/@(\w+)/g, '<strong class="text-indigo-300">@$1</strong>')
    .replace(/#([A-Z]+-\d+)/g, (match, num) => {
      const ref = refMap[num]
      if (ref) {
        return `<span data-ticket-id="${ref.ticketId}" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition-colors" title="${escapeHtml(ref.title)}">#${num}</span>`
      }
      return `<span class="font-mono text-xs text-gray-400 dark:text-gray-500">#${num}</span>`
    })
}

async function onMessageClick(e) {
  const el = e.target.closest('[data-ticket-id]')
  if (!el) return
  const ticketId = el.dataset.ticketId
  try {
    const { data } = await api.get(`/tickets/${ticketId}`)
    selectedTicket.value = data
  } catch { /* Ticket nicht gefunden */ }
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 86400000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function formatTimeFull(iso) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

async function scrollBottom() {
  await nextTick()
  messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
}

// ─── Laden ────────────────────────────────────────────────────────────────────
async function loadUsers() {
  try {
    const { data } = await api.get('/users')
    allUsers.value = data
  } finally {
    loadingUsers.value = false
  }
}

async function loadConversations() {
  try {
    const { data } = await api.get('/chat/conversations')
    conversations.value = data
  } catch { /* silent */ }
}

async function loadMessages(partnerId, silent = false) {
  if (!silent) loadingMsgs.value = true
  try {
    const { data } = await api.get('/chat/messages', { params: { partnerId } })
    const prev = messages.value.length
    messages.value = data
    if (data.length > prev) scrollBottom()
    // Unread für diesen User zurücksetzen
    unread.value[partnerId] = 0
  } catch { /* silent */ } finally {
    if (!silent) loadingMsgs.value = false
  }
}

// ─── Benutzer auswählen ───────────────────────────────────────────────────────
async function selectUser(user) {
  if (selectedUser.value?.id === user.id) return
  selectedUser.value = user
  messages.value = []
  newMessage.value = ''
  await loadMessages(user.id)
  await scrollBottom()
}

// ─── Polling ──────────────────────────────────────────────────────────────────
async function poll() {
  await loadConversations()
  if (!selectedUser.value) return

  const prevCount = messages.value.length
  await loadMessages(selectedUser.value.id, true)

  // Unread für andere Konversationen hochzählen
  conversations.value.forEach((c) => {
    if (c.partnerId !== selectedUser.value?.id && c.lastMessage && !c.lastMessage.isMine) {
      const known = messages.value.filter((m) => m.authorId === c.partnerId).length
      // Vereinfacht: Badge zeigen wenn es neuere Nachrichten gibt
    }
  })
}

// ─── Senden ───────────────────────────────────────────────────────────────────
async function send() {
  const text = newMessage.value.trim()
  if (!text || sending.value || !selectedUser.value) return
  sending.value = true
  newMessage.value = ''
  try {
    const { data } = await api.post('/chat/messages', {
      text,
      recipientId: selectedUser.value.id,
    })
    messages.value.push(data)
    // Konversationsliste aktualisieren
    const idx = conversations.value.findIndex((c) => c.partnerId === selectedUser.value.id)
    const entry = {
      partnerId: selectedUser.value.id,
      partner: { id: selectedUser.value.id, username: selectedUser.value.username },
      lastMessage: { text: data.text, createdAt: data.createdAt, isMine: true },
    }
    if (idx === -1) conversations.value.unshift(entry)
    else conversations.value[idx] = entry
    await scrollBottom()
  } catch {
    newMessage.value = text
  } finally {
    sending.value = false
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadUsers(), loadConversations()])
  pollingInterval = setInterval(poll, 5000)
})
onUnmounted(() => clearInterval(pollingInterval))
</script>

<template>
  <div class="flex gap-0 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
    style="height: calc(100vh - 7rem)">

    <!-- ── Linke Leiste: Benutzerliste ─────────────────────────────────────── -->
    <div class="w-72 shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700">

      <!-- Header -->
      <div class="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Direktnachrichten</h2>
        <div class="relative">
          <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Benutzer suchen…"
            class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- Benutzerliste -->
      <div class="flex-1 overflow-y-auto">
        <p v-if="loadingUsers" class="text-xs text-gray-400 text-center mt-6">Lade Benutzer…</p>
        <p v-else-if="!filteredUsers.length" class="text-xs text-gray-400 text-center mt-6">Keine Benutzer gefunden</p>

        <button
          v-for="user in filteredUsers"
          :key="user.id"
          @click="selectUser(user)"
          class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
          :class="selectedUser?.id === user.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-r-2 border-indigo-500' : ''"
        >
          <!-- Avatar -->
          <div class="relative shrink-0">
            <img :src="avatarUrl(user.username)" class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600" :alt="user.username" />
            <span v-if="unread[user.id]"
              class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {{ unread[user.id] > 9 ? '9+' : unread[user.id] }}
            </span>
          </div>

          <!-- Name + letzte Nachricht -->
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-1">
              <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ user.username }}</span>
              <span v-if="lastMsg(user.id)" class="text-xs text-gray-400 shrink-0">{{ formatTime(lastMsg(user.id)?.createdAt) }}</span>
            </div>
            <p v-if="lastMsg(user.id)" class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              <span v-if="lastMsg(user.id)?.isMine" class="text-gray-400">Du: </span>{{ lastMsg(user.id)?.text }}
            </p>
            <p v-else class="text-xs text-gray-400 mt-0.5 italic">Noch keine Nachrichten</p>
          </div>
        </button>
      </div>
    </div>

    <!-- ── Rechtes Panel: Chat ──────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- Kein Benutzer ausgewählt -->
      <div v-if="!selectedUser" class="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div class="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p class="text-gray-600 dark:text-gray-400 font-medium">Wähle einen Benutzer aus</p>
        <p class="text-sm text-gray-400 mt-1">Klicke links auf einen Benutzer um die Unterhaltung zu starten</p>
      </div>

      <template v-else>
        <!-- Chat-Header -->
        <div class="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <img :src="avatarUrl(selectedUser.username)" class="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600" :alt="selectedUser.username" />
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ selectedUser.username }}</p>
            <p class="text-xs text-gray-400">{{ selectedUser.email }}</p>
          </div>
        </div>

        <!-- Nachrichten -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50 dark:bg-gray-900/30" @click.capture="onMessageClick">
          <div v-if="loadingMsgs" class="flex items-center justify-center h-full text-gray-400 text-sm">
            Lade Nachrichten…
          </div>
          <p v-else-if="!messages.length" class="text-center text-gray-400 text-sm mt-10">
            Noch keine Nachrichten. Schreibe die erste!
          </p>

          <div v-for="(msg, i) in messages" :key="msg.id">
            <!-- Datum-Trenner -->
            <div v-if="i === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[i-1].createdAt).toDateString()"
              class="flex items-center gap-3 my-4">
              <hr class="flex-1 border-gray-200 dark:border-gray-700" />
              <span class="text-xs text-gray-400 shrink-0">
                {{ new Date(msg.createdAt).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) }}
              </span>
              <hr class="flex-1 border-gray-200 dark:border-gray-700" />
            </div>

            <div class="flex items-end gap-2" :class="isOwn(msg) ? 'flex-row-reverse' : 'flex-row'">
              <img
                :src="avatarUrl(isOwn(msg) ? authStore.user?.username : selectedUser.username)"
                class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0 mb-1"
                alt=""
              />
              <div class="max-w-[65%]">
                <div class="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                  :class="isOwn(msg)
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-sm shadow-sm'">
                  <span v-html="formatText(msg.text || '', msg.ticketRefs)" />
                </div>
                <p class="text-xs text-gray-400 mt-1" :class="isOwn(msg) ? 'text-right mr-1' : 'ml-1'">
                  {{ formatTimeFull(msg.createdAt) }}
                </p>
              </div>
            </div>
          </div>

          <div ref="messagesEnd" />
        </div>

        <!-- Eingabe -->
        <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div class="flex items-end gap-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 px-3 py-2">
            <textarea
              v-model="newMessage"
              rows="1"
              class="flex-1 resize-none text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-transparent focus:outline-none max-h-32 overflow-y-auto"
              :placeholder="`Nachricht an ${selectedUser.username}…`"
              @keydown="onKeydown"
            />
            <button
              @click="send"
              :disabled="!newMessage.trim() || sending"
              class="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p class="text-xs text-gray-400 mt-1.5">Enter = Senden &nbsp;·&nbsp; Shift+Enter = Neue Zeile</p>
        </div>
      </template>
    </div>
  </div>

  <TicketModal
    v-if="selectedTicket"
    :ticket="selectedTicket"
    @close="selectedTicket = null"
    @saved="selectedTicket = null"
    @deleted="selectedTicket = null"
  />
</template>
