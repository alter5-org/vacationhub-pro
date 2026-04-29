/**
 * Plantillas de email para notificaciones de vacaciones
 */

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch])
}

export function getNewRequestEmailTemplate({ employeeName, startDate, endDate, days, reason, requestId }) {
  const subject = `Nueva solicitud de vacaciones - ${employeeName}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
        .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .button-danger { background: #EF4444; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏖️ Nueva Solicitud de Vacaciones</h1>
        </div>
        <div class="content">
          <p>Hola,</p>
          <p><strong>${employeeName}</strong> ha solicitado días de vacaciones que requieren tu aprobación.</p>
          
          <div class="info-box">
            <h3>Detalles de la solicitud:</h3>
            <p><strong>Empleado:</strong> ${employeeName}</p>
            <p><strong>Fecha inicio:</strong> ${startDate}</p>
            <p><strong>Fecha fin:</strong> ${endDate}</p>
            <p><strong>Días solicitados:</strong> ${days} día${days !== 1 ? 's' : ''}</p>
            ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.APP_URL || 'http://localhost:5173'}/approvals?requestId=${encodeURIComponent(requestId)}" class="button">Ver Solicitud</a>
          </p>
          
          <p style="color: #EF4444; font-weight: bold; margin-top: 20px;">
            ⏰ Por favor, responde en las próximas 24 horas.
          </p>
        </div>
        <div class="footer">
          <p>VacationHub - Alter-5</p>
          <p>Este es un email automático, por favor no responder.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
Nueva Solicitud de Vacaciones

${employeeName} ha solicitado días de vacaciones que requieren tu aprobación.

Detalles:
- Empleado: ${employeeName}
- Fecha inicio: ${startDate}
- Fecha fin: ${endDate}
- Días solicitados: ${days} día${days !== 1 ? 's' : ''}
${reason ? `- Motivo: ${reason}` : ''}

Por favor, responde en las próximas 24 horas.
Accede a: ${process.env.APP_URL || 'http://localhost:5173'}/approvals?requestId=${encodeURIComponent(requestId)}
  `
  
  return { subject, html, text }
}

export function getReminderEmailTemplate({ employeeName, startDate, endDate, days, requestId, reminderNumber }) {
  const reminderText = reminderNumber === 1 ? 'primer recordatorio' : 'segundo recordatorio'
  const subject = `⏰ Recordatorio: Solicitud de vacaciones pendiente - ${employeeName}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B; }
        .button { display: inline-block; padding: 12px 24px; background: #F59E0B; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Recordatorio: Solicitud Pendiente</h1>
        </div>
        <div class="content">
          <p>Hola,</p>
          <p>Esta es una notificación de <strong>${reminderText}</strong> sobre una solicitud de vacaciones que aún está pendiente de aprobación.</p>
          
          <div class="info-box">
            <h3>Detalles de la solicitud:</h3>
            <p><strong>Empleado:</strong> ${employeeName}</p>
            <p><strong>Fecha inicio:</strong> ${startDate}</p>
            <p><strong>Fecha fin:</strong> ${endDate}</p>
            <p><strong>Días solicitados:</strong> ${days} día${days !== 1 ? 's' : ''}</p>
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.APP_URL || 'http://localhost:5173'}/approvals" class="button">Revisar Solicitud</a>
          </p>
          
          <p style="color: #EF4444; font-weight: bold; margin-top: 20px;">
            ⚠️ Esta solicitud lleva más de ${reminderNumber * 24} horas esperando tu respuesta.
          </p>
        </div>
        <div class="footer">
          <p>VacationHub - Alter-5</p>
          <p>Este es un email automático, por favor no responder.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
Recordatorio: Solicitud de Vacaciones Pendiente

Esta es una notificación de ${reminderText} sobre una solicitud de vacaciones que aún está pendiente de aprobación.

Detalles:
- Empleado: ${employeeName}
- Fecha inicio: ${startDate}
- Fecha fin: ${endDate}
- Días solicitados: ${days} día${days !== 1 ? 's' : ''}

Esta solicitud lleva más de ${reminderNumber * 24} horas esperando tu respuesta.
Accede a: ${process.env.APP_URL || 'http://localhost:5173'}/approvals
  `
  
  return { subject, html, text }
}

