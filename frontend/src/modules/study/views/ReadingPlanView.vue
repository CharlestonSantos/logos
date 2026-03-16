<template>
  <div class="plan-page">

    <!-- ── Não iniciado ──────────────────────────────────────── -->
    <div class="plan-start" v-if="!started && !loading">
      <div class="start-icon">📖</div>
      <h1 class="start-title">Bíblia em 1 Ano</h1>
      <p class="start-desc">
        Leia a Bíblia completa em 365 dias.<br>
        Cerca de 3 capítulos por dia, seguindo a ordem canônica.
      </p>

      <div class="start-stats">
        <div class="stat-item">
          <div class="stat-num">1.189</div>
          <div class="stat-label">Capítulos</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">365</div>
          <div class="stat-label">Dias</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">~3</div>
          <div class="stat-label">Cap./dia</div>
        </div>
      </div>

      <button class="btn-start" @click="startPlan" :disabled="starting">
        {{ starting ? 'Iniciando...' : '✦ Começar agora' }}
      </button>
    </div>

    <!-- ── Loading ───────────────────────────────────────────── -->
    <div class="plan-loading" v-else-if="loading">
      <div class="loading-dots">
        <span></span><span></span><span></span>
      </div>
    </div>

    <!-- ── Plano ativo ────────────────────────────────────────── -->
    <div class="plan-active" v-else>

      <!-- Header com progresso -->
      <div class="plan-header">
        <div class="plan-header-left">
          <div class="plan-label">✦ Bíblia em 1 Ano</div>
          <div class="plan-day">Dia {{ plan.dayNumber }} de 365</div>
          <div class="plan-status" :class="plan.onTrack ? 'on-track' : 'behind'">
            {{ plan.onTrack ? '✓ Em dia' : '⚠ Atrasado' }}
          </div>
        </div>

        <div class="plan-header-right">
          <div class="progress-ring-wrap">
            <svg class="progress-ring" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(184,150,90,0.15)" stroke-width="6"/>
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke="#B8965A" stroke-width="6"
                stroke-linecap="round"
                :stroke-dasharray="`${2 * Math.PI * 34}`"
                :stroke-dashoffset="`${2 * Math.PI * 34 * (1 - plan.percentComplete / 100)}`"
                transform="rotate(-90 40 40)"
                style="transition: stroke-dashoffset 1s ease"
              />
            </svg>
            <div class="progress-ring-text">
              <div class="progress-pct">{{ plan.percentComplete }}%</div>
              <div class="progress-sub">lido</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de progresso -->
      <div class="progress-bar-wrap">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: plan.percentComplete + '%' }"></div>
        </div>
        <div class="progress-bar-info">
          <span>{{ plan.chaptersRead }} capítulos lidos</span>
          <span>{{ plan.totalChapters - plan.chaptersRead }} restantes</span>
        </div>
      </div>

      <!-- Leitura de hoje -->
      <div class="today-section">
        <div class="today-header">
          <div class="today-title">📅 Leitura de hoje</div>
          <div class="today-message" v-if="today.message">{{ today.message }}</div>
        </div>

        <div class="today-chapters" v-if="today.chapters?.length">
          <div
            v-for="ch in today.chapters"
            :key="`${ch.bookCode}:${ch.chapter}`"
            class="today-chapter"
            :class="{ done: ch.completed }"
          >
            <div class="chapter-info">
              <span class="chapter-book">{{ ch.bookName }}</span>
              <span class="chapter-num">Cap. {{ ch.chapter }}</span>
            </div>
            <div class="chapter-actions">
              <button
                class="btn-read"
                @click="goToChapter(ch)"
              >📖 Ler</button>
              <button
                class="btn-done"
                :class="{ completed: ch.completed }"
                @click="markComplete(ch)"
                :disabled="ch.completing"
              >
                {{ ch.completed ? '✓ Lido' : 'Marcar lido' }}
              </button>
            </div>
          </div>
        </div>

        <div class="today-all-done" v-if="today.allDone">
          <div class="all-done-icon">🎉</div>
          <div class="all-done-text">Leitura do dia concluída!</div>
          <div class="all-done-sub">Volte amanhã para continuar</div>
        </div>
      </div>

      <!-- Progresso por livro -->
      <div class="books-section">
        <div class="books-title">Progresso por livro</div>

        <div class="testament-tabs">
          <button
            v-for="t in ['AT', 'NT']" :key="t"
            class="tab-btn"
            :class="{ active: activeTestament === t }"
            @click="activeTestament = t"
          >{{ t === 'AT' ? 'Antigo Testamento' : 'Novo Testamento' }}</button>
        </div>

        <div class="books-grid">
          <div
            v-for="book in filteredBooks"
            :key="book.code"
            class="book-card"
            :class="{
              complete:   book.percent === 100,
              'in-progress': book.percent > 0 && book.percent < 100,
            }"
          >
            <div class="book-card-header">
              <span class="book-card-name">{{ book.name }}</span>
              <span class="book-card-pct">{{ book.percent }}%</span>
            </div>
            <div class="book-card-bar">
              <div class="book-card-fill" :style="{ width: book.percent + '%' }"></div>
            </div>
            <div class="book-card-info">{{ book.read }}/{{ book.total }} cap.</div>
          </div>
        </div>
      </div>

      <!-- Reset -->
      <div class="plan-footer">
        <button class="btn-reset" @click="confirmReset">↺ Reiniciar plano</button>
      </div>

    </div>

    <!-- Modal de confirmação de reset -->
    <div class="modal-overlay" v-if="showResetModal" @click.self="showResetModal = false">
      <div class="modal">
        <div class="modal-title">Reiniciar plano?</div>
        <div class="modal-desc">Todo o progresso será perdido. Esta ação não pode ser desfeita.</div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showResetModal = false">Cancelar</button>
          <button class="btn-confirm-reset" @click="resetPlan">Reiniciar</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/shared/utils/api'

