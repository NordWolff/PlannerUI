<script setup>
import { computed } from 'vue'
import { useUsers } from '@/composables/useUsers'
import { generateAvatar } from '@/utils/avatar'

const props = defineProps({
  userId: { type: String, default: null },
  username: { type: String, default: null },
  // xs=20 sm=24 md=28 lg=32 xl=40
  size: { type: String, default: 'lg' },
  showStatus: { type: Boolean, default: true },
  // 'top-right' (default, per User-Vorgabe) | 'bottom-right' (z.B. wenn oben ein Badge sitzt)
  dotPosition: { type: String, default: 'top-right' },
})

const { getUser, getOnlineStatus } = useUsers()

const resolvedUser = computed(() => props.userId ? getUser(props.userId) : null)
const resolvedName = computed(() => resolvedUser.value?.username || props.username || '')
const avatarSrc    = computed(() => generateAvatar(resolvedName.value || 'default'))
const status       = computed(() => {
  if (!props.showStatus || !props.userId) return null
  return getOnlineStatus(props.userId)
})

const SIZE = {
  xs: { img: 'w-5 h-5',   dot: 'w-2 h-2 border' },
  sm: { img: 'w-6 h-6',   dot: 'w-2 h-2 border' },
  md: { img: 'w-7 h-7',   dot: 'w-2.5 h-2.5 border-2' },
  lg: { img: 'w-8 h-8',   dot: 'w-2.5 h-2.5 border-2' },
  xl: { img: 'w-10 h-10', dot: 'w-3 h-3 border-2' },
}

const imgClass = computed(() => SIZE[props.size]?.img ?? SIZE.lg.img)
const dotClass = computed(() => SIZE[props.size]?.dot ?? SIZE.lg.dot)

const STATUS_COLOR = {
  online:  'bg-green-400',
  offline: 'bg-red-400',
  hidden:  'bg-yellow-400',
}
</script>

<template>
  <div class="relative inline-block shrink-0">
    <img
      :src="avatarSrc"
      :class="imgClass"
      class="rounded-full bg-gray-200 dark:bg-gray-600"
      :alt="resolvedName"
      :title="resolvedName"
    />
    <!-- Status-Ampel am Avatar (Position konfigurierbar) -->
    <span
      v-if="status"
      :class="[
        dotClass,
        STATUS_COLOR[status] ?? STATUS_COLOR.offline,
        dotPosition === 'bottom-right' ? 'bottom-0 right-0' : 'top-0 right-0'
      ]"
      class="absolute rounded-full border-white dark:border-gray-800 shadow-sm"
      :title="status === 'online' ? 'Online' : status === 'hidden' ? 'Status verborgen' : 'Offline'"
    />
  </div>
</template>
