import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MagicLinkVerifyPage from './MagicLinkVerify'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { EmployeeProvider } from '@/context/EmployeeContext'

const renderAt = (initialUrl: string) =>
  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <ToastProvider>
        <AuthProvider>
          <EmployeeProvider>
            <Routes>
              <Route path="/auth/verify" element={<MagicLinkVerifyPage />} />
              <Route path="/" element={<div>HOME</div>} />
            </Routes>
          </EmployeeProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  )

const mockVerify = (response: { ok: boolean; body: unknown }) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: response.ok,
    json: () => Promise.resolve(response.body),
  }) as unknown as typeof fetch
}

describe('MagicLinkVerifyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('shows the verifying state immediately', () => {
    mockVerify({ ok: true, body: { success: true, token: 'jwt', user: { id: 'e7', name: 'Javier', email: 'a@b.com', deptId: 'sales', role: 'employee' } } })
    renderAt('/auth/verify?email=a@b.com&token=tok')
    expect(screen.getByText(/verificando enlace/i)).toBeInTheDocument()
  })

  it('redirects home after a successful verification', async () => {
    mockVerify({
      ok: true,
      body: {
        success: true,
        token: 'jwt',
        user: { id: 'e7', name: 'Javier', email: 'javier.ruiz@alter-5.com', deptId: 'sales', role: 'employee' },
      },
    })

    renderAt('/auth/verify?email=javier.ruiz@alter-5.com&token=tok')

    await waitFor(() => {
      expect(screen.getByText('HOME')).toBeInTheDocument()
    })
  })

  it('shows the error state when the token is invalid', async () => {
    mockVerify({ ok: false, body: { success: false, error: 'Enlace inválido o caducado' } })

    renderAt('/auth/verify?email=javier.ruiz@alter-5.com&token=bad')

    await waitFor(() => {
      expect(screen.getByText(/enlace no válido/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Enlace inválido o caducado/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /solicitar nuevo enlace/i })).toBeInTheDocument()
  })

  it('shows the error state when params are missing', () => {
    renderAt('/auth/verify')
    expect(screen.getByText(/enlace no válido/i)).toBeInTheDocument()
  })
})
