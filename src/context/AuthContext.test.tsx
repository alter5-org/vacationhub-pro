import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { ToastProvider } from './ToastContext'
import { EmployeeProvider } from './EmployeeContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    <AuthProvider>
      <EmployeeProvider>{children}</EmployeeProvider>
    </AuthProvider>
  </ToastProvider>
)

const mockFetchOnce = (response: { ok: boolean; body: unknown }) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: response.ok,
    json: () => Promise.resolve(response.body),
  }) as unknown as typeof fetch
}

describe('AuthContext (magic link)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('starts unauthenticated when no session is persisted', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('requestMagicLink returns success on 2xx', async () => {
    mockFetchOnce({ ok: true, body: { success: true, message: 'ok' } })
    const { result } = renderHook(() => useAuth(), { wrapper })

    let response: { success: boolean; error?: string } = { success: false }
    await act(async () => {
      response = await result.current.requestMagicLink('javier.ruiz@alter-5.com')
    })

    expect(response.success).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('requestMagicLink returns error on non-2xx', async () => {
    mockFetchOnce({ ok: false, body: { success: false, error: 'rate limit' } })
    const { result } = renderHook(() => useAuth(), { wrapper })

    let response: { success: boolean; error?: string } = { success: true }
    await act(async () => {
      response = await result.current.requestMagicLink('foo@alter-5.com')
    })

    expect(response.success).toBe(false)
    expect(response.error).toBe('rate limit')
  })

  it('verifyMagicLink success authenticates and persists session', async () => {
    mockFetchOnce({
      ok: true,
      body: {
        success: true,
        token: 'mock-jwt',
        user: {
          id: 'e7',
          name: 'Javier Ruiz',
          email: 'javier.ruiz@alter-5.com',
          deptId: 'sales',
          role: 'employee',
        },
      },
    })
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.verifyMagicLink('javier.ruiz@alter-5.com', 'tok')
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('javier.ruiz@alter-5.com')
    expect(result.current.user?.token).toBe('mock-jwt')
    expect(window.localStorage.getItem('vh_auth')).toContain('mock-jwt')
  })

  it('verifyMagicLink failure leaves user unauthenticated', async () => {
    mockFetchOnce({ ok: false, body: { success: false, error: 'expired' } })
    const { result } = renderHook(() => useAuth(), { wrapper })

    let response: { success: boolean; error?: string } = { success: true }
    await act(async () => {
      response = await result.current.verifyMagicLink('foo@alter-5.com', 'bad')
    })

    expect(response.success).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem('vh_auth')).toBeNull()
  })

  it('logout clears persisted session', async () => {
    mockFetchOnce({
      ok: true,
      body: {
        success: true,
        token: 'jwt',
        user: { id: 'e7', name: 'Javier', email: 'javier.ruiz@alter-5.com', deptId: 'sales', role: 'employee' },
      },
    })
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.verifyMagicLink('javier.ruiz@alter-5.com', 'tok')
    })
    expect(result.current.isAuthenticated).toBe(true)

    act(() => result.current.logout())

    expect(result.current.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem('vh_auth')).toBeNull()
  })

  it('rehydrates session from localStorage on mount', () => {
    window.localStorage.setItem(
      'vh_auth',
      JSON.stringify({
        token: 'persisted-jwt',
        payload: {
          id: 'e7',
          name: 'Javier Ruiz',
          email: 'javier.ruiz@alter-5.com',
          deptId: 'sales',
          role: 'employee',
        },
      })
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.token).toBe('persisted-jwt')
  })
})
