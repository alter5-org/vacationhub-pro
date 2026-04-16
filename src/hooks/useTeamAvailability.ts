import { useMemo } from 'react'
import { useRequests } from '@/context/RequestContext'
import { useEmployees } from '@/context/EmployeeContext'

export const useTeamAvailability = (deptId: string | undefined | null) => {
  const { requests } = useRequests()
  const { employees } = useEmployees()

  return useMemo(() => {
    if (!deptId) return []

    const teamMembers = employees.filter(e => e.deptId === deptId)
    const today = new Date()

    return teamMembers.map((member) => {
      const memberRequests = requests.filter(
        (r) => r.employeeId === member.id && r.status === 'approved'
      )

      const onVacation = memberRequests.some((r) => {
        const start = new Date(r.startDate)
        const end = new Date(r.endDate)
        return today >= start && today <= end
      })

      const nextVacation = memberRequests
        .filter((r) => new Date(r.startDate) > today)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]

      return { ...member, onVacation, nextVacation }
    })
  }, [deptId, requests, employees])
}


