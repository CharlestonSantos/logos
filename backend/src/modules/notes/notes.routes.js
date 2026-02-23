// backend/src/modules/notes/notes.routes.js
import { authenticate } from '../../shared/middleware/authenticate.js'
import { NotesService } from './notes.service.js'

export default async function notesRoutes(fastify) {
    const svc = new NotesService(fastify.db)

    fastify.addHook('preHandler', authenticate)

    // GET /notes
    fastify.get('/', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    q: { type: 'string' },
                    tag: { type: 'string' },
                    book: { type: 'string' },
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                    offset: { type: 'integer', minimum: 0, default: 0 },
                },
            },
        },
    }, async (request) => {
        return svc.list(request.user.id, request.query)
    })

    // GET /notes/tags/all — ANTES de /:id
    fastify.get('/tags/all', async (request) => {
        return svc.getTags(request.user.sub)
    })

    // GET /notes/:id
    fastify.get('/:id', async (request) => {
        return svc.getById(request.user.sub, request.params.id)
    })

    // POST /notes
    fastify.post('/', { schema: { body: { type: 'object', required: ['content'], properties: { verseId: { type: 'string' }, content: { type: 'string', minLength: 1 }, tags: { type: 'array', items: { type: 'string' } } } } } }, async (request, reply) => {
        const note = await svc.create(request.user.sub, request.body)
        reply.code(201)
        return note
    })
    async (request, reply) => {
        const userId = request.user?.id || request.user?.sub || request.user?.userId
        console.log('FULL USER OBJECT:', JSON.stringify(request.user))
        console.log('USER ID:', userId)
        const note = await svc.create(userId, request.body)
        reply.code(201)
        return note
    }

    // PUT /notes/:id
    fastify.put('/:id', { schema: { body: { type: 'object', properties: { content: { type: 'string', minLength: 1 }, tags: { type: 'array', items: { type: 'string' } } } } } }, async (request) => {
        return svc.update(request.user.sub, request.params.id, request.body)
    })

    // DELETE /notes/:id
    fastify.delete('/:id', async (request, reply) => {
        await svc.delete(request.user.sub, request.params.id)
        reply.code(204).send()
    })
}