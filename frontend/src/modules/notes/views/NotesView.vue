<template>
  <div class="notes-page">

    <!-- Sidebar de notas -->
    <aside class="notes-sidebar">
      <div class="notes-sidebar-header">
        <div class="notes-title">📝 Notas</div>
        <button class="btn-new" @click="newNote">+ Nova</button>
        <button class="btn-export" @click="handleExport" :disabled="exporting || !notes.length">
          {{ exporting ? 'Gerando...' : '⬇ PDF' }}
        </button>
      </div>

      <!-- Busca -->
      <div class="search-box">
        <input v-model="filters.q" type="text" placeholder="Buscar notas..." @input="debouncedSearch" />
      </div>

      <!-- Tags -->
      <div class="tags-row" v-if="tags.length">
        <button class="tag-pill" :class="{ active: !filters.tag }" @click="filters.tag = ''; loadNotes()">Todas</button>
        <button v-for="tag in tags" :key="tag.id" class="tag-pill" :class="{ active: filters.tag === tag.name }"
          @click="filters.tag = tag.name; loadNotes()">{{ tag.name }} <span class="tag-count">{{ tag.noteCount
          }}</span></button>
      </div>

      <!-- Lista de notas -->
      <div class="notes-list" v-if="!loadingList">
        <div v-for="note in notes" :key="note.id" class="note-item" :class="{ active: selectedNote?.id === note.id }"
          @click="selectNote(note)">
          <div class="note-item-header">
            <span v-if="note.bookAbbr" class="note-ref">
              {{ note.bookAbbr }} {{ note.chapter }}:{{ note.verseNum }}
            </span>
            <span v-else class="note-ref free">Nota livre</span>
            <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
          </div>
          <div class="note-preview">{{ note.content }}</div>
          <div class="note-tags-row" v-if="note.tags?.length">
            <span v-for="t in note.tags.slice(0, 3)" :key="t" class="note-tag">{{ t }}</span>
          </div>
        </div>

        <div class="notes-empty" v-if="!notes.length">
          <div class="empty-icon">📝</div>
          <div>Nenhuma nota encontrada</div>
          <button class="btn-new-empty" @click="newNote">Criar primeira nota</button>
        </div>
      </div>

      <div class="notes-loading" v-else>Carregando...</div>

      <!-- Paginação -->
      <div class="pagination" v-if="pagination.hasMore">
        <button class="btn-more" @click="loadMore">Carregar mais</button>
      </div>
    </aside>

    <!-- Editor principal -->
    <main class="notes-editor" v-if="editing">

      <div class="editor-header">
        <div class="editor-meta">
          <div class="editor-verse-ref" v-if="editing.bookAbbr">
            <span class="ref-badge">{{ editing.bookAbbr }} {{ editing.chapter }}:{{ editing.verseNum }}</span>
            <span class="ref-text">{{ editing.verseText }}</span>
          </div>
          <div class="editor-verse-ref" v-else>
            <span class="ref-badge free">Nota livre</span>
          </div>
        </div>

        <div class="editor-actions">
          <button class="btn-delete" @click="deleteNote" title="Excluir nota">🗑</button>
          <button class="btn-save" @click="saveNote" :disabled="saving">
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>

      <!-- Tags do editor -->
      <div class="editor-tags">
        <div class="tags-input-row">
          <span v-for="tag in editingTags" :key="tag" class="editor-tag">
            {{ tag }}
            <button @click="removeTag(tag)">×</button>
          </span>
          <input v-model="tagInput" class="tag-input" placeholder="Adicionar tag..." @keydown.enter.prevent="addTag"
            @keydown="checkComma" />
        </div>
      </div>

      <!-- Textarea -->
      <textarea v-model="editingContent" class="note-textarea" placeholder="Escreva sua nota aqui...

Você pode anotar reflexões, perguntas, observações sobre o texto bíblico ou qualquer pensamento que queira registrar."
        @input="autoSave"></textarea>

      <div class="editor-footer">
        <span class="char-count">{{ editingContent.length }} caracteres</span>
        <span class="save-status" v-if="autoSaved">✓ Salvo automaticamente</span>
      </div>
    </main>

    <!-- Estado vazio -->
    <main class="notes-empty-main" v-else>
      <div class="empty-state">
        <div class="empty-icon-lg">📝</div>
        <div class="empty-title">Suas anotações de estudo</div>
        <div class="empty-sub">Selecione uma nota ou crie uma nova para começar</div>
        <button class="btn-new-lg" @click="newNote">+ Criar nova nota</button>
      </div>
    </main>

  </div>
