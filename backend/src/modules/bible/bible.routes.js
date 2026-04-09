// backend/src/modules/bible/bible.routes.js
import { authenticate }       from '../../shared/middleware/authenticate.js'
import { BibleService }       from './bible.service.js'
import { BibleStrongService } from './bible-strong.service.js'

export default async function bibleRoutes(fastify) {
  const svc       = new BibleService(fastify.db)
  const strongSvc = new BibleStrongService(fastify.db)

  // ── GET /bible/versions ─────────────────────────────────────
  fastify.get('/versions', async () => {
    return svc.getVersions()
  })

  // ── GET /bible/books ────────────────────────────────────────
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
  fastify.get('/books/:bookCode', async (request) => {
    return svc.getBook(request.params.bookCode.toUpperCase())
  })

  // ── GET /bible/:versionCode/:bookCode/:chapter ──────────────
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
  fastify.get('/:versionCode/:bookCode/:chapter/:verse', async (request) => {
    const { versionCode, bookCode, chapter, verse } = request.params
    return svc.getVerse(
      versionCode.toUpperCase(),
      bookCode.toUpperCase(),
      Number(chapter),
      Number(verse)
    )
  })

  // ── GET /bible/search ───────────────────────────────────────
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
  fastify.get('/:verseId/references', {
    preHandler: authenticate,
  }, async (request) => {
    return svc.getCrossReferences(request.params.verseId)
  })

  // ── GET /bible/:verseId/references/topic ───────────────────
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

  // ── POST /bible/strong ──────────────────────────────────────
  // Busca definição Strong para uma palavra
  fastify.post('/strong', {
    preHandler: authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['word'],
        properties: {
          word:      { type: 'string' },
          testament: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { word, testament } = request.body
    const result = await strongSvc.lookup({ word, testament: testament || 'OT' })
    if (!result) return reply.code(404).send({ error: 'Não encontrado' })
    return result
  })
}
