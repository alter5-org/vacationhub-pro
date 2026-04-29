/**
 * Cliente HTTP centralizado.
 * - Adjunta el JWT persistido (vh_auth) en endpoints protegidos.
 * - Si el backend devuelve 401 limpia la sesión y dispara `vh:unauthorized`,
 *   que AuthContext escucha para sacar al usuario al login sin dejarlo en
 *   estado zombi.
 */

const STORAGE_KEY = 'vh_auth'

export const UNAUTHORIZED_EVENT = 'vh:unauthorized'

interface PersistedSession {
  token: string
  payload: unknown
}

function readToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedSession
    return parsed?.token ?? null
  } catch {
    return null
  }
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const token = readToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(input, { ...init, headers })

  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }

  return response
}
