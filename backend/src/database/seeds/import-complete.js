// backend/src/database/seeds/import-complete.js
// Importa ARA completa (continuação) + NVI completa
// Uso: node src/database/seeds/import-complete.js
// Se travar, rode novamente — continua de onde parou

import 'dotenv/config'
import { db } from '../connection.js'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname  = dirname(fileURLToPath(import.meta.url))
const CHECKPOINT = join(__dirname, 'checkpoint-complete.json')

// ── 66 livros ───────────────────────────────────────────────
// ara: nome para bible-api.com?translation=almeida (português, espaços = +)
// nvi: abreviação para abibliadigital.com.br/api/verses/nvi/
const BOOKS = [
  { code: 'GEN', ara: 'genesis',                nvi: 'gn',  chapters: 50  },
  { code: 'EXO', ara: 'exodo',                  nvi: 'ex',  chapters: 40  },
  { code: 'LEV', ara: 'levitico',               nvi: 'lv',  chapters: 27  },
  { code: 'NUM', ara: 'numeros',                nvi: 'nm',  chapters: 36  },
  { code: 'DEU', ara: 'deuteronomio',           nvi: 'dt',  chapters: 34  },
  { code: 'JOS', ara: 'josue',                  nvi: 'js',  chapters: 24  },
  { code: 'JDG', ara: 'juizes',                 nvi: 'jz',  chapters: 21  },
  { code: 'RUT', ara: 'rute',                   nvi: 'rt',  chapters: 4   },
  { code: '1SA', ara: '1+samuel',               nvi: '1sm', chapters: 31  },
  { code: '2SA', ara: '2+samuel',               nvi: '2sm', chapters: 24  },
  { code: '1KI', ara: '1+rei',                  nvi: '1rs', chapters: 22  },
  { code: '2KI', ara: '2+rei',                  nvi: '2rs', chapters: 25  },
  { code: '1CH', ara: '1+cronicas',             nvi: '1cr', chapters: 29  },
  { code: '2CH', ara: '2+cronicas',             nvi: '2cr', chapters: 36  },
  { code: 'EZR', ara: 'esdras',                 nvi: 'ed',  chapters: 10  },
  { code: 'NEH', ara: 'neemias',                nvi: 'ne',  chapters: 13  },
  { code: 'EST', ara: 'ester',                  nvi: 'et',  chapters: 10  },
  { code: 'JOB', ara: 'jo',                     nvi: 'jo',  chapters: 42  },
  { code: 'PSA', ara: 'salmos',                 nvi: 'sl',  chapters: 150 },
  { code: 'PRO', ara: 'proverbios',             nvi: 'pv',  chapters: 31  },
  { code: 'ECC', ara: 'eclesiastes',            nvi: 'ec',  chapters: 12  },
  { code: 'SNG', ara: 'canticos',               nvi: 'ct',  chapters: 8   },
  { code: 'ISA', ara: 'isaias',                 nvi: 'is',  chapters: 66  },
  { code: 'JER', ara: 'jeremias',               nvi: 'jr',  chapters: 52  },
  { code: 'LAM', ara: 'lamentacoes',            nvi: 'lm',  chapters: 5   },
  { code: 'EZK', ara: 'ezequiel',               nvi: 'ez',  chapters: 48  },
  { code: 'DAN', ara: 'daniel',                 nvi: 'dn',  chapters: 12  },
  { code: 'HOS', ara: 'oseias',                 nvi: 'os',  chapters: 14  },
  { code: 'JOL', ara: 'joel',                   nvi: 'jl',  chapters: 3   },
  { code: 'AMO', ara: 'amos',                   nvi: 'am',  chapters: 9   },
  { code: 'OBA', ara: 'abdias',                 nvi: 'ob',  chapters: 1   },
  { code: 'JON', ara: 'jonas',                  nvi: 'jn',  chapters: 4   },
  { code: 'MIC', ara: 'miqueias',               nvi: 'mq',  chapters: 7   },
  { code: 'NAM', ara: 'naum',                   nvi: 'na',  chapters: 3   },
  { code: 'HAB', ara: 'habacuque',              nvi: 'hc',  chapters: 3   },
  { code: 'ZEP', ara: 'sofonias',               nvi: 'sf',  chapters: 3   },
  { code: 'HAG', ara: 'ageu',                   nvi: 'ag',  chapters: 2   },
  { code: 'ZEC', ara: 'zacarias',               nvi: 'zc',  chapters: 14  },
  { code: 'MAL', ara: 'malaquias',              nvi: 'ml',  chapters: 4   },
  { code: 'MAT', ara: 'mateus',                 nvi: 'mt',  chapters: 28  },
  { code: 'MRK', ara: 'marcos',                 nvi: 'mc',  chapters: 16  },
  { code: 'LUK', ara: 'lucas',                  nvi: 'lc',  chapters: 24  },
  { code: 'JHN', ara: 'joao',                   nvi: 'jo',  chapters: 21  },
  { code: 'ACT', ara: 'atos',                   nvi: 'at',  chapters: 28  },
  { code: 'ROM', ara: 'romanos',                nvi: 'rm',  chapters: 16  },
  { code: '1CO', ara: '1+corintios',            nvi: '1co', chapters: 16  },
  { code: '2CO', ara: '2+corintios',            nvi: '2co', chapters: 13  },
  { code: 'GAL', ara: 'galatas',                nvi: 'gl',  chapters: 6   },
  { code: 'EPH', ara: 'efesios',                nvi: 'ef',  chapters: 6   },
  { code: 'PHP', ara: 'filipenses',             nvi: 'fp',  chapters: 4   },
  { code: 'COL', ara: 'colossenses',            nvi: 'cl',  chapters: 4   },
  { code: '1TH', ara: '1+tessalonicenses',      nvi: '1ts', chapters: 5   },
  { code: '2TH', ara: '2+tessalonicenses',      nvi: '2ts', chapters: 3   },
  { code: '1TI', ara: '1+timoteo',              nvi: '1tm', chapters: 6   },
  { code: '2TI', ara: '2+timoteo',              nvi: '2tm', chapters: 4   },
  { code: 'TIT', ara: 'tito',                   nvi: 'tt',  chapters: 3   },
  { code: 'PHM', ara: 'filemon',                nvi: 'fm',  chapters: 1   },
  { code: 'HEB', ara: 'hebreus',                nvi: 'hb',  chapters: 13  },
  { code: 'JAS', ara: 'tiago',                  nvi: 'tg',  chapters: 5   },
  { code: '1PE', ara: '1+pedro',                nvi: '1pe', chapters: 5   },
  { code: '2PE', ara: '2+pedro',                nvi: '2pe', chapters: 3   },
  { code: '1JN', ara: '1+joao',                 nvi: '1jo', chapters: 5   },
  { code: '2JN', ara: '2+joao',                 nvi: '2jo', chapters: 1   },
  { code: '3JN', ara: '3+joao',                 nvi: '3jo', chapters: 1   },
  { code: 'JUD', ara: 'judas',                  nvi: 'jd',  chapters: 1   },
  { code: 'REV', ara: 'apocalipse',             nvi: 'ap',  chapters: 22  },
]

