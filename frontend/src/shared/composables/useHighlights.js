// frontend/src/shared/composables/useHighlights.js
import { ref } from 'vue'
import { api } from '@/shared/utils/api'

const STORAGE_KEY = 'logos:highlights'
const highlights  = ref(loadFromStorage())
const syncing     = ref(false)

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveToStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useHighlights() {

  async function loadChapterHighlights(bookCode, chapter) {
    try {
      const { data } = await api.get(`/highlights/chapter/${bookCode}/${chapter}`)
      for (const hl of data.highlights) {
        highlights.value[hl.verseId] = { color: hl.color, id: hl.id, synced: true }
      }
      saveToStorage(highlights.value)
    } catch {}
  }

  async function applyHighlight(verseId, colorKey) {
    if (!verseId) return

    // Toggle — remove se já tem a mesma cor
    if (highlights.value[verseId]?.color === colorKey) {
      await removeHighlight(verseId)
      return
    }

    // Optimistic update — atualiza UI imediatamente
    highlights.value[verseId] = { color: colorKey, synced: false }
    saveToStorage(highlights.value)

    // Sincroniza com banco em background
    try {
      const { data } = await api.post('/highlights', {
        verseId: verseId,
        color:   colorKey,
      })
      highlights.value[verseId] = {
        color:  data.highlight.color,
        id:     data.highlight.id,
        synced: true,
      }
      saveToStorage(highlights.value)
    } catch (e) {
      console.warn('Marcação salva localmente:', e.message)
    }
  }

  async function removeHighlight(verseId) {
    const prev = highlights.value[verseId]
    delete highlights.value[verseId]
    saveToStorage(highlights.value)
    try {
      await api.delete(`/highlights/${verseId}`)
    } catch {
      if (prev) highlights.value[verseId] = prev
    }
  }

  function getHighlight(verseId) {
    return highlights.value[verseId]?.color || null
  }

  function getHighlightCount() {
    return Object.keys(highlights.value).length
  }

  return {
    highlights,
    syncing,
    loadChapterHighlights,
    applyHighlight,
    removeHighlight,
    getHighlight,
    getHighlightCount,
  }
}
