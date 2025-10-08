# Developer guidelines

This document supplements the repository README with deeper guidance on workflows,
quality gates, and expectations for contributors.

## Local setup

1. Copy `.env.example` to `.env` and adjust values when deviating from the defaults.
2. Install dependencies: `pnpm install`
3. Build shared libraries once so type definitions are available everywhere:
   ```bash
   pnpm --filter @stationery/shared build
   ```
4. Start the stack with `pnpm dev` or focus on a single surface via
   `pnpm --filter @stationery/api dev` and `pnpm --filter @stationery/web dev`.

## Database workflow

- **Migrations** – Run `pnpm db:push` after editing `apps/api/drizzle` migration
  files. The command applies the schema and re-creates the customer ledger view.
- **Seed data** – Use `pnpm seed` for deterministic fixtures or `pnpm seed:faker`
  for quick demo data. Pass the `SEED_*` environment variables described in
  `.env.example` to customise volumes.
- **SQLite tips** – SQLite writes its WAL/SHM files next to the database. Keep the
  project within a case-sensitive filesystem to avoid cross-platform surprises.

## Testing & quality gates

| Command | Scope |
| --- | --- |
| `pnpm test` | Vitest unit coverage across API, web, and shared packages |
| `pnpm e2e` | Playwright suites (API + web) with per-package reports |
| `pnpm lint` | ESLint with shared config |
| `pnpm format:check` | Verifies Prettier formatting without editing files |

Always run `pnpm lint` and `pnpm format:check` before opening a PR. Install the
optional hook via `pnpm hooks:install` to automate this step.

## Coding conventions

- TypeScript: prefer explicit return types on exported functions.
- Styling: rely on Prettier defaults; do not hand-format multi-line objects.
- Imports: keep them sorted via `eslint-plugin-simple-import-sort` (already
  configured). Use relative paths only within a package boundary.
- API routes: place validation schemas inside `packages/shared` so the API and web
  client stay in sync.

## Documentation & assets

- Store screenshots/GIFs under `docs/media/` and reference them with relative
  Markdown paths.
- Update the README when workflow or tooling changes so first-time contributors
  have accurate guidance.
- When altering API surface area, regenerate the OpenAPI spec (see
  `apps/api/src/docs/openapi.ts`) and verify `/docs` still renders successfully.

## Git workflow

- Use feature branches and keep commits scoped to a single concern.
- Reference issue numbers in commit messages when relevant (e.g. `feat: add invoice
  pagination (#123)`).
- Rebase on `main` before pushing to avoid merge commits in shared history.

## Support

Raise questions in the project discussion board or open a draft PR when seeking
feedback early. The `/docs` endpoint and new faker seed script make it easier to
share reproducible states while collaborating.