// Livros já completos na ARA — pula sem reimportar
const ARA_COMPLETE = new Set(['GEN','EXO','LEV','NUM','DEU','JOS','RUT'])

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT)) return { done: [] }
  try { return JSON.parse(readFileSync(CHECKPOINT, 'utf8')) }
  catch { return { done: [] } }
}

function saveCheckpoint(done) {
  writeFileSync(CHECKPOINT, JSON.stringify({ done: [...done] }, null, 2))
}

// ── ARA via bible-api.com ───────────────────────────────────
async function fetchARA(araName, chapter, retries = 5) {
  const url = `https://bible-api.com/${araName}+${chapter}?translation=almeida`
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (res.status === 429) { console.log('\n  ⏳ rate limit ARA, aguardando 15s...'); await sleep(15_000); continue }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (!data.verses?.length) throw new Error('sem versículos')
      return data.verses.map(v => ({ verse: v.verse, text: v.text.trim().replace(/\n/g, ' ') }))
    } catch (e) {
      if (i < retries - 1) await sleep(3000 * (i + 1))
      else console.log(`\n  ✗ ARA ${araName} cap.${chapter}: ${e.message}`)
    }
  }
  return null
}

// ── NVI via abibliadigital.com.br ───────────────────────────
async function fetchNVI(nviAbbr, chapter, retries = 5) {
  const url = `https://www.abibliadigital.com.br/api/verses/nvi/${nviAbbr}/${chapter}`
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (res.status === 429) { console.log('\n  ⏳ rate limit NVI, aguardando 15s...'); await sleep(15_000); continue }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.msg) throw new Error(data.msg)
      if (!data.verses?.length) throw new Error('sem versículos')
      return data.verses.map(v => ({ verse: v.number, text: v.text.trim().replace(/\n/g, ' ') }))
    } catch (e) {
      if (i < retries - 1) await sleep(3000 * (i + 1))
      else console.log(`\n  ✗ NVI ${nviAbbr} cap.${chapter}: ${e.message}`)
    }
  }
  return null
}

async function importChapter({ versionId, bookId, chapter, verses }) {
  const rows = verses.map(v => ({
    version_id: versionId,
    book_id:    bookId,
    chapter,
    verse:      v.verse,
    text:       v.text,
  }))
  await db`
    INSERT INTO bible_verses ${db(rows, 'version_id', 'book_id', 'chapter', 'verse', 'text')}
    ON CONFLICT (version_id, book_id, chapter, verse) DO NOTHING
  `
  return rows.length
}

