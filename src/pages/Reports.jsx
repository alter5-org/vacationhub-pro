import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useRequests } from '@/context/RequestContext'
import { useAuth } from '@/context/AuthContext'
import { useEmployees } from '@/context/EmployeeContext'
import { useToast } from '@/context/ToastContext'
import { apiFetch } from '@/utils/apiClient'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { getDepartmentById } from '@/data/employees'
import { getInitials } from '@/utils/dateUtils'
import { calculateBalance } from '@/utils/calculations'

export default function ReportsPage() {
  const { requests, selectedYear } = useRequests()
  const { user } = useAuth()
  const { getEmployeeById } = useEmployees()
  const { toast } = useToast()
  const [departmentStats, setDepartmentStats] = useState([])
  const [employeeStats, setEmployeeStats] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.isAdmin) return
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [deptRes, empRes] = await Promise.all([
          apiFetch(`/api/reports/departments?year=${selectedYear}`),
          apiFetch(`/api/reports/employees?year=${selectedYear}`),
        ])
        const deptData = await deptRes.json()
        const empData = await empRes.json()
        if (!cancelled && Array.isArray(deptData.departments)) {
          setDepartmentStats(deptData.departments)
        }
        if (!cancelled && Array.isArray(empData.employees)) {
          setEmployeeStats(empData.employees)
        }
      } catch (e) {
        console.error(e)
        toast.error('No se ha podido cargar el resumen de departamentos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [selectedYear, toast, user?.isAdmin, user?.token])

  const handleExport = () => {
    if (!user?.isAdmin) return
    apiFetch(`/api/reports/employees?year=${selectedYear}`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data.employees)) {
          throw new Error('Formato de datos inválido')
        }

        let csv = 'Empleado,Departamento,Total,Usados,Pendientes,Disponibles,%Uso\n'
        data.employees.forEach((emp) => {
          const dept = getDepartmentById(emp.deptId)
          const balance = emp.balance
          const usage = Math.round((balance.used / balance.total) * 100)
          csv += `"${emp.name}","${dept?.name}",${balance.total},${balance.used},${balance.pending},${balance.available},${usage}%\n`
        })

        const blob = new Blob([csv], { type: 'text/csv' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `vacaciones-alter5-${selectedYear}.csv`
        a.click()

        toast.success('Reporte exportado correctamente')
      })
      .catch((e) => {
        console.error(e)
        toast.error('No se ha podido exportar el reporte')
      })
  }

  if (!user?.isAdmin) {
    const employee = getEmployeeById(user.id)
    const balance = calculateBalance(user.id, selectedYear, requests, employee?.startDate)
    const ownRequests = requests.filter(
      (r) => r.employeeId === user.id && r.year === selectedYear
    )

    return (
      <div className="space-y-6 animate-slide-down">
        <h2 className="text-2xl font-bold text-slate-800">Reportes {selectedYear}</h2>
        <Card>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-slate-800">{balance.total}</p>
                <p className="text-sm text-slate-500">Días totales</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-slate-800">{balance.used}</p>
                <p className="text-sm text-slate-500">Usados</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-slate-800">{balance.pending}</p>
                <p className="text-sm text-slate-500">Pendientes</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-slate-800">{balance.available}</p>
                <p className="text-sm text-slate-500">Disponibles</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>📄 Tus solicitudes {selectedYear}</CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-500">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-500">Tipo</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-500">Estado</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-slate-500">Días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ownRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="px-6 py-3 text-sm text-slate-700">
                      {req.startDate} → {req.endDate}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700">{req.type}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{req.status}</td>
                    <td className="px-6 py-3 text-sm text-slate-700 text-right">{req.days}</td>
                  </tr>
                ))}
                {ownRequests.length === 0 && (
                  <tr>
                    <td className="px-6 py-4 text-sm text-slate-500" colSpan={4}>
                      No hay solicitudes en {selectedYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-down">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Reportes {selectedYear}</h2>
        <Button onClick={handleExport}>
          <Download className="w-5 h-5" />
          Exportar CSV
        </Button>
      </div>

      {/* Department overview */}
      <div className="grid md:grid-cols-3 gap-4">
        {departmentStats.map(dept => (
          <Card key={dept.id}>
            <CardBody>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{dept.icon}</span>
                <div>
                  <p className="font-bold text-slate-800">{dept.name}</p>
                  <p className="text-sm text-slate-500">{dept.employeeCount} empleados</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Uso del equipo</span>
                    <span className="font-bold">{dept.usagePercent}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${dept.usagePercent}%`, backgroundColor: dept.color }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-slate-500">Días usados</span>
                  <span className="font-bold" style={{ color: dept.color }}>
                    {dept.usedDays} / {dept.totalDays}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Employee table */}
      <Card>
        <CardHeader>📊 Detalle por Empleado</CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-500">Empleado</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-500">Departamento</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-slate-500">Total</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-slate-500">Usados</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-slate-500">Disponibles</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-slate-500">% Uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...employeeStats].sort((a, b) => {
                if (a.deptId === b.deptId) {
                  return a.name.localeCompare(b.name)
                }
                return a.deptId.localeCompare(b.deptId)
              }).map(emp => {
                const dept = getDepartmentById(emp.deptId)
                const balance = emp.balance
                const usage = Math.round((balance.used / balance.total) * 100)
                
                return (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: dept?.color }}
                        >
                          {getInitials(emp.name)}
                        </div>
                        <span className="font-medium text-slate-800">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{dept?.name}</td>
                    <td className="px-6 py-4 text-center text-sm">{balance.total}</td>
                    <td className="px-6 py-4 text-center text-sm font-medium text-amber-600">{balance.used}</td>
                    <td className="px-6 py-4 text-center text-sm font-medium text-emerald-600">{balance.available}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${usage > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${usage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-10">{usage}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