</template>

<script setup>
  import { ref, reactive, onMounted } from 'vue'
  import { api } from '@/shared/utils/api'
  import { useExportPdf } from '@/shared/composables/useExportPdf'
  import { useAuthStore } from '@/modules/auth/stores/auth.store'
  const auth = useAuthStore()

  const { exporting, exportNotes } = useExportPdf()

  // Botão para Função para exportar

  async function handleExport() {
    await exportNotes(notes.value, auth.user?.name || 'Usuário')
  }
  // ── Estado ───────────────────────────────────────────────────
  const notes = ref([])
  const tags = ref([])
  const selectedNote = ref(null)
  const loadingList = ref(false)
  const saving = ref(false)
  const autoSaved = ref(false)

  // ── Editor ───────────────────────────────────────────────────
  const editing = ref(null)
  const editingContent = ref('')
  const editingTags = ref([])
  const tagInput = ref('')

  // ── Filtros ──────────────────────────────────────────────────
  const filters = reactive({ q: '', tag: '' })
  const pagination = ref({ total: 0, limit: 20, offset: 0, hasMore: false })

  // ── Auto save ────────────────────────────────────────────────
  let autoSaveTimer = null

  // ── Init ─────────────────────────────────────────────────────
  onMounted(async () => {
    await Promise.all([loadNotes(), loadTags()])
  })

  // ── Carrega notas ─────────────────────────────────────────────
  async function loadNotes(append = false) {
    loadingList.value = true
    try {
      const params = {
        limit: 20,
        offset: append ? pagination.value.offset + 20 : 0,
        ...(filters.q && { q: filters.q }),
        ...(filters.tag && { tag: filters.tag }),
      }
      const { data } = await api.get('/notes', { params })
      notes.value = append ? [...notes.value, ...data.notes] : data.notes
      pagination.value = data.pagination
    } catch {
      // Modo offline — lista vazia
      notes.value = []
    } finally {
      loadingList.value = false
    }
  }

  async function loadMore() { await loadNotes(true) }

  // ── Carrega tags ──────────────────────────────────────────────
  async function loadTags() {
    try {
      const { data } = await api.get('/notes/tags/all')
      tags.value = data.tags
    } catch { }
  }

  // ── Debounce busca ────────────────────────────────────────────
  let searchTimer = null
  function debouncedSearch() {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(loadNotes, 400)
  }

  // ── Seleciona nota ────────────────────────────────────────────
  function selectNote(note) {
    selectedNote.value = note
    editing.value = note
    editingContent.value = note.content
    editingTags.value = [...(note.tags || [])]
    autoSaved.value = false
  }

  // ── Nova nota ─────────────────────────────────────────────────
  function newNote() {
    const draft = {
      id: null, content: '', tags: [],
      bookAbbr: null, chapter: null, verseNum: null, verseText: null,
    }
    selectedNote.value = null
    editing.value = draft
    editingContent.value = ''
    editingTags.value = []
    autoSaved.value = false
  }

  // ── Salvar nota ───────────────────────────────────────────────
  async function saveNote() {
    if (!editingContent.value.trim()) return
    saving.value = true
    try {
      const payload = {
        content: editingContent.value,
        tags: editingTags.value,
        ...(editing.value?.verseId && { verseId: editing.value.verseId }),
      }

      if (editing.value?.id) {
        const { data } = await api.put(`/notes/${editing.value.id}`, payload)
        const idx = notes.value.findIndex(n => n.id === editing.value.id)
        if (idx !== -1) notes.value[idx] = { ...notes.value[idx], ...data.note }
      } else {
        const { data } = await api.post('/notes', payload)
        notes.value.unshift(data.note)
        editing.value = data.note
      }
      autoSaved.value = true
      await loadTags()
    } catch { }
    finally { saving.value = false }
  }

  // ── Auto save (3s após parar de digitar) ──────────────────────
  function autoSave() {
    clearTimeout(autoSaveTimer)
    if (!editing.value?.id) return
    autoSaveTimer = setTimeout(async () => {
      await saveNote()
      autoSaved.value = true
      setTimeout(() => autoSaved.value = false, 2000)
    }, 3000)
  }

  // ── Deletar nota ──────────────────────────────────────────────
  async function deleteNote() {
    if (!editing.value?.id) { editing.value = null; return }
    if (!confirm('Excluir esta nota?')) return
    try {
      await api.delete(`/notes/${editing.value.id}`)
      notes.value = notes.value.filter(n => n.id !== editing.value.id)
      editing.value = null
    } catch { }
  }

  // ── Tags ──────────────────────────────────────────────────────
  function addTag() {
    const t = tagInput.value.trim().toLowerCase().replace(/,/g, '')
    if (t && !editingTags.value.includes(t)) editingTags.value.push(t)
    tagInput.value = ''
  }

  function removeTag(tag) {
    editingTags.value = editingTags.value.filter(t => t !== tag)
  }

  // ── Formata data ──────────────────────────────────────────────
  function formatDate(d) {
    if (!d) return ''
    const date = new Date(d)
    const now = new Date()
    const diff = now - date
    if (diff < 60_000) return 'agora'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }
