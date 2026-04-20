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

- **Frontend**: Vercel project `vacationhub-prov2` (team `javiers-projects-fd4e06c4`). Domain `vacaciones.alter5.com`. DNS CNAME in Cloudflare → `cname.vercel-dns.com` (DNS only).
- **Backend**: Render web service `vacationhub-backend` (`vacationhub-backend.onrender.com`). `/api/*` is rewritten from Vercel to Render via `vercel.json`.
- **Database**: PostgreSQL (via `pg`). `DATABASE_URL` is set in Render env vars. Schema in `server/schema.sql`, apply with `npm run migrate`.
- **Email**: Resend (primary, `RESEND_API_KEY`) or SMTP fallback (`SMTP_*`).
- **Scheduler**: `server/reminderScheduler.js` runs hourly via `node-cron`. ⚠️ If Render is on the free tier, the service spins down after 15 minutes of inactivity and the scheduler stops until the next request wakes it — upgrade to a paid plan or move the scheduler to an external cron (e.g. GitHub Actions) for reliability.

### Deploy flow
Intended: push to `main` on `alter5-org/vacationhub-pro` → Vercel auto-deploys the SPA, Render auto-deploys the backend.
Today (2026-04-20): the Vercel GitHub App in `alter5-org` has lost repo permissions, so Vercel does not auto-deploy. Until an org owner reinstalls the Vercel GitHub App, deploy the frontend manually with `cd <repo> && npx vercel --prod` (the project is already linked locally via `.vercel/`).

### Legacy / deprecated
- AWS App Runner service (`5dedar3xke.eu-west-1.awsapprunner.com`) + Aurora + CloudFormation + ECR pipeline (`.github/workflows/deploy.yml`) are deprecated. App Runner is still alive but cannot reach a working DB, so login fails with 503. Do not restore DNS to App Runner. Pending: decommission the AWS stack.

## Testing

Vitest + jsdom + React Testing Library. Config in `vitest.config.ts`, setup in `vitest.setup.ts`. Tests colocated with source files (`.test.tsx`/`.test.ts`).