const router = useRouter()

const loading         = ref(true)
const starting        = ref(false)
const started         = ref(false)
const plan            = ref({})
const today           = ref({})
const progress        = ref({})
const activeTestament = ref('AT')
const showResetModal  = ref(false)

const BOOK_INFO = [
  { code:'GEN', name:'Gênesis',      testament:'AT' },
  { code:'EXO', name:'Êxodo',        testament:'AT' },
  { code:'LEV', name:'Levítico',     testament:'AT' },
  { code:'NUM', name:'Números',      testament:'AT' },
  { code:'DEU', name:'Deuteronômio', testament:'AT' },
  { code:'JOS', name:'Josué',        testament:'AT' },
  { code:'JDG', name:'Juízes',       testament:'AT' },
  { code:'RUT', name:'Rute',         testament:'AT' },
  { code:'1SA', name:'1 Samuel',     testament:'AT' },
  { code:'2SA', name:'2 Samuel',     testament:'AT' },
  { code:'1KI', name:'1 Reis',       testament:'AT' },
  { code:'2KI', name:'2 Reis',       testament:'AT' },
  { code:'1CH', name:'1 Crônicas',   testament:'AT' },
  { code:'2CH', name:'2 Crônicas',   testament:'AT' },
  { code:'EZR', name:'Esdras',       testament:'AT' },
  { code:'NEH', name:'Neemias',      testament:'AT' },
  { code:'EST', name:'Ester',        testament:'AT' },
  { code:'JOB', name:'Jó',           testament:'AT' },
  { code:'PSA', name:'Salmos',       testament:'AT' },
  { code:'PRO', name:'Provérbios',   testament:'AT' },
  { code:'ECC', name:'Eclesiastes',  testament:'AT' },
  { code:'SNG', name:'Cantares',     testament:'AT' },
  { code:'ISA', name:'Isaías',       testament:'AT' },
  { code:'JER', name:'Jeremias',     testament:'AT' },
  { code:'LAM', name:'Lamentações',  testament:'AT' },
  { code:'EZK', name:'Ezequiel',     testament:'AT' },
  { code:'DAN', name:'Daniel',       testament:'AT' },
  { code:'HOS', name:'Oseias',       testament:'AT' },
  { code:'JOL', name:'Joel',         testament:'AT' },
  { code:'AMO', name:'Amós',         testament:'AT' },
  { code:'OBA', name:'Obadias',      testament:'AT' },
  { code:'JON', name:'Jonas',        testament:'AT' },
  { code:'MIC', name:'Miquéias',     testament:'AT' },
  { code:'NAM', name:'Naum',         testament:'AT' },
  { code:'HAB', name:'Habacuque',    testament:'AT' },
  { code:'ZEP', name:'Sofonias',     testament:'AT' },
  { code:'HAG', name:'Ageu',         testament:'AT' },
  { code:'ZEC', name:'Zacarias',     testament:'AT' },
  { code:'MAL', name:'Malaquias',    testament:'AT' },
  { code:'MAT', name:'Mateus',       testament:'NT' },
  { code:'MRK', name:'Marcos',       testament:'NT' },
  { code:'LUK', name:'Lucas',        testament:'NT' },
  { code:'JHN', name:'João',         testament:'NT' },
  { code:'ACT', name:'Atos',         testament:'NT' },
  { code:'ROM', name:'Romanos',      testament:'NT' },
  { code:'1CO', name:'1 Coríntios',  testament:'NT' },
  { code:'2CO', name:'2 Coríntios',  testament:'NT' },
  { code:'GAL', name:'Gálatas',      testament:'NT' },
  { code:'EPH', name:'Efésios',      testament:'NT' },
  { code:'PHP', name:'Filipenses',   testament:'NT' },
  { code:'COL', name:'Colossenses',  testament:'NT' },
  { code:'1TH', name:'1 Tessalonicenses', testament:'NT' },
  { code:'2TH', name:'2 Tessalonicenses', testament:'NT' },
  { code:'1TI', name:'1 Timóteo',    testament:'NT' },
  { code:'2TI', name:'2 Timóteo',    testament:'NT' },
  { code:'TIT', name:'Tito',         testament:'NT' },
  { code:'PHM', name:'Filemom',      testament:'NT' },
  { code:'HEB', name:'Hebreus',      testament:'NT' },
  { code:'JAS', name:'Tiago',        testament:'NT' },
  { code:'1PE', name:'1 Pedro',      testament:'NT' },
  { code:'2PE', name:'2 Pedro',      testament:'NT' },
  { code:'1JN', name:'1 João',       testament:'NT' },
  { code:'2JN', name:'2 João',       testament:'NT' },
  { code:'3JN', name:'3 João',       testament:'NT' },
  { code:'JUD', name:'Judas',        testament:'NT' },
  { code:'REV', name:'Apocalipse',   testament:'NT' },
]

