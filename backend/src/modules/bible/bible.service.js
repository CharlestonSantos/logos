// backend/src/modules/bible/bible.service.js
import { NotFoundError } from '../../shared/errors/AppError.js'

export class BibleService {
  constructor(db) {
    this.db = db
  }

  // ── Versões disponíveis ─────────────────────────────────────
  async getVersions() {
    const versions = await this.db`
      SELECT id, code, name, language, is_default
      FROM bible_versions
      ORDER BY is_default DESC, name
    `
    return { versions }
  }

  // ── Lista de livros ─────────────────────────────────────────
  async getBooks(testament) {
    const books = testament
      ? await this.db`
          SELECT id, code, name, abbr, testament, position, chapter_count
          FROM bible_books
          WHERE testament = ${testament}
          ORDER BY position
        `
      : await this.db`
          SELECT id, code, name, abbr, testament, position, chapter_count
          FROM bible_books
          ORDER BY position
        `

    const ot = books.filter(b => b.testament === 'OT')
    const nt = books.filter(b => b.testament === 'NT')

    return { books, ot, nt, total: books.length }
  }

  // ── Detalhes de um livro ────────────────────────────────────
  async getBook(bookCode) {
    const [book] = await this.db`
      SELECT id, code, name, abbr, testament, position, chapter_count
      FROM bible_books
      WHERE code = ${bookCode}
      LIMIT 1
    `
    if (!book) throw new NotFoundError(`Livro "${bookCode}"`)
    return { book }
  }

  // ── Capítulo completo ───────────────────────────────────────
  async getChapter(versionCode, bookCode, chapter) {
    // Busca versão e livro em paralelo
    const [[version], [book]] = await Promise.all([
      this.db`SELECT id, code, name FROM bible_versions WHERE code = ${versionCode} LIMIT 1`,
      this.db`SELECT id, code, name, abbr, chapter_count FROM bible_books WHERE code = ${bookCode} LIMIT 1`,
    ])

    if (!version) throw new NotFoundError(`Versão "${versionCode}"`)
    if (!book)    throw new NotFoundError(`Livro "${bookCode}"`)
    if (chapter < 1 || chapter > book.chapterCount) {
      throw new NotFoundError(`Capítulo ${chapter} em ${book.name}`)
    }

    const verses = await this.db`
      SELECT
        v.id,
        v.verse,
        v.text
      FROM bible_verses v
      WHERE v.version_id = ${version.id}
        AND v.book_id    = ${book.id}
        AND v.chapter    = ${chapter}
      ORDER BY v.verse
    `

    if (!verses.length) throw new NotFoundError('Capítulo não encontrado ou sem versículos cadastrados.')

    // Navegação: capítulo anterior / próximo
    const prev = chapter > 1
      ? { book: bookCode, chapter: chapter - 1 }
      : null

    const next = chapter < book.chapterCount
      ? { book: bookCode, chapter: chapter + 1 }
      : null

    return {
      version: { code: version.code, name: version.name },
      book:    { code: book.code, name: book.name, abbr: book.abbr, chapterCount: book.chapterCount },
      chapter,
      verses,
      navigation: { prev, next },
      meta: { totalVerses: verses.length },
    }
  }

  // ── Versículo individual ────────────────────────────────────
  async getVerse(versionCode, bookCode, chapter, verse) {
    const [row] = await this.db`
      SELECT
        v.id, v.chapter, v.verse, v.text,
        bk.code AS book_code, bk.name AS book_name, bk.abbr,
        bv.code AS version_code, bv.name AS version_name
      FROM bible_verses v
      JOIN bible_books    bk ON bk.id = v.book_id
      JOIN bible_versions bv ON bv.id = v.version_id
      WHERE bv.code = ${versionCode}
        AND bk.code = ${bookCode}
        AND v.chapter = ${chapter}
        AND v.verse   = ${verse}
      LIMIT 1
    `
    if (!row) throw new NotFoundError(`${bookCode} ${chapter}:${verse}`)
    return { verse: row }
  }