</script>

<style scoped>
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  .notes-page {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: #F9F6F0;
    font-family: 'DM Sans', sans-serif;
    color: #1C1A17;
  }

  /* ── Sidebar ─────────────────────────────────────────────── */
  .notes-sidebar {
    width: 300px;
    flex-shrink: 0;
    background: #FDFBF8;
    border-right: 1px solid rgba(28, 26, 23, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .notes-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.25rem 0.75rem;
  }

  .notes-title {
    font-family: 'Lora', serif;
    font-size: 1rem;
    font-weight: 600;
  }

  .btn-new {
    padding: 0.35rem 0.75rem;
    background: #1C1A17;
    color: #F9F6F0;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.78rem;
    transition: background 0.2s;
  }

  .btn-new:hover {
    background: #B8965A;
  }

  .search-box {
    padding: 0 1.25rem 0.75rem;
  }

  .search-box input {
    width: 100%;
    padding: 0.6rem 0.85rem;
    background: #F9F6F0;
    border: 1px solid rgba(28, 26, 23, 0.1);
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    color: #1C1A17;
    outline: none;
    transition: border-color 0.2s;
  }

  .search-box input:focus {
    border-color: #B8965A;
  }

  .search-box input::placeholder {
    color: #9C9590;
  }

  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0 1.25rem 0.75rem;
    border-bottom: 1px solid rgba(28, 26, 23, 0.06);
  }

  .tag-pill {
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    font-size: 0.68rem;
    border: 1px solid rgba(28, 26, 23, 0.12);
    background: none;
    cursor: pointer;
    color: #4A4540;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .tag-pill.active {
    background: #1C1A17;
    color: #F9F6F0;
    border-color: #1C1A17;
  }

  .tag-count {
    opacity: 0.6;
  }

  .notes-list {
    flex: 1;
    overflow-y: auto;
  }

  .note-item {
    padding: 1rem 1.25rem;
    cursor: pointer;
    border-bottom: 1px solid rgba(28, 26, 23, 0.06);
    transition: background 0.15s;
  }

  .note-item:hover {
    background: rgba(184, 150, 90, 0.06);
  }

  .note-item.active {
    background: rgba(184, 150, 90, 0.12);
  }

  .note-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.35rem;
  }

  .note-ref {
    font-size: 0.68rem;
    font-weight: 700;
    color: #B8965A;
  }

  .note-ref.free {
    color: #8A9E8C;
  }

  .note-date {
    font-size: 0.65rem;
    color: #9C9590;
  }

  .note-preview {
    font-size: 0.8rem;
    color: #4A4540;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 0.4rem;
  }

  .note-tags-row {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  .note-tag {
    font-size: 0.6rem;
    padding: 0.1rem 0.4rem;
    background: rgba(138, 158, 140, 0.15);
    color: #8A9E8C;
    border-radius: 20px;
  }

  .notes-empty {
    text-align: center;
    padding: 3rem 1.5rem;
    color: #9C9590;
    font-size: 0.85rem;
  }

  .notes-empty .empty-icon {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }

  .btn-new-empty {
    margin-top: 1rem;
    padding: 0.55rem 1.25rem;
    background: #1C1A17;
    color: #F9F6F0;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.82rem;
    transition: background 0.2s;
  }

  .btn-new-empty:hover {
    background: #B8965A;
  }

  .notes-loading {
    text-align: center;
    padding: 2rem;
    color: #9C9590;
    font-size: 0.82rem;
  }

  .pagination {
    padding: 0.75rem 1.25rem;
    border-top: 1px solid rgba(28, 26, 23, 0.06);
  }

  .btn-more {
    width: 100%;
    padding: 0.55rem;
    background: none;
    border: 1px solid rgba(28, 26, 23, 0.12);
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.78rem;
    color: #4A4540;
    transition: all 0.2s;
  }

  .btn-more:hover {
    border-color: #B8965A;
    color: #B8965A;
  }

  /* ── Editor ─────────────────────────────────────────────── */
  .notes-editor {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1.25rem 2rem;
    background: #FDFBF8;
    border-bottom: 1px solid rgba(28, 26, 23, 0.08);
  }

  .editor-verse-ref {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .ref-badge {
    font-size: 0.72rem;
    font-weight: 700;
    color: #B8965A;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ref-badge.free {
    color: #8A9E8C;
  }

  .ref-text {
    font-family: 'Lora', serif;
    font-size: 0.85rem;
    font-style: italic;
    color: #4A4540;
    max-width: 500px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .editor-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
    margin-left: 1rem;
  }

  .btn-delete {
    padding: 0.5rem 0.75rem;
    background: none;
    border: 1px solid rgba(196, 122, 122, 0.3);
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    color: #C47A7A;
    transition: all 0.2s;
  }

  .btn-delete:hover {
    background: rgba(196, 122, 122, 0.08);
  }

  .btn-save {
    padding: 0.5rem 1.25rem;
    background: #1C1A17;
    color: #F9F6F0;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-save:hover:not(:disabled) {
    background: #B8965A;
  }

  .btn-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Tags editor */
  .editor-tags {
    padding: 0.75rem 2rem;
    border-bottom: 1px solid rgba(28, 26, 23, 0.06);
    background: #FDFBF8;
  }

  .tags-input-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    min-height: 32px;
  }

  .editor-tag {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.5rem 0.2rem 0.65rem;
    background: rgba(184, 150, 90, 0.15);
    color: #B8965A;
    border-radius: 20px;
    font-size: 0.72rem;
  }

  .editor-tag button {
    background: none;
    border: none;
    cursor: pointer;
    color: #B8965A;
    font-size: 0.85rem;
    line-height: 1;
    padding: 0;
    opacity: 0.7;
  }

  .editor-tag button:hover {
    opacity: 1;
  }

  .tag-input {
    border: none;
    outline: none;
    background: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem;
    color: #1C1A17;
    min-width: 120px;
  }

  .tag-input::placeholder {
    color: #9C9590;
  }

  /* Textarea */
  .note-textarea {
    flex: 1;
    padding: 2rem;
    border: none;
    outline: none;
    resize: none;
    background: #F9F6F0;
    font-family: 'Lora', serif;
    font-size: 1rem;
    line-height: 1.8;
    color: #1C1A17;
  }

  .note-textarea::placeholder {
    color: rgba(28, 26, 23, 0.25);
    font-style: italic;
  }

  .editor-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 2rem;
    background: #FDFBF8;
    border-top: 1px solid rgba(28, 26, 23, 0.06);
    font-size: 0.72rem;
    color: #9C9590;
  }

  .save-status {
    color: #4A8A4C;
  }

  /* ── Estado vazio ────────────────────────────────────────── */
  .notes-empty-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-state {
    text-align: center;
    color: #9C9590;
  }

  .empty-icon-lg {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-title {
    font-family: 'Lora', serif;
    font-size: 1.3rem;
    color: #4A4540;
    margin-bottom: 0.5rem;
  }

  .empty-sub {
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
  }

  .btn-new-lg {
    padding: 0.75rem 1.75rem;
    background: #1C1A17;
    color: #F9F6F0;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.88rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-new-lg:hover {
    background: #B8965A;
  }

  @media (max-width: 768px) {
    .notes-sidebar {
      width: 100%;
    }

    .notes-editor {
      display: none;
    }
  }

  .btn-export {
    padding: 0.35rem 0.75rem;
    background: transparent;
    color: #B8965A;
    border: 1px solid rgba(184, 150, 90, 0.4);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.78rem;
    transition: all 0.2s;
  }

  .btn-export:hover:not(:disabled) {
    background: rgba(184, 150, 90, 0.1);
  }

  .btn-export:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>