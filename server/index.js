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

app.use(cors())
app.use(express.json())

// Health check for App Runner
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
    // En Railway, ejecutar migración automáticamente si es necesario
    if (process.env.RAILWAY_ENVIRONMENT) {
      try {
        const result = await query('SELECT COUNT(*) FROM users')
        if (result.rows[0].count === '0') {
          console.log('⚠️ Database empty, running migration...')
          // Ejecutar migración en background
          import('./railwayMigrate.js').catch(err => {
            console.error('Migration error:', err)
          })
        }
      } catch (error) {
        // Ignorar errores de migración automática
      }
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


