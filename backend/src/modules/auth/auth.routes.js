// src/modules/auth/auth.routes.js
import { AuthService } from './auth.service.js'
import { authenticate } from '../../shared/middleware/authenticate.js'

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
          password: { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (request, reply) => {
    const { name, email, password } = request.body
    const user = await svc.register({ name, email, password })
    const token = fastify.jwt.sign({ sub: user.id, email: user.email })
    return reply.status(201).send({ token, user })
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
    const { email, password } = request.body
    const user = await svc.login({ email, password })
    const token = fastify.jwt.sign({ sub: user.id, email: user.email })
    return { token, user }
  })

  // GET /auth/me — rota protegida
  fastify.get('/me', { preHandler: authenticate }, async (request) => {
    const user = await svc.findById(request.user.sub)
    return { user }
  })

  // POST /auth/logout
  fastify.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    // Com JWT stateless, o logout é feito no cliente descartando o token.
    // Aqui seria o lugar para invalidar sessions ou refresh tokens futuramente.
    return reply.send({ message: 'Logout realizado com sucesso.' })
  })
}
