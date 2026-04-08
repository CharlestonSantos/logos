// backend/src/modules/bible/bible-strong.service.js
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()
const cache  = new Map()

export class BibleStrongService {
  async lookup({ word, testament }) {
    const langCode = testament === 'NT' ? 'G' : 'H'
    const lang     = testament === 'NT' ? 'grego' : 'hebraico'
    const key      = `${word.toLowerCase()}:${langCode}`

    if (cache.has(key)) return cache.get(key)

    const result = await this._generate(word, lang, langCode)
    if (result) cache.set(key, result)
    return result
  }

  async _generate(word, lang, langCode) {
    const msg = await client.messages.create({
      model:      'claude-sonnet-4-6',          // ✅ model string corrigido
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
    try   { return JSON.parse(clean) }
    catch { return null }
  }
}
