<template>
  <div class="dashboard">

    <!-- Header -->
    <header class="dash-header">
      <div class="greeting">
        <div class="greeting-sub">{{ greeting }},</div>
        <div class="greeting-name">{{ firstName }}</div>
      </div>
      <div class="dash-date">{{ formattedDate }}</div>
    </header>

    <div class="dash-body">

      <!-- Coluna principal -->
      <div class="dash-main">

        <!-- Versículo do dia -->
        <div class="verse-card">
          <div class="verse-card-label">✦ Versículo do dia</div>
          <blockquote class="verse-card-text">
            "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito,
            para que todo o que nele crer não pereça, mas tenha a vida eterna."
          </blockquote>
          <div class="verse-card-ref">João 3 : 16 · NVI</div>
          <RouterLink to="/leitura" class="verse-card-btn">Ler capítulo →</RouterLink>
        </div>

        <!-- Continue lendo -->
        <div class="section" v-if="recentReading.length">
          <div class="section-title">Continue lendo</div>
          <div class="recent-grid">
            <RouterLink v-for="item in recentReading" :key="item.ref" to="/leitura" class="recent-card">
              <div class="recent-book">{{ item.book }}</div>
              <div class="recent-chapter">Capítulo {{ item.chapter }}</div>
              <div class="recent-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: item.progress + '%' }"></div>
                </div>
                <span class="progress-pct">{{ item.progress }}%</span>
              </div>
            </RouterLink>
          </div>
        </div>

        <!-- Acesso rápido aos livros -->
        <div class="section">
          <div class="section-header">
            <div class="section-title">Acesso rápido</div>
            <div class="testament-pills">
              <button v-for="t in ['AT', 'NT']" :key="t" class="pill" :class="{ active: quickTestament === t }"
                @click="quickTestament = t">{{ t === 'AT' ? 'Antigo Testamento' : 'Novo Testamento' }}</button>
            </div>
          </div>
          <div class="books-grid">
            <RouterLink v-for="book in quickBooks" :key="book.code" to="/leitura" class="book-card">
              <div class="book-card-abbr">{{ book.abbr }}</div>
              <div class="book-card-name">{{ book.name }}</div>
              <div class="book-card-chapters">{{ book.chapterCount }} cap.</div>
            </RouterLink>
          </div>
        </div>

      </div>

      <!-- Coluna lateral -->
      <aside class="dash-side">

        <!-- Estatísticas -->
        <div class="stats-card">
          <div class="stats-title">Sua jornada</div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ stats.chaptersRead }}</div>
              <div class="stat-label">Capítulos lidos</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.notes }}</div>
              <div class="stat-label">Notas criadas</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.highlights }}</div>
              <div class="stat-label">Marcações</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.streak }}d</div>
              <div class="stat-label">Dias seguidos</div>
            </div>
          </div>

          <!-- Barra de progresso da Bíblia -->
          <div class="bible-progress">
            <div class="bible-progress-header">
              <span>Progresso na Bíblia</span>
              <span class="bible-progress-pct">{{ stats.bibleProgress }}%</span>
            </div>
            <div class="progress-bar large">
              <div class="progress-fill gold" :style="{ width: stats.bibleProgress + '%' }"></div>
            </div>
            <div class="bible-progress-sub">{{ stats.chaptersRead }} de 1.189 capítulos</div>
          </div>
        </div>

        <!-- Últimas notas -->
        <div class="notes-card" v-if="recentNotes.length">
          <div class="notes-card-header">
            <div class="notes-card-title">📝 Últimas notas</div>
            <RouterLink to="/notas" class="notes-card-link">Ver todas →</RouterLink>
          </div>
          <div v-for="note in recentNotes" :key="note.id" class="note-item">
            <div class="note-item-ref">{{ note.ref }}</div>
            <div class="note-item-text">{{ note.text }}</div>
          </div>
        </div>

        <!-- Plano de leitura -->
        <div class="plan-card">
          <div class="plan-title">📅 Plano de leitura</div>
          <div class="plan-sub">Bíblia em 1 ano · Dia {{ planDay }} de 365</div>
          <div class="plan-today">
            <div class="plan-today-label">Hoje</div>
            <div class="plan-today-reading">
              <div
                v-for="ch in planToday"
                :key="`${ch.bookCode}:${ch.chapter}`"
                class="plan-passage"
                :class="{ done: ch.completed }"
              >
                <span>{{ ch.bookName }} {{ ch.chapter }}</span>
                <span class="plan-check" v-if="ch.completed">✓</span>
              </div>
              <div class="plan-passage" v-if="!planToday.length">Inicie o plano →</div>
            </div>
          </div>
          <RouterLink to="/plano" class="plan-btn">
            {{ planToday.length ? 'Ver plano completo →' : 'Iniciar plano →' }}
          </RouterLink>
        </div>

      </aside>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { RouterLink } from 'vue-router'
  import { useAuthStore } from '@/modules/auth/stores/auth.store'
  import { api } from '@/shared/utils/api'

  const auth = useAuthStore()
  const quickTestament = ref('NT')

  const firstName = computed(() => {
    const name = auth.user?.name || 'Estudante'
    return name.split(' ')[0]
  })

  const greeting = computed(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })

  const formattedDate = computed(() => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
  })

  const stats = ref({
    chaptersRead: 0, notes: 0, highlights: 0,
    streak: 1, bibleProgress: 0,
  })

  const recentNotes   = ref([])
  const planToday     = ref([])
  const planDay       = ref(1)

  const recentReading = ref([
    { book: 'João',    chapter: 3,  progress: 42 },
    { book: 'Salmos',  chapter: 23, progress: 78 },
    { book: 'Gênesis', chapter: 1,  progress: 15 },
  ])

  const allBooks = [
    { code: 'GEN', abbr: 'Gn', name: 'Gênesis',    testament: 'OT', chapterCount: 50  },
    { code: 'EXO', abbr: 'Ex', name: 'Êxodo',      testament: 'OT', chapterCount: 40  },
    { code: 'PSA', abbr: 'Sl', name: 'Salmos',      testament: 'OT', chapterCount: 150 },
    { code: 'PRO', abbr: 'Pv', name: 'Provérbios',  testament: 'OT', chapterCount: 31  },
    { code: 'ISA', abbr: 'Is', name: 'Isaías',      testament: 'OT', chapterCount: 66  },
    { code: 'JER', abbr: 'Jr', name: 'Jeremias',    testament: 'OT', chapterCount: 52  },
    { code: 'DAN', abbr: 'Dn', name: 'Daniel',      testament: 'OT', chapterCount: 12  },
    { code: 'MAT', abbr: 'Mt', name: 'Mateus',      testament: 'NT', chapterCount: 28  },
    { code: 'MRK', abbr: 'Mc', name: 'Marcos',      testament: 'NT', chapterCount: 16  },
    { code: 'LUK', abbr: 'Lc', name: 'Lucas',       testament: 'NT', chapterCount: 24  },
    { code: 'JHN', abbr: 'Jo', name: 'João',        testament: 'NT', chapterCount: 21  },
    { code: 'ACT', abbr: 'At', name: 'Atos',        testament: 'NT', chapterCount: 28  },
    { code: 'ROM', abbr: 'Rm', name: 'Romanos',     testament: 'NT', chapterCount: 16  },
    { code: 'REV', abbr: 'Ap', name: 'Apocalipse',  testament: 'NT', chapterCount: 22  },
  ]

  const quickBooks = computed(() =>
    allBooks.filter(b => b.testament === (quickTestament.value === 'AT' ? 'OT' : 'NT'))
  )

  onMounted(async () => {
    await Promise.all([loadStats(), loadRecentNotes(), loadLastReading(), loadPlan()])
  })

  async function loadStats() {
    try {
      // Notas reais do banco
      const { data: notesData } = await api.get('/notes?limit=1')
      stats.value.notes = notesData.pagination?.total || 0

      // Marcações reais do banco
      const { data: hlData } = await api.get('/highlights')
      stats.value.highlights = hlData.highlights?.length ?? 0

      // Capítulos lidos reais do plano
      const { data: progressData } = await api.get('/reading-plan/progress')
      if (progressData.started) {
        stats.value.chaptersRead  = progressData.chaptersRead   || 0
        stats.value.bibleProgress = progressData.percentComplete || 0
        stats.value.streak        = progressData.dayNumber       || 1
      }
    } catch {}
  }

  async function loadRecentNotes() {
    try {
      const { data } = await api.get('/notes?limit=3')
      recentNotes.value = data.notes?.map(n => ({
        id:   n.id,
        ref:  n.bookAbbr ? `${n.bookAbbr} ${n.chapter}:${n.verseNum}` : 'Nota livre',
        text: n.content,
      })) || []
    } catch {}
  }

  async function loadLastReading() {
    try {
      const last = localStorage.getItem('logos:lastReading')
      if (!last) return
      const { bookCode, chapter } = JSON.parse(last)
      const book = allBooks.find(b => b.code === bookCode)
      if (book) {
        recentReading.value[0] = { book: book.name, chapter, progress: 50 }
      }
    } catch {}
  }

  async function loadPlan() {
    try {
      const { data } = await api.get('/reading-plan/today')
      if (data.started) {
        planDay.value   = data.dayNumber || 1
        planToday.value = data.chapters  || []
      }
    } catch {}
  }
