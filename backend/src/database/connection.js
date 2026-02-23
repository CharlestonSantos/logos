// src/database/connection.js
import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida no .env')
}

export const db = postgres(process.env.DATABASE_URL, {
  max:       Number(process.env.DB_POOL_MAX) || 10,
  idle_timeout: 30,
  connect_timeout: 10,
  transform: postgres.camel,  // snake_case no banco → camelCase no JS
})

// Teste de conexão na inicialização
export async function testConnection() {
  try {
    await db`SELECT 1`
    console.log('✦ PostgreSQL conectado com sucesso')
  } catch (err) {
    console.error('✗ Falha ao conectar ao PostgreSQL:', err.message)
    process.exit(1)
  }
}
