import express from 'express'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'

import { JWT_SECRET } from './config.js'
import { sendEmail } from './emailService.js'
import { getMagicLinkEmailTemplate } from './emailTemplates.js'
import * as userRepo from './userRepository.js'
import * as loginTokenRepo from './loginTokenRepository.js'
import { testConnection } from './database.js'

let dbReady = false
testConnection()
  .then((connected) => {
    dbReady = connected
    console.log(connected ? '✅ Auth: database ready' : '⚠️ Auth: database unavailable')
  })
  .catch(() => {
    console.log('⚠️ Auth: database unavailable')
  })

export const authRouter = express.Router()

const requestLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas solicitudes. Intenta más tarde.' },
})

const verifyLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos. Intenta más tarde.' },
})

const GENERIC_REQUEST_RESPONSE = {
  success: true,
  message: 'Si el email está registrado, recibirás un enlace de acceso en breve.',
}

function buildJwtPayload(user) {
  return {
    sub: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    deptId: user.deptId || user.dept_id,
    role: user.role,
  }
}

function buildLoginLink(email, token) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  return `${appUrl}/?login=1&email=${encodeURIComponent(email)}&token=${token}`
}

authRouter.post('/auth/request-link', requestLinkLimiter, async (req, res) => {
  const { email } = req.body || {}

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Email requerido' })
  }

  if (!dbReady) {
    return res.status(503).json({ success: false, error: 'Servicio de autenticación no disponible' })
  }

  try {
    await loginTokenRepo.cleanupExpiredTokens()

    const user = await userRepo.getUserByEmail(email)

    // Anti-enumeration: respuesta genérica independientemente de si el usuario existe.
    if (user) {
      try {
        const token = await loginTokenRepo.createLoginToken(user.email)
        const template = getMagicLinkEmailTemplate({
          employeeName: user.name,
          loginLink: buildLoginLink(user.email, token),
        })
        await sendEmail({
          to: user.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        })
      } catch (sendError) {
        console.error('Magic link send failed for', user.email, sendError)
      }
    }

    return res.json(GENERIC_REQUEST_RESPONSE)
  } catch (error) {
    console.error('request-link error:', error)
    return res.json(GENERIC_REQUEST_RESPONSE)
  }
})

authRouter.post('/auth/verify-link', verifyLinkLimiter, async (req, res) => {
  const { email, token } = req.body || {}

  if (!email || !token) {
    return res.status(400).json({ success: false, error: 'Enlace incompleto' })
  }

  if (!dbReady) {
    return res.status(503).json({ success: false, error: 'Servicio de autenticación no disponible' })
  }

  try {
    const consumed = await loginTokenRepo.consumeLoginToken(email, token)
    if (!consumed) {
      return res.status(401).json({ success: false, error: 'Enlace inválido o caducado' })
    }

    const user = await userRepo.getUserByEmail(email)
    if (!user) {
      return res.status(401).json({ success: false, error: 'Enlace inválido o caducado' })
    }

    const payload = buildJwtPayload(user)
    const jwtToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })

    return res.json({ success: true, token: jwtToken, user: payload })
  } catch (error) {
    console.error('verify-link error:', error)
    return res.status(500).json({ success: false, error: 'Error de autenticación' })
  }
})
