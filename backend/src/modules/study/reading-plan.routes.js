// backend/src/modules/study/reading-plan.routes.js
import { authenticate } from '../../shared/middleware/authenticate.js'
import { ReadingPlanService } from './reading-plan.service.js'

export default async function readingPlanRoutes(fastify) {
  const svc = new ReadingPlanService(fastify.db)

  fastify.addHook('preHandler', authenticate)

  // GET /reading-plan — plano atual do usuário
  fastify.get('/', async (request) => {
    return svc.getPlan(request.user.sub)
  })

  // GET /reading-plan/today — leitura de hoje (?extraDay=1 para continuar)
  fastify.get('/today', async (request) => {
    const extraDay = Number(request.query.extraDay) || 0
    return svc.getToday(request.user.sub, extraDay)
  })

  // POST /reading-plan/start — inicia o plano
  fastify.post('/start', async (request, reply) => {
    const plan = await svc.startPlan(request.user.sub)
    reply.code(201)
    return plan
  })

  // POST /reading-plan/complete — marca capítulo como lido
  fastify.post('/complete', {
    schema: {
      body: {
        type: 'object',
        required: ['bookCode', 'chapter'],
        properties: {
          bookCode: { type: 'string' },
          chapter:  { type: 'integer' },
        },
      },
    },
  }, async (request) => {
    return svc.markComplete(request.user.sub, request.body)
  })

  // GET /reading-plan/progress — progresso geral
  fastify.get('/progress', async (request) => {
    return svc.getProgress(request.user.sub)
  })

  // DELETE /reading-plan/reset — reinicia o plano
  fastify.delete('/reset', async (request, reply) => {
    await svc.resetPlan(request.user.sub)
    reply.code(204).send()
  })
}
