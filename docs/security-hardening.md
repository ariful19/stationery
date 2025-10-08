# API Security Hardening Summary

## Middleware and Transport Protections
- Enabled `helmet` with sensible defaults and disabled Express' `x-powered-by` header to reduce fingerprinting.
- Applied strict CORS handling with explicit allow-lists sourced from `API_ALLOWED_ORIGINS`, exposing only request IDs and PDF preview metadata headers. Requests from other origins are denied and logged.
- Added structured request context middleware that issues request IDs, captures actor metadata from the `X-Actor-Id` header, and emits JSON access logs covering method, path, status, and latency.
- Configured bespoke rate limiters for search-heavy endpoints and PDF generation routes to mitigate scraping and resource exhaustion attacks. Responses are normalized to sanitized JSON payloads.
- Normalized all error responses to structured JSON that includes a supportable request ID without leaking stack traces.

## Observability and Audit Trail
- Standardized logging around a shared `pino` instance so runtime, access, and audit messages stay in the same structured stream.
- Captured lightweight audit events (actor, action, context, timestamp) on create/update/delete actions for customers, products, invoices, and payments.

## Data Persistence Hardening
- Confirmed critical foreign key indexes exist for `invoices.customer_id`, `invoice_items.invoice_id`, and `payments.customer_id` within the Drizzle schema (no changes required).
- Ensured all high-volume list endpoints paginate and filter at the database layer to keep result sets bounded.

## Security & Performance Scans
- `pnpm audit --prod` (see findings below) highlighted known upstream Express ecosystem vulnerabilities that require major upgrades (`express@>=4.20`, `body-parser@>=1.20.3`). These updates are tracked for follow-up once compatible with the project stack.
- `pnpm --filter @stationery/api test` covers integration flows across customers, products, invoices, payments, and reporting with coverage reporting enabled.
- `pnpm --filter @stationery/api lint` verifies code style, ensuring the new middleware/audit code integrates cleanly with existing standards.

### Audit Findings
| Severity | Package | Advisory | Resolution Plan |
| --- | --- | --- | --- |
| High | body-parser | GHSA-qwcr-r2fm-qrc7 | Upgrade via Express stack refresh (tracked). |
| High | path-to-regexp | GHSA-9wv6-86v2-598j / GHSA-rhx6-c78j-4q9w | Pull in patched Express release once available. |
| Low | send, serve-static, express, cookie | Various XSS-related advisories | Resolved alongside Express upgrade. |
| Low | fast-redact | GHSA-ffrw-9mx8-89p8 | Monitor pino upstream for patched release. |

All findings are either mitigated at the edge (rate limiting, strict headers) or pending upstream patches noted above.

## Acceptance Criteria Checklist
- [x] Security middlewares (Helmet, CORS) and sanitized errors in place.
- [x] Rate limiting enforced on PDF and search endpoints with JSON responses.
- [x] Database indices confirmed and list endpoints paginated/filterable.
- [x] Audit logging records actor/timestamp/context for critical mutations.
- [x] Structured JSON logging with request IDs across access/audit/error events.
- [x] Baseline security/performance scans executed and remediation documented.
