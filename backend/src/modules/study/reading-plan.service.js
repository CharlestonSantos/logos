// backend/src/modules/study/reading-plan.service.js

// Bíblia em 1 ano — 1189 capítulos em 365 dias (~3.26/dia)
// Sequência canônica AT → NT
const BIBLE_SEQUENCE = [
  ['GEN',50],['EXO',40],['LEV',27],['NUM',36],['DEU',34],
  ['JOS',24],['JDG',21],['RUT',4],['1SA',31],['2SA',24],
  ['1KI',22],['2KI',25],['1CH',29],['2CH',36],['EZR',10],
  ['NEH',13],['EST',10],['JOB',42],['PSA',150],['PRO',31],
  ['ECC',12],['SNG',8],['ISA',66],['JER',52],['LAM',5],
  ['EZK',48],['DAN',12],['HOS',14],['JOL',3],['AMO',9],
  ['OBA',1],['JON',4],['MIC',7],['NAM',3],['HAB',3],
  ['ZEP',3],['HAG',2],['ZEC',14],['MAL',4],
  ['MAT',28],['MRK',16],['LUK',24],['JHN',21],['ACT',28],
  ['ROM',16],['1CO',16],['2CO',13],['GAL',6],['EPH',6],
  ['PHP',4],['COL',4],['1TH',5],['2TH',3],['1TI',6],
  ['2TI',4],['TIT',3],['PHM',1],['HEB',13],['JAS',5],
  ['1PE',5],['2PE',3],['1JN',5],['2JN',1],['3JN',1],
  ['JUD',1],['REV',22],
]

// Gera lista flat de todos os capítulos em ordem
function buildChapterList() {
  const list = []
  for (const [code, count] of BIBLE_SEQUENCE) {
    for (let ch = 1; ch <= count; ch++) {
      list.push({ bookCode: code, chapter: ch })
    }
  }
  return list
}

const ALL_CHAPTERS = buildChapterList() // 1189 capítulos

// Divide em 365 dias (3 ou 4 capítulos por dia)
function buildYearPlan() {
  const days = []
  const total = ALL_CHAPTERS.length // 1189
  let idx = 0
  for (let day = 1; day <= 365; day++) {
    const remaining = total - idx
    const daysLeft  = 365 - day + 1
    const count     = Math.ceil(remaining / daysLeft)
    days.push(ALL_CHAPTERS.slice(idx, idx + count))
    idx += count
  }
  return days
}

const YEAR_PLAN = buildYearPlan() // 365 dias com capítulos

export class ReadingPlanService {
  constructor(db) {
    this.db = db
  }

  // Retorna ou cria plano do usuário
  async getPlan(userId) {
    const [plan] = await this.db`
      SELECT * FROM reading_plans WHERE user_id = ${userId} LIMIT 1
    `
    if (!plan) return { plan: null, started: false }

    const progress = await this._getCompletedCount(userId)
    const dayNumber = this._getCurrentDay(plan.startedAt)

    return {
      plan: {
        ...plan,
        dayNumber,
        totalDays:       365,
        chaptersRead:    progress,
        totalChapters:   1189,
        percentComplete: Math.round((progress / 1189) * 100),
        onTrack:         progress >= (dayNumber * 3),
      },
      started: true,
    }
  }

  // Leitura de hoje
  async getToday(userId) {
    const [plan] = await this.db`
      SELECT * FROM reading_plans WHERE user_id = ${userId} LIMIT 1
    `
    if (!plan) return { today: null, started: false }

    const dayNumber = this._getCurrentDay(plan.startedAt)
    const dayIdx    = Math.min(dayNumber - 1, 364)
    const todayChapters = YEAR_PLAN[dayIdx] || []

    // Verifica quais já foram lidos hoje
    const completed = await this.db`
      SELECT book_code, chapter FROM reading_progress
      WHERE user_id = ${userId}
        AND book_code = ANY(${todayChapters.map(c => c.bookCode)})
        AND chapter   = ANY(${todayChapters.map(c => c.chapter)})
    `

    const completedKeys = new Set(completed.map(c => `${c.bookCode}:${c.chapter}`))

    // Busca nomes dos livros
    const bookCodes = [...new Set(todayChapters.map(c => c.bookCode))]
    const books = await this.db`
      SELECT code, name, abbr FROM bible_books WHERE code = ANY(${bookCodes})
    `
    const bookMap = Object.fromEntries(books.map(b => [b.code, b]))

    const chapters = todayChapters.map(c => ({
      bookCode:  c.bookCode,
      chapter:   c.chapter,
      bookName:  bookMap[c.bookCode]?.name || c.bookCode,
      bookAbbr:  bookMap[c.bookCode]?.abbr || c.bookCode,
      completed: completedKeys.has(`${c.bookCode}:${c.chapter}`),
    }))

    const allDone = chapters.every(c => c.completed)

    return {
      started:   true,
      dayNumber,
      chapters,
      allDone,
      message:   this._getDayMessage(dayNumber, allDone),
    }
  }

