# Next Agent Context - Construction CRM

Last updated: 2026-07-15

---

## 1. Current Snapshot

| Key | Value |
|---|---|
| Workspace | `E:\Construction_CRM` |
| Git remote | `origin` points to the GitHub repo |
| Package manager | pnpm 11.7.0 workspace |
| Backend | Express + TypeScript + Prisma |
| Frontend | React 18 + Vite + Tailwind |
| Database | Supabase PostgreSQL through Prisma |
| File storage | Cloudflare R2-compatible storage configured in `.env` |
| Phases completed | 1-9 complete |
| Next phase | Phase 10 - Polish |
| UI style | Modern CRM. The original retro direction was changed by the user. |

Sensitive values live in `.env`, which is gitignored. Do not copy database URLs, Supabase keys, or R2 keys into docs, commits, logs, or summaries.

---

## 2. Phase Status

| Phase | Status | Notes |
|---|---|---|
| 1 - Foundation & Auth | Done | Owner registration, invite flow, JWT/cookie auth, optional Supabase auth validation. |
| 2 - Leads | Done | Lead pipeline, RBAC, activity logging. |
| 3 - Quotations | Done | Quotation line items, pricing totals, status workflow. |
| 4 - Projects | Done | Projects, milestones, staff assignment, quotation conversion. |
| 5 - Employees | Done | Employee directory with salary visibility controls. |
| 6 - Expenses | Done | Expense submission, approval, rejection, category/status tracking. |
| 7 - Invoices | Done | Invoice generation, PDF rendering, email notifier hook, overdue reminder state. |
| 8 - Documents | Done | Document metadata, upload sessions, local/R2 storage adapter, previews/downloads. |
| 9 - Dashboard & Analytics | Done | Role-aware analytics API and live dashboard UI. |
| 10 - Polish | Next | Global search, notifications, audit log viewer, loading/empty/error states, mobile polish. |
| 11 - Testing | Pending | Broader test suite and E2E workflow. |
| 12 - Deployment | Pending | Production hosting, CI/CD, health checks. |
| 13 - Portfolio Packaging | Pending | Demo material, README polish, screenshots/video. |

---

## 3. Current App Surface

### Backend routes

All routes except health/auth public entry points require authentication.

| Area | Key paths |
|---|---|
| Health | `GET /api/health` |
| Auth | `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/invite`, `/api/auth/accept-invite` |
| Leads | `GET/POST /api/leads` |
| Quotations | `GET/POST /api/quotations` |
| Projects | `GET/POST /api/projects`, `POST /api/projects/from-quotation`, `POST /api/projects/:id/milestones`, `POST /api/projects/:id/assignments` |
| Employees | `GET/POST /api/employees` |
| Expenses | `GET/POST /api/expenses`, `PATCH /api/expenses/:id/approve`, `PATCH /api/expenses/:id/reject` |
| Invoices | `GET/POST /api/invoices`, invoice PDF/download/email/status actions |
| Documents | `GET/POST /api/documents`, upload session, complete upload, preview/download/delete actions |
| Analytics | `GET /api/analytics/dashboard` |

### Frontend routes

| Path | Purpose |
|---|---|
| `/login` | Login |
| `/accept-invite` | Staff invite acceptance |
| `/` | Live analytics dashboard |
| `/leads` | Lead management |
| `/quotations` | Quotation management |
| `/projects` | Project management |
| `/employees` | Employee management |
| `/expenses` | Expense management |
| `/invoices` | Invoice generation, preview, PDF/download/email |
| `/documents` | Entity-linked document upload and preview |

---

## 4. Database And Supabase State

Prisma schema now contains 15 application models:

`User`, `UserInvitation`, `PasswordResetToken`, `Lead`, `Quotation`, `QuotationItem`, `ActivityLog`, `Project`, `ProjectMilestone`, `ProjectAssignment`, `Employee`, `Expense`, `Invoice`, `InvoiceItem`, `Document`.

Remote Supabase status verified on 2026-07-15:

