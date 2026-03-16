// backend/src/modules/auth/auth.service.js
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { AppError } from '../../shared/errors/AppError.js'

export class AuthService {
  constructor(db) {
    this.db = db
  }

  async register({ name, email, password }) {
    const [existing] = await this.db`SELECT id FROM users WHERE email = ${email}`
    if (existing) throw new AppError('Email já cadastrado.', 409)

    const hash = await bcrypt.hash(password, 12)
    const [user] = await this.db`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name}, ${email}, ${hash})
      RETURNING id, name, email, created_at
    `
    return { user }
  }

  async login({ email, password }) {
    const [user] = await this.db`
      SELECT id, name, email, password_hash FROM users WHERE email = ${email}
    `
    if (!user) throw new AppError('Credenciais inválidas.', 401)

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new AppError('Credenciais inválidas.', 401)

    return { user: { id: user.id, name: user.name, email: user.email } }
  }

  async me(userId) {
    const [user] = await this.db`
      SELECT id, name, email, created_at FROM users WHERE id = ${userId}
    `
    if (!user) throw new AppError('Usuário não encontrado.', 404)
    return { user }
  }

  // ── Reset de senha ───────────────────────────────────────────

  async createResetToken(email) {
    const [user] = await this.db`SELECT id FROM users WHERE email = ${email}`
    if (!user) return null // Silencioso para não expor emails

    // Gera token seguro
    const token     = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    // Remove tokens antigos do usuário
    await this.db`DELETE FROM password_reset_tokens WHERE user_id = ${user.id}`

    // Salva novo token
    await this.db`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt})
    `

    return token
  }

  async validateResetToken(token) {
    const [row] = await this.db`
      SELECT user_id, expires_at
      FROM password_reset_tokens
      WHERE token = ${token}
        AND expires_at > NOW()
        AND used = false
    `
    return !!row
  }

  async resetPassword({ token, password }) {
    const [row] = await this.db`
      SELECT user_id, expires_at
      FROM password_reset_tokens
      WHERE token = ${token}
        AND expires_at > NOW()
        AND used = false
    `

    if (!row) throw new AppError('Token inválido ou expirado.', 400)

    const hash = await bcrypt.hash(password, 12)

    await this.db`UPDATE users SET password_hash = ${hash} WHERE id = ${row.userId}`
    await this.db`UPDATE password_reset_tokens SET used = true WHERE token = ${token}`

    return { success: true }
  }
}
