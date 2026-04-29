import { readFile } from 'fs/promises'
import crypto from 'crypto'
import { query, testConnection } from './database.js'

const DEFAULT_PATH = 'data/users-template.csv'

function parseCsv(content) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      row.push(field)
      field = ''
      continue
    }

    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }

    if (char !== '\r') {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function normalizeHeader(header) {
  return header.trim().toLowerCase()
}

function buildRowObject(headers, values) {
  const data = {}
  headers.forEach((header, index) => {
    data[header] = (values[index] || '').trim()
  })
  return data
}

function getField(data, ...keys) {
  for (const key of keys) {
    if (data[key] !== undefined) {
      return data[key]
    }
  }
  return ''
}

async function upsertUser({ id, name, email, deptId, role, startDate, dryRun }) {
  const emailLower = email.toLowerCase()
  const validRole = role === 'admin' || role === 'employee' ? role : 'employee'
  const normalizedStartDate = startDate || null

  const existing = await query('SELECT id FROM users WHERE email = $1', [emailLower])

  if (existing.rows.length > 0) {
    if (!dryRun) {
      await query(
        `UPDATE users
         SET name = $1,
             dept_id = $2,
             role = $3,
             start_date = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE email = $5`,
        [name, deptId, validRole, normalizedStartDate, emailLower]
      )
    }
    return { action: 'updated' }
  }

  const userId = id || crypto.randomUUID()
  if (!dryRun) {
    await query(
      `INSERT INTO users (id, name, email, dept_id, role, start_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, name, emailLower, deptId, validRole, normalizedStartDate]
    )
  }

  return { action: 'created' }
}

async function importUsers() {
  const filePath = process.argv[2] || DEFAULT_PATH
  const dryRun = process.argv.includes('--dry-run')

  const connected = await testConnection()
  if (!connected) {
    console.error('❌ No se pudo conectar a la base de datos')
    process.exit(1)
  }

  const raw = await readFile(filePath, 'utf8')
  const rows = parseCsv(raw).filter((row) => row.some((cell) => String(cell).trim()))

  if (rows.length < 2) {
    console.error('❌ CSV vacío o sin datos')
    process.exit(1)
  }

  const headers = rows[0].map(normalizeHeader)
  const dataRows = rows.slice(1)

  const requiredHeaders = ['name', 'email']
  const hasDeptId = headers.includes('deptid') || headers.includes('dept_id')

  if (!requiredHeaders.every((key) => headers.includes(key)) || !hasDeptId) {
    console.error('❌ CSV inválido. Encabezados requeridos: name, email, deptId')
    process.exit(1)
  }

  let created = 0
  let updated = 0
  let skipped = 0

  for (const values of dataRows) {
    const rowData = buildRowObject(headers, values)
    const name = getField(rowData, 'name')
    const email = getField(rowData, 'email')
    const deptId = getField(rowData, 'deptid', 'dept_id')
    const role = getField(rowData, 'role') || 'employee'
    const startDate = getField(rowData, 'startdate', 'start_date')
    const id = getField(rowData, 'id')

    if (!name || !email || !deptId) {
      skipped += 1
      continue
    }

    const result = await upsertUser({
      id,
      name,
      email,
      deptId,
      role,
      startDate,
      dryRun,
    })

    if (result.action === 'created') {
      created += 1
    } else {
      updated += 1
    }
  }

  console.log('✅ Importación completada')
  console.log(`🆕 Creados: ${created}`)
  console.log(`♻️ Actualizados: ${updated}`)
  console.log(`⏭️ Omitidos: ${skipped}`)
  if (dryRun) {
    console.log('ℹ️ Modo dry-run: no se guardaron cambios')
  }
}

importUsers().catch((error) => {
  console.error('❌ Error importando usuarios:', error)
  process.exit(1)
})
