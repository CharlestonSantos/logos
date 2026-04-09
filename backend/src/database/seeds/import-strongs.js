// backend/src/database/seeds/import-strongs.js

import 'dotenv/config'
import { db } from '../connection.js'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../../../')

const HEB_FILE = join(ROOT, 'test-heb.js')
const GRK_FILE = join(ROOT, 'test-grk.js')

const HEB_URL = 'https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js'
const GRK_URL = 'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js'

// 🔥 Sanitizador definitivo
function safeValue(val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  if (Array.isArray(val)) return val.join(' ')
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

// Tradução básica
const KJV_TERMS = {
  father: 'pai', mother: 'mãe', son: 'filho', daughter: 'filha',
  king: 'rei', god: 'deus', lord: 'senhor',
  man: 'homem', woman: 'mulher', house: 'casa',
  land: 'terra', water: 'água', day: 'dia', night: 'noite',
  light: 'luz', darkness: 'trevas', love: 'amor',
  heart: 'coração', soul: 'alma', spirit: 'espírito',
}

// Tradução segura
function translateDef(text) {
  let result = safeValue(text)

  for (const [en, pt] of Object.entries(KJV_TERMS)) {
    result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), pt)
  }

  return result
}

// Fallback de download
async function downloadIfNeeded(url, file, name) {
  try {
    if (existsSync(file)) {
      console.log(`✓ ${name} já existe localmente`)
      return
    }

    console.log(`⬇ Baixando ${name}...`)
    const res = await fetch(url)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    writeFileSync(file, await res.text(), 'utf8')
    console.log(`  ${name} salvo ✓`)
  } catch (err) {
    if (existsSync(file)) {
      console.log(`⚠ Falha no download de ${name}, usando fallback local`)
    } else {
      throw new Error(`Sem fallback disponível para ${name}`)
    }
  }
}

// Parse do arquivo
function parseDict(filePath) {
  const content = readFileSync(filePath, 'utf8')

  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')

  if (start === -1 || end === -1) {
    throw new Error(`Erro ao parsear ${filePath}`)
  }

  return JSON.parse(content.slice(start, end + 1))
}

// 🔥 IMPORTAÇÃO CORRIGIDA
async function importDict(dict, langCode, langName) {
  const entries = Object.entries(dict)

  console.log(`\n📖 Importando ${langName} (${entries.length} verbetes)...`)

  let inserted = 0
  let errors = 0
  const BATCH = 100

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH)

    const rows = batch.map(([code, entry]) => {
      const defEnRaw =
        entry.strongs_def ||
        entry['strongs_def f'] ||
        entry['strongs_de ef'] ||
        ''

      const defPt = translateDef(defEnRaw)
      const usagePt = translateDef(entry.kjv_def)

      return {
        strongs_code: safeValue(code),
        language: safeValue(langCode),
        original: safeValue(entry.lemma),
        transliteration: safeValue(entry.xlit || entry.pron),
        definition: safeValue(defPt),
        usage: safeValue(usagePt),
      }
    })

    // 🔥 AQUI ESTÁ A CORREÇÃO DEFINITIVA
    const values = rows.map(r => [
      r.strongs_code,
      r.language,
      r.original,
      r.transliteration,
      r.definition,
      r.usage,
    ])

    try {
      await db`
        INSERT INTO strongs_dictionary
          (strongs_code, language, original, transliteration, definition, usage)
        VALUES ${db(values)}
        ON CONFLICT (strongs_code) DO UPDATE SET
          language        = EXCLUDED.language,
          original        = EXCLUDED.original,
          transliteration = EXCLUDED.transliteration,
          definition      = EXCLUDED.definition,
          usage           = EXCLUDED.usage
      `

      inserted += batch.length
    } catch (e) {
      console.error(`\n  ✗ Erro no batch ${i}-${i + BATCH}:`, e.message)
      errors += batch.length
    }

    const pct = Math.round(((i + BATCH) / entries.length) * 100)

    process.stdout.write(
      `\r  ${Math.min(i + BATCH, entries.length)}/${entries.length} (${Math.min(pct, 100)}%)`
    )
  }

  console.log(`\n  ✓ ${inserted} inseridos, ${errors} erros`)
  return inserted
}

// MAIN
async function main() {
  console.log("✦ Importação Strong's Concordance\n")

  await downloadIfNeeded(HEB_URL, HEB_FILE, 'Hebraico')
  await downloadIfNeeded(GRK_URL, GRK_FILE, 'Grego')

  console.log('\n🔍 Parseando arquivos...')
  const hebDict = parseDict(HEB_FILE)
  const grkDict = parseDict(GRK_FILE)

  console.log(`  Hebraico: ${Object.keys(hebDict).length}`)
  console.log(`  Grego:    ${Object.keys(grkDict).length}`)

  const [{ count: existing }] =
    await db`SELECT COUNT(*)::int as count FROM strongs_dictionary`

  if (existing <= 10) {
    console.log('\n🧹 Limpando registros...')
    await db`DELETE FROM strongs_dictionary`
  } else {
    console.log(`\n✓ Banco já possui ${existing} registros`)
  }

  const totalHeb = await importDict(hebDict, 'H', 'Hebraico')
  const totalGrk = await importDict(grkDict, 'G', 'Grego')

  const [{ count: final }] =
    await db`SELECT COUNT(*)::int as count FROM strongs_dictionary`

  console.log('\n━━━ Resumo ━━━')
  console.log(`Hebraico: ${totalHeb}`)
  console.log(`Grego:    ${totalGrk}`)
  console.log(`Total:    ${final}`)

  await db.end()
}

main().catch(err => {
  console.error('\n✗ Erro fatal:', err.message)
  process.exit(1)
})