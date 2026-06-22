import { createAvatar } from '@dicebear/core'
import * as avataaars from '@dicebear/avataaars'

export function generateAvatar(seed) {
  const svg = createAvatar(avataaars, { seed: seed || 'default' }).toString()
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function getUserAvatar(user) {
  if (!user) return generateAvatar('default')
  if (user.avatarCustomUrl) return `http://localhost:3000${user.avatarCustomUrl}`
  return generateAvatar(user.username || 'default')
}
