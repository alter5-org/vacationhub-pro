# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (two terminals needed)
npm run dev:server     # Express backend on port 4000
npm run dev            # Vite frontend on port 5173 (proxies /api to backend)

# Build & production
npm run build          # Vite build → dist/
npm start              # Production server (serves API + static dist/)

# Tests
npm test               # Vitest (all tests)
npm run test:watch     # Vitest watch mode
npx vitest run src/path/to/file.test.tsx  # Single test file

# Database
npm run migrate        # Run schema + seed (needs DB connection)
```

## Architecture

Monolithic app: React frontend + Express 5 backend in one repo, deployed as a single service.

**Frontend** (`src/`): React 18 + Vite + Tailwind. Uses `@/` alias for `src/`. State via React Context (`AuthContext`, `RequestContext`, `ToastContext`). Pages in `src/pages/`, reusable UI in `src/components/ui/`.

**Backend** (`server/`): Express 5 (ESM modules, `.js` extensions required in imports). All routes under `/api`. JWT auth via `authMiddleware.js`. PostgreSQL via `pg` pool in `database.js` — supports `DATABASE_URL` connection string or individual `DB_*` env vars.

**Shared data** (`src/data/`): `absenceTypes.js` and `employees.js` are imported by both frontend and backend. The Dockerfile copies `src/data/` separately for this reason.

**Route files**: `authRoutes.js`, `requestRoutes.js`, `employeeRoutes.js`, `reportRoutes.js`, `notificationRoutes.js` — each exports a router mounted at `/api`.

## Key Patterns

- **Express 5**: Uses `/{*path}` for catch-all routes (not `*`). The `path-to-regexp` v8 syntax applies.
- **DB queries**: Use the `query(text, params)` helper from `database.js`, not direct pool access.
- **Auth flow**: JWT in Authorization header → `authenticateJWT` middleware → `req.user` has decoded payload.
- **Frontend API calls**: In dev, Vite proxies `/api` to the backend. In production, Express serves both the API and the built `dist/` static files.

## Deployment

- **AWS App Runner** (eu-west-1) with VPC connector to Aurora
- **Aurora Serverless v2** PostgreSQL
- **CI/CD**: Push to `main` → GitHub Actions builds Docker image → pushes to ECR → App Runner auto-deploys
- **Secrets**: AWS Secrets Manager (`vacationhub-secrets-prod`) — DATABASE_URL, JWT_SECRET, SMTP_*
- **CloudFormation**: `infrastructure/cloudformation/` — `data.yaml` (Aurora), `apprunner.yaml` (App Runner)
- **Domain**: vacaciones.alter5.com

## Testing

Vitest + jsdom + React Testing Library. Config in `vitest.config.ts`, setup in `vitest.setup.ts`. Tests colocated with source files (`.test.tsx`/`.test.ts`).
