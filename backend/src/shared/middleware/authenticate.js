// src/shared/middleware/authenticate.js
// Decorator que protege rotas — use como preHandler

export async function authenticate(request, reply) {
  try {
    await request.jwtVerify()
    // Normaliza: garante que request.user.id sempre existe
    request.user.id = request.user.id ?? request.user.sub
  } catch {
    reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido ou expirado.' })
  }
}