export function getApprovalEmailTemplate({ employeeName, startDate, endDate, days, reviewerName }) {
  const subject = `✅ Tu solicitud de vacaciones ha sido aprobada`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Solicitud Aprobada</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${employeeName}</strong>,</p>
          <p>¡Buenas noticias! Tu solicitud de vacaciones ha sido <strong>aprobada</strong> por ${reviewerName}.</p>
          
          <div class="info-box">
            <h3>Detalles de tus vacaciones:</h3>
            <p><strong>Fecha inicio:</strong> ${startDate}</p>
            <p><strong>Fecha fin:</strong> ${endDate}</p>
            <p><strong>Días aprobados:</strong> ${days} día${days !== 1 ? 's' : ''}</p>
          </div>
          
          <p>¡Disfruta de tus vacaciones! 🏖️</p>
        </div>
        <div class="footer">
          <p>VacationHub - Alter-5</p>
          <p>Este es un email automático, por favor no responder.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
Solicitud de Vacaciones Aprobada

Hola ${employeeName},

¡Buenas noticias! Tu solicitud de vacaciones ha sido aprobada por ${reviewerName}.

Detalles:
- Fecha inicio: ${startDate}
- Fecha fin: ${endDate}
- Días aprobados: ${days} día${days !== 1 ? 's' : ''}

¡Disfruta de tus vacaciones!
  `
  
  return { subject, html, text }
}

export function getRejectionEmailTemplate({ employeeName, startDate, endDate, days, reviewerName, rejectionReason }) {
  const subject = `❌ Tu solicitud de vacaciones ha sido rechazada`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444; }
        .reason-box { background: #FEF2F2; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Solicitud Rechazada</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${employeeName}</strong>,</p>
          <p>Lamentamos informarte que tu solicitud de vacaciones ha sido <strong>rechazada</strong> por ${reviewerName}.</p>
          
          <div class="info-box">
            <h3>Detalles de la solicitud:</h3>
            <p><strong>Fecha inicio:</strong> ${startDate}</p>
            <p><strong>Fecha fin:</strong> ${endDate}</p>
            <p><strong>Días solicitados:</strong> ${days} día${days !== 1 ? 's' : ''}</p>
          </div>
          
          ${rejectionReason ? `
          <div class="reason-box">
            <h4>Motivo del rechazo:</h4>
            <p>${rejectionReason}</p>
          </div>
          ` : ''}
          
          <p>Si tienes alguna pregunta, por favor contacta con ${reviewerName}.</p>
        </div>
        <div class="footer">
          <p>VacationHub - Alter-5</p>
          <p>Este es un email automático, por favor no responder.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
Solicitud de Vacaciones Rechazada

Hola ${employeeName},

Lamentamos informarte que tu solicitud de vacaciones ha sido rechazada por ${reviewerName}.

Detalles:
- Fecha inicio: ${startDate}
- Fecha fin: ${endDate}
- Días solicitados: ${days} día${days !== 1 ? 's' : ''}
${rejectionReason ? `\nMotivo del rechazo:\n${rejectionReason}` : ''}

Si tienes alguna pregunta, por favor contacta con ${reviewerName}.
  `
  
  return { subject, html, text }
}


export function getMagicLinkEmailTemplate({ employeeName, loginLink }) {
  const subject = `Tu enlace de acceso a Alter5 Vacaciones`
  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const logoUrl = `${appUrl}/brand/alter5-wordmark.png`
  const safeName = escapeHtml(employeeName)
  const safeLink = escapeHtml(loginLink)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; background: #f5f6f8; margin: 0; padding: 0; }
        .wrapper { background: #f5f6f8; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
        .header { background: #ffffff; padding: 48px 40px 36px; text-align: center; border-bottom: 1px solid #f0f1f3; }
        .header img { height: 110px; display: inline-block; max-width: 360px; }
        .content { padding: 40px; color: #1a1a1a; }
        .content h1 { font-size: 20px; font-weight: 600; margin: 0 0 20px; color: #0A1628; letter-spacing: -0.01em; }
        .content p { font-size: 15px; margin: 0 0 16px; color: #374151; }
        .button-row { margin: 32px 0; }
        .button { display: inline-block; padding: 12px 28px; background: #0A1628; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 15px; }
        .button:hover { background: #1a2940; }
        .link-fallback { font-size: 13px; color: #6b7280; margin-top: 12px; word-break: break-all; }
        .divider { height: 1px; background: #e5e7eb; margin: 28px 0; border: 0; }
        .meta { font-size: 13px; color: #6b7280; }
        .meta strong { color: #374151; font-weight: 600; }
        .footer { padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; background: #fafafa; }
        .footer p { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="Alter5">
          </div>
          <div class="content">
            <h1>Tu enlace de acceso</h1>
            <p>Hola ${safeName},</p>
            <p>Pulsa el botón para acceder al portal de vacaciones de Alter5. No necesitas contraseña.</p>
            <div class="button-row">
              <a href="${safeLink}" class="button">Acceder a Vacaciones</a>
              <p class="link-fallback">Si el botón no funciona, copia este enlace en tu navegador:<br>${safeLink}</p>
            </div>
            <hr class="divider">
            <p class="meta">Este enlace caduca en <strong>15 minutos</strong> y solo puede usarse una vez. Si no lo has solicitado tú, puedes ignorar este correo.</p>
          </div>
          <div class="footer">
            <p>Alter5 &middot; Portal de Vacaciones</p>
            <p>Mensaje automático, por favor no responder.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `Alter5 · Portal de Vacaciones

Hola ${employeeName},

Pulsa el siguiente enlace para acceder. No necesitas contraseña:
${loginLink}

Este enlace caduca en 15 minutos y solo puede usarse una vez. Si no lo has solicitado tú, puedes ignorar este correo.

—
Alter5
Mensaje automático, por favor no responder.`

  return { subject, html, text }
}
