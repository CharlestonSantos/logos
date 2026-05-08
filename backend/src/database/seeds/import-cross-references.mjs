// backend/src/database/seeds/import-cross-references.mjs
// Importa referências cruzadas do arquivo cross_references.txt (OpenBible.info)
//
// 1. Baixe o arquivo em: https://www.openbible.info/labs/cross-references/cross-references.zip
// 2. Extraia o cross_references.txt na mesma pasta deste script
// 3. Rode: node import-cross-references.mjs

import fs        from 'fs'
import path      from 'path'
import readline  from 'readline'
import postgres  from 'postgres'
import dotenv    from 'dotenv'

// Tenta encontrar o .env subindo na árvore de pastas
const possiblePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../../../.env'),
]
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p })
    console.log('✓ .env carregado de:', p)
    break
  }
}

// Se ainda não carregou, usa credenciais diretas
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:pg2025@localhost:5432/logos_dev'
console.log('✓ Conectando em:', DATABASE_URL.replace(/:([^:@]+)@/, ':****@'))

const db = postgres(DATABASE_URL, { max: 5 })

// Mapeamento OpenBible → códigos do banco
const BOOK_MAP = {
  // Génesis → Malaquias
  'Gen': 'GEN', 'Exod': 'EXO', 'Exo': 'EXO', 'Lev': 'LEV', 'Num': 'NUM',
  'Deut': 'DEU', 'Deu': 'DEU', 'Josh': 'JOS', 'Jos': 'JOS',
  'Judg': 'JDG', 'Jdg': 'JDG', 'Ruth': 'RUT', 'Rut': 'RUT',
  '1Sam': '1SA', '1Sa': '1SA', '2Sam': '2SA', '2Sa': '2SA',
  '1Kgs': '1KI', '1Ki': '1KI', '2Kgs': '2KI', '2Ki': '2KI',
  '1Chr': '1CH', '1Ch': '1CH', '2Chr': '2CH', '2Ch': '2CH',
  'Ezra': 'EZR', 'Ezr': 'EZR', 'Neh': 'NEH', 'Esth': 'EST', 'Est': 'EST',
  'Job': 'JOB', 'Ps': 'PSA', 'Psa': 'PSA', 'Prov': 'PRO', 'Pro': 'PRO',
  'Eccl': 'ECC', 'Ecc': 'ECC', 'Song': 'SNG', 'Sol': 'SNG',
  'Isa': 'ISA', 'Jer': 'JER', 'Lam': 'LAM',
  'Ezek': 'EZK', 'Eze': 'EZK', 'Dan': 'DAN', 'Hos': 'HOS',
  'Joel': 'JOL', 'Joe': 'JOL', 'Amos': 'AMO', 'Amo': 'AMO',
  'Obad': 'OBA', 'Oba': 'OBA', 'Jonah': 'JON', 'Jon': 'JON',
  'Mic': 'MIC', 'Nah': 'NAM', 'Hab': 'HAB',
  'Zeph': 'ZEP', 'Zep': 'ZEP', 'Hag': 'HAG',
  'Zech': 'ZEC', 'Zec': 'ZEC', 'Mal': 'MAL',
  // Mateus → Apocalipse
  'Matt': 'MAT', 'Mat': 'MAT', 'Mark': 'MRK', 'Mar': 'MRK',
  'Luke': 'LUK', 'Luk': 'LUK', 'John': 'JHN', 'Joh': 'JHN',
  'Acts': 'ACT', 'Act': 'ACT', 'Rom': 'ROM',
  '1Cor': '1CO', '1Co': '1CO', '2Cor': '2CO', '2Co': '2CO',
  'Gal': 'GAL', 'Eph': 'EPH', 'Phil': 'PHP', 'Php': 'PHP',
  'Col': 'COL', '1Thess': '1TH', '1Th': '1TH', '2Thess': '2TH', '2Th': '2TH',
  '1Tim': '1TI', '1Ti': '1TI', '2Tim': '2TI', '2Ti': '2TI',
  'Titus': 'TIT', 'Tit': 'TIT', 'Phlm': 'PHM', 'Phm': 'PHM',
  'Heb': 'HEB', 'Jas': 'JAS', 'James': 'JAS',
  '1Pet': '1PE', '1Pe': '1PE', '2Pet': '2PE', '2Pe': '2PE',
  '1John': '1JN', '1Jo': '1JN', '2John': '2JN', '2Jo': '2JN',
  '3John': '3JN', '3Jo': '3JN', 'Jude': 'JUD', 'Jud': 'JUD',
  'Rev': 'REV',
}

