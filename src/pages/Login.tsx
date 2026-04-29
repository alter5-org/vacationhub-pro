import { useState, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertCircle, CheckCircle, Mail } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const { requestMagicLink, isAuthenticated } = useAuth()
  const [email, setEmail] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [sentTo, setSentTo] = useState<string>('')

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await requestMagicLink(email)

    setLoading(false)

    if (!result.success) {
      setError(result.error || 'No se pudo enviar el enlace')
      return
    }

    setSentTo(email)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 p-8 text-center">
            <img
              src="/brand/alter5-vertical.png"
              alt="Alter5"
              className="h-24 mx-auto mb-3 object-contain"
            />
            <p className="text-emerald-100 font-medium">Gestión de Vacaciones</p>
            <p className="text-emerald-100/80 text-sm mt-1">Modo relax 🌴🏄‍♂️</p>
          </div>

          {sentTo ? (
            <div className="p-8 space-y-5 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-300" />
              </div>
              <h2 className="text-xl font-semibold text-white">Revisa tu email</h2>
              <p className="text-emerald-100/90 text-sm">
                Si <span className="font-medium text-white">{sentTo}</span> está registrado, te hemos enviado un enlace de acceso.
              </p>
              <p className="text-emerald-200/70 text-xs">
                El enlace caduca en 15 minutos y solo puede usarse una vez.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSentTo('')
                  setEmail('')
                }}
                className="text-emerald-300 hover:text-emerald-200 text-sm transition-colors"
              >
                Usar otro email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="bg-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-emerald-300 text-sm font-medium mb-2">
                  Email corporativo
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="tu.nombre@alter-5.com"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
                <p className="mt-2 text-xs text-emerald-200/60">
                  Te enviaremos un enlace de un solo uso para acceder.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Mail className="w-4 h-4" />
                {loading ? 'Enviando enlace…' : 'Enviar enlace de acceso'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
