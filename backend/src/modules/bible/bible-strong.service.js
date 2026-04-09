// backend/src/modules/bible/bible-strong.service.js
// Busca Strong's no banco local primeiro; Claude AI só como fallback

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()
const cache  = new Map()

export class BibleStrongService {
  constructor(db) {
    this.db = db
  }

  async lookup({ word, testament }) {
    const langCode = testament === 'NT' ? 'G' : 'H'
    const key      = `${word.toLowerCase()}:${langCode}`

    if (cache.has(key)) return cache.get(key)

    // ── 1. Busca no banco local ──────────────────────────────
    let result = await this._lookupDB(word, langCode)

    // ── 2. Fallback: Claude AI ───────────────────────────────
    if (!result) {
      console.log(`[Strong's] "${word}" não encontrado no banco — tentando Claude AI`)
      result = await this._lookupAI(word, testament === 'NT' ? 'grego' : 'hebraico', langCode)
    }

    if (result) cache.set(key, result)
    return result
  }

  // ── Busca no banco por palavra portuguesa ──────────────────
  async _lookupDB(word, langCode) {
    try {
      const rows = await this.db`
        SELECT
          strongs_code    AS strongs,
          language        AS lang,
          original,
          transliteration AS translit,
          definition,
          usage
        FROM strongs_dictionary
        WHERE language = ${langCode}
          AND (
            definition      ILIKE ${'%' + word + '%'}
            OR transliteration ILIKE ${'%' + word + '%'}
          )
        ORDER BY
          CASE WHEN definition ILIKE ${word + '%'} THEN 0 ELSE 1 END,
          length(definition)
        LIMIT 1
      `
      return rows.length > 0 ? rows[0] : null
    } catch (e) {
      console.error('[Strong\'s] Erro ao buscar no banco:', e.message)
      return null
    }
  }

  // ── Fallback: Claude AI ────────────────────────────────────
  async _lookupAI(word, lang, langCode) {
    try {
      const msg = await client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Você é especialista em concordância Strong bíblica.
Para a palavra portuguesa "${word}" (idioma original: ${lang}), retorne SOMENTE JSON válido sem markdown:
{
  "strongs": "${langCode}XXXX",
  "lang": "${langCode}",
  "original": "palavra em ${lang}",
  "translit": "transliteração",
  "definition": "definição em português (2-3 frases)",
  "usage": "uso bíblico (1 frase)"
}`
        }],
      })

      const text  = msg.content[0]?.text?.trim() || '{}'
      const clean = text.replace(/```json|```/g, '').trim()
      const data  = JSON.parse(clean)

      // Salva no banco para evitar chamadas futuras à AI
      if (data?.strongs) await this._saveToDb(data)

      return data
    } catch (e) {
      console.error('[Strong\'s] Erro no Claude AI:', e.message)
      return null
    }
  }

  // ── Persiste resultado da AI no banco ─────────────────────
  async _saveToDb(data) {
    try {
      await this.db`
        INSERT INTO strongs_dictionary
          (strongs_code, language, original, transliteration, definition, usage)
        VALUES
          (${data.strongs}, ${data.lang}, ${data.original}, ${data.translit}, ${data.definition}, ${data.usage})
        ON CONFLICT (strongs_code) DO NOTHING
      `
      console.log(`[Strong's] Salvo no banco: ${data.strongs}`)
    } catch (e) {
      console.error('[Strong\'s] Erro ao salvar no banco:', e.message)
    }
  }
}
