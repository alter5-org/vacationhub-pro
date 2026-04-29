/**
 * Lista canónica de empleados Alter5.
 * Se inserta vía `npm run migrate` y nunca contiene credenciales — la
 * autenticación es magic-link, no hay contraseñas que sembrar.
 */
export const SEED_USERS = [
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
