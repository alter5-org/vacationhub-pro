export const PORT = process.env.PORT || 4000

const isProduction = process.env.NODE_ENV === 'production'

if (!process.env.JWT_SECRET) {
  if (isProduction) {
    throw new Error('JWT_SECRET requerido en producción')
  }
  console.warn('JWT_SECRET no definido, usando valor por defecto SOLO para desarrollo')
}

if (isProduction) {
  const hasDbUrl = Boolean(process.env.DATABASE_URL)
  const hasDbParts = Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD)
  if (!hasDbUrl && !hasDbParts) {
    console.warn('⚠️ DATABASE_URL (o DB_HOST/DB_NAME/DB_USER/DB_PASSWORD) no definido en producción: login devolverá 503')
  }
  if (!process.env.APP_URL) {
    console.warn('⚠️ APP_URL no definido en producción: los links de reset password apuntarán a http://localhost:5173')
  }
  const hasEmail = Boolean(process.env.RESEND_API_KEY) || Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
  if (!hasEmail) {
    console.warn('⚠️ Sin RESEND_API_KEY ni SMTP_USER/SMTP_PASS: los emails no se enviarán')
  }
  if (!process.env.INTERNAL_SCHEDULER_TOKEN) {
    console.warn('⚠️ INTERNAL_SCHEDULER_TOKEN no definido: el scheduler de recordatorios fallará al llamar al endpoint interno')
  }
}

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'


