# SiteCore Construction CRM

SiteCore is a single-tenant construction CRM for managing leads, quotations, projects, employees, expenses, documents, invoices, dashboard analytics, and global search from one secure workspace.

## What It Does

- Lead intake with status pipeline and activity tracking
- Quotations with line items, tax, totals, and approval states
- Project creation from accepted quotations or manual entry
- Project milestones and employee assignments
- Employee directory with role-based salary visibility
- Expense submission, approval, rejection, and status tracking
- Invoice generation from project quotation lines and approved expenses
- Invoice PDF preview, payment tracking, and email delivery support
- Project, lead, employee, and invoice document uploads
- Role-aware dashboard and global search

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Zustand
- Backend: Express, TypeScript, Prisma, PostgreSQL
- Shared types: workspace package under `packages/shared-types`
- Tests: Vitest, Supertest, React Testing Library
- Deployments: Vercel for web, Railway-compatible API
- Optional services: Supabase auth, Cloudflare R2 documents, Resend invoice email

## Roles And Access

| Role | Main Access |
| --- | --- |
| Owner | Full system access |
| Admin | Full operational access except owner-only bootstrap |
| Manager | Leads, quotations, projects, documents, invoice view, employee view with salary hidden |
| Accountant | Expenses, invoices, documents, finance dashboard data |
| Employee | Assigned projects and only their own submitted expenses |

Employees can create expenses and track their own expense status. They cannot see organization-wide expenses.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Create a `.env` file at the repo root or inside `apps/api`.

Minimum local API variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/construction_crm"
JWT_ACCESS_SECRET="replace-with-at-least-24-characters"
JWT_REFRESH_SECRET="replace-with-at-least-24-characters"
APP_ORIGIN="http://localhost:5173"
```

Optional production integrations:

```env
SUPABASE_AUTH_ENABLED="false"
SUPABASE_URL=""
SUPABASE_PUBLISHABLE_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
DOCUMENT_STORAGE_DRIVER="local"
R2_ENDPOINT=""
R2_BUCKET=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
RESEND_API_KEY=""
INVOICE_EMAIL_FROM=""
```

Run database migrations:

```bash
pnpm --filter @construction-crm/api prisma:deploy
```

Seed demo accounts:

```bash
pnpm db:seed
```

Start the API:

```bash
pnpm dev:api
```

Start the web app:

```bash
pnpm dev:web
```

The web app defaults to `http://localhost:5173` and the API defaults to `http://localhost:4000/api`.

## Demo Accounts

The seed creates these demo users when `DEMO_ACCOUNT_DOMAIN=construction.com`:

- `admin@construction.com`
- `manager1@construction.com`
- `manager2@construction.com`
- `employee1@construction.com` through `employee6@construction.com`
- `accountant@construction.com`

Use `DEMO_SEED_PASSWORD` to set their password during seeding.

## Testing

Run backend tests:

```bash
pnpm --dir apps/api test
```

Run frontend tests:

```bash
pnpm --dir apps/web test
```

Build the frontend:

```bash
pnpm --dir apps/web build
```

Run the whole workspace test suite:

```bash
pnpm test
```

## Production Workflow

The main happy path is:

1. Log in as admin or manager.
2. Create a lead.
3. Start a quotation from the lead.
4. Create and accept the quotation.
5. Convert the accepted quotation into a project.
6. Add milestones, assignments, expenses, and documents.
7. Generate an invoice from the project.
8. Track invoice status and payments.

## Repository Layout

```text
apps/api                 Express API, Prisma stores, services, routes, tests
apps/web                 React frontend
packages/shared-types    Shared TypeScript contracts
```

## Deployment Notes

- Web deployment needs `VITE_API_URL` pointing to the API `/api` URL.
- API deployment needs `DATABASE_URL`, JWT secrets, and `APP_ORIGIN`/`APP_ORIGINS`.
- For production document uploads, set `DOCUMENT_STORAGE_DRIVER=r2` plus the R2 variables.
- For invoice email delivery, configure `RESEND_API_KEY` and `INVOICE_EMAIL_FROM`.
