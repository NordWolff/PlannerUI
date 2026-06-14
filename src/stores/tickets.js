import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useTicketsStore = defineStore('tickets', () => {
  const tickets = ref([])
  const loading = ref(false)

  async function fetchTickets(filters = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/tickets', { params: filters })
      tickets.value = data
    } finally {
      loading.value = false
    }
  }

  async function createTicket(ticketData) {
    const { data } = await api.post('/tickets', ticketData)
    tickets.value.push(data)
    return data
  }

  async function updateTicket(id, ticketData) {
    const { data } = await api.put(`/tickets/${id}`, ticketData)
    const idx = tickets.value.findIndex(t => t.id === id)
    if (idx !== -1) tickets.value[idx] = data
    return data
  }

  async function deleteTicket(id) {
    await api.delete(`/tickets/${id}`)
    tickets.value = tickets.value.filter(t => t.id !== id)
  }

  async function updateStatus(id, status) {
    const { data } = await api.put(`/tickets/${id}/status`, { status })
    const idx = tickets.value.findIndex(t => t.id === id)
    if (idx !== -1) tickets.value[idx] = data
    return data
  }

  async function toggleChecklist(ticketId, itemId) {
    const { data } = await api.put(`/tickets/${ticketId}/checklist`, { itemId })
    const idx = tickets.value.findIndex(t => t.id === ticketId)
    if (idx !== -1) tickets.value[idx] = data
    return data
  }

  async function addChecklistItem(ticketId, text) {
    const { data } = await api.post(`/tickets/${ticketId}/checklist`, { text })
    const idx = tickets.value.findIndex(t => t.id === ticketId)
    if (idx !== -1) tickets.value[idx] = data
    return data
  }

  async function fetchHistory(id) {
    const { data } = await api.get(`/tickets/${id}/history`)
    return data
  }

  async function fetchComments(ticketId) {
    const { data } = await api.get(`/tickets/${ticketId}/comments`)
    return data
  }

  async function addComment(ticketId, text) {
    const { data } = await api.post(`/tickets/${ticketId}/comments`, { text })
    return data
  }

  async function toggleReaction(ticketId, commentId, emoji) {
    const { data } = await api.post(`/tickets/${ticketId}/comments/${commentId}/reactions`, { emoji })
    return data
  }

  return { tickets, loading, fetchTickets, createTicket, updateTicket, deleteTicket, updateStatus, toggleChecklist, addChecklistItem, fetchHistory, fetchComments, addComment, toggleReaction }
})
