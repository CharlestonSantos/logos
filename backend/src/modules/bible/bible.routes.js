// backend/src/modules/bible/bible.routes.js
import { authenticate }  from '../../shared/middleware/authenticate.js'
import { BibleService }  from './bible.service.js'

export default async function bibleRoutes(fastify) {
  const svc = new BibleService(fastify.db)

  // ── GET /bible/versions ─────────────────────────────────────
  // Lista todas as versões disponíveis
  fastify.get('/versions', async () => {
    return svc.getVersions()
  })

  // ── GET /bible/books ────────────────────────────────────────
  // Lista todos os livros (opcionalmente filtrado por testamento)
  fastify.get('/books', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          testament: { type: 'string', enum: ['OT', 'NT'] },
        },
      },
    },
  }, async (request) => {
    return svc.getBooks(request.query.testament)
  })

  // ── GET /bible/books/:bookCode ──────────────────────────────
  // Detalhes de um livro específico
  fastify.get('/books/:bookCode', async (request) => {
    return svc.getBook(request.params.bookCode.toUpperCase())
  })

  // ── GET /bible/:versionCode/:bookCode/:chapter ──────────────
  // Lê um capítulo completo
  fastify.get('/:versionCode/:bookCode/:chapter', {
    schema: {
      params: {
        type: 'object',
        required: ['versionCode', 'bookCode', 'chapter'],
        properties: {
          versionCode: { type: 'string' },
          bookCode:    { type: 'string' },
          chapter:     { type: 'integer', minimum: 1 },
        },
      },
    },
  }, async (request) => {
    const { versionCode, bookCode, chapter } = request.params
    return svc.getChapter(
      versionCode.toUpperCase(),
      bookCode.toUpperCase(),
      chapter
    )
  })

  // ── GET /bible/:versionCode/:bookCode/:chapter/:verse ───────
  // Lê um versículo específico
  fastify.get('/:versionCode/:bookCode/:chapter/:verse', async (request) => {
    const { versionCode, bookCode, chapter, verse } = request.params
    return svc.getVerse(
      versionCode.toUpperCase(),
      bookCode.toUpperCase(),
      Number(chapter),
      Number(verse)
    )
  })

  // ── GET /bible/search?q=&version= ───────────────────────────
  // Busca textual nos versículos (full-text search PostgreSQL)
  fastify.get('/search', {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q:       { type: 'string', minLength: 2 },
          version: { type: 'string' },
          limit:   { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset:  { type: 'integer', minimum: 0, default: 0 },
        },
      },
    },
  }, async (request) => {
    const { q, version, limit, offset } = request.query
    return svc.search(q, version?.toUpperCase(), limit, offset)
  })

  // ── GET /bible/:verseId/references ─────────────────────────
  // Referências cruzadas de um versículo — rota autenticada
  fastify.get('/:verseId/references', {
    preHandler: authenticate,
  }, async (request) => {
    return svc.getCrossReferences(request.params.verseId)
  })

  // ── GET /bible/:verseId/references/topic?tag= ──────────────
  // Referências cruzadas filtradas por tema/tag
  fastify.get('/:verseId/references/topic', {
    preHandler: authenticate,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          tag: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    return svc.getCrossReferencesByTopic(
      request.params.verseId,
      request.query.tag
    )
  })
}