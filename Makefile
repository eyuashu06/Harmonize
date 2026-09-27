# ============================================================
# HarmonyHub Makefile
# ============================================================
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Load .env if present so targets work outside docker
ifneq (,$(wildcard ./.env))
include .env
export
endif

COMPOSE       := docker compose
API           := $(COMPOSE) exec -T api
WEB           := $(COMPOSE) exec -T web
PSQL          := $(COMPOSE) exec -T postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

.PHONY: help up down restart logs ps build pull rebuild clean \
        migrate makedb revision upgrade downgrade seed resetdb \
        api-shell web-shell db-shell redis-shell \
        test api-test web-test lint format \
        prisma-format docs-serve

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-18s\033[0m %s\n",$$1,$$2}'

## --- Lifecycle ---

up: ## Build and start all services
	$(COMPOSE) up -d --build
	@echo "✅ Services up. Web: http://localhost:3000  API: http://localhost:8001  Docs: http://localhost:8001/docs"

down: ## Stop all services
	$(COMPOSE) down

restart: ## Restart services
	$(COMPOSE) restart

logs: ## Tail logs (api web)
	$(COMPOSE) logs -f --tail=100 api web

ps: ## List running services
	$(COMPOSE) ps

build: ## Build images
	$(COMPOSE) build

rebuild: ## Rebuild without cache
	$(COMPOSE) build --no-cache

clean: down ## Stop and remove volumes
	$(COMPOSE) down -v
	@echo "🧹 Removed volumes"

## --- Database ---

migrate: ## Apply Alembic migrations
	$(API) alembic upgrade head

revision: ## Create new Alembic revision (msg="...")
	$(API) alembic revision --autogenerate -m "$(msg)"

upgrade: ## Upgrade DB to head
	$(API) alembic upgrade head

downgrade: ## Downgrade DB by one
	$(API) alembic downgrade -1

seed: ## Seed demo data
	$(API) python -m scripts.seed

resetdb: down ## Drop DB and re-migrate (DESTRUCTIVE)
	$(COMPOSE) down -v
	$(COMPOSE) up -d postgres redis
	@echo "Waiting for postgres..."
	@sleep 5
	$(COMPOSE) up -d api
	@echo "Waiting for api..."
	@sleep 8
	$(MAKE) migrate
	$(MAKE) seed

## --- Shells ---

api-shell: ## Shell into api container
	$(COMPOSE) exec api /bin/bash

web-shell: ## Shell into web container
	$(COMPOSE) exec web /bin/sh

db-shell: ## Open psql
	$(PSQL)

redis-shell: ## Open redis-cli
	$(COMPOSE) exec -T redis redis-cli

## --- Tests & quality ---

test: api-test web-test ## Run all tests

api-test: ## Run backend tests
	$(API) pytest -q

web-test: ## Run frontend tests
	$(WEB) pnpm test --run

lint: ## Lint everything
	$(COMPOSE) run --rm api ruff check .
	$(COMPOSE) run --rm web pnpm lint

format: ## Format everything
	$(COMPOSE) run --rm api ruff format .
	$(COMPOSE) run --rm web pnpm format
