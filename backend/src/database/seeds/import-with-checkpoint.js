// backend/src/database/seeds/import-with-checkpoint.js
// Importa versículos da bible-api.com e salva progresso localmente
// Se travar, rode novamente — continua de onde parou
// Uso: node src/database/seeds/import-with-checkpoint.js

import 'dotenv/config'
import { db } from '../connection.js'
import { writeFileSync, readFileSync, existsSync, appendFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname  = dirname(fileURLToPath(import.meta.url))
const CHECKPOINT = join(__dirname, 'checkpoint.json')
const SQL_FILE   = join(__dirname, 'verses.sql')
const API_BASE   = 'https://bible-api.com'
const VERSION    = 'almeida'
const VERSION_CODE = 'ARA'

// Todos os 66 livros com capítulos
const BOOKS = [
  ['GEN','genesis',50],['EXO','exodus',40],['LEV','leviticus',27],
  ['NUM','numbers',36],['DEU','deuteronomy',34],['JOS','joshua',24],
  ['JDG','judges',21],['RUT','ruth',4],['1SA','1samuel',31],
  ['2SA','2samuel',24],['1KI','1kings',22],['2KI','2kings',25],
  ['1CH','1chronicles',29],['2CH','2chronicles',36],['EZR','ezra',10],
  ['NEH','nehemiah',13],['EST','esther',10],['JOB','job',42],
  ['PSA','psalms',150],['PRO','proverbs',31],['ECC','ecclesiastes',12],
  ['SNG','songofsolomon',8],['ISA','isaiah',66],['JER','jeremiah',52],
  ['LAM','lamentations',5],['EZK','ezekiel',48],['DAN','daniel',12],
  ['HOS','hosea',14],['JOL','joel',3],['AMO','amos',9],
  ['OBA','obadiah',1],['JON','jonah',4],['MIC','micah',7],
  ['NAM','nahum',3],['HAB','habakkuk',3],['ZEP','zephaniah',3],
  ['HAG','haggai',2],['ZEC','zechariah',14],['MAL','malachi',4],
  ['MAT','matthew',28],['MRK','mark',16],['LUK','luke',24],
  ['JHN','john',21],['ACT','acts',28],['ROM','romans',16],
  ['1CO','1corinthians',16],['2CO','2corinthians',13],['GAL','galatians',6],
  ['EPH','ephesians',6],['PHP','philippians',4],['COL','colossians',4],
  ['1TH','1thessalonians',5],['2TH','2thessalonians',3],['1TI','1timothy',6],
  ['2TI','2timothy',4],['TIT','titus',3],['PHM','philemon',1],
  ['HEB','hebrews',13],['JAS','james',5],['1PE','1peter',5],
  ['2PE','2peter',3],['1JN','1john',5],['2JN','2john',1],
  ['3JN','3john',1],['JUD','jude',1],['REV','revelation',22],
]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT)) return { completedChapters: [] }
  try { return JSON.parse(readFileSync(CHECKPOINT, 'utf8')) }
  catch { return { completedChapters: [] } }
}

function saveCheckpoint(data) {
  writeFileSync(CHECKPOINT, JSON.stringify(data, null, 2))
}

function escapeSql(str) {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\').trim()
}

async function fetchChapter(apiName, chapter, retries = 5) {
  const url = `${API_BASE}/${apiName}+${chapter}?translation=${VERSION}`
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (res.status === 429) { await sleep(10_000); continue }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data
    } catch (e) {
      if (i < retries - 1) await sleep(3000 * (i + 1))
    }
  }
  return null
}

async function main() {
  console.log('✦ Importação com checkpoint\n')

  // Carrega checkpoint
  const cp = loadCheckpoint()
  const done = new Set(cp.completedChapters || [])
  console.log(`✓ Checkpoint: ${done.size} capítulos já importados\n`)

  // Garante versão no banco
  let [version] = await db`SELECT id FROM bible_versions WHERE code = ${VERSION_CODE}`
  if (!version) {
    ;[version] = await db`
      INSERT INTO bible_versions (code, name, language, is_default)
      VALUES (${VERSION_CODE}, 'Almeida Revista e Atualizada', 'pt-BR', false)
      RETURNING id
    `
  }

  // Busca IDs dos livros
  const bookRows = await db`SELECT id, code FROM bible_books`
  const bookIds  = Object.fromEntries(bookRows.map(b => [b.code, b.id]))

  let totalInserted = 0
  let totalErrors   = 0

  for (const [code, apiName, chapCount] of BOOKS) {
    const bookId = bookIds[code]
    if (!bookId) { console.warn(`⚠ Livro ${code} não encontrado no banco`); continue }

    process.stdout.write(`📖 ${code.padEnd(5)} `)
    let bookOk = true

    for (let ch = 1; ch <= chapCount; ch++) {
      const key = `${code}:${ch}`
      if (done.has(key)) { process.stdout.write('·'); continue }

      const data = await fetchChapter(apiName, ch)

      if (!data?.verses?.length) {
        process.stdout.write('✗')
        totalErrors++
        bookOk = false
        await sleep(1000)
        continue
      }

      // Insere no banco
      const rows = data.verses.map(v => ({
        version_id: version.id,
        book_id:    bookId,
        chapter:    ch,
        verse:      v.verse,
        text:       v.text.trim().replace(/\n/g, ' '),
      }))

      try {
        await db`
          INSERT INTO bible_verses ${db(rows, 'version_id','book_id','chapter','verse','text')}
          ON CONFLICT (version_id, book_id, chapter, verse) DO NOTHING
        `
        totalInserted += rows.length
        done.add(key)

        // Salva checkpoint a cada capítulo
        saveCheckpoint({ completedChapters: [...done] })

        process.stdout.write('.')
      } catch (e) {
        process.stdout.write('✗')
        totalErrors++
        bookOk = false
      }

      await sleep(300)
    }

    console.log(bookOk ? ` ✓` : ` ⚠`)
  }

  console.log(`\n✦ Concluído!`)
  console.log(`   Versículos inseridos: ${totalInserted}`)
  console.log(`   Erros:                ${totalErrors}`)

  if (totalErrors === 0) {
    // Limpa checkpoint se tudo ok
    writeFileSync(CHECKPOINT, JSON.stringify({ completedChapters: [] }))
    console.log('   Checkpoint limpo ✓')
  } else {
    console.log('   ⚠ Rode novamente para reimportar capítulos com erro')
  }

  // Confirma total no banco
  const [{ count }] = await db`SELECT COUNT(*)::int AS count FROM bible_verses WHERE version_id = ${version.id}`
  console.log(`   Total no banco:       ${count} versículos`)

  await db.end()
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message)
  process.exit(1)
})