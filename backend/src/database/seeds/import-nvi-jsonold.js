// backend/src/database/seeds/import-nvi-json.js
// Baixa nvi.json do GitHub UMA VEZ e importa toda a NVI localmente
// Uso: node src/database/seeds/import-nvi-json.js

import 'dotenv/config'
import { db } from '../connection.js'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const JSON_FILE   = join(__dirname, 'nvi.json')
const CHECKPOINT  = join(__dirname, 'checkpoint-nvi.json')
const NVI_URL     = 'https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/nvi.json'

// Mapeamento abbrev do JSON → code da tabela bible_books
const ABBREV_TO_CODE = {
  'gn':  'GEN', 'ex':  'EXO', 'lv':  'LEV', 'nm':  'NUM', 'dt':  'DEU',
  'js':  'JOS', 'jz':  'JDG', 'rt':  'RUT', '1sm': '1SA', '2sm': '2SA',
  '1rs': '1KI', '2rs': '2KI', '1cr': '1CH', '2cr': '2CH', 'ed':  'EZR',
  'ne':  'NEH', 'et':  'EST', 'jó':  'JOB', 'sl':  'PSA', 'pv':  'PRO',
  'ec':  'ECC', 'ct':  'SNG', 'is':  'ISA', 'jr':  'JER', 'lm':  'LAM',
  'ez':  'EZK', 'dn':  'DAN', 'os':  'HOS', 'jl':  'JOL', 'am':  'AMO',
  'ob':  'OBA', 'jn':  'JON', 'mq':  'MIC', 'na':  'NAM', 'hc':  'HAB',
  'sf':  'ZEP', 'ag':  'HAG', 'zc':  'ZEC', 'ml':  'MAL', 'mt':  'MAT',
  'mc':  'MRK', 'lc':  'LUK', 'jo':  'JHN', 'at':  'ACT', 'rm':  'ROM',
  '1co': '1CO', '2co': '2CO', 'gl':  'GAL', 'ef':  'EPH', 'fp':  'PHP',
  'cl':  'COL', '1ts': '1TH', '2ts': '2TH', '1tm': '1TI', '2tm': '2TI',
  'tt':  'TIT', 'fm':  'PHM', 'hb':  'HEB', 'tg':  'JAS', '1pe': '1PE',
  '2pe': '2PE', '1jo': '1JN', '2jo': '2JN', '3jo': '3JN', 'jd':  'JUD',
  'ap':  'REV',
}

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT)) return new Set()
  try { return new Set(JSON.parse(readFileSync(CHECKPOINT, 'utf8')).done) }
  catch { return new Set() }
}

function saveCheckpoint(done) {
  writeFileSync(CHECKPOINT, JSON.stringify({ done: [...done] }, null, 2))
}

async function main() {
  console.log('✦ Importação NVI via JSON local\n')

  // ── 1. Baixa o JSON se não existir ────────────────────────
  if (!existsSync(JSON_FILE)) {
    console.log('⬇ Baixando nvi.json do GitHub (~4MB)...')
    const res = await fetch(NVI_URL)
    if (!res.ok) throw new Error(`Falha ao baixar: HTTP ${res.status}`)
    const text = await res.text()
    writeFileSync(JSON_FILE, text, 'utf8')
    console.log('   nvi.json salvo ✓\n')
  } else {
    console.log('✓ nvi.json já existe, pulando download\n')
  }

  // ── 2. Carrega e parseia ───────────────────────────────────
  console.log('📖 Carregando JSON...')
  const books = JSON.parse(readFileSync(JSON_FILE, 'utf8'))
  console.log(`   ${books.length} livros encontrados\n`)

  // ── 3. Conecta ao banco ────────────────────────────────────
  const versions = await db`SELECT id, code FROM bible_versions`
  const vId = Object.fromEntries(versions.map(v => [v.code, v.id]))
  if (!vId.NVI) throw new Error('Versão NVI não encontrada no banco')

  const bookRows = await db`SELECT id, code FROM bible_books`
  const bId = Object.fromEntries(bookRows.map(b => [b.code, b.id]))

  // ── 4. Limpa NVI existente (exceto 1 versículo de teste) ──
  console.log('🧹 Limpando registros NVI anteriores...')
  await db`DELETE FROM bible_verses WHERE version_id = ${vId.NVI}`
  console.log('   NVI limpa ✓\n')

  // ── 5. Importa ─────────────────────────────────────────────
  const done = loadCheckpoint()
  let totalInserted = 0
  let totalErrors   = 0

  console.log('━━━ Importando NVI ━━━\n')

  for (const book of books) {
    const abbrev  = book.abbrev?.toLowerCase()
    const bookCode = ABBREV_TO_CODE[abbrev]

    if (!bookCode) {
      console.warn(`⚠ Abreviação desconhecida: "${abbrev}" (${book.name}) — pulando`)
      continue
    }

    const bid = bId[bookCode]
    if (!bid) {
      console.warn(`⚠ Livro ${bookCode} não encontrado no banco — pulando`)
      continue
    }

    process.stdout.write(`📖 NVI ${bookCode.padEnd(4)} `)
    let bookErrors = 0

    for (let ci = 0; ci < book.chapters.length; ci++) {
      const chapter  = ci + 1
      const key      = `NVI:${bookCode}:${chapter}`
      if (done.has(key)) { process.stdout.write('·'); continue }

      const verseTexts = book.chapters[ci]
      if (!verseTexts?.length) {
        process.stdout.write('✗'); totalErrors++; bookErrors++; continue
      }

      const rows = verseTexts.map((text, vi) => ({
        version_id: vId.NVI,
        book_id:    bid,
        chapter,
        verse:      vi + 1,
        text:       text.trim().replace(/\n/g, ' '),
      }))

      try {
        await db`
          INSERT INTO bible_verses ${db(rows, 'version_id', 'book_id', 'chapter', 'verse', 'text')}
          ON CONFLICT (version_id, book_id, chapter, verse) DO NOTHING
        `
        totalInserted += rows.length
        done.add(key)
        saveCheckpoint(done)
        process.stdout.write('.')
      } catch (e) {
        console.error(`\n  ✗ Erro ao inserir ${bookCode} cap.${chapter}:`, e.message)
        process.stdout.write('✗'); totalErrors++; bookErrors++
      }
    }

    console.log(bookErrors === 0 ? ' ✓' : ` ⚠ (${bookErrors} erros)`)
  }

  // ── 6. Resumo ──────────────────────────────────────────────
  console.log('\n━━━ Resumo ━━━')
  console.log(`Versículos inseridos: ${totalInserted}`)
  console.log(`Erros:                ${totalErrors}`)

  const [{ count }] = await db`
    SELECT COUNT(*)::int as count FROM bible_verses WHERE version_id = ${vId.NVI}
  `
  console.log(`Total NVI no banco:   ${count}`)

  if (totalErrors === 0) {
    writeFileSync(CHECKPOINT, JSON.stringify({ done: [] }))
    console.log('\n✓ NVI importada com sucesso!')
  } else {
    console.log('\n⚠ Rode novamente para reimportar capítulos com erro')
  }

  await db.end()
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message)
  process.exit(1)
})
