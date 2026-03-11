<template>
  <div class="search-page">

    <!-- Hero de busca -->
    <div class="search-hero">
      <div class="search-hero-content">
        <div class="search-hero-label">✦ Busca Bíblica</div>
        <h1 class="search-hero-title">O que você está buscando?</h1>

        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input ref="inputRef" v-model="query" type="text" placeholder="Buscar por palavra, versículo ou tema..."
            class="search-input" @keydown.enter="doSearch" @input="onInput" />
          <button v-if="query" class="search-clear" @click="clearSearch">✕</button>
          <button class="search-btn" @click="doSearch" :disabled="loading">
            {{ loading ? '...' : 'Buscar' }}
          </button>
        </div>

        <!-- Filtros -->
        <div class="search-filters">
          <div class="filter-group">
            <span class="filter-label">Testamento:</span>
            <button v-for="t in testaments" :key="t.value" class="filter-btn"
              :class="{ active: filters.testament === t.value }" @click="filters.testament = t.value">{{ t.label
              }}</button>
          </div>

          <div class="filter-group">
            <span class="filter-label">Livro:</span>
            <select v-model="filters.book" class="filter-select">
              <option value="">Todos</option>
              <optgroup label="Antigo Testamento">
                <option v-for="b in atBooks" :key="b.code" :value="b.code">{{ b.name }}</option>
              </optgroup>
              <optgroup label="Novo Testamento">
                <option v-for="b in ntBooks" :key="b.code" :value="b.code">{{ b.name }}</option>
              </optgroup>
            </select>
          </div>

          <div class="filter-group">
            <span class="filter-label">Versão:</span>
            <select v-model="filters.version" class="filter-select">
              <option v-for="v in versions" :key="v.code" :value="v.code">{{ v.code }}</option>
            </select>
          </div>
        </div>

        <!-- Buscas rápidas -->
        <div class="quick-searches" v-if="!searched">
          <span class="quick-label">Sugestões:</span>
          <button v-for="s in suggestions" :key="s" class="quick-btn" @click="quickSearch(s)">{{ s }}</button>
        </div>
      </div>
    </div>

    <!-- Resultados -->
    <div class="search-results">

      <!-- Loading -->
      <div class="results-loading" v-if="loading">
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <div class="loading-text">Buscando versículos...</div>
      </div>

      <!-- Stats dos resultados -->
      <div class="results-header" v-else-if="searched && !loading">
        <div class="results-count" v-if="results.length">
          <strong>{{ total }}</strong> resultado{{ total !== 1 ? 's' : '' }} para
          <span class="results-query">"{{ lastQuery }}"</span>
        </div>
        <div class="results-count" v-else>
          Nenhum resultado para <span class="results-query">"{{ lastQuery }}"</span>
        </div>
        <div class="results-time" v-if="searchTime">{{ searchTime }}ms</div>
      </div>

      <!-- Lista de resultados -->
      <div class="results-list" v-if="results.length && !loading">
        <div v-for="result in results" :key="result.id" class="result-card" @click="goToVerse(result)">
          <div class="result-card-header">
            <div class="result-ref">
              <span class="result-book">{{ result.bookName }}</span>
              <span class="result-chapter">{{ result.chapter }}:{{ result.verse }}</span>
              <span class="result-version">{{ result.versionCode }}</span>
            </div>
            <div class="result-testament">
              {{ result.testament === 'OT' || result.bookCode <= 'MAL' ? 'AT' : 'NT' }} </div>
            </div>

            <div class="result-text" v-html="highlightText(result.text)"></div>

            <div class="result-footer">
              <button class="result-action" @click.stop="copyVerse(result)" title="Copiar">
                📋 Copiar
              </button>
              <button class="result-action" @click.stop="goToVerse(result)" title="Ler no contexto">
                📖 Ler contexto
              </button>
            </div>
          </div>

          <!-- Carregar mais -->
          <div class="load-more" v-if="results.length < total">
            <button class="btn-load-more" @click="loadMore" :disabled="loadingMore">
              {{ loadingMore ? 'Carregando...' : `Ver mais resultados (${total - results.length} restantes)` }}
            </button>
          </div>
        </div>

        <!-- Estado vazio -->
        <div class="empty-results" v-else-if="searched && !loading && !results.length">
          <div class="empty-icon">📭</div>
          <div class="empty-title">Nenhum versículo encontrado</div>
          <div class="empty-sub">Tente outras palavras ou remova os filtros</div>
          <button class="btn-clear-filters" @click="clearFilters">Limpar filtros</button>
        </div>

        <!-- Estado inicial -->
        <div class="initial-state" v-else-if="!searched && !loading">
          <div class="initial-grid">
            <div v-for="topic in topics" :key="topic.label" class="topic-card" @click="quickSearch(topic.query)">
              <div class="topic-icon">{{ topic.icon }}</div>
              <div class="topic-label">{{ topic.label }}</div>
            </div>
          </div>
        </div>

      </div>

      <!-- Toast de cópia -->
      <div class="copy-toast" v-if="copied">✓ Versículo copiado!</div>

    </div>
