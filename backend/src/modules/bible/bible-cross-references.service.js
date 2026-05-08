// backend/src/modules/bible/bible-cross-references.service.js
// Referências cruzadas lidas direto do banco (importadas do OpenBible.info)

export class CrossReferencesService {
  constructor(db) {
    this.db = db
  }

  // Verifica se já tem refs no banco para este versículo
  async hasReferences(verseId) {
    const [{ count }] = await this.db`
      SELECT COUNT(*)::int AS count
      FROM cross_references
      WHERE source_verse_id = ${verseId}
    `
    return count > 0
  }
}