- Prisma reports the database schema is up to date.
- Remote database has 9 applied migrations.
- Latest migration is `202607150002_phase_5_6_employees_expenses`.
- Expected public app tables all have RLS enabled.
- `public._prisma_migrations` may show a Supabase alert because Prisma's internal migration table is public without RLS; do not add application policies to app tables unless the architecture changes to direct Supabase client access.
- Current architecture is backend-owned data access through Prisma, so "RLS enabled no policy" alerts on app tables are expected and acceptable.

Useful Supabase check:

```powershell
$env:Path = 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:Path
pnpm --dir apps/api exec tsx src/db/verifySupabase.ts
```

---

## 5. Storage State

Document storage is configured through `DOCUMENT_STORAGE_DRIVER`.

- `local` works for development through local direct upload/download routes.
- `r2` works through Cloudflare R2 S3-compatible presigned URLs.
- R2 bucket connectivity, presigned upload, public read, content match, and cleanup were verified on 2026-07-15.
- Keep R2 account ID, access key, secret key, bucket, and public base URL only in `.env`.

---

## 6. Architecture Patterns

Domain modules follow a service/store pattern:

1. Store interface in `apps/api/src/<module>/<module>Store.ts`
2. Prisma implementation in `apps/api/src/<module>/prisma<Module>Store.ts`
3. In-memory implementation for tests
4. Service with business rules and RBAC
5. Zod schemas
6. Route file under `apps/api/src/routes`
7. Wiring inside `apps/api/src/app.ts`

Tests use `createApp(...)` with in-memory stores where possible. Production uses Prisma stores and the configured storage/notifier adapters.

RBAC is split between:

- `authenticate.ts` for identity/session validation.
- `authorize.ts` for route-level role gates.
- Service-layer checks for record-level rules.

---

## 7. Phase 8 And 9 Evidence

Phase 8 document work includes:

- Backend document service/store/routes.
- `Document` Prisma model and migration.
- Local and R2 storage providers.
- Frontend `/documents` page.
- API tests for upload lifecycle and access restrictions.

Phase 9 analytics work includes:

- `apps/api/src/analytics/*`
- `apps/api/src/routes/analyticsRoutes.ts`
- `GET /api/analytics/dashboard`
- Shared dashboard contracts in `packages/shared-types/src/index.ts`
- Live frontend dashboard consuming analytics through `getDashboardAnalytics`.
- API tests covering dashboard analytics behavior.

Validation completed on 2026-07-15:

- Shared types TypeScript build passed.
- API TypeScript compile passed.
- API Vitest suite passed: 7 files, 17 tests.
- Web TypeScript compile passed.
- Web Vitest suite passed: 1 file, 2 tests.
- Web production build passed.
- Supabase migrations and table RLS verification passed.
- R2 provider and upload/read/delete verification passed.

---

## 8. Phase 10 Starting Point

Recommended next slice for Phase 10:

1. Add backend global search endpoint across leads, projects, invoices, and possibly documents.
2. Wire the existing top-bar search UI in `Layout` to a real API-backed dropdown.
3. Add lightweight in-app notifications from existing signals: overdue invoices, pending expenses, assigned projects/leads.
4. Add audit-log viewer using existing `activity_logs`.
5. Add reusable loading, empty, and error states to high-traffic pages.
6. Do a mobile pass on navigation, tables/cards, forms, invoice preview, and document uploads.

Phase 10 should preserve the existing design direction and shared component patterns rather than starting a visual redesign from scratch.

---

## 9. Useful Commands

Set PATH first in PowerShell:

```powershell
$env:Path = 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:Path
```

Common checks:

```powershell
pnpm --dir packages/shared-types exec tsc -p tsconfig.json
pnpm --dir apps/api exec tsc -p tsconfig.json
pnpm --dir apps/api test
pnpm --dir apps/web exec tsc -b tsconfig.json
pnpm --dir apps/web test
pnpm --dir apps/web build
pnpm --dir apps/api exec prisma migrate status --schema prisma/schema.prisma
pnpm --dir apps/api exec tsx src/db/verifySupabase.ts
```
