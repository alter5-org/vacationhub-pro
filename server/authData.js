export const USERS = [
  { id: 'e1', name: 'Leandro Pili', email: 'leandro.pili@alter-5.com', deptId: 'tech', role: 'employee', startDate: '2025-05-05' },
  { id: 'e2', name: 'Aaron Rodilla', email: 'aaron.rodilla@alter-5.com', deptId: 'tech', role: 'employee', startDate: '2025-10-15' },
  { id: 'e3', name: 'Lautaro Laserna', email: 'lautaro.laserna@alter-5.com', deptId: 'tech', role: 'employee', startDate: '2025-02-05' },
  { id: 'e11', name: 'Sabrina Zanzi', email: 'sabrina.zanzi@alter5.com', deptId: 'tech', role: 'employee', startDate: '2026-01-12' },
  { id: 'e4', name: 'Salvador Carrillo', email: 'salvador.carrillo@alter-5.com', deptId: 'sales', role: 'admin' },
  { id: 'e6', name: 'Carlos Almodovar', email: 'carlos.almodovar@alter-5.com', deptId: 'sales', role: 'employee', startDate: '2025-11-03' },
  { id: 'e7', name: 'Javier Ruiz Balado', email: 'javier.ruiz@alter-5.com', deptId: 'sales', role: 'employee' },
  { id: 'e8', name: 'Miguel Solana', email: 'miguel.solana@alter-5.com', deptId: 'capital', role: 'admin' },
  { id: 'e9', name: 'Rafael Nevado', email: 'rafael.nevado@alter-5.com', deptId: 'capital', role: 'employee' },
  { id: 'e10', name: 'Gonzalo de Gracia', email: 'gonzalo.degracia@alter-5.com', deptId: 'capital', role: 'employee', startDate: '2025-07-15' },
]

// Hashed passwords (using bcrypt)
export const HASHED_CREDENTIALS = {
  'javier.ruiz@alter-5.com': '$2b$10$GrgefVUjltNrkXnz/NnTWudO0r2k0U/88F7qPoSWg5R.XI3YF56Tu',
  'miguel.solana@alter-5.com': '$2b$10$k37mYK3rcjC6mkKwDjDoZOAB96.RK.G0EYxHdSlmVy5ZCuQgJ7nmi',
  'leandro.pili@alter-5.com': '$2b$10$P21mH0rK0LOgTLHNC1WAme5iC0moGR/UGaFHg6IQXFfVmQ3WZV8.e',
  'aaron.rodilla@alter-5.com': '$2b$10$CKFk4YuW.UEOO2YW5xMZf.4kSQmmwtN1q3YnPuLQIR.iZWyKOiqv6',
  'lautaro.laserna@alter-5.com': '$2b$10$qnfcf7QVWFPC.eOf0C6F9./tdcHmsJv8ujN86SHvFVcSM4hIZNate',
  'salvador.carrillo@alter-5.com': '$2b$10$pZqDbXOGzouJ428/Py2faOGuR7Zc2UYn9XECHgnXn3upqvMmcQ5RO',
  'carlos.almodovar@alter-5.com': '$2b$10$KovcyMc3kZWjRsrOfzOA9OvUjXOfWUAy3dsZaMtKqtlcItlgZBbxy',
  'rafael.nevado@alter-5.com': '$2b$10$ZKvAXkl1P9BvEUMgZs9AkOagXN9GNwRkRVzQV5FGLSrrpfmVY39S2',
  'gonzalo.degracia@alter-5.com': '$2b$10$uYBE6CG8v54lWOb0RNRacezmkswgaWeqKRWrQIatJSl440fBpIJ9e',
  'sabrina.zanzi@alter5.com': '$2b$10$z8w0HdbgN0hSAX7O./57AuWhUTl28ilBxr6lDtNjbEkym11uFWRQ2',
}

// Function to update password (in-memory for now, should use DB in production)
export function updatePassword(email, hashedPassword) {
  const emailLower = email.toLowerCase()
  HASHED_CREDENTIALS[emailLower] = hashedPassword
  // Note: In production, this should update a database, not an in-memory object
  return true
}
