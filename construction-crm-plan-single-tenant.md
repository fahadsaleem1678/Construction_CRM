# Construction Company CRM — Single-Tenant Implementation Plan

**Stack:** Node.js + Express + TypeScript (backend) · React + TypeScript + Vite (frontend) · PostgreSQL + Prisma · Single company · Deployed on Vercel (frontend) + Railway (backend + DB)

This is the multi-tenant plan stripped down: no `tenant_id`, no RLS, no subdomain routing. One company, multiple internal users with roles. Faster to build, still a complete production-grade app for a portfolio piece.

---

## 1. Architecture Overview

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────┐
│  React SPA  │◄────►│  Express API      │◄────►│  PostgreSQL   │
│  (Vercel)   │ REST │  (Railway)        │      │  (Railway)    │
└─────────────┘      └────────┬─────────┘      └──────────────┘
                               │
                     ┌─────────┴─────────┐
                     │  Cloudflare R2     │  ← documents, invoice PDFs
                     └───────────────────┘
                               │
                     ┌─────────┴─────────┐
                     │  Resend/SendGrid   │  ← emails
                     └───────────────────┘
```

One Express API, one Postgres database, one company's data. Users are just employees of that company logging into a shared internal tool — this is the more common real-world shape for a construction company CRM anyway (they're buying software for their own business, not reselling it).

### Core entities (ERD summary)
```
users (role: owner/admin/manager/employee/accountant)
 leads
   └── quotations
         └── quotation_items
   └── projects (created from won leads)
         └── project_milestones
         └── expenses
         └── documents
         └── project_assignments (employees ↔ projects)
 employees
   └── employee_documents
 expenses (project-linked or general/overhead)
 invoices
   └── invoice_items
 documents (polymorphic: lead/project/employee/invoice)
 activity_logs
```

---

## 2. Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- TailwindCSS + shadcn/ui
- TanStack Query + Zustand
- React Router v6, React Hook Form + Zod
- Recharts (dashboard)

**Backend**
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- Zod for request validation
- JWT (access + refresh token, httpOnly cookie), bcrypt
- Multer + AWS SDK v3 (Cloudflare R2)
- `@react-pdf/renderer` for invoice/quotation PDFs
- Resend for email
- Pino for logging
- node-cron for scheduled jobs (overdue invoice reminders)

**Infra**
- Railway: Express API + managed Postgres
- Vercel: React SPA
- Cloudflare R2: file storage
- GitHub Actions: CI + auto-deploy
- Sentry: error tracking

---

## 3. Database Schema (core tables)

```sql
users (id, email, password_hash, name, role, is_active,
       email_verified, created_at)
-- role: owner | admin | manager | employee | accountant

leads (id, client_name, contact_phone, contact_email, source,
       status, estimated_value, assigned_to, notes, created_at)
-- status: new | contacted | site_visit | quoted | won | lost

quotations (id, lead_id, quotation_number, status, subtotal, tax,
            total, valid_until, created_by, created_at)
-- status: draft | sent | accepted | rejected | expired

quotation_items (id, quotation_id, description, unit, quantity,
                  unit_price, total)

projects (id, lead_id, name, client_name, status, start_date,
          end_date, budget, address, created_at)
-- status: planning | in_progress | on_hold | completed | cancelled

project_milestones (id, project_id, title, due_date, status)

employees (id, user_id NULLABLE, name, role, phone, cnic, salary,
           hire_date, is_active)

project_assignments (id, project_id, employee_id, role_on_project)

expenses (id, project_id NULLABLE, category, amount, description,
          expense_date, paid_by, receipt_document_id, status)
-- status: pending | approved | rejected

invoices (id, project_id, client_name, invoice_number, status,
          subtotal, tax, total, due_date, paid_date, created_at)
-- status: draft | sent | partially_paid | paid | overdue

invoice_items (id, invoice_id, description, quantity, unit_price, total)

documents (id, entity_type, entity_id, file_name, file_url,
           file_size, mime_type, uploaded_by, created_at)
-- entity_type: lead | project | employee | invoice

activity_logs (id, user_id, action, entity_type, entity_id,
                metadata_json, created_at)
