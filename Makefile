PNPM ?= pnpm
DOCKER ?= docker compose

.PHONY: help install build dev dev-api dev-web lint format format-check test test-e2e seed seed-faker db-push docker-build docker-up docker-down docker-logs docs hooks

help:
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?#' Makefile | awk 'BEGIN {FS = ":.*?#"} {printf "  %-18s %s\n", $$1, $$2}'

install: ## Install dependencies with pnpm
	$(PNPM) install

build: ## Build all workspace packages
	$(PNPM) build

dev: ## Start API + web dev servers concurrently
	$(PNPM) dev

dev-api: ## Start only the API dev server
	$(PNPM) --filter @stationery/api dev

dev-web: ## Start only the web dev server
	$(PNPM) --filter @stationery/web dev

lint: ## Run ESLint across the workspace
	$(PNPM) lint

format: ## Apply Prettier formatting changes
	$(PNPM) format

format-check: ## Verify formatting without making changes
	$(PNPM) format:check

test: ## Run Vitest suites across packages
	$(PNPM) test

test-e2e: ## Execute Playwright end-to-end suites
	$(PNPM) e2e

seed: ## Load the curated seed dataset
	$(PNPM) seed

seed-faker: ## Generate random fixtures using Faker
	$(PNPM) seed:faker

db-push: ## Apply Drizzle migrations and ensure database views
	$(PNPM) db:push

docker-build: ## Build Docker images
	$(DOCKER) build

docker-up: ## Start the Docker Compose stack
	$(DOCKER) up -d

docker-down: ## Stop containers (preserve volumes)
	$(DOCKER) down

docker-logs: ## Tail logs from running containers
	$(DOCKER) logs -f

docs: ## Print the Swagger UI and OpenAPI URLs
	@URL=$${PUBLIC_API_URL:-http://localhost:8080}; \
	echo "Swagger UI: $$URL/docs"; \
	echo "OpenAPI JSON: $$URL/docs/openapi.json"

hooks: ## Install the optional pre-commit hook
	$(PNPM) hooks:install
