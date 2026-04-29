/**
 * Repositorio de usuarios - Acceso a datos de usuarios en PostgreSQL.
 * Auth es magic-link: el repo no maneja contraseñas.
 */

import { query } from './database.js'

export async function getUserByEmail(email) {
  const result = await query(
    'SELECT id, name, email, dept_id as "deptId", role, start_date as "startDate" FROM users WHERE email = $1',
    [email.toLowerCase()]
  )
  return result.rows[0] || null
}

export async function getUserById(id) {
  const result = await query(
    'SELECT id, name, email, dept_id as "deptId", role, start_date as "startDate" FROM users WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

export async function getAllUsers() {
  const result = await query(
    'SELECT id, name, email, dept_id as "deptId", role, start_date as "startDate", created_at, updated_at FROM users ORDER BY name'
  )
  return result.rows
}

export async function getUsersByDepartment(deptId) {
  const result = await query(
    'SELECT id, name, email, dept_id as "deptId", role, start_date as "startDate" FROM users WHERE dept_id = $1 ORDER BY name',
    [deptId]
  )
  return result.rows
}

export async function createUser(userData) {
  const { id, name, email, deptId, role, startDate } = userData

  const result = await query(
    `INSERT INTO users (id, name, email, dept_id, role, start_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, email, dept_id as "deptId", role, start_date as "startDate"`,
    [id, name, email.toLowerCase(), deptId, role || 'employee', startDate || null]
  )

  return result.rows[0]
}

export async function updateUser(id, updates) {
  const fields = []
  const values = []
  let paramIndex = 1

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`)
    values.push(updates.name)
  }
  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`)
    values.push(updates.email.toLowerCase())
  }
  if (updates.deptId !== undefined) {
    fields.push(`dept_id = $${paramIndex++}`)
    values.push(updates.deptId)
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramIndex++}`)
    values.push(updates.role)
  }
  if (updates.startDate !== undefined) {
    fields.push(`start_date = $${paramIndex++}`)
    values.push(updates.startDate)
  }

  if (fields.length === 0) {
    return await getUserById(id)
  }

  values.push(id)
  const result = await query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
    values
  )

  return result.rows[0] || null
}

export async function deleteUser(id) {
  await query('DELETE FROM users WHERE id = $1', [id])
  return true
}
