/**
 * Migración inicial / idempotente.
 * Ejecutar con: node server/migrate.js
 *
 * Pasos:
 * 1. Verifica conexión
 * 2. Aplica schema.sql (CREATE TABLE IF NOT EXISTS)
 * 3. Aplica migraciones one-shot idempotentes:
 *    - users.password_hash → DROP COLUMN IF EXISTS  (auth migrada a magic-link)
 *    - password_reset_tokens → RENAME TO login_tokens
 *    - login_tokens.used_at → ADD COLUMN IF NOT EXISTS
 *    - índices login_tokens (idx_login_tokens_*)
 * 4. Siembra departamentos y usuarios canónicos
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { query, testConnection } from './database.js'
import { SEED_USERS } from './seedUsers.js'
import { DEPARTMENTS } from '../src/data/employees.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function applyOneShotMigrations() {
  // users.password_hash: ya no se usa (magic-link). Drop si existe.
  await query('ALTER TABLE users DROP COLUMN IF EXISTS password_hash')

  // password_reset_tokens → login_tokens (rename idempotente).
  await query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_tokens')
         AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'login_tokens') THEN
        ALTER TABLE password_reset_tokens RENAME TO login_tokens;
      END IF;
    END$$;
  `)

  // Asegura columna used_at + índices con nuevos nombres.
  await query('ALTER TABLE login_tokens ADD COLUMN IF NOT EXISTS used_at TIMESTAMP')
  await query('DROP INDEX IF EXISTS idx_reset_tokens_email')
  await query('DROP INDEX IF EXISTS idx_reset_tokens_token')
  await query('DROP INDEX IF EXISTS idx_reset_tokens_expires')
  await query('CREATE INDEX IF NOT EXISTS idx_login_tokens_email ON login_tokens(email)')
  await query('CREATE INDEX IF NOT EXISTS idx_login_tokens_token ON login_tokens(token)')
  await query('CREATE INDEX IF NOT EXISTS idx_login_tokens_expires ON login_tokens(expires_at)')
}

/**
 * Ejecuta el pipeline completo de migración (idempotente y safe-on-boot).
 * Devuelve true si la BD quedó migrada; lanza excepción si algo falló.
 */
export async function runMigrations({ silent = false } = {}) {
  const log = silent ? () => {} : (...args) => console.log(...args)

  log('🚀 Iniciando migración de base de datos...\n')

  log('1️⃣ Verificando conexión...')
  const connected = await testConnection()
  if (!connected) {
    throw new Error('No se pudo conectar a la base de datos (DATABASE_URL o DB_*)')
  }

  log('\n2️⃣ Aplicando schema...')
  const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  await query(schemaSQL)
  await query('ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS backup_employee_id VARCHAR(50) REFERENCES users(id)')
  log('✅ Schema aplicado')

  log('\n3️⃣ Aplicando migraciones idempotentes...')
  await applyOneShotMigrations()
  log('✅ Migraciones aplicadas (passwords drop, tabla login_tokens, índices)')

  log('\n4️⃣ Insertando departamentos...')
  for (const dept of DEPARTMENTS) {
    await query(
      `INSERT INTO departments (id, name, color, icon)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [dept.id, dept.name, dept.color, dept.icon]
    )
  }
  log(`✅ ${DEPARTMENTS.length} departamentos asegurados`)

  log('\n5️⃣ Insertando usuarios canónicos...')
  let count = 0
  for (const user of SEED_USERS) {
    await query(
      `INSERT INTO users (id, name, email, dept_id, role, start_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         dept_id = EXCLUDED.dept_id,
         role = EXCLUDED.role,
         start_date = EXCLUDED.start_date`,
      [user.id, user.name, user.email.toLowerCase(), user.deptId, user.role, user.startDate || null]
    )
    count++
  }
  log(`✅ ${count} usuarios sembrados`)

  log('\n6️⃣ Verificación...')
  const deptCount = await query('SELECT COUNT(*) FROM departments')
  const userCount = await query('SELECT COUNT(*) FROM users')
  const tokenCount = await query('SELECT COUNT(*) FROM login_tokens')
  log(`   departments: ${deptCount.rows[0].count}`)
  log(`   users: ${userCount.rows[0].count}`)
  log(`   login_tokens: ${tokenCount.rows[0].count}`)

  log('\n✅ Migración completada')

  return {
    departments: Number(deptCount.rows[0].count),
    users: Number(userCount.rows[0].count),
    loginTokens: Number(tokenCount.rows[0].count),
  }
}

// CLI entrypoint: solo si este archivo se ejecuta directamente.
const isCli = import.meta.url === `file://${process.argv[1]}`
if (isCli) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error fatal en migración:', error)
      process.exit(1)
    })
}
