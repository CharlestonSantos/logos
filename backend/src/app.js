// src/app.js — Configuração central da aplicação
import cors          from '@fastify/cors'
import jwt           from '@fastify/jwt'
import cookie        from '@fastify/cookie'
import rateLimit     from '@fastify/rate-limit'
import swagger       from '@fastify/swagger'
import swaggerUi     from '@fastify/swagger-ui'

import { db }        from './database/connection.js'

// Módulos (rotas)
import authRoutes      from './modules/auth/auth.routes.js'
import bibleRoutes     from './modules/bible/bible.routes.js'
import studyRoutes     from './modules/study/study.routes.js'
import notesRoutes     from './modules/notes/notes.routes.js'
import highlightRoutes from './modules/highlights/highlights.routes.js'
import exportRoutes    from './modules/export/export.routes.js'

export async function buildApp(fastify) {

  // ── Banco de dados ──────────────────────────────────────────
  fastify.decorate('db', db)

  // ── CORS ────────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })

  // ── Rate Limiting ────────────────────────────────────────────
  await fastify.register(rateLimit, {
    max:      Number(process.env.RATE_LIMIT_MAX)    || 100,
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW) || 60_000,
  })

  // ── JWT ──────────────────────────────────────────────────────
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET,
    sign:   { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  })

  // ── Cookies ──────────────────────────────────────────────────
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET,
    hook:   'onRequest',
  })

  // ── Swagger (docs automáticos) ───────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    await fastify.register(swagger, {
      openapi: {
        info: { title: 'Logos API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
    })
    await fastify.register(swaggerUi, { routePrefix: '/docs' })
  }

  // ── Health check ─────────────────────────────────────────────
  fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  // ── Rotas dos módulos ─────────────────────────────────────────
  await fastify.register(authRoutes,      { prefix: '/auth'       })
  await fastify.register(bibleRoutes,     { prefix: '/bible'      })
  await fastify.register(studyRoutes,     { prefix: '/studies'    })
  await fastify.register(notesRoutes,     { prefix: '/notes'      })
  await fastify.register(highlightRoutes, { prefix: '/highlights' })
  await fastify.register(exportRoutes,    { prefix: '/export'     })

  // ── Handler de erros global ──────────────────────────────────
  fastify.setErrorHandler((error, request, reply) => {
    const status = error.statusCode || 500
    fastify.log.error(error)
    reply.status(status).send({
      error:   error.name || 'InternalServerError',
      message: status < 500 ? error.message : 'Erro interno do servidor',
    })
  })
}
