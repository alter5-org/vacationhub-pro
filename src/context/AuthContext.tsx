import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { getDepartmentById } from '@/data/employees'
import { UNAUTHORIZED_EVENT } from '@/utils/apiClient'
import { useToast } from './ToastContext'

const STORAGE_KEY = 'vh_auth'

export interface AuthUser {
  id: string
  name: string
  email: string
  deptId: string
  role: string
  department: ReturnType<typeof getDepartmentById> | undefined
  isAdmin: boolean
  canApprove: boolean
  token: string
}

export interface RequestLinkResult {
  success: boolean
  error?: string
}

export interface VerifyLinkResult {
  success: boolean
  error?: string
}

interface PersistedSession {
  token: string
  payload: {
    id: string
    name: string
    email: string
    deptId: string
    role: string
  }
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  requestMagicLink: (email: string) => Promise<RequestLinkResult>
  verifyMagicLink: (email: string, token: string) => Promise<VerifyLinkResult>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function hydrateUser(payload: PersistedSession['payload'], token: string): AuthUser {
  const department = getDepartmentById(payload.deptId)
  const isAdmin = payload.role === 'admin'
  return {
    ...payload,
    department,
    isAdmin,
    canApprove: isAdmin,
    token,
  }
}

function readPersistedSession(): PersistedSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedSession
    if (!parsed?.token || !parsed?.payload?.email) return null
    return parsed
  } catch {
    return null
  }
}

function persistSession(session: PersistedSession | null) {
  if (typeof window === 'undefined') return
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } else {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const persisted = readPersistedSession()
    if (persisted) {
      setUser(hydrateUser(persisted.payload, persisted.token))
    }

    if (typeof window === 'undefined') return
    const handleUnauthorized = () => {
      persistSession(null)
      setUser(null)
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const requestMagicLink = useCallback(
    async (email: string): Promise<RequestLinkResult> => {
      try {
        const response = await fetch('/api/auth/request-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          return { success: false, error: data?.error || 'No se pudo enviar el enlace' }
        }

        return { success: true }
      } catch (error) {
        console.error('requestMagicLink error:', error)
        toast.error('No se ha podido conectar con el servidor')
        return { success: false, error: 'Error de conexión' }
      }
    },
    [toast]
  )

  const verifyMagicLink = useCallback(
    async (email: string, token: string): Promise<VerifyLinkResult> => {
      try {
        const response = await fetch('/api/auth/verify-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data?.success) {
          return { success: false, error: data?.error || 'Enlace inválido o caducado' }
        }

        const payload = data.user
        const session: PersistedSession = { token: data.token, payload }
        persistSession(session)
        const next = hydrateUser(payload, data.token)
        setUser(next)
        toast.success(`¡Bienvenido, ${next.name.split(' ')[0]}!`)

        return { success: true }
      } catch (error) {
        console.error('verifyMagicLink error:', error)
        toast.error('No se ha podido conectar con el servidor')
        return { success: false, error: 'Error de conexión' }
      }
    },
    [toast]
  )

  const logout = useCallback(() => {
    persistSession(null)
    setUser(null)
    toast.info('Sesión cerrada')
  }, [toast])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        requestMagicLink,
        verifyMagicLink,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
