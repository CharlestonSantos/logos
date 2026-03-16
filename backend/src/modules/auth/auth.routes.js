// backend/src/modules/auth/auth.routes.js
import { authenticate }          from '../../shared/middleware/authenticate.js'
import { AuthService }           from './auth.service.js'
import { sendPasswordResetEmail } from '../../shared/mailer.js'

export default async function authRoutes(fastify) {
  const svc = new AuthService(fastify.db)

  // POST /auth/register
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name:     { type: 'string', minLength: 2 },
          email:    { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    const result = await svc.register(request.body)
    const token  = await reply.jwtSign({ sub: result.user.id, email: result.user.email })
    reply
      .setCookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/' })
      .code(201)
      .send({ user: result.user, token })
  })

  // POST /auth/login
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const result = await svc.login(request.body)
    const token  = await reply.jwtSign({ sub: result.user.id, email: result.user.email })
    reply
      .setCookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/' })
      .send({ user: result.user, token })
  })

  // GET /auth/me
  fastify.get('/me', { preHandler: authenticate }, async (request) => {
    return svc.me(request.user.sub)
  })

  // POST /auth/logout
  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('token').send({ message: 'Logout realizado com sucesso.' })
  })

  // ── Recuperação de senha ─────────────────────────────────────

  // POST /auth/forgot-password
  fastify.post('/forgot-password', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
  }, async (request, reply) => {
    const { email } = request.body

    try {
      const token = await svc.createResetToken(email)

      if (token) {
        const resetUrl = `${process.env.APP_URL}/redefinir-senha?token=${token}`
        await sendPasswordResetEmail(email, resetUrl)
      }
    } catch (e) {
      fastify.log.error('Erro ao enviar email de reset:', e.message)
      fastify.log.error(e)
    }

    // Sempre retorna sucesso para não expor se o email existe
    reply.send({
      message: 'Se este email estiver cadastrado, você receberá as instruções em breve.',
    })
  })

  // POST /auth/reset-password
  fastify.post('/reset-password', {
    schema: {
      body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token:    { type: 'string' },
          password: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    await svc.resetPassword(request.body)
    reply.send({ message: 'Senha redefinida com sucesso!' })
  })

  // GET /auth/validate-reset-token/:token
  fastify.get('/validate-reset-token/:token', async (request, reply) => {
    const valid = await svc.validateResetToken(request.params.token)
    if (!valid) return reply.code(400).send({ error: 'Token inválido ou expirado.' })
    reply.send({ valid: true })
  })
}
