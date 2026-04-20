import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import rateLimit from 'express-rate-limit'
import { USERS, HASHED_CREDENTIALS, updatePassword } from './authData.js'
import { JWT_SECRET } from './config.js'
import { authenticateJWT } from './authMiddleware.js'
import { sendEmail } from './emailService.js'
import { getPasswordResetEmailTemplate } from './emailTemplates.js'
// Database repositories (with fallback to in-memory)
import * as userRepo from './userRepository.js'
import * as resetTokenRepo from './passwordResetRepository.js'
import { testConnection } from './database.js'
// Fallback to in-memory tokens if DB not available
import { createResetToken as createResetTokenMem, verifyResetToken as verifyResetTokenMem, deleteResetToken as deleteResetTokenMem, cleanupExpiredTokens as cleanupExpiredTokensMem } from './passwordResetTokens.js'

// Check if database is available
let useDatabase = false
testConnection().then(connected => {
  useDatabase = connected
  if (useDatabase) {
    console.log('✅ Using PostgreSQL database')
  } else {
    console.log('⚠️ Database not available, using in-memory data')
  }
}).catch(() => {
  console.log('⚠️ Database not available, using in-memory data')
})

export const authRouter = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos. Intenta más tarde.' },
})

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas solicitudes. Intenta más tarde.' },
})

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, error: 'Email y contraseña requeridos' })
  }

  if (!useDatabase && process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Servicio de autenticación no disponible' })
  }

  try {
    let user, passwordValid

    if (useDatabase) {
      user = await userRepo.getUserByEmail(email)
      passwordValid = user ? await userRepo.verifyPassword(email, password) : false
    } else {
      user = USERS.find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase()
      )
      const emailLower = String(email).toLowerCase()
      const hashedPassword = HASHED_CREDENTIALS[emailLower]
      passwordValid = hashedPassword ? await bcrypt.compare(password, hashedPassword) : false
    }

    if (!user || !passwordValid) {
      return res
        .status(401)
        .json({ success: false, error: 'Credenciales inválidas' })
    }

    const payload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      deptId: user.deptId || user.dept_id,
      role: user.role,
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })

    return res.json({
      success: true,
      token,
      user: payload,
    })
  } catch (error) {
    console.error('Login error:', error)
    return res
      .status(500)
      .json({ success: false, error: 'Error de autenticación' })
  }
})

// Change password endpoint
authRouter.post('/change-password', authenticateJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  const userEmail = req.user.email.toLowerCase()

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ success: false, error: 'Contraseña actual y nueva contraseña requeridas' })
  }

  // Validate new password strength
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' })
  }

  if (!useDatabase && process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Servicio de autenticación no disponible' })
  }

  try {
    // Verify current password
    let currentPasswordValid
    if (useDatabase) {
      currentPasswordValid = await userRepo.verifyPassword(userEmail, currentPassword)
    } else {
      const hashedPassword = HASHED_CREDENTIALS[userEmail]
      currentPasswordValid = false
      if (hashedPassword) {
        currentPasswordValid = await bcrypt.compare(currentPassword, hashedPassword)
      }
    }

    if (!currentPasswordValid) {
      return res
        .status(401)
        .json({ success: false, error: 'Contraseña actual incorrecta' })
    }

    // Check if new password is different
    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ success: false, error: 'La nueva contraseña debe ser diferente a la actual' })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    if (useDatabase) {
      await userRepo.updateUserPassword(userEmail, newPasswordHash)
    } else {
      updatePassword(userEmail, newPasswordHash)
    }

    return res.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    })
  } catch (error) {
    console.error('Error updating password:', error)
    return res
      .status(500)
      .json({ success: false, error: 'Error al actualizar la contraseña' })
  }
})

// Request password reset
authRouter.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  const { email } = req.body || {}

  if (!email) {
    return res
      .status(400)
      .json({ success: false, error: 'Email requerido' })
  }

  if (!useDatabase && process.env.NODE_ENV === 'production') {
    return res.json({
      success: true,
      message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña',
    })
  }

  try {
    // Cleanup expired tokens
    if (useDatabase) {
      await resetTokenRepo.cleanupExpiredTokens()
    } else {
      cleanupExpiredTokensMem()
    }

    // Get user
    let user
    if (useDatabase) {
      user = await userRepo.getUserByEmail(email)
    } else {
      user = USERS.find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase()
      )
    }

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      try {
        const token = useDatabase
          ? await resetTokenRepo.createResetToken(user.email)
          : await createResetTokenMem(user.email)

        const appUrl = process.env.APP_URL || 'http://localhost:5173'
        // Use root + query params to avoid SPA deep-link 404s on some hosts
        const resetLink = `${appUrl}/?reset=1&email=${encodeURIComponent(user.email)}&token=${token}`

        const emailTemplate = getPasswordResetEmailTemplate({
          employeeName: user.name,
          resetLink,
        })

        await sendEmail({
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        })
      } catch (error) {
        console.error('Error sending password reset email:', error)
        // Still return success to prevent email enumeration
      }
    }

    return res.json({
      success: true,
      message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña',
    })
  } catch (error) {
    console.error('Error in forgot-password:', error)
    return res.json({
      success: true,
      message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña',
    })
  }
})

// Reset password with token
authRouter.post('/reset-password', passwordResetLimiter, async (req, res) => {
  const { email, token, newPassword } = req.body || {}

  if (!email || !token || !newPassword) {
    return res
      .status(400)
      .json({ success: false, error: 'Email, token y nueva contraseña requeridos' })
  }

  // Validate new password strength
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' })
  }

  if (!useDatabase && process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Servicio de autenticación no disponible' })
  }

  try {
    const emailLower = email.toLowerCase()

    // Verify token
    let tokenValid
    if (useDatabase) {
      tokenValid = await resetTokenRepo.verifyResetToken(emailLower, token)
    } else {
      tokenValid = verifyResetTokenMem(emailLower, token)
    }

    if (!tokenValid) {
      return res
        .status(401)
        .json({ success: false, error: 'Token inválido o expirado' })
    }

    // Verify user exists
    let user
    if (useDatabase) {
      user = await userRepo.getUserByEmail(emailLower)
    } else {
      user = USERS.find(
        (u) => u.email.toLowerCase() === emailLower
      )
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: 'Usuario no encontrado' })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    if (useDatabase) {
      await userRepo.updateUserPassword(emailLower, newPasswordHash)
      await resetTokenRepo.markTokenAsUsed(emailLower, token)
    } else {
      updatePassword(emailLower, newPasswordHash)
      deleteResetTokenMem(emailLower)
    }

    return res.json({
      success: true,
      message: 'Contraseña restablecida correctamente',
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return res
      .status(500)
      .json({ success: false, error: 'Error al restablecer la contraseña' })
  }
})


