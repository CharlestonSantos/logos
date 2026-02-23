// backend/src/modules/notes/notes.service.js
import { NotFoundError, UnauthorizedError } from '../../shared/errors/AppError.js'

export class NotesService {
  constructor(db) {
    this.db = db
  }

  // ── Listar notas ─────────────────────────────────────────────
  async list(userId, { q, tag, book, limit = 20, offset = 0 }) {
    const notes = await this.db`
      SELECT
        n.id,
        n.content,
        n.created_at,
        n.updated_at,
        -- Versículo vinculado (opcional)
        v.id      AS verse_id,
        v.chapter,
        v.verse   AS verse_num,
        v.text    AS verse_text,
        bk.code   AS book_code,
        bk.name   AS book_name,
        bk.abbr   AS book_abbr,
        -- Tags
        COALESCE(
          ARRAY_AGG(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
          '{}'
        ) AS tags
      FROM notes n
      LEFT JOIN bible_verses  v  ON v.id  = n.verse_id
      LEFT JOIN bible_books   bk ON bk.id = v.book_id
      LEFT JOIN note_tag_links ntl ON ntl.note_id = n.id
      LEFT JOIN note_tags      t   ON t.id = ntl.tag_id AND t.user_id = ${userId}
      WHERE n.user_id = ${userId}
        ${q ? this.db`AND n.content ILIKE ${'%' + q + '%'}` : this.db``}
        ${book ? this.db`AND bk.code = ${book.toUpperCase()}` : this.db``}
        ${tag ? this.db`AND t.name = ${tag}` : this.db``}
      GROUP BY n.id, v.id, bk.id
      ORDER BY n.updated_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    const [{ count }] = await this.db`
      SELECT COUNT(DISTINCT n.id)::int AS count
      FROM notes n
      LEFT JOIN bible_verses  v   ON v.id  = n.verse_id
      LEFT JOIN bible_books   bk  ON bk.id = v.book_id
      LEFT JOIN note_tag_links ntl ON ntl.note_id = n.id
      LEFT JOIN note_tags      t   ON t.id = ntl.tag_id AND t.user_id = ${userId}
      WHERE n.user_id = ${userId}
        ${q ? this.db`AND n.content ILIKE ${'%' + q + '%'}` : this.db``}
        ${book ? this.db`AND bk.code = ${book.toUpperCase()}` : this.db``}
        ${tag ? this.db`AND t.name = ${tag}` : this.db``}
    `

    return {
      notes,
      pagination: { total: count, limit, offset, hasMore: offset + limit < count },
    }
  }

  // ── Buscar por ID ────────────────────────────────────────────
  async getById(userId, noteId) {
    const [note] = await this.db`
      SELECT
        n.id, n.content, n.created_at, n.updated_at,
        v.id AS verse_id, v.chapter, v.verse AS verse_num, v.text AS verse_text,
        bk.code AS book_code, bk.name AS book_name, bk.abbr AS book_abbr,
        COALESCE(
          ARRAY_AGG(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
          '{}'
        ) AS tags
      FROM notes n
      LEFT JOIN bible_verses  v   ON v.id  = n.verse_id
      LEFT JOIN bible_books   bk  ON bk.id = v.book_id
      LEFT JOIN note_tag_links ntl ON ntl.note_id = n.id
      LEFT JOIN note_tags      t   ON t.id = ntl.tag_id
      WHERE n.id = ${noteId}
      GROUP BY n.id, v.id, bk.id
      LIMIT 1
    `
    if (!note) throw new NotFoundError('Nota')
    if (note.userId !== userId) throw new UnauthorizedError()
    return { note }
  }

  // ── Criar nota ───────────────────────────────────────────────
  async create(userId, body) {
    const content = body.content
    const tags = body.tags || []
    const verseIdVal = body.verseId != null ? body.verseId : null

    const [note] = await this.db`
    INSERT INTO notes (user_id, verse_id, content)
    VALUES (${userId}, ${verseIdVal}, ${content})
    RETURNING id, content, verse_id, created_at, updated_at
  `

    if (tags.length) await this._syncTags(userId, note.id, tags)
    return { note: { ...note, tags } }
  }

  // ── Atualizar nota ───────────────────────────────────────────
  async update(userId, noteId, { content, tags }) {
    const [existing] = await this.db`SELECT id, user_id FROM notes WHERE id = ${noteId} LIMIT 1`
    if (!existing) throw new NotFoundError('Nota')
    if (existing.userId !== userId) throw new UnauthorizedError()

    const [note] = await this.db`
      UPDATE notes
      SET content    = COALESCE(${content ?? null}, content),
          updated_at = NOW()
      WHERE id = ${noteId}
      RETURNING id, content, verse_id, created_at, updated_at
    `

    if (tags !== undefined) await this._syncTags(userId, noteId, tags)

    return { note: { ...note, tags: tags ?? [] } }
  }

  // ── Deletar nota ─────────────────────────────────────────────
  async delete(userId, noteId) {
    const [existing] = await this.db`SELECT id, user_id FROM notes WHERE id = ${noteId} LIMIT 1`
    if (!existing) throw new NotFoundError('Nota')
    if (existing.userId !== userId) throw new UnauthorizedError()

    await this.db`DELETE FROM notes WHERE id = ${noteId}`
  }

  // ── Listar tags do usuário ───────────────────────────────────
  async getTags(userId) {
    const tags = await this.db`
      SELECT t.id, t.name, COUNT(ntl.note_id)::int AS note_count
      FROM note_tags t
      LEFT JOIN note_tag_links ntl ON ntl.tag_id = t.id
      WHERE t.user_id = ${userId}
      GROUP BY t.id
      ORDER BY note_count DESC, t.name
    `
    return { tags }
  }

  // ── Sincronizar tags (interno) ───────────────────────────────
  async _syncTags(userId, noteId, tagNames) {
    // Remove vínculos antigos
    await this.db`DELETE FROM note_tag_links WHERE note_id = ${noteId}`

    if (!tagNames.length) return

    for (const name of tagNames) {
      const trimmed = name.trim().toLowerCase()
      if (!trimmed) continue

      // Upsert da tag
      const [tag] = await this.db`
        INSERT INTO note_tags (user_id, name)
        VALUES (${userId}, ${trimmed})
        ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `

      // Vincula à nota
      await this.db`
        INSERT INTO note_tag_links (note_id, tag_id)
        VALUES (${noteId}, ${tag.id})
        ON CONFLICT DO NOTHING
      `
    }
  }
}