  // Inicia o plano
  async startPlan(userId) {
    // Remove plano anterior se existir
    await this.db`DELETE FROM reading_plans WHERE user_id = ${userId}`
    await this.db`DELETE FROM reading_progress WHERE user_id = ${userId}`

    const [plan] = await this.db`
      INSERT INTO reading_plans (user_id, plan_type, started_at)
      VALUES (${userId}, 'year', NOW())
      RETURNING *
    `
    return { plan, started: true }
  }

  // Marca capítulo como lido
  async markComplete(userId, { bookCode, chapter }) {
    await this.db`
      INSERT INTO reading_progress (user_id, book_code, chapter, read_at)
      VALUES (${userId}, ${bookCode.toUpperCase()}, ${chapter}, NOW())
      ON CONFLICT (user_id, book_code, chapter) DO UPDATE SET read_at = NOW()
    `

    const progress = await this._getCompletedCount(userId)
    const dayNumber = await this._getDayNumberFromPlan(userId)

    return {
      success: true,
      chaptersRead:    progress,
      totalChapters:   1189,
      percentComplete: Math.round((progress / 1189) * 100),
      dayNumber,
    }
  }

  // Progresso geral
  async getProgress(userId) {
    const [plan] = await this.db`
      SELECT * FROM reading_plans WHERE user_id = ${userId}
    `
    if (!plan) return { started: false }

    const completed = await this.db`
      SELECT book_code, chapter FROM reading_progress WHERE user_id = ${userId}
    `

    const completedSet = new Set(completed.map(c => `${c.bookCode}:${c.chapter}`))
    const dayNumber    = this._getCurrentDay(plan.startedAt)

    // Progresso por livro
    const bookProgress = {}
    for (const [code, count] of BIBLE_SEQUENCE) {
      let read = 0
      for (let ch = 1; ch <= count; ch++) {
        if (completedSet.has(`${code}:${ch}`)) read++
      }
      bookProgress[code] = { total: count, read, percent: Math.round((read / count) * 100) }
    }

    return {
      started:         true,
      dayNumber,
      chaptersRead:    completed.length,
      totalChapters:   1189,
      percentComplete: Math.round((completed.length / 1189) * 100),
      bookProgress,
      onTrack:         completed.length >= dayNumber * 3,
    }
  }

  // Reinicia plano
  async resetPlan(userId) {
    await this.db`DELETE FROM reading_plans     WHERE user_id = ${userId}`
    await this.db`DELETE FROM reading_progress  WHERE user_id = ${userId}`
  }

  // ── Helpers ───────────────────────────────────────────────
  _getCurrentDay(startedAt) {
    const start = new Date(startedAt)
    const now   = new Date()
    const diff  = Math.floor((now - start) / (1000 * 60 * 60 * 24))
    return Math.min(diff + 1, 365)
  }

  async _getDayNumberFromPlan(userId) {
    const [plan] = await this.db`
      SELECT started_at FROM reading_plans WHERE user_id = ${userId}
    `
    return plan ? this._getCurrentDay(plan.startedAt) : 1
  }

  async _getCompletedCount(userId) {
    const [{ count }] = await this.db`
      SELECT COUNT(*)::int AS count FROM reading_progress WHERE user_id = ${userId}
    `
    return count
  }

  _getDayMessage(day, allDone) {
    if (allDone) return '✓ Leitura do dia concluída! Excelente!'
    if (day <= 30)  return 'Ótimo começo! Continue assim.'
    if (day <= 100) return 'Você está construindo um hábito!'
    if (day <= 200) return 'Mais da metade do caminho!'
    if (day <= 300) return 'A linha de chegada está próxima!'
    return 'Reta final! Você consegue!'
  }
}
