import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react'
import { useToast } from './ToastContext'
import { calculateProratedDays } from '@/utils/calculations'
import { useAuth } from './AuthContext'
import { apiFetch } from '@/utils/apiClient'
import type { Employee } from '@/domain/types'

interface EmployeeContextValue {
  employees: Employee[]
  addEmployee: (employeeData: Omit<Employee, 'id'>) => void
  updateEmployee: (id: string, updates: Partial<Employee>) => void
  deleteEmployee: (id: string) => void
  promoteToAdmin: (id: string) => void
  getEmployeeById: (id: string) => Employee | undefined
}

const EmployeeContext = createContext<EmployeeContextValue | null>(null)

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.token) return
    apiFetch('/api/employees')
      .then((response) => response.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.employees)) {
          setEmployees(data.employees)
        }
      })
      .catch((error) => {
        console.error('Error loading employees:', error)
      })
  }, [user?.token])

  const addEmployee = useCallback(
    (employeeData: Omit<Employee, 'id'>): void => {
      if (!user?.token) {
        toast.error('Necesitas iniciar sesión para agregar empleados')
        return
      }

      apiFetch('/api/employees', {
        method: 'POST',
        body: JSON.stringify(employeeData),
      })
        .then((response) => response.json())
        .then((data) => {
          if (!data?.success || !data.employee) {
            throw new Error(data?.error || 'No se pudo crear empleado')
          }
          setEmployees((prev) => [...prev, data.employee])
          const currentYear = new Date().getFullYear()
          const proratedDays = calculateProratedDays(employeeData.startDate, currentYear)
          toast.success(
            `${data.employee.name} agregado. Días de vacaciones ${currentYear}: ${proratedDays} días`
          )
        })
        .catch((error) => {
          console.error('Error creating employee:', error)
          toast.error('No se pudo crear el empleado')
        })
    },
    [toast, user?.token]
  )

  const updateEmployee = useCallback(
    (id: string, updates: Partial<Employee>) => {
      if (!user?.token) {
        toast.error('Necesitas iniciar sesión para actualizar empleados')
        return
      }

      apiFetch(`/api/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
        .then((response) => response.json())
        .then((data) => {
          if (!data?.success || !data.employee) {
            throw new Error(data?.error || 'No se pudo actualizar empleado')
          }
          setEmployees((prev) =>
            prev.map((e) => (e.id === id ? { ...e, ...data.employee } : e))
          )
          toast.success('Empleado actualizado')
        })
        .catch((error) => {
          console.error('Error updating employee:', error)
          toast.error('No se pudo actualizar el empleado')
        })
    },
    [toast, user?.token]
  )

  const deleteEmployee = useCallback(
    (id: string) => {
      if (!user?.token) {
        toast.error('Necesitas iniciar sesión para eliminar empleados')
        return
      }
      const employee = employees.find((e) => e.id === id)
      apiFetch(`/api/employees/${id}`, {
        method: 'DELETE',
      })
        .then((response) => response.json())
        .then((data) => {
          if (!data?.success) {
            throw new Error(data?.error || 'No se pudo eliminar empleado')
          }
          setEmployees((prev) => prev.filter((e) => e.id !== id))
          toast.info(`${employee?.name || 'Empleado'} eliminado`)
        })
        .catch((error) => {
          console.error('Error deleting employee:', error)
          toast.error('No se pudo eliminar el empleado')
        })
    },
    [employees, toast, user?.token]
  )

  const promoteToAdmin = useCallback(
    (id: string) => {
      updateEmployee(id, { role: 'admin' })
    },
    [updateEmployee]
  )

  const getEmployeeById = useCallback(
    (id: string) => {
      return employees.find((e) => e.id === id)
    },
    [employees]
  )

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        promoteToAdmin,
        getEmployeeById,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  )
}

export function useEmployees(): EmployeeContextValue {
  const context = useContext(EmployeeContext)
  if (!context) {
    throw new Error('useEmployees must be used within an EmployeeProvider')
  }
  return context
}


