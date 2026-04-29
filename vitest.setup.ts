import '@testing-library/jest-dom'
import { vi } from 'vitest'

const fakeResponse = (body: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  }) as unknown as Response

global.fetch = vi.fn((input: URL | RequestInfo) => {
  const url = typeof input === 'string' ? input : (input as Request).url || ''
  if (url.includes('/api/requests')) {
    return Promise.resolve(fakeResponse({ success: true, requests: [] }))
  }
  if (url.includes('/api/employees')) {
    return Promise.resolve(fakeResponse({ success: true, employees: [] }))
  }
  return Promise.resolve(fakeResponse({ success: true }))
}) as unknown as typeof fetch
