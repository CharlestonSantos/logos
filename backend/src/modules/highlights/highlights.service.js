// backend/src/modules/highlights/highlights.service.js

export class HighlightsService {
  constructor(db) {
    this.db = db
  }

  // Lista todas as marcações do usuário
  async list(userId) {
    const highlights = await this.db`
      SELECT
        h.id,
        h.verse_id,
        h.color,
        h.created_at,
        v.chapter,
        v.verse,
        bk.code AS book_code
      FROM highlights h
      JOIN bible_verses v  ON v.id  = h.verse_id
      JOIN bible_books  bk ON bk.id = v.book_id
      WHERE h.user_id = ${userId}
      ORDER BY bk.position, v.chapter, v.verse
    `
    return { highlights }
  }

  // Marcações de um capítulo específico
  async getByChapter(userId, bookCode, chapter) {
    const highlights = await this.db`
      SELECT
        h.id,
        h.verse_id,
        h.color,
        h.created_at
      FROM highlights h
      JOIN bible_verses v  ON v.id  = h.verse_id
      JOIN bible_books  bk ON bk.id = v.book_id
      WHERE h.user_id  = ${userId}
        AND bk.code    = ${bookCode.toUpperCase()}
        AND v.chapter  = ${chapter}
    `
    return { highlights }
  }

  // Cria ou atualiza marcação (upsert)
  async upsert(userId, { verseId, color }) {
    const [highlight] = await this.db`
      INSERT INTO highlights (user_id, verse_id, color)
      VALUES (${userId}, ${verseId}, ${color})
      ON CONFLICT (user_id, verse_id)
      DO UPDATE SET color = EXCLUDED.color, created_at = NOW()
      RETURNING id, verse_id, color, created_at
    `
    return { highlight }
  }

  // Remove marcação
  async remove(userId, verseId) {
    await this.db`
      DELETE FROM highlights
      WHERE user_id  = ${userId}
        AND verse_id = ${verseId}
    `
  }
}