</template>

<script setup>
  import { ref, computed, onMounted, nextTick } from 'vue'
  import { useRouter } from 'vue-router'
  import { api } from '@/shared/utils/api'

  const router = useRouter()
  const inputRef = ref(null)

  // ── Estado ────────────────────────────────────────────────────
  const query = ref('')
  const lastQuery = ref('')
  const results = ref([])
  const total = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)
  const searched = ref(false)
  const searchTime = ref(null)
  const copied = ref(false)
  const versions = ref([{ code: 'NVI', name: 'Nova Versão Internacional' }])
  const offset = ref(0)
  const LIMIT = 20

  const filters = ref({
    testament: '',
    book: '',
    version: 'NVI',
  })

  // ── Dados fixos ───────────────────────────────────────────────
  const testaments = [
    { value: '', label: 'Todos' },
    { value: 'OT', label: 'Antigo' },
    { value: 'NT', label: 'Novo' },
  ]

  const suggestions = ['amor', 'fé', 'paz', 'esperança', 'graça', 'salvação', 'oração']

  const topics = [
    { icon: '❤️', label: 'Amor', query: 'amor' },
    { icon: '🙏', label: 'Oração', query: 'oração' },
    { icon: '✝️', label: 'Salvação', query: 'salvação' },
    { icon: '☮️', label: 'Paz', query: 'paz' },
    { icon: '💪', label: 'Força', query: 'força' },
    { icon: '🌟', label: 'Esperança', query: 'esperança' },
    { icon: '🙌', label: 'Louvor', query: 'louvor' },
    { icon: '📖', label: 'Sabedoria', query: 'sabedoria' },
    { icon: '🕊️', label: 'Espírito', query: 'espírito' },
    { icon: '👑', label: 'Reino', query: 'reino' },
    { icon: '💡', label: 'Luz', query: 'luz' },
    { icon: '🌿', label: 'Graça', query: 'graça' },
  ]

  const allBooks = [
    { code: 'GEN', name: 'Gênesis', testament: 'OT' },
    { code: 'EXO', name: 'Êxodo', testament: 'OT' },
    { code: 'LEV', name: 'Levítico', testament: 'OT' },
    { code: 'NUM', name: 'Números', testament: 'OT' },
    { code: 'DEU', name: 'Deuteronômio', testament: 'OT' },
    { code: 'JOS', name: 'Josué', testament: 'OT' },
    { code: 'JDG', name: 'Juízes', testament: 'OT' },
    { code: 'RUT', name: 'Rute', testament: 'OT' },
    { code: '1SA', name: '1 Samuel', testament: 'OT' },
    { code: '2SA', name: '2 Samuel', testament: 'OT' },
    { code: '1KI', name: '1 Reis', testament: 'OT' },
    { code: '2KI', name: '2 Reis', testament: 'OT' },
    { code: '1CH', name: '1 Crônicas', testament: 'OT' },
    { code: '2CH', name: '2 Crônicas', testament: 'OT' },
    { code: 'EZR', name: 'Esdras', testament: 'OT' },
    { code: 'NEH', name: 'Neemias', testament: 'OT' },
    { code: 'EST', name: 'Ester', testament: 'OT' },
    { code: 'JOB', name: 'Jó', testament: 'OT' },
    { code: 'PSA', name: 'Salmos', testament: 'OT' },
    { code: 'PRO', name: 'Provérbios', testament: 'OT' },
    { code: 'ECC', name: 'Eclesiastes', testament: 'OT' },
    { code: 'SNG', name: 'Cantares', testament: 'OT' },
    { code: 'ISA', name: 'Isaías', testament: 'OT' },
    { code: 'JER', name: 'Jeremias', testament: 'OT' },
    { code: 'LAM', name: 'Lamentações', testament: 'OT' },
    { code: 'EZK', name: 'Ezequiel', testament: 'OT' },
    { code: 'DAN', name: 'Daniel', testament: 'OT' },
    { code: 'HOS', name: 'Oseias', testament: 'OT' },
    { code: 'JOL', name: 'Joel', testament: 'OT' },
    { code: 'AMO', name: 'Amós', testament: 'OT' },
    { code: 'OBA', name: 'Obadias', testament: 'OT' },
    { code: 'JON', name: 'Jonas', testament: 'OT' },
    { code: 'MIC', name: 'Miquéias', testament: 'OT' },
    { code: 'NAM', name: 'Naum', testament: 'OT' },
    { code: 'HAB', name: 'Habacuque', testament: 'OT' },
    { code: 'ZEP', name: 'Sofonias', testament: 'OT' },
    { code: 'HAG', name: 'Ageu', testament: 'OT' },
    { code: 'ZEC', name: 'Zacarias', testament: 'OT' },
    { code: 'MAL', name: 'Malaquias', testament: 'OT' },
    { code: 'MAT', name: 'Mateus', testament: 'NT' },
    { code: 'MRK', name: 'Marcos', testament: 'NT' },
    { code: 'LUK', name: 'Lucas', testament: 'NT' },
    { code: 'JHN', name: 'João', testament: 'NT' },
    { code: 'ACT', name: 'Atos', testament: 'NT' },
    { code: 'ROM', name: 'Romanos', testament: 'NT' },
    { code: '1CO', name: '1 Coríntios', testament: 'NT' },
    { code: '2CO', name: '2 Coríntios', testament: 'NT' },
    { code: 'GAL', name: 'Gálatas', testament: 'NT' },
    { code: 'EPH', name: 'Efésios', testament: 'NT' },
    { code: 'PHP', name: 'Filipenses', testament: 'NT' },
    { code: 'COL', name: 'Colossenses', testament: 'NT' },
    { code: '1TH', name: '1 Tessalonicenses', testament: 'NT' },
    { code: '2TH', name: '2 Tessalonicenses', testament: 'NT' },
    { code: '1TI', name: '1 Timóteo', testament: 'NT' },
    { code: '2TI', name: '2 Timóteo', testament: 'NT' },
    { code: 'TIT', name: 'Tito', testament: 'NT' },
    { code: 'PHM', name: 'Filemom', testament: 'NT' },
    { code: 'HEB', name: 'Hebreus', testament: 'NT' },
    { code: 'JAS', name: 'Tiago', testament: 'NT' },
    { code: '1PE', name: '1 Pedro', testament: 'NT' },
    { code: '2PE', name: '2 Pedro', testament: 'NT' },
    { code: '1JN', name: '1 João', testament: 'NT' },
    { code: '2JN', name: '2 João', testament: 'NT' },
    { code: '3JN', name: '3 João', testament: 'NT' },
    { code: 'JUD', name: 'Judas', testament: 'NT' },
    { code: 'REV', name: 'Apocalipse', testament: 'NT' },
  ]

  const atBooks = computed(() => allBooks.filter(b => b.testament === 'OT'))
  const ntBooks = computed(() => allBooks.filter(b => b.testament === 'NT'))

  // ── Init ──────────────────────────────────────────────────────
  onMounted(async () => {
    await nextTick()
    inputRef.value?.focus()
    try {
      const { data } = await api.get('/bible/versions')
      versions.value = data.versions
      filters.value.version = data.versions.find(v => v.isDefault)?.code || 'NVI'
    } catch { }
  })

  // ── Busca ─────────────────────────────────────────────────────
  async function doSearch(append = false) {
    if (!query.value.trim()) return
    if (!append) {
      loading.value = true
      results.value = []
      offset.value = 0
      searched.value = true
      lastQuery.value = query.value.trim()
    } else {
      loadingMore.value = true
    }

    const start = Date.now()
    try {
      const params = new URLSearchParams({
        q: query.value.trim(),
        limit: LIMIT,
        offset: offset.value,
        ...(filters.value.version && { version: filters.value.version }),
        ...(filters.value.testament && { testament: filters.value.testament }),
        ...(filters.value.book && { book: filters.value.book }),
      })

      const { data } = await api.get(`/bible/search?${params}`)
      results.value = append ? [...results.value, ...data.results] : data.results
      total.value = data.total || data.results.length
      searchTime.value = Date.now() - start
      offset.value += LIMIT
    } catch {
      results.value = []
      total.value = 0
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  function loadMore() { doSearch(true) }

  function quickSearch(term) {
    query.value = term
    doSearch()
  }

  let debounceTimer = null
  function onInput() {
    clearTimeout(debounceTimer)
    if (query.value.length >= 3) {
      debounceTimer = setTimeout(doSearch, 600)
    }
  }

  function clearSearch() {
    query.value = ''
    results.value = []
    searched.value = false
    total.value = 0
    inputRef.value?.focus()
  }

  function clearFilters() {
    filters.value = { testament: '', book: '', version: filters.value.version }
    if (query.value) doSearch()
  }

  // ── Highlight do termo buscado ────────────────────────────────
  function highlightText(text) {
    if (!lastQuery.value) return text
    const words = lastQuery.value.trim().split(/\s+/)
    let result = text
    for (const word of words) {
      const regex = new RegExp(`(${word})`, 'gi')
      result = result.replace(regex, '<mark>$1</mark>')
    }
    return result
  }

  // ── Navegar para versículo ────────────────────────────────────
  function goToVerse(result) {
    // Salva contexto para abrir no leitor
    localStorage.setItem('logos:lastReading', JSON.stringify({
      bookCode: result.bookCode,
      chapter: result.chapter,
      version: result.versionCode || filters.value.version,
    }))
    router.push('/leitura')
  }

  // ── Copiar versículo ──────────────────────────────────────────
  async function copyVerse(result) {
    const text = `"${result.text.trim()}" — ${result.bookName} ${result.chapter}:${result.verse} (${result.versionCode})`
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      setTimeout(() => copied.value = false, 2000)
    } catch { }
  }
</script>

<style scoped>
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  .search-page {
    height: 100vh;
    overflow-y: auto;
    background: #F9F6F0;
    font-family: 'DM Sans', sans-serif;
    color: #1C1A17;
  }

  /* ── Hero ────────────────────────────────────────────────── */
  .search-hero {
    background: #1C1A17;
    padding: 3rem 2.5rem 2.5rem;
  }

  .search-hero-content {
    max-width: 720px;
    margin: 0 auto;
  }

  .search-hero-label {
    font-size: 0.68rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #B8965A;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }

  .search-hero-title {
    font-family: 'Lora', serif;
    font-size: 2rem;
    font-weight: 600;
    color: #F9F6F0;
    margin-bottom: 1.5rem;
    line-height: 1.2;
  }

  /* Input de busca */
  .search-input-wrap {
    display: flex;
    align-items: center;
    gap: 0;
    background: #F9F6F0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  }

  .search-icon {
    padding: 0 0.75rem 0 1rem;
    font-size: 1rem;
    color: #9C9590;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    padding: 1rem 0.5rem;
    border: none;
    outline: none;
    background: transparent;
    font-family: 'DM Sans', sans-serif;
    font-size: 1rem;
    color: #1C1A17;
  }

  .search-input::placeholder {
    color: #9C9590;
  }

  .search-clear {
    padding: 0 0.75rem;
    background: none;
    border: none;
    color: #9C9590;
    cursor: pointer;
    font-size: 0.85rem;
    transition: color 0.2s;
  }

  .search-clear:hover {
    color: #1C1A17;
  }

  .search-btn {
    padding: 1rem 1.5rem;
    background: #B8965A;
    color: white;
    border: none;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    transition: background 0.2s;
    flex-shrink: 0;
  }

  .search-btn:hover:not(:disabled) {
    background: #A07840;
  }

  .search-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Filtros */
  .search-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1.25rem;
    align-items: center;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .filter-label {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .filter-btn {
    padding: 0.3rem 0.75rem;
    border-radius: 20px;
    font-size: 0.72rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: none;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.15s;
  }

  .filter-btn.active {
    background: rgba(184, 150, 90, 0.25);
    color: #D4B07A;
    border-color: #B8965A;
  }

  .filter-btn:hover:not(.active) {
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
  }

  .filter-select {
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.8);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.75rem;
    outline: none;
    cursor: pointer;
  }

  .filter-select option {
    background: #1C1A17;
    color: #F9F6F0;
  }

  /* Sugestões */
  .quick-searches {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1.25rem;
  }

  .quick-label {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.3);
  }

  .quick-btn {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    border: 1px solid rgba(184, 150, 90, 0.3);
    background: none;
    color: rgba(184, 150, 90, 0.8);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .quick-btn:hover {
    background: rgba(184, 150, 90, 0.15);
    color: #D4B07A;
  }

  /* ── Resultados ──────────────────────────────────────────── */
  .search-results {
    padding: 2rem 2.5rem;
    max-width: 760px;
    margin: 0 auto;
  }

  .results-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem 0;
    gap: 1rem;
  }

  .loading-dots {
    display: flex;
    gap: 0.4rem;
  }

  .loading-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #B8965A;
    animation: bounce 1.2s infinite;
  }

  .loading-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .loading-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes bounce {

    0%,
    80%,
    100% {
      transform: scale(0.8);
      opacity: 0.5;
    }

    40% {
      transform: scale(1.2);
      opacity: 1;
    }
  }

  .loading-text {
    font-size: 0.85rem;
    color: #9C9590;
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(28, 26, 23, 0.08);
  }

  .results-count {
    font-size: 0.85rem;
    color: #4A4540;
  }

  .results-query {
    color: #B8965A;
    font-weight: 600;
  }

  .results-time {
    font-size: 0.72rem;
    color: #9C9590;
  }

  /* Cards de resultado */
  .result-card {
    background: #FDFBF8;
    border: 1px solid rgba(28, 26, 23, 0.08);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 0.75rem;
    cursor: pointer;
    transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
  }

  .result-card:hover {
    border-color: rgba(184, 150, 90, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(184, 150, 90, 0.1);
  }

  .result-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .result-ref {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .result-book {
    font-weight: 600;
    font-size: 0.85rem;
    color: #1C1A17;
  }

  .result-chapter {
    font-size: 0.78rem;
    padding: 0.15rem 0.5rem;
    background: rgba(184, 150, 90, 0.12);
    color: #B8965A;
    border-radius: 20px;
    font-weight: 600;
  }

  .result-version {
    font-size: 0.65rem;
    color: #9C9590;
    letter-spacing: 0.05em;
  }

  .result-testament {
    font-size: 0.65rem;
    font-weight: 700;
    color: #8A9E8C;
    letter-spacing: 0.1em;
  }

  .result-text {
    font-family: 'Lora', serif;
    font-size: 0.95rem;
    line-height: 1.7;
    color: #1C1A17;
    margin-bottom: 1rem;
  }

  .result-text :deep(mark) {
    background: rgba(184, 150, 90, 0.25);
    color: #1C1A17;
    border-radius: 2px;
    padding: 0 2px;
  }

  .result-footer {
    display: flex;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(28, 26, 23, 0.06);
  }

  .result-action {
    padding: 0.3rem 0.75rem;
    background: none;
    border: 1px solid rgba(28, 26, 23, 0.1);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.72rem;
    color: #4A4540;
    transition: all 0.15s;
  }

  .result-action:hover {
    border-color: #B8965A;
    color: #B8965A;
  }

  /* Carregar mais */
  .load-more {
    text-align: center;
    padding: 1.5rem 0;
  }

  .btn-load-more {
    padding: 0.75rem 2rem;
    background: none;
    border: 1px solid rgba(28, 26, 23, 0.15);
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    color: #4A4540;
    transition: all 0.2s;
  }

  .btn-load-more:hover:not(:disabled) {
    border-color: #B8965A;
    color: #B8965A;
  }

  .btn-load-more:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Estado vazio */
  .empty-results {
    text-align: center;
    padding: 4rem 0;
    color: #9C9590;
  }

  .empty-results .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-results .empty-title {
    font-family: 'Lora', serif;
    font-size: 1.3rem;
    color: #4A4540;
    margin-bottom: 0.5rem;
  }

  .empty-results .empty-sub {
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
  }

  .btn-clear-filters {
    padding: 0.65rem 1.5rem;
    background: none;
    border: 1px solid rgba(28, 26, 23, 0.15);
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    color: #4A4540;
  }

  /* Estado inicial — tópicos */
  .initial-state {
    padding: 1rem 0;
  }

  .initial-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }

  .topic-card {
    background: #FDFBF8;
    border: 1px solid rgba(28, 26, 23, 0.08);
    border-radius: 12px;
    padding: 1.25rem 1rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .topic-card:hover {
    border-color: rgba(184, 150, 90, 0.35);
    background: rgba(184, 150, 90, 0.04);
    transform: translateY(-2px);
  }

  .topic-icon {
    font-size: 1.5rem;
    margin-bottom: 0.4rem;
  }

  .topic-label {
    font-size: 0.78rem;
    color: #4A4540;
    font-weight: 500;
  }

  /* Toast */
  .copy-toast {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: #1C1A17;
    color: #F9F6F0;
    padding: 0.65rem 1.5rem;
    border-radius: 8px;
    font-size: 0.82rem;
    animation: fadeUp 0.2s ease;
    z-index: 1000;
  }

  @keyframes fadeUp {
    from {
      transform: translateX(-50%) translateY(10px);
      opacity: 0;
    }

    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    .search-hero {
      padding: 2rem 1.25rem;
    }

    .search-results {
      padding: 1.5rem 1.25rem;
    }

    .search-filters {
      gap: 0.6rem;
    }

    .initial-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