  // ── Busca textual full-text (PostgreSQL tsvector) ───────────
  async search(query, versionCode, limit = 20, offset = 0) {
    // Normaliza a query para tsquery
    const tsQuery = query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(w => `${w}:*`)   // prefixo para busca parcial
      .join(' & ')

    // Versão padrão se não especificada
    const versionFilter = versionCode
      ? this.db`AND bv.code = ${versionCode}`
      : this.db``

    const rows = await this.db`
      SELECT
        v.id,
        v.chapter,
        v.verse,
        v.text,
        bk.code  AS book_code,
        bk.name  AS book_name,
        bk.abbr,
        bv.code  AS version_code,
        ts_rank(v.text_search, to_tsquery('portuguese', ${tsQuery})) AS rank
      FROM bible_verses v
      JOIN bible_books    bk ON bk.id = v.book_id
      JOIN bible_versions bv ON bv.id = v.version_id
      WHERE v.text_search @@ to_tsquery('portuguese', ${tsQuery})
      ${versionFilter}
      ORDER BY rank DESC, bk.position, v.chapter, v.verse
      LIMIT ${limit}
      OFFSET ${offset}
    `

    const [{ count }] = await this.db`
      SELECT COUNT(*)::int AS count
      FROM bible_verses v
      JOIN bible_versions bv ON bv.id = v.version_id
      WHERE v.text_search @@ to_tsquery('portuguese', ${tsQuery})
      ${versionFilter}
    `

    return {
      query,
      results: rows,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    }
  }

  // ── Referências cruzadas de um versículo ───────────────────
  async getCrossReferences(verseId) {
    const refs = await this.db`
      SELECT
        cr.id,
        cr.relevance,
        cr.topic_tags,
        -- Versículo alvo
        tv.id      AS target_id,
        tv.chapter AS target_chapter,
        tv.verse   AS target_verse,
        tv.text    AS target_text,
        bk.code    AS target_book_code,
        bk.name    AS target_book_name,
        bk.abbr    AS target_book_abbr
      FROM cross_references cr
      JOIN bible_verses tv  ON tv.id = cr.target_verse_id
      JOIN bible_books  bk  ON bk.id = tv.book_id
      WHERE cr.source_verse_id = ${verseId}
      ORDER BY cr.relevance DESC, bk.position, tv.chapter, tv.verse
    `

    // Agrupa por tópico para facilitar o frontend
    const byTopic = {}
    for (const ref of refs) {
      const tags = ref.topicTags || ['geral']
      for (const tag of tags) {
        if (!byTopic[tag]) byTopic[tag] = []
        byTopic[tag].push(ref)
      }
    }

    return {
      verseId,
      total: refs.length,
      references: refs,
      byTopic,
    }
  }

  // ── Referências cruzadas por tema/tag ──────────────────────
  async getCrossReferencesByTopic(verseId, tag) {
    const tagFilter = tag
      ? this.db`AND ${tag} = ANY(cr.topic_tags)`
      : this.db``

    const refs = await this.db`
      SELECT
        cr.id,
        cr.relevance,
        cr.topic_tags,
        tv.id      AS target_id,
        tv.chapter AS target_chapter,
        tv.verse   AS target_verse,
        tv.text    AS target_text,
        bk.code    AS target_book_code,
        bk.name    AS target_book_name,
        bk.abbr    AS target_book_abbr
      FROM cross_references cr
      JOIN bible_verses tv  ON tv.id = cr.target_verse_id
      JOIN bible_books  bk  ON bk.id = tv.book_id
      WHERE cr.source_verse_id = ${verseId}
      ${tagFilter}
      ORDER BY cr.relevance DESC
    `

    return {
      verseId,
      tag: tag || null,
      total: refs.length,
      references: refs,
    }
  }
}