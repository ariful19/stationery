
# Stationery Shop App — End‑to‑End Delivery Plan (Node.js + SQLite + Lit)

> **Goal**: A beautiful, fast, and reliable web app for a stationery shop to manage customers, products, invoices (PDF), payments, and dues — built with **Node.js + SQLite** in the backend, **Lit** (with Vite) in the frontend, and **perfectly testable in Codex Web** environments.

---

## Table of Contents
1. [North Star](#north-star)
1. [Scope & Success Criteria](#scope--success-criteria)
1. [High-Level Architecture](#high-level-architecture)
1. [Repository Layout](#repository-layout)
1. [Environments & Tooling](#environments--tooling)
1. [Milestones / Phases](#milestones--phases)
  - [Phase 0 — Project Bootstrap](#phase-0--project-bootstrap)
  - [Phase 1 — Data Model & Migrations](#phase-1--data-model--migrations)
  - [Phase 2 — API Design](#phase-2--api-design)
  - [Phase 3 — Core Business Logic](#phase-3--core-business-logic)
  - [Phase 4 — PDF Invoices](#phase-4--pdf-invoices)
  - [Phase 5 — Frontend (Lit)](#phase-5--frontend-lit)
  - [Phase 6 — Reports & Export](#phase-6--reports--export)
  - [Phase 7 — Testing](#phase-7--testing)
  - [Phase 8 — Docs & DX](#phase-8--docs--dx)
  - [Phase 9 — Hardening & Polish](#phase-9--hardening--polish)
1. [Detailed Agent Playbook](#detailed-agent-playbook)
1. [Backlog (Issues/Tickets)](#backlog-issuestickets)
1. [Data Model](#data-model)
1. [API Contract (v1)](#api-contract-v1)
1. [Frontend (Lit) Structure](#frontend-lit-structure)
1. [Testing Strategy](#testing-strategy)
1. [Security & Compliance](#security--compliance)
1. [Observability & Logging](#observability--logging)
1. [Dev Ergonomics for “Codex Web”](#dev-ergonomics-for-codex-web)
1. [Stretch Goals](#stretch-goals)
1. [Definition of Done Checklist](#definition-of-done-checklist)
1. [Appendix](#appendix)

---

## North Star

- **End-user experience**: Create/edit invoices quickly with a polished, minimal UI; show dues and payment history at a glance; one-click PDF generation; snappy search and filtering.
- **Stack**: 
  - **Backend**: Node.js (Express), TypeScript, Drizzle ORM, `better-sqlite3`, Zod validation, Puppeteer (PDF).
  - **Frontend**: Lit + Vite, TypeScript, Motion One (micro-animations), Chart.js (visuals).
  - **Testing**: Vitest (unit), Playwright (E2E), OpenAPI-based contract tests.
  - **Infra**: Local pnpm workflows with SQLite in WAL mode and reproducible data seeds.
- **Non-goals** (for MVP): Multi-tenant auth, distributed DB, heavy role/permission matrix (can be added later).

---

## Scope & Success Criteria

- **In-Scope (MVP)**
  - Customers, Products CRUD.
  - Invoices with items; discounts, tax, totals.
  - Payments against invoices or directly to customer balance.
  - Dues calculation per customer.
  - Reports: Dues by customer, Sales by date range, Payment list.
  - PDF invoice generation (A4 & 80mm thermal).
  - CSV exports.
- **Success Criteria**
  - One-command dev up (`pnpm dev`).
  - E2E flow: create customer → product → invoice → payment → dues updated.
  - PDF invoices render consistently in local and CI environments.
  - Data persists across local restarts thanks to SQLite WAL mode.
  - Works in “Codex Web” sandboxes (proxy, host binding, headless tests).

---

## High-Level Architecture

```
[ Browser (Lit SPA) ]
        ⇅ HTTP (fetch, JSON)
[ Node.js (Express API) ]
        ⇅ Drizzle ORM (sync calls)
[ SQLite (WAL mode)     ]
```

- **Service layer** holds business rules (totals, dues) as pure functions (tested).
- **API layer** handles validation (Zod), routing, errors.
- **DB** uses Drizzle migrations; SQLite in WAL for better concurrent behavior.
- **PDF** produced by rendering an HTML template via headless Chromium (Puppeteer).

---

## Repository Layout

```
stationery/
  apps/
    api/           # Express + TS + Drizzle + better-sqlite3
    web/           # Lit + Vite + TS
  packages/
    shared/        # shared types, zod schemas, utils
  .env.example
  README.md
```

- **Monorepo** keeps front and back in sync and easy to run in online IDEs.
- **Shared** package centralizes DTOs and validation to avoid drift.

---

## Environments & Tooling

- **Node**: LTS; `.nvmrc` pinned.
- **Package manager**: `pnpm` (or `npm` if preferred).
- **TypeScript** everywhere; `eslint` + `prettier`.
- **Playwright** for browser automation; **Vitest** for unit tests.
- **Vite** dev server with proxy to API to avoid CORS.
- **CI**: run `pnpm build`, `pnpm test`, and `pnpm e2e` for regression coverage.

---

## Milestones / Phases

### Phase 0 — Project Bootstrap
**Tasks**
1. Initialize monorepo; configure `pnpm` workspaces (or npm).
2. `apps/web`: scaffold Vite + Lit; enable `server.host=true` and proxy `/api` → `http://localhost:8080`.
3. `apps/api`: scaffold Express + TS; add Zod, Drizzle, better-sqlite3; health route.
4. Add Vitest & Playwright to both; smoke tests.
5. Scripts: `dev`, `build`, `test`, `e2e`, `lint`, `format`.

**Acceptance**
- `pnpm dev` starts web at `:5173` and API at `:8080`; health 200; sample tests pass.

---

### Phase 1 — Data Model & Migrations
**Tables**
- `customers(id, name, phone, email, addr, created_at)`
- `products(id, sku, name, unit_price, stock_qty, created_at)`
- `invoices(id, invoice_no, customer_id, issue_date, sub_total, discount, tax, grand_total, status)`
- `invoice_items(id, invoice_id, product_id, qty, unit_price, line_total)`
- `payments(id, customer_id, invoice_id?, amount, method, paid_at, note)`
- Computed `ledger_view`: dues = Σ(grand_total[open/partial]) − Σ(payments)

**Tasks**
- Define schema in Drizzle; generate migrations.
- Enable `PRAGMA journal_mode=WAL` at startup.
- Seed script (20 customers, 30 products).

**Acceptance**
- `pnpm db:push` creates tables; WAL mode active; seed OK.

---

### Phase 2 — API Design
**Principles**
- REST-ish; versioned under `/api/v1`.
- Validate every request/response with Zod.
- Central error middleware returns `{code,message,details?}`.
- Generate OpenAPI 3.1 & serve Swagger UI.

**Endpoints (MVP)**
- `GET /health`
- **Customers**: `GET/POST/PUT/DELETE /customers`, `GET /customers/:id/ledger`
- **Products**: `GET/POST/PUT/DELETE /products`
- **Invoices**: `POST /invoices`, `GET /invoices/:id`, `GET /invoices?query=...`, `POST /invoices/:id/pdf`
- **Payments**: `POST /payments`, `GET /payments?customer=...`
- **Reports**: `GET /reports/dues`, `GET /reports/sales?from&to`

**Acceptance**
- Swagger UI at `/docs`; Zod types match OpenAPI; examples runnable.

---

### Phase 3 — Core Business Logic
**Rules**
- Invoice number: `PREFIX-YYYYMM-####` (configurable).
- `grand_total = Σ(line_total) − discount + tax`
- Customer dues = Σ(grand_total where status in ['issued','partial']) − Σ(payments.amount)

**Tasks**
- Implement as pure functions (`packages/shared/billing.ts`).
- Unit tests for rounding, zero qty, returns (negative lines), large numbers.

**Acceptance**
- All billing tests green with golden snapshots.

---

### Phase 4 — PDF Invoices
**Tasks**
- Responsive HTML invoice template (brand colors, RTL-safe, print CSS).
- Puppeteer headless PDF generation (`A4` and `80mm thermal` options).
- Endpoint: `POST /invoices/:id/pdf` returns `application/pdf`.
- Optional: watermark for unpaid/partial.

**Acceptance**
- PDFs render correctly in local development and CI; totals and formatting match UI.

---

### Phase 5 — Frontend (Lit)
**Structure**
- `app-shell` (nav, sidebar, route outlet)
- Pages: `dashboard`, `customers`, `products`, `invoice-editor`, `payments`, `reports`
- Components: `customer-list`, `invoice-form`, `product-picker`, `money-input`, `pdf-preview`

**UX**
- Keyboard-first invoice editing, fuzzy product search, inline errors, optimistic UI.
- Micro-interactions via Motion One for tasteful “mesmerizing” feel.
- Charts with Chart.js (dues by customer, sales trend).

**State**
- Local reactive state in components; small shared store for cross-cutting state.

**Acceptance**
- Create→invoice→payment flow is smooth; animations <200ms; charts render.

---

### Phase 6 — Reports & Export
**Reports**
- Dues by customer (top debtors).
- Sales by date range (daily/weekly/monthly grouping).
- Payments ledger.

**Export**
- CSV (server-side streaming) and PDF (Puppeteer).

**Acceptance**
- Filters work; totals reconcile with ledger & invoices; exports open in Excel/PDF viewers.

---

### Phase 7 — Testing
**Unit (Vitest)**
- Billing rules, helpers, Zod schemas, API services.

**E2E (Playwright)**
- Flow: create customer → create product → create invoice (+items) → record payment → verify dues and invoice PDF.

**Contract**
- Validate API responses against OpenAPI schema in tests.

**Acceptance**
- `pnpm test` and `pnpm e2e` green; Playwright HTML report archived as artifact.

---

### Phase 8 — Docs & DX
**Docs**
- README: quickstart (local), env vars, screenshots.
- `/docs` Swagger UI + download OpenAPI JSON.
- Troubleshooting (Puppeteer deps, file permissions).

**DX**
- Seed script, faker data.
- Lint/format hooks (pre-commit optional).

---

### Phase 9 — Hardening & Polish
**Security**
- CORS (tight), Helmet, rate-limit on PDF and search routes.
- Input validation everywhere; safe file names for PDFs.

**Performance**
- DB indices: `invoice.customer_id`, `payments.customer_id`, `invoice_items.invoice_id`.
- Pagination & server-side filtering for lists.

**Auditability**
- Lightweight audit log (who/when/what) for critical actions.

**Acceptance**
- Security scan clean; basic performance budget met; indices validated.

---

## Detailed Agent Playbook

Each “Agent” is a repeatable, self-contained task with clear IO and acceptance.

### Agent `Init`
- **Input**: empty repo
- **Goal**: create monorepo scaffolding, scripts, TS config, lint/format, Playwright+Vitest.
- **Output**: runnable dev servers (web + api)
- **Verify**: `GET /api/health` 200; Vite page loads.

**Prompt**
> Create `apps/api` (Express+TS+Zod) and `apps/web` (Vite+Lit+TS). Vite: `server.host=true`, proxy `/api`→`http://localhost:8080`. Add scripts: `dev`, `build`, `test`, `e2e`. Add Playwright/Vitest smoke tests.

---

### Agent `DB`
- **Input**: schema spec
- **Goal**: Drizzle models + migrations + seed; enable WAL.
- **Output**: tables created, seed inserted.
- **Verify**: `PRAGMA journal_mode` returns `wal`.

**Prompt**
> Implement SQLite schema via Drizzle; run migrations; add seed script with 20 customers/30 products; enforce `PRAGMA journal_mode=WAL` on startup.

---

### Agent `API`
- **Goal**: REST endpoints with Zod validation; error middleware; OpenAPI 3.1; Swagger UI.
- **Verify**: `/docs` renders; OpenAPI matches Zod types.

**Prompt**
> Implement `/api/v1` for customers/products/invoices/payments/reports. Add Zod schemas in `packages/shared`. Auto-generate OpenAPI and serve Swagger UI. Central error handler.

---

### Agent `Billing`
- **Goal**: Pure functions for totals/dues; golden tests.
- **Verify**: edge cases (rounding, negative lines, zero qty) pass.

**Prompt**
> Implement billing utilities and unit tests. Keep deterministic rounding (e.g., bankers or round-half-up; document choice).

---

### Agent `PDF`
- **Goal**: HTML template → Puppeteer PDF (A4, 80mm).
- **Verify**: `POST /invoices/:id/pdf` returns valid PDF; fonts embedded.

**Prompt**
> Build invoice template (print CSS, logo slot, watermark for unpaid). Implement endpoint that loads invoice HTML and returns `application/pdf` with filename `INV-<number>.pdf`.

---

### Agent `UI`
- **Goal**: Lit app shell, routes, components, animations, charts.
- **Verify**: smooth create→invoice→payment flow; charts render.

**Prompt**
> Implement pages: dashboard/customers/products/invoice-editor/payments/reports. Components: `customer-list`, `invoice-form`, `product-picker`, `money-input`, `pdf-preview`. Use Motion One for micro-animations and Chart.js for charts.

---

### Agent `E2E`
- **Goal**: Playwright flows and fixtures (seeded DB).
- **Verify**: green E2E with HTML report.

**Prompt**
> Write E2E: create customer/product → invoice with items → payment → check dues and download PDF. Use data-testids. Save artifacts (screenshots, traces).

---

## Backlog (Issues/Tickets)

- [ ] Init monorepo & workspace configs
- [ ] API scaffold + health
- [ ] DB schema + migrations + seed + WAL
- [ ] Zod schemas + DTOs in shared
- [ ] Customer CRUD
- [ ] Product CRUD + stock tracking (optional: stock decremented on invoice finalize)
- [ ] Invoice create/edit (draft → issued) + numbering
- [ ] Payment create (for invoice or general balance)
- [ ] Dues endpoint & ledger view
- [ ] Reports (dues/sales/payments)
- [ ] PDF generation (A4 & thermal)
- [ ] CSV exports
- [ ] Lit UI shell & routing
- [ ] Components (lists/forms/pickers)
- [ ] Charts (dues, sales trend)
- [ ] Unit tests (Vitest)
- [ ] E2E tests (Playwright)
- [ ] README + Swagger
- [ ] Security hardening & indices
- [ ] CI pipeline (build, test, e2e)

---

## Data Model

### Entities
- **Customer**
  - `id (pk)`, `name`, `phone`, `email`, `addr`, `created_at`
- **Product**
  - `id (pk)`, `sku (unique)`, `name`, `unit_price`, `stock_qty`, `created_at`
- **Invoice**
  - `id (pk)`, `invoice_no (unique)`, `customer_id (fk)`, `issue_date`, `sub_total`, `discount`, `tax`, `grand_total`, `status ('draft'|'issued'|'partial'|'paid')`
- **InvoiceItem**
  - `id (pk)`, `invoice_id (fk)`, `product_id (fk)`, `qty`, `unit_price`, `line_total`
- **Payment**
  - `id (pk)`, `customer_id (fk)`, `invoice_id (nullable fk)`, `amount`, `method ('cash'|'bkash'|'card'|'other')`, `paid_at`, `note`

### Indices
- `invoices(customer_id)`, `invoice_items(invoice_id)`, `payments(customer_id)`

### Derived
- **Ledger** per customer: `dues = Σ(grand_total where status in ['issued','partial']) − Σ(payments.amount)`

---

## API Contract (v1)

- `GET /api/v1/health`
- **Customers**
  - `GET /customers` (query, pagination)
  - `POST /customers` (Zod schema)
  - `GET /customers/:id`
  - `PUT /customers/:id`
  - `DELETE /customers/:id`
  - `GET /customers/:id/ledger`
- **Products**
  - `GET /products` / `POST /products` / `GET /products/:id` / `PUT /products/:id` / `DELETE /products/:id`
- **Invoices**
  - `POST /invoices` (creates draft or issued)
  - `GET /invoices/:id`
  - `GET /invoices?query=&status=&from=&to=`
  - `POST /invoices/:id/pdf`
- **Payments**
  - `POST /payments`
  - `GET /payments?customer=&invoice=&from=&to=`
- **Reports**
  - `GET /reports/dues`
  - `GET /reports/sales?from=&to=&groupBy=(day|week|month)`

**Errors**
- JSON: `{ code: string, message: string, details?: any }`

---

## Frontend (Lit) Structure

```
web/src/
  app-shell.ts
  router.ts
  pages/
    dashboard-page.ts
    customers-page.ts
    products-page.ts
    invoice-editor-page.ts
    payments-page.ts
    reports-page.ts
  components/
    customer-list.ts
    invoice-form.ts
    product-picker.ts
    money-input.ts
    pdf-preview.ts
  store/
    app-store.ts
  styles/
    tokens.css
```

- **Design**: clean, airy spacing; responsive tables; keyboard shortcuts for invoice editing.
- **Animations**: Motion One for subtle transitions (enter/leave, button presses).
- **Charts**: Chart.js line (sales), bar/pie (dues).

---

## Testing Strategy

- **Unit (Vitest)**: billing math, formatters, DTO validation.
- **API**: route handlers (supertest), response validation vs Zod/OpenAPI.
- **E2E (Playwright)**: full cashier flow; data-testids, downloads (PDF), screenshots & traces.
- **Coverage**: target 80% lines/functions for core logic.

---

## Security & Compliance

- Helmet, CORS allowlist, rate-limit specific routes (PDF/search).
- Input validation via Zod; sanitize output; consistent error model.
- Logging scrubs PII in errors.
- Optional: simple auth (JWT or shared secret) for admin actions.

---

## Observability & Logging

- Minimal JSON logs (pino/winston); request id middleware.
- Access logs (method, path, duration, status).
- E2E artifacts archived in CI.

---

## Dev Ergonomics for “Codex Web”

- Vite **proxy** `/api` to local API avoids CORS/setup.
- Vite `server.host=true` binds to `0.0.0.0` for web sandboxes.
- Headless Chromium installed only when needed (PDF step toggle).
- Single `pnpm dev` to run both (concurrently) for fast iteration.

---

## Stretch Goals

- Barcode scanning via camera for product selection.
- PWA offline (cache UI; later explore remote libsql for sync).
- User roles (cashier/manager), closing reports.
- SMS/email reminders for outstanding dues.

---

## Definition of Done Checklist

- [ ] All endpoints implemented & documented (OpenAPI 3.1).
- [ ] DB migrations applied; WAL verified; seed script exists.
- [ ] Unit + E2E tests green; Playwright HTML report generated.
- [ ] PDF invoice correct for A4 and thermal.
- [ ] README with quickstart, screenshots, troubleshooting.
- [ ] Basic security hardening (Helmet, CORS, rate-limit), indices in place.

---

## Appendix

### Example `.env.example`
```
# API
PORT=8080
NODE_ENV=development
DB_PATH=./data/app.db
INVOICE_PREFIX=INV
PDF_LOCALE=en-US

# WEB
VITE_API_BASE=/api
```

### Example Makefile Targets (optional)
```
dev: ## run web + api in dev
	pnpm -r --parallel dev

e2e: ## run end-to-end tests
	pnpm -r e2e
```

---

**That’s the full plan.** It’s deliberately agent-friendly: each phase has clear inputs, outputs, prompts, and acceptance criteria so AI or humans can work in parallel and verify progress quickly.
