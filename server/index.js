import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PORT } from './config.js'
import { authRouter } from './authRoutes.js'
import { employeeRouter } from './employeeRoutes.js'
import { requestRouter } from './requestRoutes.js'
import { reportRouter } from './reportRoutes.js'
import { notificationRouter } from './notificationRoutes.js'
import { verifyEmailConnection } from './emailService.js'
import { startReminderScheduler } from './reminderScheduler.js'
import { testConnection, query } from './database.js'
import { seedVacations } from './seedVacations.js'

const app = express()
app.set('trust proxy', 1)

const allowedOrigins = [
  'https://vacaciones.alter5.com',
  'http://localhost:5173',
]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    if (/\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'))
  },
}))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', authRouter)
app.use('/api', employeeRouter)
app.use('/api', requestRouter)
app.use('/api/reports', reportRouter)
app.use('/api/notifications', notificationRouter)

// Verificar conexión de base de datos al iniciar
testConnection().then(async (connected) => {
  if (connected) {
    console.log('✅ Database connection verified')
    try {
      const seedCheck = await query(
        `SELECT COUNT(*)::int as count
         FROM vacation_requests
         WHERE reason = 'Vacaciones disfrutadas'
           AND (EXTRACT(YEAR FROM start_date) = 2025 OR EXTRACT(YEAR FROM end_date) = 2025)`
      )
      if ((seedCheck.rows[0]?.count || 0) === 0) {
        console.log('⚠️ Vacaciones históricas 2025 no encontradas, precargando...')
        const result = await seedVacations()
        console.log(`✅ Precarga completada: ${result.created} creadas, ${result.skipped} omitidas`)
      }
    } catch (error) {
      console.error('Error comprobando precarga histórica:', error)
    }
  } else {
    console.log('⚠️ Database not available, using in-memory data')
  }
}).catch(() => {
  console.log('⚠️ Database not available, using in-memory data')
})

// Verificar conexión de email al iniciar
verifyEmailConnection()

// Iniciar scheduler de recordatorios
startReminderScheduler()

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Auth API listening on http://localhost:${PORT}`)
})


