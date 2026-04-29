import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react'
import { useToast } from './ToastContext'
import { useAuth } from './AuthContext'
import { useEmployees } from './EmployeeContext'
import { apiFetch } from '@/utils/apiClient'
import type { VacationRequest } from '@/domain/types'

export interface RequestContextValue {
  requests: VacationRequest[]
  selectedYear: number
  setSelectedYear: (year: number) => void
  addRequest: (requestData: Omit<VacationRequest, 'id' | 'status' | 'requestDate'>) => Promise<VacationRequest>
  updateRequest: (id: string, updates: Partial<VacationRequest>) => void
  approveRequest: (id: string) => Promise<void>
  rejectRequest: (id: string, reason: string) => Promise<void>
  cancelRequest: (id: string) => void
  getRequestsByEmployee: (employeeId: string, year?: number) => VacationRequest[]
  getPendingRequests: (year?: number) => VacationRequest[]
  getRequestsForDate: (dateString: string) => VacationRequest[]
}

const RequestContext = createContext<RequestContextValue | null>(null)

const getDefaultYear = () => {
  const today = new Date()
  const year = today.getFullYear()
  // A partir del 1 de diciembre se trabaja con el siguiente año
  if (today.getMonth() === 11) {
    return year + 1
  }
  return year
}

export function RequestProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<VacationRequest[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(getDefaultYear())
  const { toast } = useToast()
  const { user } = useAuth()
  const { getEmployeeById } = useEmployees()

  useEffect(() => {
    if (!user?.token) return

    const yearsToLoad = [selectedYear]
    if (selectedYear > 0) {
      yearsToLoad.push(selectedYear - 1)
    }

    Promise.all(
      yearsToLoad.map((year) =>
        apiFetch(`/api/requests?year=${year}`).then((response) => response.json())
      )
    )
      .then((responses) => {
        const allRequests = responses
          .flatMap((data) => (data?.success && Array.isArray(data.requests) ? data.requests : []))
          .map((req) => ({
            ...req,
            year: req.year ?? new Date(req.startDate).getFullYear(),
          }))

        const uniqueById = new Map(allRequests.map((req) => [req.id, req]))
        setRequests(Array.from(uniqueById.values()))
      })
      .catch((error) => {
        console.error('Error loading requests:', error)
        toast.error('No se han podido cargar las solicitudes')
      })
  }, [user?.token, selectedYear, toast])

  const addRequest = useCallback(
    async (
      requestData: Omit<VacationRequest, 'id' | 'status' | 'requestDate'>
    ): Promise<VacationRequest> => {
      if (!user?.token) {
        toast.error('Sesión inválida')
        throw new Error('Missing auth token')
      }

      const response = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify(requestData),
      })

      const data = await response.json()
      if (!response.ok || !data?.success || !data.request) {
        throw new Error(data?.error || 'No se pudo crear la solicitud')
      }

      const createdRequest = {
        ...data.request,
        year: data.request.year ?? new Date(data.request.startDate).getFullYear(),
      }

      setRequests((prev) => [...prev, createdRequest])
      
      // Enviar notificación a admins
      try {
        const employee = getEmployeeById(requestData.employeeId)
        if (employee) {
          await apiFetch('/api/notifications/new-request', {
            method: 'POST',
            body: JSON.stringify({
              request: createdRequest,
              employee,
            }),
          })
        }
      } catch (error) {
        console.error('Error enviando notificación:', error)
        // No fallar la creación de la solicitud si falla el email
      }
      
      toast.success('Solicitud enviada correctamente')

      return createdRequest
    },
    [toast, getEmployeeById, user?.token]
  )

  const updateRequest = useCallback(
    (id: string, updates: Partial<VacationRequest>) => {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
    },
    []
  )

  const approveRequest = useCallback(
    async (id: string) => {
      if (!user) return

      const request = requests.find(r => r.id === id)
      if (!request) return

      const response = await apiFetch(`/api/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      })
      const data = await response.json()
      if (!response.ok || !data?.success || !data.request) {
        throw new Error(data?.error || 'No se pudo aprobar la solicitud')
      }

      const updatedRequest: VacationRequest = {
        ...data.request,
        year: data.request.year ?? new Date(data.request.startDate).getFullYear(),
        reviewer: user.name,
        reviewDate: new Date().toISOString().split('T')[0],
      }

      setRequests((prev) => prev.map((r) => (r.id === id ? updatedRequest : r)))
      
      // Enviar notificación al empleado
      try {
        const employee = getEmployeeById(request.employeeId)
        if (employee) {
          await apiFetch('/api/notifications/approved', {
            method: 'POST',
            body: JSON.stringify({
              request: updatedRequest,
              employee,
              reviewerName: user.name,
            }),
          })
        }
      } catch (error) {
        console.error('Error enviando notificación:', error)
        // No fallar la aprobación si falla el email
      }
      
      toast.success('Solicitud aprobada')
    },
    [user, toast, requests, getEmployeeById]
  )

  const rejectRequest = useCallback(
    async (id: string, reason: string) => {
      if (!user) return

      const request = requests.find(r => r.id === id)
      if (!request) return

      const response = await apiFetch(`/api/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', rejectionReason: reason }),
      })
      const data = await response.json()
      if (!response.ok || !data?.success || !data.request) {
        throw new Error(data?.error || 'No se pudo rechazar la solicitud')
      }

      const updatedRequest: VacationRequest = {
        ...data.request,
        year: data.request.year ?? new Date(data.request.startDate).getFullYear(),
        reviewer: user.name,
        reviewDate: new Date().toISOString().split('T')[0],
        rejectionReason: reason,
      }

      setRequests((prev) => prev.map((r) => (r.id === id ? updatedRequest : r)))
      
      // Enviar notificación al empleado
      try {
        const employee = getEmployeeById(request.employeeId)
        if (employee) {
          await apiFetch('/api/notifications/rejected', {
            method: 'POST',
            body: JSON.stringify({
              request: updatedRequest,
              employee,
              reviewerName: user.name,
              rejectionReason: reason,
            }),
          })
        }
      } catch (error) {
        console.error('Error enviando notificación:', error)
        // No fallar el rechazo si falla el email
      }
      
      toast.info('Solicitud rechazada')
    },
    [user, toast, requests, getEmployeeById]
  )

  const cancelRequest = useCallback(
    (id: string) => {
      if (!user?.token) {
        toast.error('Sesión inválida')
        return
      }
      apiFetch(`/api/requests/${id}`, {
        method: 'DELETE',
      })
        .then((response) => response.json())
        .then((data) => {
          if (!data?.success) {
            throw new Error(data?.error || 'No se pudo cancelar la solicitud')
          }
          setRequests((prev) => prev.filter((r) => r.id !== id))
          toast.success('Solicitud cancelada')
        })
        .catch((error) => {
          console.error('Error cancelling request:', error)
          toast.error('No se pudo cancelar la solicitud')
        })
    },
    [toast, user?.token]
  )

  const getRequestsByEmployee = useCallback(
    (employeeId: string, year: number = selectedYear) => {
      return requests.filter((r) => r.employeeId === employeeId && r.year === year)
    },
    [requests, selectedYear]
  )

  const getPendingRequests = useCallback(
    (year: number = selectedYear) => {
      return requests
        .filter((r) => r.status === 'pending' && r.year === year)
        .sort(
          (a, b) =>
            new Date(a.requestDate).getTime() -
            new Date(b.requestDate).getTime()
        )
    },
    [requests, selectedYear]
  )

  const getRequestsForDate = useCallback(
    (dateString: string) => {
      return requests.filter((r) => {
        if (r.status === 'rejected') return false
        return dateString >= r.startDate && dateString <= r.endDate
      })
    },
    [requests]
  )

  return (
    <RequestContext.Provider
      value={{
        requests,
        selectedYear,
        setSelectedYear,
        addRequest,
        updateRequest,
        approveRequest,
        rejectRequest,
        cancelRequest,
        getRequestsByEmployee,
        getPendingRequests,
        getRequestsForDate,
      }}
    >
      {children}
    </RequestContext.Provider>
  )
}

export function useRequests(): RequestContextValue {
  const context = useContext(RequestContext)
  if (!context) {
    throw new Error('useRequests must be used within a RequestProvider')
  }
  return context
}


