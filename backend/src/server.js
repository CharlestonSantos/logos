// src/server.js — Ponto de entrada da API Logos
import 'dotenv/config'
import Fastify from 'fastify'
import { buildApp } from './app.js'

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

await buildApp(fastify)

const port = Number(process.env.PORT) || 3000
const host = process.env.HOST || '0.0.0.0'

try {
  await fastify.listen({ port, host })
  fastify.log.info(`✦ Logos API rodando em http://${host}:${port}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
