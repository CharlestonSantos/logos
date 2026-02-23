// backend/src/database/seeds/import-verses.js
// Importa os versículos da Bíblia via API pública bible-api.com
// Uso: node src/database/seeds/import-verses.js

import 'dotenv/config'
import { db } from '../connection.js'

const API_BASE = 'https://bible-api.com'
const VERSION  = 'almeida'   // Tradução João Ferreira de Almeida (domínio público)
const VERSION_CODE = 'ARA'   // Almeida Revista e Atualizada

// Mapeamento: code do nosso banco → abreviação da bible-api.com
const BOOK_MAP = {
  GEN:'genesis',EXO:'exodus',LEV:'leviticus',NUM:'numbers',DEU:'deuteronomy',
  JOS:'joshua',JDG:'judges',RUT:'ruth','1SA':'1samuel','2SA':'2samuel',
  '1KI':'1kings','2KI':'2kings','1CH':'1chronicles','2CH':'2chronicles',
  EZR:'ezra',NEH:'nehemiah',EST:'esther',JOB:'job',PSA:'psalms',PRO:'proverbs',
  ECC:'ecclesiastes',SNG:'songofsolomon',ISA:'isaiah',JER:'jeremiah',
  LAM:'lamentations',EZK:'ezekiel',DAN:'daniel',HOS:'hosea',JOL:'joel',
  AMO:'amos',OBA:'obadiah',JON:'jonah',MIC:'micah',NAM:'nahum',
  HAB:'habakkuk',ZEP:'zephaniah',HAG:'haggai',ZEC:'zechariah',MAL:'malachi',
  MAT:'matthew',MRK:'mark',LUK:'luke',JHN:'john',ACT:'acts',ROM:'romans',
  '1CO':'1corinthians','2CO':'2corinthians',GAL:'galatians',EPH:'ephesians',
  PHP:'philippians',COL:'colossians','1TH':'1thessalonians','2TH':'2thessalonians',
  '1TI':'1timothy','2TI':'2timothy',TIT:'titus',PHM:'philemon',HEB:'hebrews',
  JAS:'james','1PE':'1peter','2PE':'2peter','1JN':'1john','2JN':'2john',
  '3JN':'3john',JUD:'jude',REV:'revelation',
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchChapter(bookName, chapter) {
  const url = `${API_BASE}/${bookName}+${chapter}?translation=${VERSION}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json()
}

async function main() {
  console.log('✦ Iniciando importação dos versículos...\n')

  // 1. Garante que a versão ARA existe no banco
  let [version] = await db`SELECT id FROM bible_versions WHERE code = ${VERSION_CODE}`
  if (!version) {
    ;[version] = await db`
      INSERT INTO bible_versions (code, name, language, is_default)
      VALUES (${VERSION_CODE}, 'Almeida Revista e Atualizada', 'pt-BR', false)
      RETURNING id
    `
    console.log(`✓ Versão ${VERSION_CODE} criada`)
  }

  // 2. Busca todos os livros do banco
  const books = await db`SELECT id, code, chapter_count FROM bible_books ORDER BY position`
  console.log(`📚 ${books.length} livros encontrados\n`)

  let totalVerses = 0
  let errors      = 0

  for (const book of books) {
    const apiName = BOOK_MAP[book.code]
    if (!apiName) {
      console.warn(`⚠ Sem mapeamento para ${book.code} — pulando`)
      continue
    }

    process.stdout.write(`📖 ${book.code.padEnd(5)} `)

    for (let ch = 1; ch <= book.chapterCount; ch++) {
      try {
        const data = await fetchChapter(apiName, ch)

        if (!data.verses?.length) {
          process.stdout.write('?')
          continue
        }

        // Insere todos os versículos do capítulo em batch
        const rows = data.verses.map(v => ({
          version_id: version.id,
          book_id:    book.id,
          chapter:    ch,
          verse:      v.verse,
          text:       v.text.trim().replace(/\n/g, ' '),
        }))

        await db`
          INSERT INTO bible_verses ${db(rows, 'version_id', 'book_id', 'chapter', 'verse', 'text')}
          ON CONFLICT (version_id, book_id, chapter, verse) DO NOTHING
        `

        totalVerses += rows.length
        process.stdout.write('.')

        // Respeita rate limit da API pública (200ms entre requests)
        await sleep(200)

      } catch (err) {
        process.stdout.write('✗')
        errors++
        // Espera mais em caso de erro (possível rate limit)
        await sleep(1000)
      }
    }

    console.log(` ✓ ${book.chapterCount} cap.`)
  }

  console.log(`\n✦ Importação concluída!`)
  console.log(`   Versículos importados: ${totalVerses}`)
  console.log(`   Erros:                 ${errors}`)

  await db.end()
}

main().catch(err => {
  console.error('✗ Erro fatal:', err.message)
  process.exit(1)
})
