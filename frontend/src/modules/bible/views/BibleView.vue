<template>
  <div class="bible-view">

    <!-- ── Sidebar de navegação ─────────────────────────────── -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <span class="sidebar-title">Bíblia</span>
        <button class="sidebar-close" @click="sidebarOpen = false">✕</button>
      </div>

      <!-- Testamento -->
      <div class="testament-tabs">
        <button v-for="t in ['AT', 'NT']" :key="t" class="testament-tab" :class="{ active: testament === t }"
          @click="testament = t">{{ t === 'AT' ? 'Antigo' : 'Novo' }}</button>
      </div>

      <!-- Lista de livros -->
      <div class="book-list">
        <button v-for="book in filteredBooks" :key="book.code" class="book-item"
          :class="{ active: selectedBook?.code === book.code }" @click="selectBook(book)">
          <span class="book-abbr">{{ book.abbr }}</span>
          <span class="book-name">{{ book.name }}</span>
        </button>
      </div>

      <!-- Seletor de capítulo -->
      <div v-if="selectedBook" class="chapter-selector">
        <div class="chapter-label">Capítulo</div>
        <div class="chapter-grid">
          <button v-for="n in selectedBook.chapterCount" :key="n" class="chapter-btn"
            :class="{ active: selectedChapter === n }" @click="loadChapter(n)">{{ n }}</button>
        </div>
      </div>
    </aside>

    <!-- ── Área principal ───────────────────────────────────── -->
    <main class="reader">

      <!-- Topbar -->
      <header class="reader-header">
        <button class="menu-btn" @click="sidebarOpen = !sidebarOpen">
          <span></span><span></span><span></span>
        </button>

        <div class="location-info" v-if="chapter">
          <span class="location-book">{{ chapter.book.name }}</span>
          <span class="location-sep">·</span>
          <span class="location-chapter">Capítulo {{ chapter.chapter }}</span>
          <span class="location-version">{{ chapter.version.code }}</span>
        </div>

        <div class="header-actions">
          <!-- Seletor de versão -->
          <select v-model="selectedVersion" class="version-select" @change="reloadChapter">
            <option v-for="v in versions" :key="v.code" :value="v.code">{{ v.code }}</option>
          </select>

          <!-- Tamanho da fonte -->
          <div class="font-controls">
            <button @click="fontSize = Math.max(14, fontSize - 2)">A-</button>
            <button @click="fontSize = Math.min(28, fontSize + 2)">A+</button>
          </div>

          <!-- Toggle notas -->
          <button class="notes-toggle" :class="{ active: notesPanel }" @click="notesPanel = !notesPanel"
            title="Notas">📝</button>
        </div>
      </header>

      <!-- Barra de ferramentas de marcação -->
      <div class="highlight-toolbar" v-if="selectedVerseId" ref="toolbar">
        <span class="toolbar-label">Marcar:</span>
        <button v-for="color in highlightColors" :key="color.key" class="color-btn" :style="{ background: color.bg }"
          :title="color.label" @click="applyHighlight(color.key)"></button>
        <button class="toolbar-note-btn" @click="openNoteForVerse" title="Adicionar nota">✏️</button>
        <button class="toolbar-ref-btn" @click="loadReferences" title="Ver referências">🔗</button>
        <button class="toolbar-close" @click="selectedVerseId = null">✕</button>
      </div>

      <!-- Conteúdo do capítulo -->
      <div class="chapter-content" v-if="loading">
        <div class="skeleton" v-for="n in 20" :key="n" :style="{ width: (50 + Math.random() * 45) + '%' }"></div>
      </div>

      <div class="chapter-content" v-else-if="chapter" :style="{ fontSize: fontSize + 'px' }">

        <!-- Título do capítulo -->
        <div class="chapter-heading">
          <h1 class="chapter-title">{{ chapter.book.name }}</h1>
          <div class="chapter-num">{{ chapter.chapter }}</div>
        </div>

        <!-- Versículos -->
        <div class="verses-block">
          <div v-for="verse in chapter.verses" :key="verse.id" class="verse" :class="{
            selected: selectedVerseId === verse.id,
            highlighted: getHighlight(verse.id),
            [`hl-${getHighlight(verse.id)}`]: !!getHighlight(verse.id),
            'has-note': hasNote(verse.id),
          }" @click="selectVerse(verse)">
            <span class="verse-num">{{ verse.verse }}</span>
            <span class="verse-text">{{ verse.text }}</span>
            <span v-if="hasNote(verse.id)" class="note-indicator" title="Ver nota">●</span>
          </div>
        </div>

        <!-- Navegação entre capítulos -->
        <div class="chapter-nav">
          <button v-if="chapter.navigation.prev" class="nav-btn" @click="loadChapter(chapter.navigation.prev.chapter)">←
            Capítulo {{ chapter.navigation.prev.chapter }}</button>

          <div class="nav-spacer"></div>

          <button v-if="chapter.navigation.next" class="nav-btn nav-btn-next"
            @click="loadChapter(chapter.navigation.next.chapter)">Capítulo {{ chapter.navigation.next.chapter }}
            →</button>
        </div>
      </div>

      <!-- Estado vazio -->
      <div v-else class="empty-state">
        <div class="empty-icon">✦</div>
        <div class="empty-title">Selecione um livro</div>
        <div class="empty-sub">Escolha um livro e capítulo na barra lateral</div>
        <button class="empty-btn" @click="sidebarOpen = true">Abrir Bíblia</button>
      </div>
    </main>

    <!-- ── Painel lateral direito ───────────────────────────── -->
    <aside class="right-panel" v-if="notesPanel || refsPanel">

      <!-- Painel de notas -->
      <div v-if="notesPanel" class="panel-section">
        <div class="panel-header">
          <span>📝 Notas</span>
          <button @click="notesPanel = false">✕</button>
        </div>
        <div class="note-editor" v-if="editingNote">
          <div class="note-verse-ref" v-if="editingVerseRef">{{ editingVerseRef }}</div>
          <textarea v-model="noteContent" placeholder="Digite sua nota aqui..." class="note-textarea"
            rows="6"></textarea>
          <div class="note-actions">
            <button class="btn-save" @click="saveNote">Salvar</button>
            <button class="btn-cancel" @click="editingNote = false">Cancelar</button>
          </div>
        </div>

        <!-- Lista de notas do capítulo -->
        <div class="notes-list" v-if="chapterNotes.length">
          <div class="notes-list-title">Notas neste capítulo</div>
          <div v-for="note in chapterNotes" :key="note.verseId" class="note-card">
            <div class="note-card-ref">{{ note.ref }}</div>
            <div class="note-card-text">{{ note.content }}</div>
            <button class="note-card-edit" @click="editNote(note)">✏️</button>
          </div>
        </div>

        <div class="panel-empty" v-else-if="!editingNote">
          <p>Clique em um versículo e depois em ✏️ para adicionar uma nota.</p>
        </div>
      </div>

      <!-- Painel de referências cruzadas -->
      <div v-if="refsPanel" class="panel-section">
        <div class="panel-header">
          <span>🔗 Referências Cruzadas</span>
          <button @click="refsPanel = false">✕</button>
        </div>

        <div v-if="loadingRefs" class="panel-loading">Buscando referências...</div>

        <div v-else-if="references.length" class="refs-list">
          <div class="refs-verse-ref">{{ selectedVerseText }}</div>
          <div v-for="ref in references" :key="ref.targetId" class="ref-card">
            <div class="ref-location">
              {{ ref.targetBookAbbr }} {{ ref.targetChapter }}:{{ ref.targetVerse }}
            </div>
            <div class="ref-text">{{ ref.targetText }}</div>
            <div class="ref-tags">
              <span v-for="tag in ref.topicTags" :key="tag" class="ref-tag">{{ tag }}</span>
            </div>
          </div>
        </div>

        <div v-else class="panel-empty">
          <p>Nenhuma referência cruzada cadastrada para este versículo.</p>
        </div>
      </div>
    </aside>

  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { api } from '@/shared/utils/api'
  import { useAuthStore } from '@/modules/auth/stores/auth.store'

  const auth = useAuthStore()
  const route = useRoute()
  const router = useRouter()

  // ── Estado da UI ────────────────────────────────────────────
  const sidebarOpen = ref(true)
  const notesPanel = ref(false)
  const refsPanel = ref(false)
  const loading = ref(false)
  const loadingRefs = ref(false)
  const fontSize = ref(18)
  const testament = ref('AT')

  // ── Dados bíblicos ──────────────────────────────────────────
  const versions = ref([])
  const books = ref([])
  const selectedVersion = ref('NVI')
  const selectedBook = ref(null)
  const selectedChapter = ref(null)
  const chapter = ref(null)

  // ── Versículo selecionado ───────────────────────────────────
  const selectedVerseId = ref(null)
  const selectedVerseText = ref('')

  // ── Marcações e notas (locais por enquanto) ─────────────────
  // Carrega marcações e notas do localStorage
  const highlights = ref(JSON.parse(localStorage.getItem('logos:highlights') || '{}'))
  const notes = ref(JSON.parse(localStorage.getItem('logos:notes') || '{}'))
  const editingNote = ref(false)
  const editingVerseRef = ref('')
  const noteContent = ref('')
  const noteVerseId = ref(null)
  const references = ref([])

  const highlightColors = [
    { key: 'yellow', bg: 'rgba(255,220,80,0.7)', label: 'Amarelo' },
    { key: 'green', bg: 'rgba(100,200,130,0.7)', label: 'Verde' },
    { key: 'blue', bg: 'rgba(80,150,220,0.7)', label: 'Azul' },
    { key: 'pink', bg: 'rgba(230,100,130,0.7)', label: 'Rosa' },
    { key: 'orange', bg: 'rgba(255,150,60,0.7)', label: 'Laranja' },
  ]

  // ── Computed ────────────────────────────────────────────────
  const filteredBooks = computed(() =>
    books.value.filter(b => b.testament === (testament.value === 'AT' ? 'OT' : 'NT'))
  )

  const chapterNotes = computed(() =>
    Object.entries(notes.value)
      .filter(([, n]) => n)
      .map(([verseId, n]) => ({ verseId, ...n }))
  )

  function getHighlight(verseId) { return highlights.value[verseId] || null }
  function hasNote(verseId) { return !!notes.value[verseId] }

  // ── Inicialização ────────────────────────────────────────────
  onMounted(async () => {
    await Promise.all([loadVersions(), loadBooks()])

    // Restaura última leitura do localStorage
    const last = localStorage.getItem('logos:lastReading')
    if (last) {
      try {
        const { bookCode, chapter: ch, version } = JSON.parse(last)
        const book = books.value.find(b => b.code === bookCode)
        if (book) {
          selectedVersion.value = version || 'NVI'
          selectedBook.value = book
          testament.value = book.testament === 'OT' ? 'AT' : 'NT'
          await loadChapter(ch)
          return
        }
      } catch { }
    }
  })

  // ── Carrega versões ──────────────────────────────────────────
  async function loadVersions() {
    try {
      const { data } = await api.get('/bible/versions')
      versions.value = data.versions
      const def = data.versions.find(v => v.isDefault)
      if (def) selectedVersion.value = def.code
    } catch (e) {
      console.error('Erro ao carregar versões:', e)
    }
  }

  // ── Carrega livros ───────────────────────────────────────────
  async function loadBooks() {
    try {
      const { data } = await api.get('/bible/books')
      books.value = data.books
    } catch (e) {
      console.error('Erro ao carregar livros:', e)
    }
  }

  // ── Seleciona livro ──────────────────────────────────────────
  function selectBook(book) {
    selectedBook.value = book
    selectedChapter.value = null
    chapter.value = null
    selectedVerseId.value = null
  }

  // ── Carrega capítulo da API ──────────────────────────────────
  async function loadChapter(num) {
    if (!selectedBook.value) return
    loading.value = true
    selectedChapter.value = num
    selectedVerseId.value = null
    refsPanel.value = false

    try {
      const { data } = await api.get(
        `/bible/${selectedVersion.value}/${selectedBook.value.code}/${num}`
      )
      chapter.value = data
      sidebarOpen.value = false
      window.scrollTo({ top: 0, behavior: 'smooth' })

      // Salva última leitura
      localStorage.setItem('logos:lastReading', JSON.stringify({
        bookCode: selectedBook.value.code,
        chapter: num,
        version: selectedVersion.value,
      }))
    } catch (e) {
      console.error('Erro ao carregar capítulo:', e)
      chapter.value = null
    } finally {
      loading.value = false
    }
  }

  async function reloadChapter() {
    if (selectedChapter.value) await loadChapter(selectedChapter.value)
  }

  // ── Seleção de versículo ─────────────────────────────────────
  function selectVerse(verse) {
    if (selectedVerseId.value === verse.id) {
      selectedVerseId.value = null
      return
    }
    selectedVerseId.value = verse.id
    selectedVerseText.value = `${chapter.value.book.abbr} ${chapter.value.chapter}:${verse.verse}`
  }

  // ── Marcações ────────────────────────────────────────────────
  function applyHighlight(colorKey) {
    if (!selectedVerseId.value) return
    if (highlights.value[selectedVerseId.value] === colorKey) {
      delete highlights.value[selectedVerseId.value]
    } else {
      highlights.value[selectedVerseId.value] = colorKey
    }
    // Persiste no localStorage
    localStorage.setItem('logos:highlights', JSON.stringify(highlights.value))
    selectedVerseId.value = null
  }

  // ── Notas ────────────────────────────────────────────────────
  function openNoteForVerse() {
    if (!selectedVerseId.value) return
    noteVerseId.value = selectedVerseId.value
    editingVerseRef.value = selectedVerseText.value
    noteContent.value = notes.value[selectedVerseId.value]?.content || ''
    editingNote.value = true
    notesPanel.value = true
    selectedVerseId.value = null
  }

  function saveNote() {
    if (!noteVerseId.value) return
    notes.value[noteVerseId.value] = {
      content: noteContent.value,
      ref: editingVerseRef.value,
      verseId: noteVerseId.value,
    }
    // Persiste no localStorage
    localStorage.setItem('logos:notes', JSON.stringify(notes.value))
    editingNote.value = false
    noteContent.value = ''
  }

  function editNote(note) {
    noteVerseId.value = note.verseId
    editingVerseRef.value = note.ref
    noteContent.value = note.content
    editingNote.value = true
  }

  // ── Referências cruzadas ─────────────────────────────────────
  async function loadReferences() {
    if (!selectedVerseId.value) return
    refsPanel.value = true
    loadingRefs.value = true
    notesPanel.value = false
    references.value = []
    const id = selectedVerseId.value
    selectedVerseId.value = null
    try {
      const { data } = await api.get(`/bible/${id}/references`)
      references.value = data.references
    } catch { }
    finally { loadingRefs.value = false }
  }
