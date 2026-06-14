<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'

const authStore = useAuthStore()
const toast = useToast()

const messages = ref([])
const newMessage = ref('')
const loading = ref(true)
const sending = ref(false)
const messagesContainer = ref(null)
let pollingInterval = null

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatText(text) {
  return escapeHtml(text)
    .replace(/@(\w+)/g, '<strong class="text-yellow-300">@$1</strong>')
    .replace(/#(TKT-\w+)/g, '<a href="/kanban" class="underline font-medium">#$1</a>')
}

function isOwn(msg) {
  return (msg.sender?.id || msg.authorId) === authStore.user?.id
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function initials(sender) {
  return (sender?.username || '?').charAt(0).toUpperCase()
}

async function scrollBottom() {
  await nextTick()
  if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
}

async function fetchMessages() {
  try {
    const { data } = await api.get('/chat/messages')
    const prev = messages.value.length
    messages.value = data
    if (data.length > prev) scrollBottom()
  } catch {
    if (loading.value) toast.error('Chat konnte nicht geladen werden')
  } finally {
    loading.value = false
  }
}

async function send() {
  const text = newMessage.value.trim()
  if (!text || sending.value) return
  sending.value = true
  newMessage.value = ''
  try {
    const { data } = await api.post('/chat/messages', { text })
    messages.value.push(data)
    await scrollBottom()
  } catch {
    toast.error('Nachricht konnte nicht gesendet werden')
    newMessage.value = text
  } finally {
    sending.value = false
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}

onMounted(async () => {
  await fetchMessages()
  await scrollBottom()
  pollingInterval = setInterval(fetchMessages, 5000)
})
onUnmounted(() => clearInterval(pollingInterval))
</script>

<template>
  <div class="flex flex-col" style="height: calc(100vh - 7rem)">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Chat</h1>

    <div v-if="loading" class="flex-1 flex items-center justify-center text-gray-400">Lade Nachrichten...</div>

    <div v-else ref="messagesContainer" class="flex-1 overflow-y-auto space-y-3 pb-4">
      <p v-if="!messages.length" class="text-center text-gray-400 text-sm mt-10">Noch keine Nachrichten. Schreibe die erste!</p>

      <div v-for="msg in messages" :key="msg.id" class="flex items-end gap-2" :class="isOwn(msg) ? 'flex-row-reverse' : 'flex-row'">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          :class="isOwn(msg) ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-700'">
          {{ initials(msg.sender) }}
        </div>
        <div class="max-w-xs lg:max-w-md">
          <p v-if="!isOwn(msg)" class="text-xs text-gray-500 mb-1 ml-1">{{ msg.sender?.username }}</p>
          <div class="px-4 py-2 rounded-2xl text-sm"
            :class="isOwn(msg)
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-sm shadow-sm'">
            <span v-html="formatText(msg.text || '')" />
          </div>
          <p class="text-xs text-gray-400 mt-1" :class="isOwn(msg) ? 'text-right mr-1' : 'ml-1'">
            {{ formatTime(msg.createdAt) }}
          </p>
        </div>
      </div>
    </div>

    <div class="mt-3 flex items-end gap-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-2 shadow-sm">
      <textarea v-model="newMessage" rows="1"
        class="flex-1 resize-none text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-transparent focus:outline-none px-2 py-1 max-h-32 overflow-y-auto"
        placeholder="Nachricht schreiben… (@name, #TKT-001)"
        @keydown="onKeydown" />
      <button @click="send" :disabled="!newMessage.trim() || sending"
        class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0">
        Senden
      </button>
    </div>
    <p class="text-xs text-gray-400 mt-1 ml-1">Enter = Senden &nbsp;|&nbsp; Shift+Enter = Neue Zeile</p>
  </div>
</template>