// Cache de versículos para evitar queries repetidas
const verseCache = new Map()

async function getVerseId(bookCode, chapter, verse) {
  const key = `${bookCode}:${chapter}:${verse}`
  if (verseCache.has(key)) return verseCache.get(key)

  const [row] = await db`
    SELECT v.id
    FROM bible_verses v
    JOIN bible_books  bk ON bk.id = v.book_id
    JOIN bible_versions bv ON bv.id = v.version_id
    WHERE bk.code   = ${bookCode}
      AND v.chapter = ${chapter}
      AND v.verse   = ${verse}
    ORDER BY bv.is_default DESC
    LIMIT 1
  `
  const id = row?.id || null
  verseCache.set(key, id)
  return id
}

function parseRef(ref) {
  // Formato: "Gen.1.1" ou "Gen.1.1-2" (ignora range, pega só o primeiro)
  const clean = ref.split('-')[0]
  const parts = clean.split('.')
  if (parts.length < 3) return null
  const bookCode = BOOK_MAP[parts[0]]
  if (!bookCode) return null
  return { bookCode, chapter: parseInt(parts[1]), verse: parseInt(parts[2]) }
}

async function main() {
  const filePath = path.resolve(process.cwd(), 'cross_references.txt')
  if (!fs.existsSync(filePath)) {
    console.error('❌ Arquivo cross_references.txt não encontrado nesta pasta!')
    console.error('   Baixe em: https://www.openbible.info/labs/cross-references/cross-references.zip')
    process.exit(1)
  }

  console.log('✦ Iniciando importação de referências cruzadas...')

  // Limpa tabela antes de importar
  await db`DELETE FROM cross_references`
  console.log('✓ Tabela limpa')

  const rl = readline.createInterface({
    input:     fs.createReadStream(filePath),
    crlfDelay: Infinity,
  })

  let total    = 0
  let imported = 0
  let skipped  = 0
  const BATCH  = []
  const BATCH_SIZE = 500

  async function flushBatch() {
    if (!BATCH.length) return
    for (const r of BATCH) {
      try {
        const rel = Math.max(0, Math.min(100, r.relevance))
        await db`
          INSERT INTO cross_references (source_verse_id, target_verse_id, relevance, topic_tags)
          VALUES (${r.sourceId}, ${r.targetId}, ${rel}, ARRAY[]::text[])
          ON CONFLICT DO NOTHING
        `
      } catch { /* ignora registro inválido */ }
    }
    BATCH.length = 0
  }

  for await (const line of rl) {
    if (line.startsWith('#') || !line.trim()) continue
    total++

    const cols = line.split('\t')
    if (cols.length < 2) continue

    const src = parseRef(cols[0])
    const tgt = parseRef(cols[1])
    if (!src || !tgt) { skipped++; continue }

    // Relevância: arquivo tem votes na col 3, normaliza para 0-100
    const votes = parseInt(cols[2]) || 1
    const relevance = Math.max(0, Math.min(100, Math.round((votes / 50) * 100)))

    const [sourceId, targetId] = await Promise.all([
      getVerseId(src.bookCode, src.chapter, src.verse),
      getVerseId(tgt.bookCode, tgt.chapter, tgt.verse),
    ])

    if (!sourceId || !targetId) { skipped++; continue }

    BATCH.push({ sourceId, targetId, relevance })
    imported++

    if (BATCH.length >= BATCH_SIZE) {
      await flushBatch()
      process.stdout.write(`\r  Importados: ${imported} | Pulados: ${skipped}`)
    }
  }

  await flushBatch()

  console.log(`\n\n✦ Concluído!`)
  console.log(`  Total lido:  ${total}`)
  console.log(`  Importados:  ${imported}`)
  console.log(`  Pulados:     ${skipped} (versículos não encontrados no banco)`)

  await db.end()
}

main().catch(e => { console.error(e); process.exit(1) })
