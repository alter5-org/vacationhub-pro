import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { RequestProvider, useRequests } from './RequestContext'
import { ToastProvider } from './ToastContext'
import { AuthProvider } from './AuthContext'
import { EmployeeProvider } from './EmployeeContext'

vi.mock('./AuthContext', async () => {
  const actual = await vi.importActual<typeof import('./AuthContext')>('./AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      user: {
        id: 'e1',
        name: 'Test User',
        email: 'test@alter-5.com',
        deptId: 'sales',
        role: 'employee',
        isAdmin: false,
        canApprove: false,
        department: { id: 'sales', name: 'Sales', color: '#F59E0B', icon: '📈' },
        token: 'mock-token',
      },
    }),
  }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    <AuthProvider>
      <EmployeeProvider>
        <RequestProvider>{children}</RequestProvider>
      </EmployeeProvider>
    </AuthProvider>
  </ToastProvider>
)

describe('RequestContext', () => {
  it('can add and cancel a request', async () => {
    const fetchMock = vi.fn((input, init) => {
      const url = typeof input === 'string' ? input : input?.url || ''
      if (url.includes('/api/requests') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            request: {
              id: 'req-1',
              employeeId: 'e1',
              startDate: '2025-01-10',
              endDate: '2025-01-12',
              days: 3,
              year: 2025,
              reason: 'Test',
              type: 'vacation',
              status: 'pending',
              requestDate: '2025-01-01',
              backup: null,
            },
          }),
        })
      }
      if (url.includes('/api/requests') && init?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        })
      }
      if (url.includes('/api/notifications/new-request')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          requests: [
            {
              id: 'req-0',
              employeeId: 'e1',
              startDate: '2025-01-02',
              endDate: '2025-01-03',
              days: 2,
              year: 2025,
              reason: 'Seed',
              type: 'vacation',
              status: 'pending',
              requestDate: '2025-01-01',
              backup: null,
            },
          ],
        }),
      })
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const { result } = renderHook(() => useRequests(), { wrapper })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    let createdId: string | undefined
    await act(async () => {
      const created = await result.current.addRequest({
        employeeId: 'e1',
        startDate: '2025-01-10',
        endDate: '2025-01-12',
        days: 3,
        year: 2025,
        reason: 'Test',
        type: 'vacation',
        backup: null,
      } as any)
      createdId = created.id
    })

    await waitFor(() => {
      expect(result.current.requests.length).toBeGreaterThan(0)
    })

    await act(async () => {
      if (createdId) {
        result.current.cancelRequest(createdId)
      }
      await Promise.resolve()
    })

    const stillExists = result.current.requests.some((r) => r.id === createdId)
    expect(stillExists).toBe(false)
  })
})