const filteredBooks = computed(() => {
  return BOOK_INFO
    .filter(b => b.testament === activeTestament.value)
    .map(b => {
      const bp = progress.value.bookProgress?.[b.code] || { total: 0, read: 0, percent: 0 }
      return { ...b, ...bp }
    })
})

onMounted(async () => {
  await loadPlan()
})

async function loadPlan() {
  loading.value = true
  try {
    const [planRes, todayRes, progressRes] = await Promise.all([
      api.get('/reading-plan'),
      api.get('/reading-plan/today'),
      api.get('/reading-plan/progress'),
    ])
    started.value  = planRes.data.started
    plan.value     = planRes.data.plan || {}
    today.value    = todayRes.data
    progress.value = progressRes.data
  } catch {}
  loading.value = false
}

async function startPlan() {
  starting.value = true
  try {
    await api.post('/reading-plan/start')
    await loadPlan()
  } catch {}
  starting.value = false
}

async function markComplete(ch) {
  ch.completing = true
  try {
    await api.post('/reading-plan/complete', {
      bookCode: ch.bookCode,
      chapter:  ch.chapter,
    })
    ch.completed  = true
    ch.completing = false

    // Atualiza progresso
    const [planRes, progressRes] = await Promise.all([
      api.get('/reading-plan'),
      api.get('/reading-plan/progress'),
    ])
    plan.value     = planRes.data.plan || {}
    progress.value = progressRes.data

    // Verifica se terminou o dia
    if (today.value.chapters?.every(c => c.completed)) {
      today.value.allDone = true
    }
  } catch {
    ch.completing = false
  }
}

function goToChapter(ch) {
  localStorage.setItem('logos:lastReading', JSON.stringify({
    bookCode: ch.bookCode,
    chapter:  ch.chapter,
    version:  'NVI',
  }))
  router.push('/leitura')
}

function confirmReset() {
  showResetModal.value = true
}

