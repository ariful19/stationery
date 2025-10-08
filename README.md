# Stationery Monorepo

A modern stationery invoicing demo built as a pnpm workspace. The repository hosts a
TypeScript/Express API, a Vite/Lit web client, and shared libraries that power both
experiences. This guide walks through local pnpm development, environment configuration,
automated tooling, and the assets/docs ecosystem so new contributors can get productive
quickly.

## Table of contents

1. [Project layout](#project-layout)
2. [Requirements](#requirements)
3. [Local development with pnpm](#local-development-with-pnpm)
4. [Database migrations & seed data](#database-migrations--seed-data)
5. [Screenshots & GIFs](#screenshots--gifs)
6. [API documentation](#api-documentation)
7. [Environment variables](#environment-variables)
8. [Testing & quality gates](#testing--quality-gates)
9. [Optional git hooks](#optional-git-hooks)
10. [Make targets](#make-targets)
11. [Troubleshooting](#troubleshooting)
12. [Developer guidelines](#developer-guidelines)

## Project layout

```
apps/
  api/           # Express API, Drizzle ORM, Swagger/OpenAPI docs
  web/           # Vite + Lit front-end
packages/
  shared/        # Shared validation, invoice helpers, and typings
scripts/         # Tooling helpers (pre-commit, Playwright reporting, etc.)
```

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io/) 8+
- SQLite 3.40+ (CLI is optional but handy for inspection)

## Local development with pnpm

1. Copy the environment template and tailor values if needed:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies and build shared packages:
   ```bash
   pnpm install
   ```
3. Start the full stack (API + web) with hot reloading:
   ```bash
   pnpm dev
   ```
   - API: http://localhost:8080 (health check at `/api/v1/health`)
   - Web: http://localhost:5173 (proxying API requests to port 8080)
4. To work on a single surface:
   ```bash
   pnpm --filter @stationery/api dev     # API only
   pnpm --filter @stationery/web dev     # Web client only
   ```
5. Stop the processes with `Ctrl+C` once you are done hacking.

## Database migrations & seed data

- Apply schema changes and ensure the ledger view exists:
  ```bash
  pnpm db:push
  ```
- Load the curated demo dataset:
  ```bash
  pnpm seed
  ```
- Generate random fixtures with Faker (pass counts via env vars):
  ```bash
  SEED_CUSTOMERS=25 SEED_INVOICES=40 pnpm seed:faker
  ```
  The faker script accepts the following optional knobs: `SEED_RESET` (`true` to
  wipe tables before inserting), `SEED_CUSTOMERS`, `SEED_PRODUCTS`, `SEED_INVOICES`,
  and `SEED_FAKER_SEED` for deterministic runs.

The SQLite database lives at `./stationery.sqlite` by default. Adjust `DATABASE_URL`
or `DB_PATH` in `.env` to relocate it.

## Screenshots & GIFs

Visual assets live in `docs/media/` and are referenced from documentation. Capture
new UI states with the running Vite server (`pnpm --filter @stationery/web dev`) and
store them as PNG or GIF files following the `feature-name_description.png` naming
pattern. Update this README (or feature-specific docs) with Markdown image links when
adding new assets.

## API documentation

Swagger UI is mounted at [`/docs`](http://localhost:8080/docs) when the API is
running. The raw OpenAPI definition is always available at:

- JSON: [`http://localhost:8080/docs/openapi.json`](http://localhost:8080/docs/openapi.json)

To browse the documentation without starting the entire stack, run the API in
isolation (`pnpm --filter @stationery/api dev`) or point any Swagger UI instance to
the JSON URL above.

## Environment variables

| Name | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | API HTTP port when running locally |
| `DATABASE_URL` | `./stationery.sqlite` | SQLite path picked up by Drizzle & tests |
| `DB_PATH` | _(empty)_ | Overrides `DATABASE_URL` when supplied |
| `PLAYWRIGHT_DATABASE_URL` | `./tmp/playwright-api.sqlite` | Isolated DB for Playwright runs |
| `PUPPETEER_HEADLESS` | `true` | Controls Chromium launch mode for PDF rendering |
| `PUPPETEER_EXECUTABLE_PATH` | _(empty)_ | Explicit Chromium binary for containerized environments |
| `PDF_PREVIEW_DIR` | `./tmp/previews` | Folder used for PDF preview exports |
| `MOCK_INVOICE_PDF` / `MOCK_REPORT_PDF` | `false` | Return fixture buffers instead of launching Chromium |
| `BILLING_ROUNDING_MODE` | `HALF_EVEN` | Controls invoice total rounding strategy |
| `INVOICE_PREFIX` | `INV` | Prefix used when generating invoice numbers |
| `INVOICE_SEQUENCE_PADDING` | _(unset)_ | Optional zero-padding for invoice sequence numbers |
| `SEED_RESET` | `false` | Drop data before running faker seeds |
| `SEED_CUSTOMERS` | `20` | Faker-generated customer count |
| `SEED_PRODUCTS` | `15` | Faker-generated product count |
| `SEED_INVOICES` | `35` | Faker-generated invoice count |
| `SEED_FAKER_SEED` | _(unset)_ | Optional deterministic seed for Faker |

Refer to `.env.example` for inline documentation and additional knobs that tailor
Playwright/Puppeteer behaviour.

## Testing & quality gates

```bash
pnpm test           # Vitest unit coverage across packages
pnpm e2e            # Playwright suites (API + web)
pnpm lint           # ESLint across the workspace
pnpm format:check   # Prettier verification without writing files
```

Generate an HTML report for Playwright runs with `pnpm e2e` – results live under
`apps/api/playwright-report/` or `apps/web/playwright-report/` depending on the
package.

## Optional git hooks

An opt-in pre-commit hook can guard formatting and lint rules:

```bash
pnpm hooks:install
```

The hook runs `pnpm format:check` and `pnpm lint` before commits. Remove it at any
time by deleting `.git/hooks/pre-commit`.

## Make targets

A convenience `Makefile` mirrors the commands above. View the catalogue with:

```bash
make help
```

Targets cover dependency installation, local dev servers, tests, linting, seeding,
and Swagger documentation helpers.

## Troubleshooting

### Puppeteer & Chromium dependencies

- Minimal Linux environments (such as CI containers or remote servers) require `libnss3`, `libatk-1.0-0`, `libatk-bridge2.0-0`,
  `libx11-xcb1`, `libxcomposite1`, `libxdamage1`, `libxfixes3`, and `libxrandr2`.
  Install them with `apt-get install -y` before launching the API in headless
  environments.
- Set `PUPPETEER_EXECUTABLE_PATH` when using a system Chromium/Chrome build instead
  of the bundled binary (useful for Alpine images or minimal base images).
- Toggle `PUPPETEER_HEADLESS=0` locally to debug PDF rendering in a visible browser.

### File permissions

- Ensure shell scripts are executable: `chmod +x scripts/setup-pre-commit.sh`.
- On Windows + WSL2, run commands from WSL to avoid `EPERM` errors when SQLite opens
  WAL files. If file locking persists, move the workspace into the WSL filesystem.

### Codex Web quirks

- Expose dev servers on all interfaces. The supplied Vite config already sets
  `server.host = true`, but if you add additional tooling, pass `--host 0.0.0.0`.
- Use forwarded ports 5173 (web) and 8080 (API) for live previews. Codex mirrors
  these under the “Ports” panel.
- Prefer `pnpm format:check` instead of write mode when autosave is enabled – it
  avoids Codex Web reloading loops caused by mass file rewrites.

## Developer guidelines

See [`docs/development.md`](docs/development.md) for coding standards, testing
expectations, and contribution workflows that expand on this README.
