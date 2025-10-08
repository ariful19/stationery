# Stationery Docker Guide

This repository ships production-ready containers for the Stationery API and web client.
The stack uses multi-stage builds, installs dependencies with `pnpm`, and runs the
services as non-root users. A named Docker volume (`stationery_db_data`) holds the
SQLite database so that write-ahead logging (WAL) files persist across restarts.

## Prerequisites

- Docker 24+
- Docker Compose v2 (invoked as `docker compose`)

## Building & Starting the stack

```bash
docker compose build
docker compose up -d
```

The compose file builds the API (`docker/api.Dockerfile`) and web (`docker/web.Dockerfile`)
images and starts them with the following external ports:

- API available at http://localhost:8080
- Web client served from http://localhost:8081 (aliased to http://localhost:5173 for convenience)

The API honours the `DB_PATH` environment variable (mirrored to `DATABASE_URL` in the
compose file) so you can change the SQLite location by updating a single value.

You can inspect container health once the services are running:

```bash
docker compose ps --status running
```

Both containers expose HTTP health checks so the command above should report
`healthy` for the `api` and `web` services once startup completes.

## Verifying the API

1. Query the API root to confirm it is responding:
   ```bash
   curl http://localhost:8080/
   ```
2. Check the detailed health endpoint (used by Docker health checks):
   ```bash
   curl http://localhost:8080/api/v1/health | jq
   ```

### PDF generation test

The API bundles Puppeteer so it can render PDF reports on demand. To verify this,
request a sample report and ensure that the response is a valid PDF:

```bash
curl -o sales-report.pdf http://localhost:8080/api/v1/reports/sales.pdf
file sales-report.pdf
```

The second command should report `PDF document`. You can open the file locally to
review the rendered report.

## Verifying the web client

After the containers finish booting, open http://localhost:8081 in a browser to
load the precompiled Vite application. The SPA falls back to `index.html`, so
client-side routing will work even on refresh.

## Persistence & WAL verification

The API stores data in `/app/data/stationery.sqlite` with SQLite's WAL mode
enabled. The compose file mounts this path to the named `stationery_db_data`
volume. Follow these steps to confirm that data outlives container restarts:

1. Create a new customer record:
   ```bash
   curl -X POST http://localhost:8080/api/v1/customers \
     -H 'Content-Type: application/json' \
     -d '{
       "name": "Docker Demo Co",
       "email": "demo@example.com",
       "phone": "555-9876",
       "address": "1 Container Way"
     }'
   ```
2. Restart the API container:
   ```bash
   docker compose restart api
   ```
3. Fetch customers and verify the new record still exists:
   ```bash
   curl 'http://localhost:8080/api/v1/customers?limit=10&offset=0' | jq '.data[] | select(.name=="Docker Demo Co")'
   ```
4. (Optional) Inspect the database directory to see the WAL files:
   ```bash
   docker compose exec api ls -l /app/data
   ```

Because the database lives in the shared volume, the newly created customer and
associated WAL/SHM files remain available even after container restarts or image
rebuilds.

## Cleaning up

To stop and remove the containers while preserving the database volume:

```bash
docker compose down
```

To delete the persistent data as well, add the `--volumes` flag.