</script>

<style scoped>
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  .dashboard {
    height: 100vh;
    overflow-y: auto;
    background: #F9F6F0;
    font-family: 'DM Sans', sans-serif;
    color: #1C1A17;
  }

  /* ── Header ─────────────────────────────────────────────── */
  .dash-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 2.5rem 2.5rem 1.5rem;
    border-bottom: 1px solid rgba(28, 26, 23, 0.08);
    background: #FDFBF8;
  }

  .greeting-sub {
    font-size: 0.8rem;
    color: #9C9590;
    letter-spacing: 0.05em;
  }

  .greeting-name {
    font-family: 'Lora', serif;
    font-size: 2rem;
    font-weight: 600;
    color: #1C1A17;
    line-height: 1.1;
  }

  .dash-date {
    font-size: 0.8rem;
    color: #9C9590;
    text-transform: capitalize;
  }

  /* ── Body ───────────────────────────────────────────────── */
  .dash-body {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 2rem;
    padding: 2rem 2.5rem;
    max-width: 1300px;
  }

  /* ── Versículo do dia ───────────────────────────────────── */
  .verse-card {
    background: #1C1A17;
    color: #F9F6F0;
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 2rem;
    position: relative;
    overflow: hidden;
  }

  .verse-card::before {
    content: '❝';
    position: absolute;
    right: 1.5rem;
    top: 1rem;
    font-size: 6rem;
    color: rgba(184, 150, 90, 0.12);
    font-family: 'Lora', serif;
    line-height: 1;
  }

  .verse-card-label {
    font-size: 0.68rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #B8965A;
    margin-bottom: 1rem;
    font-weight: 600;
  }

  .verse-card-text {
    font-family: 'Lora', serif;
    font-size: 1.15rem;
    font-style: italic;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 1rem;
    max-width: 580px;
  }

  .verse-card-ref {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.1em;
    margin-bottom: 1.5rem;
  }

  .verse-card-btn {
    display: inline-block;
    padding: 0.55rem 1.25rem;
    background: rgba(184, 150, 90, 0.2);
    color: #D4B07A;
    border-radius: 8px;
    text-decoration: none;
    font-size: 0.82rem;
    transition: background 0.2s;
  }
  .verse-card-btn:hover { background: rgba(184, 150, 90, 0.35); }

  /* ── Seções ─────────────────────────────────────────────── */
  .section { margin-bottom: 2rem; }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9C9590;
    margin-bottom: 1rem;
  }
  .section-header .section-title { margin-bottom: 0; }

  .testament-pills { display: flex; gap: 0.4rem; }
  .pill {
    padding: 0.3rem 0.75rem;
    border-radius: 20px;
    font-size: 0.72rem;
    border: 1px solid rgba(28, 26, 23, 0.12);
    background: none;
    cursor: pointer;
    color: #4A4540;
    transition: all 0.2s;
  }
  .pill.active { background: #1C1A17; color: #F9F6F0; border-color: #1C1A17; }

  .recent-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
  .recent-card {
    background: #FDFBF8;
    border: 1px solid rgba(28, 26, 23, 0.08);
    border-radius: 12px; padding: 1rem;
    text-decoration: none;
    transition: border-color 0.2s, transform 0.15s;
  }
  .recent-card:hover { border-color: #B8965A; transform: translateY(-2px); }

  .recent-book { font-family: 'Lora', serif; font-size: 0.95rem; font-weight: 600; color: #1C1A17; margin-bottom: 0.2rem; }
  .recent-chapter { font-size: 0.75rem; color: #9C9590; margin-bottom: 0.75rem; }
  .recent-progress { display: flex; align-items: center; gap: 0.5rem; }
  .progress-pct { font-size: 0.68rem; color: #B8965A; font-weight: 600; }

  .books-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.6rem; }
  .book-card {
    background: #FDFBF8; border: 1px solid rgba(28, 26, 23, 0.08);
    border-radius: 10px; padding: 0.9rem 0.75rem;
    text-decoration: none; transition: border-color 0.2s, background 0.2s;
    display: flex; flex-direction: column; gap: 0.2rem;
  }
  .book-card:hover { border-color: #B8965A; background: rgba(184, 150, 90, 0.04); }
  .book-card-abbr { font-size: 0.68rem; font-weight: 700; color: #B8965A; }
  .book-card-name { font-size: 0.82rem; color: #1C1A17; font-weight: 500; }
  .book-card-chapters { font-size: 0.68rem; color: #9C9590; }

  .progress-bar { flex: 1; height: 4px; background: rgba(28, 26, 23, 0.08); border-radius: 99px; overflow: hidden; }
  .progress-bar.large { height: 6px; }
  .progress-fill { height: 100%; background: #8A9E8C; border-radius: 99px; transition: width 0.5s ease; }
  .progress-fill.gold { background: linear-gradient(90deg, #B8965A, #D4B07A); }

  /* ── Sidebar direita ─────────────────────────────────────── */
  .dash-side { display: flex; flex-direction: column; gap: 1.25rem; }

  .stats-card {
    background: #FDFBF8; border: 1px solid rgba(28, 26, 23, 0.08);
    border-radius: 16px; padding: 1.5rem;
  }
  .stats-title {
    font-size: 0.72rem; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #9C9590; margin-bottom: 1.25rem;
  }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
  .stat-item { text-align: center; }
  .stat-value { font-family: 'Lora', serif; font-size: 1.8rem; font-weight: 600; color: #1C1A17; line-height: 1; }
  .stat-label { font-size: 0.68rem; color: #9C9590; margin-top: 0.25rem; }

  .bible-progress-header {
    display: flex; justify-content: space-between;
    align-items: center; font-size: 0.75rem; color: #4A4540; margin-bottom: 0.5rem;
  }
  .bible-progress-pct { font-weight: 600; color: #B8965A; }
  .bible-progress-sub { font-size: 0.68rem; color: #9C9590; margin-top: 0.4rem; }

  .notes-card {
    background: #FDFBF8; border: 1px solid rgba(28, 26, 23, 0.08);
    border-radius: 16px; padding: 1.5rem;
  }
  .notes-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .notes-card-title { font-size: 0.85rem; font-weight: 600; color: #1C1A17; }
  .notes-card-link { font-size: 0.75rem; color: #B8965A; text-decoration: none; }

  .note-item { padding: 0.75rem 0; border-bottom: 1px solid rgba(28, 26, 23, 0.06); }
  .note-item:last-child { border-bottom: none; padding-bottom: 0; }
  .note-item-ref { font-size: 0.68rem; font-weight: 700; color: #B8965A; margin-bottom: 0.25rem; }
  .note-item-text { font-size: 0.8rem; color: #4A4540; line-height: 1.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .plan-card {
    background: linear-gradient(135deg, rgba(138, 158, 140, 0.15), rgba(184, 150, 90, 0.08));
    border: 1px solid rgba(138, 158, 140, 0.25);
    border-radius: 16px; padding: 1.5rem;
  }
  .plan-title { font-size: 0.85rem; font-weight: 600; color: #1C1A17; margin-bottom: 0.2rem; }
  .plan-sub { font-size: 0.72rem; color: #9C9590; margin-bottom: 1.25rem; }
  .plan-today-label {
    font-size: 0.65rem; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #8A9E8C; margin-bottom: 0.5rem;
  }
  .plan-today-reading { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 1.25rem; }
  .plan-passage {
    font-family: 'Lora', serif; font-size: 0.88rem; color: #1C1A17;
    padding: 0.35rem 0.6rem; background: rgba(255, 255, 255, 0.5);
    border-radius: 6px; display: flex; justify-content: space-between; align-items: center;
  }
  .plan-passage.done { opacity: 0.5; text-decoration: line-through; }
  .plan-check { color: #8A9E8C; font-size: 0.75rem; }

  .plan-btn {
    display: block; text-align: center; padding: 0.65rem;
    background: #1C1A17; color: #F9F6F0; border-radius: 8px;
    text-decoration: none; font-size: 0.78rem; font-weight: 500; transition: background 0.2s;
  }
  .plan-btn:hover { background: #B8965A; }

  @media (max-width: 1024px) {
    .dash-body { grid-template-columns: 1fr; padding: 1.5rem; }
    .recent-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 600px) {
    .dash-header { padding: 1.5rem; flex-direction: column; align-items: flex-start; gap: 0.5rem; }
    .recent-grid { grid-template-columns: 1fr; }
    .dash-body { padding: 1rem; }
  }
</style>