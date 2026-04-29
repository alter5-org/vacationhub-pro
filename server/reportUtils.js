// Utilidades de reporting para el backend
// Estas funciones replican la lógica de calculations.ts para evitar dependencias de TypeScript

import { POLICIES, doesAbsenceDeduct } from '../src/data/absenceTypes.js'

/**
 * Calcula los días de vacaciones prorrateados según fecha de incorporación
 */
function calculateProratedDays(employeeStartDate, year) {
  if (!employeeStartDate) {
    // Si no hay fecha de inicio, asumir año completo
    return POLICIES.vacationDaysPerYear
  }

  const startDate = new Date(employeeStartDate)
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)

  // Si el empleado empezó antes del año, tiene año completo
  if (startDate < yearStart) {
    return POLICIES.vacationDaysPerYear
  }

  // Si el empleado empezó después del año, no tiene días
  if (startDate > yearEnd) {
    return 0
  }

  // Calcular meses trabajados en el año
  // Contar desde el mes de inicio hasta diciembre (mes 11)
  const startMonth = startDate.getMonth()
  const monthsWorked = 12 - startMonth

  // Proratear: días completos * (meses trabajados / 12)
  const proratedDays = Math.round((POLICIES.vacationDaysPerYear * monthsWorked) / 12)

  return proratedDays
}

function getRequestYear(request) {
  if (typeof request.year === 'number') {
    return request.year
  }
  return new Date(request.startDate).getFullYear()
}

function calculateCarryOver(employee, year, requests) {
  const previousYear = year - 1
  if (previousYear < 0) {
    return 0
  }

  const previousYearRequests = requests.filter((r) => {
    const requestYear = getRequestYear(r)
    return r.employeeId === employee.id && requestYear === previousYear
  })

  const deducting = previousYearRequests.filter((r) => doesAbsenceDeduct(r.type))

  const prevUsed = deducting
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.days, 0)

  const prevPending = deducting
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + r.days, 0)

  const prevTotal = calculateProratedDays(employee?.startDate, previousYear)
  const remaining = prevTotal - prevUsed - prevPending

  return Math.max(remaining, 0)
}

/**
 * Calcula el balance de vacaciones de un empleado
 */
export function calculateBalance(employee, year, requests) {
  const employeeRequests = requests.filter((r) => {
    const requestYear = getRequestYear(r)
    return r.employeeId === employee.id && requestYear === year
  })

  const deducting = employeeRequests.filter((r) => doesAbsenceDeduct(r.type))

  const used = deducting
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.days, 0)

  const pending = deducting
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + r.days, 0)

  // Calcular días totales prorrateados según fecha de incorporación
  const proratedTotal = calculateProratedDays(employee?.startDate, year)

  const carryOver = calculateCarryOver(employee, year, requests)
  const total = proratedTotal + carryOver
  const available = total - used - pending

  return {
    year,
    total,
    used,
    pending,
    carryOver,
    available,
  }
}

/**
 * Calcula estadísticas de un departamento
 */
export function getDepartmentStats(department, year, requests, employees) {
  const departmentEmployees = employees.filter((emp) => emp.deptId === department.id)
  
  // Calcular total de días (incluyendo carry-over) para el departamento
  const totalDays = departmentEmployees.reduce((sum, emp) => {
    return sum + calculateBalance(emp, year, requests).total
  }, 0)

  const deductingInDept = requests.filter(
    (r) =>
      r.year === year &&
      doesAbsenceDeduct(r.type) &&
      departmentEmployees.some((e) => e.id === r.employeeId)
  )

  const usedDays = deductingInDept
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.days, 0)

  const pendingDays = deductingInDept
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + r.days, 0)

  return {
    ...department,
    employeeCount: departmentEmployees.length,
    totalDays,
    usedDays,
    pendingDays,
    usagePercent: totalDays > 0 ? Math.round((usedDays / totalDays) * 100) : 0,
  }
}

