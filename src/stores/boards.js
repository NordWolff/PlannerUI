import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useBoardsStore = defineStore('boards', () => {
  const boards = ref([])
  const currentBoard = ref(null)
  const loading = ref(false)

  async function fetchBoards(filters = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/boards', { params: filters })
      boards.value = data
    } finally {
      loading.value = false
    }
  }

  async function createBoard(boardData) {
    const { data } = await api.post('/boards', boardData)
    boards.value.push(data)
    return data
  }

  async function updateBoard(id, boardData) {
    const { data } = await api.put(`/boards/${id}`, boardData)
    const idx = boards.value.findIndex(b => b.id === id)
    if (idx !== -1) boards.value[idx] = data
    return data
  }

  async function deleteBoard(id) {
    await api.delete(`/boards/${id}`)
    boards.value = boards.value.filter(b => b.id !== id)
  }

  function clear() { boards.value = []; currentBoard.value = null }

  return { boards, currentBoard, loading, fetchBoards, createBoard, updateBoard, deleteBoard, clear }
})
