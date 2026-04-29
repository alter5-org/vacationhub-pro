import { useAuth } from '@/context/AuthContext'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

export default function SettingsPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="space-y-6 animate-slide-down">
      <h2 className="text-2xl font-bold text-slate-800">Configuración</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <span className="flex items-center gap-2">ℹ️ Tu Información</span>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Nombre</span>
              <span className="font-medium text-slate-800">{user.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Email</span>
              <span className="font-medium text-slate-800">{user.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Departamento</span>
              <span className="font-medium text-slate-800">{user.department?.name}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Rol</span>
              <Badge variant={user.isAdmin ? 'purple' : 'default'}>
                {user.isAdmin ? 'Co-Founder' : 'Empleado'}
              </Badge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <span className="flex items-center gap-2">🔐 Acceso</span>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-slate-600">
            <p>El acceso al portal se realiza mediante <strong>enlace de un solo uso</strong> enviado a tu email corporativo.</p>
            <p>No hay contraseña que recordar ni cambiar. Cada vez que entres, solicita un nuevo enlace desde la pantalla de inicio de sesión.</p>
            <p className="text-xs text-slate-500">Los enlaces caducan a los 15 minutos y solo pueden usarse una vez.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

