# VacationHub Pro - API Documentation

API REST para el sistema de gestión de ausencias y vacaciones.

## Base URL

```
http://localhost:4000/api
```

## Autenticación

La API utiliza JWT (JSON Web Tokens) para autenticación. El token debe incluirse en el header `Authorization`:

```
Authorization: Bearer <token>
```

---

## Endpoints

### Autenticación (magic link)

No hay contraseñas. El usuario solicita un enlace de un solo uso, lo abre desde su email y obtiene un JWT.

#### `POST /api/auth/request-link`

Genera un token de magic-link (válido 15 min, single-use) y envía un email al usuario. Respuesta genérica anti-enumeration: siempre 200 si el body es válido, exista o no el email.

**Request Body:**
```json
{ "email": "javier.ruiz@alter-5.com" }
```

**Response (200):**
```json
{
  "success": true,
  "message": "Si el email está registrado, recibirás un enlace de acceso en breve."
}
```

**Errores:**
- `400`: `email` ausente.
- `429`: 5 solicitudes / 15 min por IP excedidas.
- `503`: base de datos no disponible.

**cURL:**
```bash
curl -X POST http://localhost:4000/api/auth/request-link \
  -H "Content-Type: application/json" \
  -d '{"email":"javier.ruiz@alter-5.com"}'
```

#### `POST /api/auth/verify-link`

Canjea un token de magic-link por un JWT. El token se marca como usado de forma atómica; un segundo intento devuelve 401.

**Request Body:**
```json
{
  "email": "javier.ruiz@alter-5.com",
  "token": "<token recibido por email>"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e7",
    "email": "javier.ruiz@alter-5.com",
    "name": "Javier Ruiz Balado",
    "deptId": "sales",
    "role": "employee"
  }
}
```

**Errores:**
- `400`: `email` o `token` ausente.
- `401`: enlace inválido, caducado o ya consumido.
- `429`: 20 verificaciones / 15 min por IP excedidas.
- `503`: base de datos no disponible.

---

### Reportes

#### `GET /api/reports/departments`

Obtiene estadísticas de uso de vacaciones por departamento.

**Query Parameters:**
- `year` (opcional): Año para el cual obtener las estadísticas. Por defecto: año actual.

**Ejemplo:**
```
GET /api/reports/departments?year=2025
```

**Response (200):**
```json
{
  "year": 2025,
  "policies": {
    "vacationDaysPerYear": 24,
    "carryOverLimit": 5
  },
  "departments": [
    {
      "id": "tech",
      "name": "Tech Team",
      "color": "#6366F1",
      "icon": "💻",
      "employeeCount": 4,
      "totalDays": 96,
      "usedDays": 45,
      "pendingDays": 10,
      "usagePercent": 47
    },
    {
      "id": "sales",
      "name": "Deal Origination & Sales",
      "color": "#F59E0B",
      "icon": "📈",
      "employeeCount": 3,
      "totalDays": 72,
      "usedDays": 30,
      "pendingDays": 5,
      "usagePercent": 42
    }
  ]
}
```

**Ejemplo con cURL:**
```bash
curl http://localhost:4000/api/reports/departments?year=2025
```

---

#### `GET /api/reports/employees`

Obtiene el balance de vacaciones de todos los empleados.

**Query Parameters:**
- `year` (opcional): Año para el cual obtener los balances. Por defecto: año actual.

**Ejemplo:**
```
GET /api/reports/employees?year=2025
```

**Response (200):**
```json
{
  "year": 2025,
  "employees": [
    {
      "id": "e7",
      "name": "Javier Ruiz Balado",
      "email": "javier.ruiz@alter-5.com",
      "deptId": "sales",
      "balance": {
        "year": 2025,
        "total": 28,
        "used": 16,
        "pending": 0,
        "carryOver": 4,
        "available": 12
      }
    },
    {
      "id": "e1",
      "name": "Leandro Pili",
      "email": "leandro.pili@alter-5.com",
      "deptId": "tech",
      "balance": {
        "year": 2025,
        "total": 29,
        "used": 0,
        "pending": 0,
        "carryOver": 5,
        "available": 29
      }
    }
  ]
}
```

**Ejemplo con cURL:**
```bash
curl http://localhost:4000/api/reports/employees?year=2025
```

---

## Códigos de Estado HTTP

- `200 OK`: Solicitud exitosa
- `400 Bad Request`: Datos de entrada inválidos
- `401 Unauthorized`: Credenciales inválidas o token faltante
- `403 Forbidden`: Token válido pero sin permisos
- `500 Internal Server Error`: Error del servidor

---

## Estructura del Token JWT

El token JWT contiene el siguiente payload:

```json
{
  "sub": "e7",
  "email": "javier.ruiz@alter-5.com",
  "name": "Javier Ruiz Balado",
  "deptId": "sales",
  "role": "employee",
  "iat": 1234567890,
  "exp": 1234595690
}
```

**Campos:**
- `sub`: ID del empleado
- `email`: Email del empleado
- `name`: Nombre completo
- `deptId`: ID del departamento
- `role`: Rol (`employee` o `admin`)
- `iat`: Fecha de emisión (timestamp)
- `exp`: Fecha de expiración (timestamp, 8 horas después de la emisión)

---

## Notas de Implementación

### Seguridad

1. **JWT_SECRET** obligatorio en producción (variable de entorno aleatoria).
2. **Sin contraseñas**: la auth es magic-link único. Tokens de 32 bytes hex, single-use, 15 min, almacenados en `login_tokens`.
3. **Anti-enumeration**: `request-link` devuelve la misma respuesta exista o no el email.
4. **Rate limiting**: 5 solicitudes / 20 verificaciones por IP cada 15 min.
5. **HTTPS** y **CORS** restringido a `vacaciones.alter5.com` + previews `*.vercel.app`.
6. **JWT 8h**: requiere `Authorization: Bearer <token>` en endpoints protegidos.

### Variables de Entorno

```env
PORT=4000
JWT_SECRET=tu-secret-super-seguro-aqui
NODE_ENV=production
```

### Middleware de Autenticación

Para proteger rutas en el futuro, usar el middleware `authenticateJWT`:

```javascript
import { authenticateJWT } from './authMiddleware.js'

router.get('/protected-route', authenticateJWT, (req, res) => {
  // req.user contiene el payload del token
  res.json({ user: req.user })
})
```

---

## Ejemplos de Uso

### Flujo Completo de Autenticación

```javascript
// 1. Solicitar enlace de acceso (el usuario lo recibe por email)
await fetch('http://localhost:4000/api/auth/request-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'javier.ruiz@alter-5.com' }),
})

// 2. El usuario abre el link → la app extrae email + token de la URL
//    y los canjea por un JWT
const verify = await fetch('http://localhost:4000/api/auth/verify-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, token: linkToken }),
})
const { token, user } = await verify.json()

// 3. Usar el JWT en endpoints protegidos
const reports = await fetch('http://localhost:4000/api/reports/employees?year=2025', {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json())
```

---

## Changelog

### v2.0.0
- Auth migrada a magic-link único (POST /api/auth/request-link + /api/auth/verify-link)
- Eliminados endpoints de password (login/forgot/reset/change)
- Tabla `password_reset_tokens` renombrada a `login_tokens` con `used_at`

### v1.0.0
- Endpoint de login con JWT
- Endpoints de reportes (departments, employees)
- Soporte para carry-over de días de vacaciones
- Cálculo de balances por empleado y departamento

---

## Soporte

Para problemas o preguntas, contactar al equipo de desarrollo.

