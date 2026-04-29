import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'

type Status = 'verifying' | 'error'

export default function MagicLinkVerifyPage() {
  const { verifyMagicLink, isAuthenticated } = useAuth()
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const token = params.get('token') || ''

  const [status, setStatus] = useState<Status>('verifying')
  const [error, setError] = useState<string>('')
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    if (!email || !token) {
      setStatus('error')
      setError('El enlace no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.')
      return
    }

    verifyMagicLink(email, token).then((result) => {
      if (!result.success) {
        setStatus('error')
        setError(result.error || 'Enlace inválido o caducado')
      }
    })
  }, [email, token, verifyMagicLink])

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden p-10 text-center space-y-5">
          {status === 'verifying' ? (
            <>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-emerald-300 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-white">Verificando enlace…</h2>
              <p className="text-emerald-100/80 text-sm">Un momento, estamos accediendo a tu cuenta.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-300" />
              </div>
              <h2 className="text-xl font-semibold text-white">Enlace no válido</h2>
              <p className="text-red-200 text-sm">{error}</p>
              <Link to="/login">
                <Button className="w-full">Solicitar nuevo enlace</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
