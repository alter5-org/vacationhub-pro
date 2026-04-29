import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./database.js', () => ({
  query: vi.fn(),
}))

import { query } from './database.js'
import {
  createLoginToken,
  consumeLoginToken,
  cleanupExpiredTokens,
} from './loginTokenRepository.js'

describe('loginTokenRepository', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset()
  })

  it('createLoginToken inserts a 64-char hex token with 15min TTL', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rowCount: 1, rows: [] })

    const before = Date.now()
    const token = await createLoginToken('Javier.Ruiz@alter-5.com')
    const after = Date.now()

    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(query).toHaveBeenCalledTimes(1)
    const [, params] = vi.mocked(query).mock.calls[0]
    expect(params[0]).toBe('javier.ruiz@alter-5.com') // lowercased
    expect(params[1]).toBe(token)
    const expiresAt = params[2].getTime()
    expect(expiresAt).toBeGreaterThanOrEqual(before + 15 * 60 * 1000 - 50)
    expect(expiresAt).toBeLessThanOrEqual(after + 15 * 60 * 1000 + 50)
  })

  it('consumeLoginToken returns true when row updated', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
    const ok = await consumeLoginToken('Javier@example.com', 'abc')
    expect(ok).toBe(true)
    const [sql, params] = vi.mocked(query).mock.calls[0]
    expect(sql).toMatch(/UPDATE login_tokens/)
    expect(sql).toMatch(/used = TRUE/)
    expect(sql).toMatch(/used = FALSE/) // single-use guard
    expect(params).toEqual(['javier@example.com', 'abc'])
  })

  it('consumeLoginToken returns false when no row matches', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rowCount: 0, rows: [] })
    const ok = await consumeLoginToken('a@b.com', 'bad')
    expect(ok).toBe(false)
  })

  it('cleanupExpiredTokens deletes expired and old-used rows', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rowCount: 0, rows: [] })
    await cleanupExpiredTokens()
    const [sql] = vi.mocked(query).mock.calls[0]
    expect(sql).toMatch(/DELETE FROM login_tokens/)
    expect(sql).toMatch(/expires_at < NOW\(\) - INTERVAL '24 hours'/)
  })
})
