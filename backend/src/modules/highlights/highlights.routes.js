// backend/src/modules/highlights/highlights.routes.js
import { authenticate } from '../../shared/middleware/authenticate.js'
import { HighlightsService } from './highlights.service.js'

export default async function highlightRoutes(fastify) {
  const svc = new HighlightsService(fastify.db)

  fastify.addHook('preHandler', authenticate)

  // GET /highlights — todas as marcações do usuário
  fastify.get('/', async (request) => {
    return svc.list(request.user.sub)
  })

  // GET /highlights/chapter/:bookCode/:chapter — marcações de um capítulo
  fastify.get('/chapter/:bookCode/:chapter', async (request) => {
    const { bookCode, chapter } = request.params
    return svc.getByChapter(request.user.sub, bookCode, parseInt(chapter))
  })

  // POST /highlights — criar ou atualizar marcação
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['verseId', 'color'],
        properties: {
          verseId: { type: 'string' },
          color:   { type: 'string', enum: ['yellow','green','blue','pink','orange'] },
        },
      },
    },
  }, async (request, reply) => {
    const hl = await svc.upsert(request.user.sub, request.body)
    reply.code(201)
    return hl
  })

  // DELETE /highlights/:verseId — remover marcação
  fastify.delete('/:verseId', async (request, reply) => {
    await svc.remove(request.user.sub, request.params.verseId)
    reply.code(204).send()
  })
}
