// backend/src/database/seeds/translate-strongs.js

import 'dotenv/config'
import { db } from '../connection.js'
import pkg from '@vitalets/google-translate-api'
const { translate } = pkg

// 🔧 CONFIG
const CONCURRENCY = 3        // 🔥 quantas traduções simultâneas (3 = seguro)
const BATCH_SIZE = 30        // maior porque agora é paralelo
const BASE_DELAY = 800       // delay leve entre execuções
const BATCH_DELAY = 4000     // pausa entre lotes

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 🔥 tradução com retry + anti rate limit
async function traduzirTexto(texto, tentativa = 1) {
  try {
    const res = await translate(texto, { to: 'pt' })
    return res?.text ?? null

  } catch (err) {
    const msg = err.message || ''

    console.log(`⚠ Erro tradução (tentativa ${tentativa}):`, msg)

    // 🚫 rate limit detectado
    if (msg.includes('Too Many Requests')) {
      const wait = 4000 * tentativa
      console.log(`🚫 Rate limit! aguardando ${wait}ms...`)
      await sleep(wait)
    } else {
      await sleep(1000)
    }

    if (tentativa < 5) {
      return traduzirTexto(texto, tentativa + 1)
    }

    return null
  }
}

// 🔥 worker individual
async function processarRegistro(row, counters) {
  const codigo = row.strongsCode
  const texto = row.definition

  if (!codigo) {
    console.log('⚠ Sem código:', row)
    counters.skipped++
    return
  }

  if (!texto) {
    console.log(`⚠ Sem definition: ${codigo}`)
    counters.skipped++
    return
  }

  const traducao = await traduzirTexto(texto)

  if (!traducao || typeof traducao !== 'string') {
    console.log(`⚠ Tradução inválida: ${codigo}`)
    counters.fail++
    return
  }

  try {
    await db`
      UPDATE strongs_dictionary
      SET definition_pt = ${traducao}
      WHERE strongs_code = ${codigo}
    `

    console.log(`✔ ${codigo}`)
    counters.success++

  } catch (err) {
    console.log(`❌ DB erro (${codigo}):`, err.message)
    counters.fail++
  }

  await sleep(BASE_DELAY)
}

// 🔥 executor com limite de concorrência
async function processarBatch(batch, counters) {
  const executing = []

  for (const row of batch) {
    const p = processarRegistro(row, counters)
    executing.push(p)

    if (executing.length >= CONCURRENCY) {
      await Promise.race(executing)
      executing.splice(0, 1)
    }
  }

  await Promise.all(executing)
}

async function main() {
  console.log("🌍 Tradução Strong's ULTRA\n")

  const rows = await db`
    SELECT strongs_code, definition
    FROM strongs_dictionary
    WHERE definition_pt IS NULL
    LIMIT 2000
  `

  console.log(`📊 ${rows.length} registros\n`)

  const counters = {
    success: 0,
    fail: 0,
    skipped: 0
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    console.log(`🚀 Lote ${i / BATCH_SIZE + 1}`)

    await processarBatch(batch, counters)

    const pct = Math.round((Math.min(i + BATCH_SIZE, rows.length) / rows.length) * 100)
    console.log(`📦 Progresso: ${pct}%\n`)

    console.log('⏸ Pausa anti-bloqueio...\n')
    await sleep(BATCH_DELAY)
  }

  console.log('\n━━━ Resultado ━━━')
  console.log(`✅ Sucesso:  ${counters.success}`)
  console.log(`❌ Falha:    ${counters.fail}`)
  console.log(`⚠ Ignorados: ${counters.skipped}`)

  await db.end()
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message)
})