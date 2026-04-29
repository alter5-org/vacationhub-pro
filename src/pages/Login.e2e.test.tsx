import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from './Login'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { EmployeeProvider } from '@/context/EmployeeContext'

const mockFetch = (responses: Record<string, { ok: boolean; body: unknown }>) => {
  global.fetch = vi.fn((input) => {
    const url = typeof input === 'string' ? input : input?.url || ''
    for (const [pattern, resp] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: resp.ok,
          json: async () => resp.body,
        })
      }
    }
    return Promise.resolve({ ok: true, json: async () => ({ success: true }) })
  }) as unknown as typeof fetch
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <EmployeeProvider>{children}</EmployeeProvider>
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
)

describe('LoginPage (magic link)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('renders the magic-link request form', () => {
    render(<LoginPage />, { wrapper })
    expect(screen.getByText('Gestión de Vacaciones')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tu.nombre@alter-5.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar enlace de acceso/i })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('••••••••')).not.toBeInTheDocument()
  })

  it('shows confirmation screen after successful request', async () => {
    mockFetch({
      '/api/auth/request-link': {
        ok: true,
        body: { success: true, message: 'ok' },
      },
    })

    render(<LoginPage />, { wrapper })
    await userEvent.type(screen.getByPlaceholderText('tu.nombre@alter-5.com'), 'javier.ruiz@alter-5.com')
    await userEvent.click(screen.getByRole('button', { name: /enviar enlace de acceso/i }))

    await waitFor(() => {
      expect(screen.getByText('Revisa tu email')).toBeInTheDocument()
    })
    expect(screen.getByText('javier.ruiz@alter-5.com')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/auth/request-link', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'javier.ruiz@alter-5.com' }),
    }))
  })

  it('shows error when the API rejects the request', async () => {
    mockFetch({
      '/api/auth/request-link': {
        ok: false,
        body: { success: false, error: 'Demasiadas solicitudes. Intenta más tarde.' },
      },
    })

    render(<LoginPage />, { wrapper })
    await userEvent.type(screen.getByPlaceholderText('tu.nombre@alter-5.com'), 'foo@alter-5.com')
    await userEvent.click(screen.getByRole('button', { name: /enviar enlace de acceso/i }))

    await waitFor(() => {
      expect(screen.getByText(/demasiadas solicitudes/i)).toBeInTheDocument()
    })
    expect(screen.queryByText('Revisa tu email')).not.toBeInTheDocument()
  })

  it('blocks submission when email is missing (HTML5 validation)', async () => {
    render(<LoginPage />, { wrapper })
    const button = screen.getByRole('button', { name: /enviar enlace de acceso/i })
    await userEvent.click(button)
    const input = screen.getByPlaceholderText('tu.nombre@alter-5.com') as HTMLInputElement
    expect(input.validity.valid).toBe(false)
  })
})