async function main() {
  console.log('✦ Importação completa ARA + NVI\n')

  const cp   = loadCheckpoint()
  const done = new Set(cp.done)
  console.log(`✓ Checkpoint: ${done.size} capítulos já importados\n`)

  // IDs das versões
  const versions = await db`SELECT id, code FROM bible_versions`
  const vId = Object.fromEntries(versions.map(v => [v.code, v.id]))
  if (!vId.ARA || !vId.NVI) {
    console.error('✗ Versões ARA ou NVI não encontradas no banco'); process.exit(1)
  }

  // IDs dos livros
  const bookRows = await db`SELECT id, code FROM bible_books`
  const bId = Object.fromEntries(bookRows.map(b => [b.code, b.id]))

  // Limpa JDG incompleto (só uma vez)
  if (!done.has('CLEANUP:JDG')) {
    console.log('🧹 Limpando JDG (ARA) incompleto...')
    await db`DELETE FROM bible_verses WHERE version_id = ${vId.ARA} AND book_id = ${bId.JDG}`
    done.add('CLEANUP:JDG')
    saveCheckpoint(done)
    console.log('   JDG limpo ✓\n')
  }

  let totalInserted = 0
  let totalErrors   = 0

  // ── ARA ─────────────────────────────────────────────────
  console.log('━━━ ARA (Almeida Revista e Atualizada) ━━━\n')

  for (const book of BOOKS) {
    if (ARA_COMPLETE.has(book.code)) continue

    const bid = bId[book.code]
    if (!bid) { console.warn(`⚠ Livro ${book.code} não encontrado no banco`); continue }

    process.stdout.write(`📖 ARA ${book.code.padEnd(4)} `)
    let bookErrors = 0

    for (let ch = 1; ch <= book.chapters; ch++) {
      const key = `ARA:${book.code}:${ch}`
      if (done.has(key)) { process.stdout.write('·'); continue }

      const verses = await fetchARA(book.ara, ch)
      if (!verses) {
        process.stdout.write('✗'); totalErrors++; bookErrors++
        await sleep(1000); continue
      }

      try {
        const n = await importChapter({ versionId: vId.ARA, bookId: bid, chapter: ch, verses })
        totalInserted += n
        done.add(key)
        saveCheckpoint(done)
        process.stdout.write('.')
      } catch (e) {
        process.stdout.write('✗'); totalErrors++; bookErrors++
      }

      await sleep(400)
    }

    console.log(bookErrors === 0 ? ' ✓' : ` ⚠ (${bookErrors} erros)`)
  }

  // ── NVI ─────────────────────────────────────────────────
  console.log('\n━━━ NVI (Nova Versão Internacional) ━━━\n')

  for (const book of BOOKS) {
    const bid = bId[book.code]
    if (!bid) { console.warn(`⚠ Livro ${book.code} não encontrado no banco`); continue }

    process.stdout.write(`📖 NVI ${book.code.padEnd(4)} `)
    let bookErrors = 0

    for (let ch = 1; ch <= book.chapters; ch++) {
      const key = `NVI:${book.code}:${ch}`
      if (done.has(key)) { process.stdout.write('·'); continue }

      const verses = await fetchNVI(book.nvi, ch)
      if (!verses) {
        process.stdout.write('✗'); totalErrors++; bookErrors++
        await sleep(1000); continue
      }

      try {
        const n = await importChapter({ versionId: vId.NVI, bookId: bid, chapter: ch, verses })
        totalInserted += n
        done.add(key)
        saveCheckpoint(done)
        process.stdout.write('.')
      } catch (e) {
        process.stdout.write('✗'); totalErrors++; bookErrors++
      }

      await sleep(450)
    }

    console.log(bookErrors === 0 ? ' ✓' : ` ⚠ (${bookErrors} erros)`)
  }

  // ── Resumo ───────────────────────────────────────────────
  console.log('\n━━━ Resumo Final ━━━')
  console.log(`Versículos inseridos: ${totalInserted}`)
  console.log(`Erros:                ${totalErrors}`)

  const counts = await db`
    SELECT bv2.code as version, COUNT(*)::int as total
    FROM bible_verses bv
    JOIN bible_versions bv2 ON bv2.id = bv.version_id
    GROUP BY bv2.code ORDER BY bv2.code
  `
  console.log('\nTotal no banco:')
  counts.forEach(r => console.log(`  ${r.version}: ${r.total} versículos`))

  if (totalErrors === 0) {
    writeFileSync(CHECKPOINT, JSON.stringify({ done: [] }))
    console.log('\n✓ Checkpoint limpo — importação 100% concluída!')
  } else {
    console.log('\n⚠ Rode novamente para reimportar capítulos com erro')
  }

  await db.end()
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message)
  process.exit(1)
})
