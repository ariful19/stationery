# Swagger UI & OpenAPI reference

The Stationery API serves interactive documentation via [`/docs`](http://localhost:8080/docs)
using `swagger-ui-express`. Start the API (`pnpm --filter @stationery/api dev`) and
visit the route above to browse available endpoints, schemas, and sample payloads.

## Download the OpenAPI definition

The raw JSON schema is available at `/docs/openapi.json`:

```bash
curl http://localhost:8080/docs/openapi.json -o openapi.json
```

Point any compatible tooling (Stoplight Studio, Insomnia, Postman, etc.) at that URL
or the downloaded file to generate clients or validate requests.

## Regenerating the spec

- Update route validators under `packages/shared` when you change request/response
  structures.
- Rebuild the shared package (`pnpm --filter @stationery/shared build`).
- Restart the API. The Swagger document is assembled at runtime via
  `apps/api/src/docs/openapi.ts` and automatically reflects the latest schemas.

## Serving docs from a static host

When deploying, expose the same `/docs` and `/docs/openapi.json` endpoints through
your platform of choice. The production Docker image bundles Swagger UI, so a simple
`docker compose up -d` is enough to share the documentation with teammates without
running the development server locally.
