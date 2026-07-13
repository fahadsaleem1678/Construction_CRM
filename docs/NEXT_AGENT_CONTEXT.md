# Next Agent Context — Construction CRM

Last updated: 2026-07-13

---

## 1. Project Snapshot

| Key | Value |
|---|---|
| **Workspace** | `E:\Construction_CRM` |
| **Git** | Initialized (`.git` folder present, but empty) |
| **Package manager** | pnpm 11.7.0 (workspace) |
| **Master plan** | [`construction-crm-plan-single-tenant.md`](file:///e:/Construction_CRM/construction-crm-plan-single-tenant.md) |
| **Total planned phases** | 0–13 (Phase 0 = planning doc) |
| **Phases completed** | **1 (Foundation & Auth), 2 (Leads), 3 (Quotations), 4 (Projects), 5 (Employees), 6 (Expenses)** |
| **Next phase** | **7 — Invoice Generation** |
| **UI style** | Modern CRM (original retro requirement was changed at user's request) |

---

## 2. Monorepo Structure

```
E:\Construction_CRM
├── apps/
│   ├── api/          ← Express + TypeScript + Prisma backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma        (311 lines, 12 models)
│   │   │   ├── migrations/
│   │   │   │   ├── 202607080001_phase_1_auth/
│   │   │   │   ├── 202607080002_phase_2_leads/
│   │   │   │   ├── 202607080003_phase_3_quotations/
│   │   │   │   └── ... (Prisma schema now includes Project, Employee, Expense models)
│   │   │   ├── seed.ts
│   │   │   └── seed.js
│   │   └── src/
│   │       ├── app.ts               ← createApp() factory
│   │       ├── server.ts            ← entry point
│   │       ├── auth/                ← Auth module
│   │       ├── leads/               ← Leads module
│   │       ├── quotations/          ← Quotations module
│   │       ├── projects/            ← Projects module (milestones & assignments)
│   │       ├── employees/           ← Employees module
│   │       ├── expenses/            ← Expenses module
│   │       ├── config/
│   │       ├── db/
│   │       ├── middleware/          ← Auth, authorization, error handler
│   │       ├── routes/              ← Auth, leads, quotations, projects, employees, expenses routes
│   │       ├── tests/               ← Unit/Integration tests for auth, leads, quotations, projects
│   │       └── types/
│   └── web/          ← React + Vite + TypeScript frontend
│       └── src/
│           ├── App.tsx              ← BrowserRouter, routes
│           ├── main.tsx
│           ├── styles.css
│           ├── components/          ← Layout, Button, ProtectedRoute, TextField
│           ├── lib/                 ← api.ts, sessionStore.ts (Zustand)
│           └── pages/
│               ├── LoginPage.tsx
│               ├── AcceptInvitePage.tsx
│               ├── DashboardPage.tsx
│               ├── leads/LeadsPage.tsx
│               ├── quotations/QuotationsPage.tsx
│               ├── projects/ProjectsPage.tsx
│               ├── employees/EmployeesPage.tsx
│               └── expenses/ExpensesPage.tsx
├── packages/
│   └── shared-types/
│       └── src/index.ts             ← All shared TS contracts (now includes Project, Employee, Expense types)
├── docs/
│   └── NEXT_AGENT_CONTEXT.md        ← THIS FILE
├── docker-compose.yml               ← postgres:16-alpine on :5432
├── .env                             ← Supabase + DB credentials (gitignored)
├── .env.example
├── .gitignore
├── eslint.config.js
├── tsconfig.base.json
├── pnpm-workspace.yaml
└── package.json                     ← workspace scripts
```

---

## 3. Tech Stack

### Backend (`apps/api`)

| Layer | Technology |
|---|---|
| Framework | Express |
| Language | TypeScript (ESM) |
| ORM | Prisma (PostgreSQL) |
| Validation | Zod |
| Auth | JWT (access + refresh, httpOnly cookies) + optional Supabase Auth |
| Security | helmet, cors, bcrypt |
| Logging | pino / pino-http |
| Testing | Vitest |

### Frontend (`apps/web`)

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript |
| State | Zustand (session store) |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| HTTP | Custom `api.ts` client with auto token refresh |

### Shared (`packages/shared-types`)

Single `index.ts` exporting all type contracts: `AuthUser`, `Lead`, `Quotation`, `QuotationItem`, `Project`, `ProjectMilestone`, `ProjectAssignment`, `Employee`, `Expense`, enums, request/response types.

### Infrastructure

- **Local DB**: Docker Compose → `postgres:16-alpine` on port 5432
- **Remote DB**: Supabase PostgreSQL (migration not yet applied — see Blockers)
- **Planned deployment**: Vercel (frontend) + Railway (API + Postgres)
- **Planned file storage**: Cloudflare R2
- **Planned email**: Resend / SendGrid

---

## 4. Architecture Patterns

Understanding these patterns is **critical** for any agent continuing work on this codebase.

### 4.1 Dependency Injection via Store Interfaces

Each domain module follows a **Service + Store** pattern:

```
                ┌──────────────┐
  Route ───►   │   Service    │   (business logic, RBAC checks)
                └──────┬───────┘
                       │ depends on
                ┌──────▼───────┐
                │    Store     │   (interface — e.g. LeadStore)
                └──────┬───────┘
                       │ implemented by
           ┌───────────┴───────────┐
           │                       │
   PrismaLeadStore         InMemoryLeadStore
   (production)            (unit tests)
```

- **Store interface**: `apps/api/src/<module>/<module>Store.ts`
- **Prisma impl**: `apps/api/src/<module>/prisma<Module>Store.ts`
- **In-memory impl**: `apps/api/src/<module>/inMemory<Module>Store.ts`
- **Service**: `apps/api/src/<module>/<module>Service.ts`
- **Schemas** (Zod): `apps/api/src/<module>/<module>Schemas.ts`

The `createApp()` factory in `app.ts` wires everything together. Tests call `createApp(inMemoryUserStore, inMemoryLeadStore, ...)`.

**When adding a new module (e.g. invoices), follow this exact pattern:**
1. Create the store interface
2. Create the Prisma store implementation
3. Create the in-memory store implementation (for tests)
4. Create the service
5. Create Zod schemas
6. Create the route file
7. Wire into `createApp()`

### 4.2 RBAC Middleware

Two-layer approach:
- `authenticate.ts` — validates JWT (or Supabase token if enabled), attaches `req.user`
- `authorize.ts` — checks `req.user.role` against allowed roles array

Fine-grained rules (e.g. "employee can only see assigned leads/projects") live in the **service layer**, not middleware.

### 4.3 Supabase Auth (Dual-Mode)

Controlled by env var `SUPABASE_AUTH_ENABLED`:
- **`true`**: Tokens are validated via `supabase.auth.getUser()` server-side
- **`false`** (or test): Local JWT auth path is used

Supabase adapter: `apps/api/src/auth/supabaseAuth.ts`

> ⚠️ **Security**: Service role key is backend-only. Role metadata goes to `app_metadata`, not `user_metadata`.

### 4.4 Frontend Routing

All authenticated routes are wrapped in `<ProtectedRoute>`. The session bootstrap happens in `App.tsx` via `useSessionStore.bootstrap()`. API calls go through `apps/web/src/lib/api.ts` which handles token refresh automatically.

### 4.5 Prisma Schema Conventions

- Model names: PascalCase (`QuotationItem`)
- DB table names: snake_case via `@@map("quotation_items")`
- Field names: camelCase in TS, snake_case in DB via `@map("field_name")`
- All IDs: UUID strings (`@id @default(uuid())`)
- All timestamps: `created_at`, `updated_at`
- Decimals: `@db.Decimal(12, 2)` for money fields

---

## 5. Current Database Schema (Prisma)

**12 models** are implemented:

| Model | Table | Phase | Key Relations |
|---|---|---|---|
| `User` | `users` | 1 | → leads, quotations, activity_logs, invitations, assignments, expenses |
| `UserInvitation` | `user_invitations` | 1 | → invited_by User |
| `PasswordResetToken` | `password_reset_tokens` | 1 | → User |
| `Lead` | `leads` | 2 | → assigned User, → quotations, → projects |
| `Quotation` | `quotations` | 3 | → Lead, → created_by User, → items, → project |
| `QuotationItem` | `quotation_items` | 3 | → Quotation (cascade delete) |
| `ActivityLog` | `activity_logs` | 1 | → User (nullable) |
| `Project` | `projects` | 4 | → Lead, → Quotation, → milestones, → assignments, → expenses |
| `ProjectMilestone` | `project_milestones` | 4 | → Project (cascade delete) |
| `ProjectAssignment` | `project_assignments` | 4 | → Project (cascade delete), → User |
| `Employee` | `employees` | 5 | → User (nullable), → expenses |
| `Expense` | `expenses` | 6 | → Project, → Employee, → submitter User, → approver User |

### Enums

| Enum | Values |
|---|---|
| `UserRole` | `owner`, `admin`, `manager`, `employee`, `accountant` |
| `LeadStatus` | `new`, `contacted`, `site_visit`, `quoted`, `won`, `lost` |
| `LeadSource` | `walk_in`, `referral`, `website`, `phone`, `social`, `other` |
| `QuotationStatus` | `draft`, `sent`, `accepted`, `rejected`, `expired` |
| `ProjectStatus` | `planning`, `in_progress`, `on_hold`, `completed`, `cancelled` |
| `MilestoneStatus` | `pending`, `in_progress`, `completed` |
| `EmploymentStatus` | `active`, `inactive`, `terminated` |
| `ExpenseCategory` | `materials`, `labor`, `transport`, `equipment`, `overhead`, `other` |
| `ExpenseStatus` | `pending`, `approved`, `rejected` |

### Models NOT yet created (needed for future phases)

```
Phase 7:  Invoice, InvoiceItem
Phase 8:  Document (polymorphic)
```

---

## 6. Completed Work (Phases 1–6)

### Phase 1 — Foundation & Auth ✅
- Express app factory and Prisma user setup.
- Invitation-based team registration and JWT auth paths.
- Frontend Auth flow + pages (`LoginPage`, `AcceptInvitePage`).

### Phase 2 — Leads ✅
- Lead schema & activities tracking.
- Leads management UI (Kanban + Table views).

### Phase 3 — Quotations ✅
- Quotation item CRUD with automated subtotal, tax, and total pricing calculations.
- Status workflows, and conversion prompt to project.

### Phase 4 — Projects ✅
- `Project`, `ProjectMilestone`, and `ProjectAssignment` models and business services.
- Convert accepted quotation into a project (marks lead as `won`).
- Frontend `/projects` page for managing milestones, assignments, status progress, and basic budget visibility.
- Integration tests in `projects.test.ts`.

### Phase 5 — Employees ✅
- `Employee` schema, service, store interface, and Prisma implementation.
- API endpoints supporting limited salary/wage details (accessible only to `owner`, `admin`, `accountant`).
- Frontend `/employees` page displaying workforce details.

### Phase 6 — Expenses ✅
- `Expense` models and workflows.
- API routing for submitting, approving (owner/admin/accountant), and rejecting (owner/admin/accountant/manager with note) expenses.
- Frontend `/expenses` list and submission panel.

---

## 7. API Endpoints (Current)

All core paths require authentication (except where noted).

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check |
| `POST` | `/api/auth/register` | No | Owner registration |
| `POST` | `/api/auth/login` | No | Login (cookies) |
| `POST` | `/api/auth/refresh` | Cookie | Session refresh |
| `POST` | `/api/auth/logout` | Yes | Logout |
| `POST` | `/api/auth/invite` | Owner/Admin | Invite staff |
| `POST` | `/api/auth/accept-invite` | No | Accept invite |
| `GET` | `/api/auth/me` | Yes | Current profile |
| `GET` | `/api/leads` | Yes | List leads |
| `POST` | `/api/leads` | Yes | Create lead |
| `GET` | `/api/quotations` | Yes | List quotations |
| `POST` | `/api/quotations` | Yes | Create quotation |
| `GET` | `/api/projects` | Yes | List projects |
| `POST` | `/api/projects` | Yes | Create project |
| `POST` | `/api/projects/from-quotation` | Yes | Convert quotation to project |
| `POST` | `/api/projects/:id/milestones` | Yes | Add milestone |
| `POST` | `/api/projects/:id/assignments` | Yes | Assign staff |
| `GET` | `/api/employees` | Yes | List employees |
| `POST` | `/api/employees` | Yes | Create employee |
| `GET` | `/api/expenses` | Yes | List expenses |
| `POST` | `/api/expenses` | Yes | Submit expense |
| `PATCH` | `/api/expenses/:id/approve` | Approver | Approve expense |
| `PATCH` | `/api/expenses/:id/reject` | Approver/Mgr | Reject expense |

### Frontend Routes

| Path | Component | Auth Required |
|---|---|---|
| `/login` | `LoginPage` | No |
| `/accept-invite` | `AcceptInvitePage` | No |
| `/` | `DashboardPage` | Yes |
| `/leads` | `LeadsPage` | Yes |
| `/quotations` | `QuotationsPage` | Yes |
| `/projects` | `ProjectsPage` | Yes |
| `/employees` | `EmployeesPage` | Yes |
| `/expenses` | `ExpensesPage` | Yes |

---

## 8. Current Issues & Bugs

### 8.1 ❌ Frontend Unit Test Failure (`App.test.tsx`)
Running `pnpm test` triggers `vitest run` on `apps/web`. The test file `src/App.test.tsx` fails inside `renders protected content for signed-in users` with:
`TypeError: Cannot destructure property 'future' of 'React__namespace.useContext(...)' as it is null.`
* **Cause:** `ProtectedRoute` renders the `<Layout>` component, which utilizes `NavLink` (from `react-router-dom`). The test environment does not mount `ProtectedRoute` within a Router context (e.g. `MemoryRouter` or mock `Layout`), causing React Router hook failures.
* **Resolution:** Wrap `<ProtectedRoute />` in `<MemoryRouter>` inside `App.test.tsx` or mock `Layout`.

---

## 9. Secret & Database Setup Notes

* Supabase credentials are located in `E:\Construction_CRM\.env` (gitignored).
* Remote migrations are pending remote SSL configuration.
* Local Docker Database:
  ```powershell
  docker compose up -d postgres
  ```

---

## 10. Roadmap — What Needs to Be Done Next

### Phase 7 — Invoice Generation 🔜 (NEXT)

**Database Schema:**
- `Invoice` model: id, project_id, client_name, invoice_number (unique), status (draft/sent/partially_paid/paid/overdue), subtotal, tax, total, due_date, paid_date, created_at, updated_at
- `InvoiceItem` model: id, invoice_id (FK), description, quantity, unit_price, total

**Backend (`apps/api`):**
- Create `InvoiceStore` interface + `PrismaInvoiceStore` + `InMemoryInvoiceStore`.
- Implement `InvoiceService` with logic to generate an invoice from a Project (extract quotation items and expenses as suggested items).
- Implement `@react-pdf/renderer` PDF invoice layout generation.
- Add invoice routing & wire into `app.ts`.
- Set up `node-cron` scheduled task for overdue invoice automated detection and Resend email alerts.
- Write unit tests in `apps/api/src/tests/invoices.test.ts`.

**Frontend (`apps/web`):**
- Add `/invoices` routing and link in `Layout.tsx` navbar.
- Build `InvoicesPage` component:
  - Generate invoice modal.
  - PDF preview / download panel.
  - Payment tracking actions (mark as paid / partially paid).

---

## 11. Useful Commands

Always update your local PowerShell PATH when executing `pnpm`:
```powershell
$env:Path = 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:Path

# Test
pnpm test

# Build
pnpm build

# Lint
pnpm lint

# Generate Prisma Client
pnpm --filter @construction-crm/api prisma:generate
```