async function resetPlan() {
  try {
    await api.delete('/reading-plan/reset')
    showResetModal.value = false
    started.value = false
    plan.value    = {}
    today.value   = {}
    progress.value = {}
  } catch {}
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');

.plan-page {
  min-height: 100vh; background: #F9F6F0;
  font-family: 'DM Sans', sans-serif; color: #1C1A17;
  padding: 2.5rem;
}

/* ── Não iniciado ─────────────────────────────────────── */
.plan-start {
  max-width: 480px; margin: 4rem auto; text-align: center;
}
.start-icon  { font-size: 3.5rem; margin-bottom: 1.5rem; }
.start-title {
  font-family: 'Lora', serif; font-size: 2rem;
  font-weight: 600; margin-bottom: 1rem;
}
.start-desc {
  color: #4A4540; line-height: 1.7; margin-bottom: 2rem;
}
.start-stats {
  display: flex; justify-content: center; gap: 3rem;
  margin-bottom: 2.5rem;
}
.stat-item   { text-align: center; }
.stat-num    { font-family: 'Lora', serif; font-size: 2rem; font-weight: 600; color: #B8965A; }
.stat-label  { font-size: 0.75rem; color: #9C9590; margin-top: 0.25rem; }

.btn-start {
  padding: 0.9rem 2.5rem; background: #1C1A17; color: #F9F6F0;
  border: none; border-radius: 10px; font-size: 1rem;
  font-family: 'DM Sans', sans-serif; cursor: pointer;
  transition: background 0.2s;
}
.btn-start:hover:not(:disabled) { background: #B8965A; }
.btn-start:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Loading ──────────────────────────────────────────── */
.plan-loading {
  display: flex; justify-content: center; padding: 6rem;
}
.loading-dots { display: flex; gap: 0.4rem; }
.loading-dots span {
  width: 8px; height: 8px; border-radius: 50%;
  background: #B8965A; animation: bounce 1.2s infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }

/* ── Plano ativo ──────────────────────────────────────── */
.plan-active { max-width: 800px; margin: 0 auto; }

/* Header */
.plan-header {
  display: flex; justify-content: space-between; align-items: center;
  background: #1C1A17; border-radius: 16px; padding: 1.75rem 2rem;
  margin-bottom: 1.5rem; color: #F9F6F0;
}
.plan-label  { font-size: 0.68rem; letter-spacing: 0.15em; color: #B8965A; margin-bottom: 0.4rem; font-weight: 600; }
.plan-day    { font-family: 'Lora', serif; font-size: 1.6rem; font-weight: 600; margin-bottom: 0.5rem; }
.plan-status {
  display: inline-block; font-size: 0.72rem; padding: 0.2rem 0.6rem;
  border-radius: 20px; font-weight: 600;
}
.plan-status.on-track { background: rgba(100,200,130,0.2); color: #64C882; }
.plan-status.behind   { background: rgba(255,150,60,0.2);  color: #FF963C; }

/* Ring de progresso */
.progress-ring-wrap { position: relative; width: 80px; height: 80px; }
.progress-ring      { width: 80px; height: 80px; }
.progress-ring-text {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.progress-pct { font-size: 1rem; font-weight: 700; color: #F9F6F0; line-height: 1; }
.progress-sub { font-size: 0.55rem; color: rgba(255,255,255,0.5); }

/* Barra de progresso */
.progress-bar-wrap { margin-bottom: 2rem; }
.progress-bar-track {
  height: 8px; background: rgba(28,26,23,0.08); border-radius: 4px; overflow: hidden;
}
.progress-bar-fill {
  height: 100%; background: #B8965A; border-radius: 4px;
  transition: width 0.8s ease;
}
.progress-bar-info {
  display: flex; justify-content: space-between;
  font-size: 0.75rem; color: #9C9590; margin-top: 0.5rem;
}

/* Leitura de hoje */
.today-section {
  background: #FDFBF8; border: 1px solid rgba(28,26,23,0.08);
  border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;
}
.today-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.today-title  { font-weight: 600; font-size: 0.95rem; }
.today-message { font-size: 0.78rem; color: #B8965A; }

.today-chapter {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.9rem 1rem; border-radius: 8px;
  background: #F9F6F0; margin-bottom: 0.5rem;
  transition: background 0.2s;
}
.today-chapter.done { background: rgba(100,200,130,0.08); }

.chapter-info { display: flex; align-items: center; gap: 0.75rem; }
.chapter-book { font-weight: 600; font-size: 0.88rem; }
.chapter-num  { font-size: 0.78rem; color: #9C9590; }

.chapter-actions { display: flex; gap: 0.5rem; }
.btn-read {
  padding: 0.35rem 0.75rem; background: none;
  border: 1px solid rgba(28,26,23,0.12); border-radius: 6px;
  cursor: pointer; font-size: 0.75rem; color: #4A4540;
  transition: all 0.15s;
}
.btn-read:hover { border-color: #B8965A; color: #B8965A; }

.btn-done {
  padding: 0.35rem 0.9rem; background: #1C1A17; color: #F9F6F0;
  border: none; border-radius: 6px; cursor: pointer;
  font-size: 0.75rem; font-weight: 500; transition: all 0.2s;
}
.btn-done.completed { background: #64C882; color: white; cursor: default; }
.btn-done:hover:not(.completed):not(:disabled) { background: #B8965A; }
.btn-done:disabled { opacity: 0.6; }

.today-all-done {
  text-align: center; padding: 1.5rem 0;
}
.all-done-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
.all-done-text { font-family: 'Lora', serif; font-size: 1.2rem; color: #1C1A17; margin-bottom: 0.25rem; }
.all-done-sub  { font-size: 0.82rem; color: #9C9590; }

/* Progresso por livro */
.books-section { margin-bottom: 2rem; }
.books-title   { font-weight: 600; margin-bottom: 1rem; }

.testament-tabs {
  display: flex; gap: 0.5rem; margin-bottom: 1rem;
}
.tab-btn {
  padding: 0.4rem 1rem; border-radius: 6px;
  border: 1px solid rgba(28,26,23,0.12); background: none;
  cursor: pointer; font-size: 0.78rem; color: #4A4540;
  transition: all 0.15s;
}
.tab-btn.active { background: #1C1A17; color: #F9F6F0; border-color: #1C1A17; }

.books-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.6rem;
}
.book-card {
  background: #FDFBF8; border: 1px solid rgba(28,26,23,0.08);
  border-radius: 8px; padding: 0.75rem;
  transition: border-color 0.2s;
}
.book-card.complete      { border-color: rgba(100,200,130,0.4); background: rgba(100,200,130,0.04); }
.book-card.in-progress   { border-color: rgba(184,150,90,0.3); }

.book-card-header {
  display: flex; justify-content: space-between;
  font-size: 0.78rem; margin-bottom: 0.4rem;
}
.book-card-name { font-weight: 500; color: #1C1A17; }
.book-card-pct  { color: #B8965A; font-weight: 600; }
.book-card-bar  { height: 4px; background: rgba(28,26,23,0.08); border-radius: 2px; overflow: hidden; margin-bottom: 0.3rem; }
.book-card-fill { height: 100%; background: #B8965A; border-radius: 2px; transition: width 0.5s; }
.book-card-info { font-size: 0.65rem; color: #9C9590; }
.book-card.complete .book-card-fill { background: #64C882; }

/* Footer */
.plan-footer { text-align: center; padding: 1rem 0 2rem; }
.btn-reset {
  background: none; border: none; color: #9C9590;
  font-size: 0.78rem; cursor: pointer; transition: color 0.2s;
}
.btn-reset:hover { color: #E05555; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal {
  background: #FDFBF8; border-radius: 12px; padding: 2rem;
  max-width: 360px; width: 90%; text-align: center;
}
.modal-title { font-family: 'Lora', serif; font-size: 1.3rem; margin-bottom: 0.75rem; }
.modal-desc  { font-size: 0.85rem; color: #4A4540; margin-bottom: 1.5rem; line-height: 1.6; }
.modal-actions { display: flex; gap: 0.75rem; justify-content: center; }
.btn-cancel {
  padding: 0.6rem 1.5rem; background: none;
  border: 1px solid rgba(28,26,23,0.15); border-radius: 8px;
  cursor: pointer; font-size: 0.85rem;
}
.btn-confirm-reset {
  padding: 0.6rem 1.5rem; background: #E05555; color: white;
  border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem;
}
</style>
