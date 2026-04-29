/**
 * Tokens de un solo uso para magic-link login.
 * Token válido 15 minutos, se marca consumido al canjearse por JWT.
 */

import crypto from 'crypto'
import { query } from './database.js'

const TOKEN_EXPIRY_MINUTES = 15

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function createLoginToken(email) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

  await query(
    `INSERT INTO login_tokens (email, token, expires_at)
     VALUES ($1, $2, $3)`,
    [email.toLowerCase(), token, expiresAt]
  )

  return token
}

export async function consumeLoginToken(email, token) {
  const result = await query(
    `UPDATE login_tokens
     SET used = TRUE, used_at = CURRENT_TIMESTAMP
     WHERE email = $1
       AND token = $2
       AND expires_at > NOW()
       AND used = FALSE
     RETURNING id`,
    [email.toLowerCase(), token]
  )

  return result.rowCount > 0
}

export async function cleanupExpiredTokens() {
  await query(
    `DELETE FROM login_tokens
     WHERE expires_at < NOW() - INTERVAL '24 hours'
        OR (used = TRUE AND used_at < NOW() - INTERVAL '24 hours')`
  )
}
