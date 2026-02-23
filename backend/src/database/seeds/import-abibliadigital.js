// backend/src/database/seeds/import-abibliadigital.js
// Importa versículos via abibliadigital.com.br — SEM necessidade de token
// Uso: node src/database/seeds/import-abibliadigital.js

import 'dotenv/config'
import { db } from '../connection.js'

const API_BASE     = 'https://www.abibliadigital.com.br/api'
const VERSION_CODE = 'NVI'

// Mapeamento code banco → abreviação da abibliadigital
const BOOK_MAP = {
  GEN:'gn', EXO:'ex', LEV:'lv', NUM:'nm', DEU:'dt',
  JOS:'js', JDG:'jz', RUT:'rt', '1SA':'1sm', '2SA':'2sm',
  '1KI':'1rs', '2KI':'2rs', '1CH':'1cr', '2CH':'2cr',
  EZR:'ed', NEH:'ne', EST:'et', JOB:'jo', PSA:'sl',
  PRO:'pv', ECC:'ec', SNG:'ct', ISA:'is', JER:'jr',
  LAM:'lm', EZK:'ez', DAN:'dn', HOS:'os', JOL:'jl',
  AMO:'am', OBA:'ob', JON:'jn', MIC:'mq', NAM:'na',
  HAB:'hc', ZEP:'sf', HAG:'ag', ZEC:'zc', MAL:'ml',
  MAT:'mt', MRK:'mc', LUK:'lc', JHN:'jo', ACT:'at',
  ROM:'rm', '1CO':'1co', '2CO':'2co', GAL:'gl', EPH:'ef',
  PHP:'fp', COL:'cl', '1TH':'1ts', '2TH':'2ts',
  '1TI':'1tm', '2TI':'2tm', TIT:'tt', PHM:'fm',
  HEB:'hb', JAS:'tg', '1PE':'1pe', '2PE':'2pe',
  '1JN':'1jo', '2JN':'2jo', '3JN':'3jo', JUD:'jd', REV:'ap',
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchChapter(bookAbr, chapter, retries = 4) {
  const url = `${API_BASE}/verses/nvi/${bookAbr}/${chapter}`
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (res.status === 429) {
        console.log('\n⏳ Rate limit — aguardando 30s...')
        await sleep(30_000)
        continue
      }
      if (res.status === 404) return null  // capítulo não existe
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch {
      await sleep(2000 * (i + 1))
    }
  }
  return null
}

async function main() {
  console.log('✦ Importando versículos via ABíblia Digital (sem token)...\n')

  // Garante versão NVI no banco
  let [version] = await db`SELECT id FROM bible_versions WHERE code = ${VERSION_CODE}`
  if (!version) {
    ;[version] = await db`
      INSERT INTO bible_versions (code, name, language, is_default)
      VALUES ('NVI', 'Nova Versão Internacional', 'pt-BR', true)
      RETURNING id
    `
    console.log('✓ Versão NVI criada\n')
  }

  // Limpa versículos anteriores da NVI para reimportar limpo
  await db`DELETE FROM bible_verses WHERE version_id = ${version.id}`
  console.log('✓ Versículos anteriores removidos\n')

  const books = await db`SELECT id, code, chapter_count FROM bible_books ORDER BY position`

  let totalVerses = 0
  let totalErrors = 0

  for (const book of books) {
    const abr = BOOK_MAP[book.code]
    if (!abr) {
      console.warn(`⚠ Sem mapeamento para ${book.code} — pulando`)
      continue
    }

    process.stdout.write(`📖 ${book.code.padEnd(5)} `)

    for (let ch = 1; ch <= book.chapterCount; ch++) {
      const data = await fetchChapter(abr, ch)

      if (!data?.verses?.length) {
        process.stdout.write('✗')
        totalErrors++
        await sleep(500)
        continue
      }

      const rows = data.verses.map(v => ({
        version_id: version.id,
        book_id:    book.id,
        chapter:    ch,
        verse:      v.number,
        text:       v.text.trim().replace(/\n/g, ' '),
      }))

      await db`
        INSERT INTO bible_verses ${db(rows, 'version_id','book_id','chapter','verse','text')}
        ON CONFLICT (version_id, book_id, chapter, verse) DO NOTHING
      `

      totalVerses += rows.length
      process.stdout.write('.')
      await sleep(250)
    }

    console.log(` (${book.chapterCount} cap.)`)
  }

  console.log(`\n✦ Importação concluída!`)
  console.log(`   Versículos importados: ${totalVerses}`)
  console.log(`   Erros:                 ${totalErrors}`)

  await db.end()
}

main().catch(err => {
  console.error('✗ Erro fatal:', err.message)
  process.exit(1)
})