// src/modules/auth/auth.service.js
import bcrypt from 'bcrypt'
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/AppError.js'

const SALT_ROUNDS = 12

export class AuthService {
  constructor(db) {
    this.db = db
  }

  async register({ name, email, password }) {
    // Verificar email duplicado
    const [existing] = await this.db`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `
    if (existing) throw new ConflictError('Este e-mail já está em uso.')

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const [user] = await this.db`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name}, ${email}, ${passwordHash})
      RETURNING id, name, email, avatar_url, created_at
    `
    return user
  }

  async login({ email, password }) {
    const [user] = await this.db`
      SELECT id, name, email, password_hash, avatar_url, is_active
      FROM users
      WHERE email = ${email} AND provider = 'local'
      LIMIT 1
    `
    if (!user) throw new UnauthorizedError('E-mail ou senha inválidos.')
    if (!user.isActive) throw new UnauthorizedError('Conta desativada.')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedError('E-mail ou senha inválidos.')

    // Não retornar o hash!
    const { passwordHash: _, ...safeUser } = user
    return safeUser
  }

  async findById(id) {
    const [user] = await this.db`
      SELECT id, name, email, avatar_url, created_at
      FROM users WHERE id = ${id} LIMIT 1
    `
    if (!user) throw new NotFoundError('Usuário')
    return user
  }
}