```

No `tenant_id` anywhere, no RLS policies. Isolation is a non-issue because there's only one company's data in the database.

---

## 4. Phased Build Plan

### Phase 0 — Planning (done)
This document.

### Phase 1 — Foundation & Auth (Week 1)
- Repo setup: `/apps/api`, `/apps/web`, `/packages/shared-types`
- Express scaffold: TypeScript, ESLint, Prettier, env config, error middleware
- Prisma schema for `users`, first migration, seed script (creates the owner account)
- Auth: register (first user becomes owner; subsequent users are invited, not self-registered), login, JWT issue/refresh, logout, password reset
- Middleware: `authenticate`, `authorize(roles[])`
- Frontend: Vite + Tailwind + shadcn setup, login page, invite-acceptance page, protected routes, API client with auto token refresh
- **Deliverable:** owner can log in, invite a manager, manager can log in with restricted access.

### Phase 2 — Lead Management (Week 2)
- CRUD API for leads, filters (status, source, assigned employee), pagination
- Kanban pipeline (New → Contacted → Site Visit → Quoted → Won/Lost)
- Frontend: leads table + kanban view, lead detail drawer, activity timeline
- Convert lead → starts quotation flow

### Phase 3 — Quotations (Week 3)
- CRUD for quotations with line items, auto-calculated totals
- Status transitions (draft → sent → accepted/rejected)
- PDF generation with company letterhead
- Email quotation to client via Resend
- Accepted quotation → prompt to create Project

### Phase 4 — Projects (Week 4)
- CRUD for projects, linked to won leads
- Milestone timeline (simple horizontal timeline, not a full Gantt lib)
- Budget vs. spent tracking, progress %
- Employee assignment to projects

### Phase 5 — Employees (Week 5)
- CRUD for employees, roles, salary (visibility restricted to owner/admin/accountant)
- Employee document uploads (CNIC, contract)
- Assignment history across projects

### Phase 6 — Expenses (Week 6)
- CRUD for expenses, categorized (materials, labor, transport, overhead, other)
- Link to project or mark general/overhead
- Receipt upload
- Approval flow: employee submits → manager/accountant approves

### Phase 7 — Invoice Generation (Week 7)
- CRUD for invoices, generated from a project (pull linked expenses/quotation as suggested line items)
- PDF generation matching quotation branding
- Manual payment status tracking ("mark as paid")
- Overdue detection via cron + email reminder

### Phase 8 — Document Upload (Week 8)
- Centralized document module, polymorphic attachment
- Direct-to-R2 upload via presigned URLs
- File type/size validation
- Inline preview for PDFs/images

### Phase 9 — Dashboard & Analytics (Week 9)
- Company-wide dashboard: active leads, pipeline value, active projects, monthly revenue, overdue invoices, expense breakdown
- Charts via Recharts (revenue trend, conversion funnel, expense-by-category)
- Role-aware views (accountant sees financials, employee sees only assigned projects)

### Phase 10 — Polish (Week 10)
- Global search (leads/projects/invoices)
- Notifications (in-app + email)
- Audit log viewer
- Empty states, loading skeletons, error boundaries
- Responsive/mobile pass

### Phase 11 — Testing (Week 11)
- Backend: unit tests (Vitest/Jest) for services, integration tests for core flows
- Frontend: component tests (Vitest + RTL)
- E2E: Playwright for the happy path (login → lead → quotation → project → invoice)

### Phase 12 — Deployment & CI/CD (Week 12)
- GitHub Actions: lint + typecheck + test on PR, deploy on merge to `main`
- Railway: API + Postgres, env vars, health check endpoint
- Vercel: frontend build, env vars, custom domain
- Cloudflare R2 bucket + CORS
- Seed script with realistic demo data
- `.env.example`, deployment README

### Phase 13 — Portfolio Packaging (Week 13)
- 2–3 min Loom demo: login → full lead-to-invoice flow
- Fiverr gig copy emphasizing: role-based access control, PDF generation, cloud file storage, clean project-based accounting — practical language a construction business owner actually cares about
- Live demo deployment with a reset-nightly demo account
- GitHub repo with README, architecture diagram, screenshots

---

## 5. RBAC Matrix

| Action | Owner | Admin | Manager | Accountant | Employee |
|---|---|---|---|---|---|
| Manage users/roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Leads (CRUD) | ✅ | ✅ | ✅ | ❌ | View assigned only |
| Quotations | ✅ | ✅ | ✅ | View | ❌ |
| Projects | ✅ | ✅ | ✅ | View | View assigned only |
| Employees/salaries | ✅ | ✅ | View (no salary) | ✅ | ❌ |
| Expenses | ✅ | ✅ | Submit | Approve/View all | Submit own |
| Invoices | ✅ | ✅ | View | ✅ | ❌ |
| Dashboard | Full | Full | Ops only | Financial only | Assigned projects only |

---

## 6. What Changed vs. the Multi-Tenant Version
- No `tenant_id` column, no RLS, no subdomain resolution — every table and query is simpler by one join/filter.
- Registration flow changes: first signup creates the owner account directly (no "tenant" concept); everyone after that is invited by an admin/owner rather than self-registering.
- Roughly 1–2 weeks faster to build since Phase 1 has no tenant-isolation testing to get right before moving on.
- Slightly less impressive to a technical reviewer (no "enterprise data isolation" story), but this is actually the more realistic shape for what a single construction company would pay for — worth mentioning in your Fiverr gig description as "internal business management system," not "SaaS platform."

## 7. Suggested Timeline
10–11 weeks part-time, or an MVP (Phases 1–9 + basic deploy) in ~5 weeks if focused full-time.

## 8. Immediate Next Step
Scaffold the repo, get `users` + auth (owner signup, invite-based user creation, JWT login) working end-to-end with one protected route, then move straight into leads.