</script>

<style scoped>
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  /* ── Layout ─────────────────────────────────────────────── */
  .bible-view {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: #F9F6F0;
    font-family: 'DM Sans', sans-serif;
    color: #1C1A17;
  }

  /* ── Sidebar esquerda ───────────────────────────────────── */
  .sidebar {
    width: 280px;
    flex-shrink: 0;
    background: #FDFBF8;
    border-right: 1px solid rgba(28, 26, 23, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.3s ease;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid rgba(28, 26, 23, 0.08);
  }

  .sidebar-title {
    font-family: 'Lora', serif;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .sidebar-close {
    display: none;
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    color: #9C9590;
  }

  .testament-tabs {
    display: flex;
    padding: 0.75rem 1rem;
    gap: 0.5rem;
    border-bottom: 1px solid rgba(28, 26, 23, 0.06);
  }

  .testament-tab {
    flex: 1;
    padding: 0.4rem;
    border: 1px solid rgba(28, 26, 23, 0.12);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 500;
    color: #4A4540;
    transition: all 0.2s;
  }

  .testament-tab.active {
    background: #1C1A17;
    color: #F9F6F0;
    border-color: #1C1A17;
  }

  .book-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .book-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.55rem 0.75rem;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
  }

  .book-item:hover {
    background: rgba(184, 150, 90, 0.08);
  }

  .book-item.active {
    background: rgba(184, 150, 90, 0.15);
  }

  .book-abbr {
    font-family: 'DM Sans', monospace;
    font-size: 0.68rem;
    font-weight: 600;
    color: #B8965A;
    width: 30px;
    flex-shrink: 0;
  }

  .book-name {
    font-size: 0.82rem;
    color: #1C1A17;
  }

  .chapter-selector {
    border-top: 1px solid rgba(28, 26, 23, 0.08);
    padding: 1rem;
    max-height: 220px;
    overflow-y: auto;
  }

  .chapter-label {
    font-size: 0.68rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #9C9590;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }

  .chapter-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.35rem;
  }

  .chapter-btn {
    padding: 0.4rem;
    border: 1px solid rgba(28, 26, 23, 0.1);
    border-radius: 6px;
    background: none;
    cursor: pointer;
    font-size: 0.75rem;
    color: #4A4540;
    transition: all 0.15s;
  }

  .chapter-btn:hover {
    border-color: #B8965A;
    color: #B8965A;
  }

  .chapter-btn.active {
    background: #B8965A;
    border-color: #B8965A;
    color: white;
  }

  /* ── Leitor principal ───────────────────────────────────── */
  .reader {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .reader-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.5rem;
    background: #FDFBF8;
    border-bottom: 1px solid rgba(28, 26, 23, 0.08);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .menu-btn {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
  }

  .menu-btn span {
    display: block;
    width: 20px;
    height: 2px;
    background: #1C1A17;
    border-radius: 2px;
    transition: all 0.2s;
  }

  .location-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }

  .location-book {
    font-family: 'Lora', serif;
    font-size: 1rem;
    font-weight: 600;
  }

  .location-sep {
    color: #9C9590;
  }

  .location-chapter {
    font-size: 0.85rem;
    color: #4A4540;
  }

  .location-version {
    font-size: 0.65rem;
    padding: 0.15rem 0.5rem;
    background: rgba(184, 150, 90, 0.15);
    color: #B8965A;
    border-radius: 20px;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .version-select {
    padding: 0.35rem 0.6rem;
    border: 1px solid rgba(28, 26, 23, 0.12);
    border-radius: 6px;
    background: #F9F6F0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem;
    color: #1C1A17;
    cursor: pointer;
    outline: none;
  }

  .font-controls {
    display: flex;
    gap: 0.25rem;
  }

  .font-controls button {
    padding: 0.3rem 0.6rem;
    border: 1px solid rgba(28, 26, 23, 0.12);
    border-radius: 6px;
    background: none;
    cursor: pointer;
    font-size: 0.75rem;
    color: #4A4540;
    transition: all 0.2s;
  }

  .font-controls button:hover {
    border-color: #B8965A;
    color: #B8965A;
  }

  .notes-toggle {
    padding: 0.35rem 0.6rem;
    border: 1px solid rgba(28, 26, 23, 0.12);
    border-radius: 6px;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .notes-toggle.active {
    background: rgba(184, 150, 90, 0.15);
    border-color: #B8965A;
  }

  /* ── Toolbar de marcação ────────────────────────────────── */
  .highlight-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.5rem;
    background: #1C1A17;
    color: #F9F6F0;
    animation: slideDown 0.2s ease;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }

    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .toolbar-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    margin-right: 0.25rem;
  }

  .color-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s;
  }

  .color-btn:hover {
    transform: scale(1.2);
    border-color: white;
  }

  .toolbar-note-btn,
  .toolbar-ref-btn,
  .toolbar-close {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
    color: white;
    transition: background 0.2s;
  }

  .toolbar-note-btn:hover,
  .toolbar-ref-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .toolbar-close {
    margin-left: auto;
    font-size: 0.75rem;
  }

  /* ── Conteúdo do capítulo ───────────────────────────────── */
  .chapter-content {
    flex: 1;
    overflow-y: auto;
    padding: 3rem 4rem;
    max-width: 720px;
    margin: 0 auto;
    width: 100%;
  }

  .chapter-heading {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 2.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(28, 26, 23, 0.08);
  }

  .chapter-title {
    font-family: 'Lora', serif;
    font-size: 1.8rem;
    font-weight: 600;
    color: #1C1A17;
  }

  .chapter-num {
    font-family: 'Lora', serif;
    font-size: 3rem;
    font-weight: 300;
    color: rgba(184, 150, 90, 0.4);
    line-height: 1;
  }

  .verses-block {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .verse {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    margin: 0 -0.75rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
    position: relative;
    line-height: 1.8;
  }

  .verse:hover {
    background: rgba(184, 150, 90, 0.06);
  }

  .verse.selected {
    background: rgba(184, 150, 90, 0.12);
  }

  /* Marcações */
  .verse.hl-yellow {
    background: rgba(255, 220, 80, 0.25);
  }

  .verse.hl-green {
    background: rgba(100, 200, 130, 0.20);
  }

  .verse.hl-blue {
    background: rgba(80, 150, 220, 0.18);
  }

  .verse.hl-pink {
    background: rgba(230, 100, 130, 0.18);
  }

  .verse.hl-orange {
    background: rgba(255, 150, 60, 0.20);
  }

  .verse-num {
    font-size: 0.65em;
    font-weight: 700;
    color: #B8965A;
    min-width: 24px;
    flex-shrink: 0;
    padding-top: 0.1em;
    user-select: none;
  }

  .verse-text {
    font-family: 'Lora', serif;
    color: #1C1A17;
  }

  .note-indicator {
    position: absolute;
    right: 0.75rem;
    top: 0.75rem;
    font-size: 0.45rem;
    color: #B8965A;
  }

  /* Skeleton loading */
  .skeleton {
    height: 1.2rem;
    background: rgba(28, 26, 23, 0.06);
    border-radius: 4px;
    margin-bottom: 1rem;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {

    0%,
    100% {
      opacity: 0.5;
    }

    50% {
      opacity: 1;
    }
  }

  /* Navegação */
  .chapter-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(28, 26, 23, 0.08);
  }

  .nav-btn {
    padding: 0.65rem 1.25rem;
    background: #F9F6F0;
    border: 1px solid rgba(28, 26, 23, 0.12);
    border-radius: 8px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    color: #4A4540;
    transition: all 0.2s;
  }

  .nav-btn:hover {
    border-color: #B8965A;
    color: #B8965A;
  }

  .nav-btn-next {
    margin-left: auto;
  }

  .nav-spacer {
    flex: 1;
  }

  /* Estado vazio */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: #9C9590;
  }

  .empty-icon {
    font-size: 2.5rem;
    color: rgba(184, 150, 90, 0.4);
  }

  .empty-title {
    font-family: 'Lora', serif;
    font-size: 1.4rem;
    color: #4A4540;
  }

  .empty-sub {
    font-size: 0.85rem;
  }

  .empty-btn {
    margin-top: 0.75rem;
    padding: 0.65rem 1.5rem;
    background: #1C1A17;
    color: #F9F6F0;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.2s;
  }

  .empty-btn:hover {
    background: #B8965A;
  }

  /* ── Painel direito ─────────────────────────────────────── */
  .right-panel {
    width: 320px;
    flex-shrink: 0;
    background: #FDFBF8;
    border-left: 1px solid rgba(28, 26, 23, 0.1);
    overflow-y: auto;
    animation: slideLeft 0.25s ease;
  }

  @keyframes slideLeft {
    from {
      transform: translateX(100%);
      opacity: 0;
    }

    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .panel-section {
    padding: 1.25rem;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 1.25rem;
  }

  .panel-header button {
    background: none;
    border: none;
    cursor: pointer;
    color: #9C9590;
    font-size: 0.9rem;
  }

  /* Editor de nota */
  .note-verse-ref {
    font-size: 0.72rem;
    color: #B8965A;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .note-textarea {
    width: 100%;
    border: 1px solid rgba(28, 26, 23, 0.12);
    border-radius: 8px;
    padding: 0.75rem;
    resize: vertical;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    background: #F9F6F0;
    color: #1C1A17;
    outline: none;
    transition: border-color 0.2s;
  }

  .note-textarea:focus {
    border-color: #B8965A;
  }

  .note-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .btn-save {
    flex: 1;
    padding: 0.55rem;
    background: #1C1A17;
    color: #F9F6F0;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.82rem;
    transition: background 0.2s;
  }

  .btn-save:hover {
    background: #B8965A;
  }

  .btn-cancel {
    padding: 0.55rem 1rem;
    background: none;
    border: 1px solid rgba(28, 26, 23, 0.12);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.82rem;
    color: #4A4540;
  }

  /* Lista de notas */
  .notes-list-title {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #9C9590;
    margin: 1.25rem 0 0.75rem;
    font-weight: 600;
  }

  .note-card {
    background: #F9F6F0;
    border-radius: 8px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
    position: relative;
  }

  .note-card-ref {
    font-size: 0.68rem;
    color: #B8965A;
    font-weight: 600;
    margin-bottom: 0.35rem;
  }

  .note-card-text {
    font-size: 0.82rem;
    color: #4A4540;
    line-height: 1.5;
  }

  .note-card-edit {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    opacity: 0.5;
  }

  .note-card-edit:hover {
    opacity: 1;
  }

  /* Referências */
  .refs-verse-ref {
    font-size: 0.72rem;
    color: #B8965A;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 1rem;
  }

  .ref-card {
    border-bottom: 1px solid rgba(28, 26, 23, 0.06);
    padding: 0.75rem 0;
  }

  .ref-location {
    font-size: 0.72rem;
    font-weight: 700;
    color: #B8965A;
    margin-bottom: 0.25rem;
  }

  .ref-text {
    font-family: 'Lora', serif;
    font-size: 0.85rem;
    color: #1C1A17;
    line-height: 1.6;
  }

  .ref-tags {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
    margin-top: 0.4rem;
  }

  .ref-tag {
    font-size: 0.6rem;
    padding: 0.1rem 0.4rem;
    background: rgba(138, 158, 140, 0.15);
    color: #8A9E8C;
    border-radius: 20px;
    text-transform: lowercase;
  }

  .panel-empty {
    font-size: 0.82rem;
    color: #9C9590;
    line-height: 1.6;
    text-align: center;
    padding: 1.5rem 0;
  }

  .panel-loading {
    font-size: 0.82rem;
    color: #9C9590;
    text-align: center;
    padding: 2rem 0;
  }

  /* ── Responsivo ─────────────────────────────────────────── */
  @media (max-width: 1024px) {
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      z-index: 100;
      transform: translateX(-100%);
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .sidebar-close {
      display: block;
    }

    .chapter-content {
      padding: 2rem 1.5rem;
    }

    .right-panel {
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      z-index: 90;
    }
  }

  @media (max-width: 600px) {
    .chapter-content {
      padding: 1.5rem 1rem;
    }

    .chapter-title {
      font-size: 1.4rem;
    }
  }
</style>