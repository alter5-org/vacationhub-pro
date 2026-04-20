import express from 'express'
import rateLimit from 'express-rate-limit'
import { authenticateJWT } from './authMiddleware.js'
import { POLICIES } from '../src/data/absenceTypes.js'
import { calculateBalance, getDepartmentStats } from './reportUtils.js'
import { query } from './database.js'

export const reportRouter = express.Router()

const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas peticiones. Intenta en un minuto.' },
})

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acceso solo para administradores' })
  }
  next()
}

async function getReportData(year) {
  const departmentsResult = await query(
    'SELECT id, name, color, icon FROM departments ORDER BY name'
  )
  const employeesResult = await query(
    `SELECT id, name, email, dept_id as "deptId", role, start_date as "startDate"
     FROM users
     ORDER BY name`
  )
  const requestsResult = await query(
    `SELECT id,
            employee_id as "employeeId",
            TO_CHAR(start_date, 'YYYY-MM-DD') as "startDate",
            TO_CHAR(end_date, 'YYYY-MM-DD') as "endDate",
            days,
            type,
            reason,
            status,
            request_date as "requestDate"
     FROM vacation_requests
     WHERE EXTRACT(YEAR FROM start_date) IN ($1, $2)
        OR EXTRACT(YEAR FROM end_date) IN ($1, $2)`,
    [year, year - 1]
  )

  return {
    departments: departmentsResult.rows,
    employees: employeesResult.rows,
    requests: requestsResult.rows.map((request) => ({
      ...request,
      year: new Date(request.startDate).getUTCFullYear(),
    })),
  }
}

reportRouter.get('/departments', reportLimiter, authenticateJWT, requireAdmin, (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear()

  getReportData(year)
    .then(({ departments, employees, requests }) => {
      const stats = departments.map((dept) =>
        getDepartmentStats(dept, year, requests, employees)
      )

      return res.json({
        year,
        policies: {
          vacationDaysPerYear: POLICIES.vacationDaysPerYear,
          carryOverLimit: POLICIES.carryOverLimit,
        },
        departments: stats,
      })
    })
    .catch((error) => {
      console.error('Error loading department report:', error)
      return res.status(500).json({ success: false, error: 'No se pudo cargar el reporte' })
    })
})

reportRouter.get('/employees', reportLimiter, authenticateJWT, requireAdmin, (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear()

  getReportData(year)
    .then(({ employees, requests }) => {
      const payload = employees.map((emp) => {
        const balance = calculateBalance(emp, year, requests)
        return {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          deptId: emp.deptId,
          balance,
        }
      })

      return res.json({
        year,
        employees: payload,
      })
    })
    .catch((error) => {
      console.error('Error loading employee report:', error)
      return res.status(500).json({ success: false, error: 'No se pudo cargar el reporte' })
    })
})


