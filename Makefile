.PHONY: help dev dev-build up down logs clean install migrate seed backup restore

# Colors for terminal output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Mostrar este menu de ajuda
	@echo "$(BLUE)S3E System PRO - Docker Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

dev: ## Iniciar em modo desenvolvimento com hot reload
	docker-compose up

dev-build: ## Build e iniciar em desenvolvimento
	docker-compose up --build

up: ## Iniciar todos os serviços em background
	docker-compose up -d

down: ## Parar todos os serviços
	docker-compose down

logs: ## Ver logs de todos os serviços
	docker-compose logs -f

logs-backend: ## Ver logs apenas do backend
	docker-compose logs -f backend

logs-frontend: ## Ver logs apenas do frontend
	docker-compose logs -f frontend

logs-db: ## Ver logs apenas do banco de dados
	docker-compose logs -f postgres

clean: ## Parar e remover todos os containers, volumes e imagens
	docker-compose down -v --rmi all

clean-cache: ## Limpar cache do Docker
	docker system prune -af --volumes

install: ## Instalar dependências nos containers
	docker-compose run --rm backend npm install
	docker-compose run --rm frontend npm install

build: ## Build de produção
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

prod: ## Iniciar em modo produção
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

migrate: ## Executar migrations do banco de dados
	docker-compose exec backend npm run migrate

seed: ## Popular banco com dados de exemplo
	docker-compose exec backend npm run seed

db-shell: ## Abrir shell do PostgreSQL
	docker-compose exec postgres psql -U s3e_user -d s3e_db

backend-shell: ## Abrir shell no container do backend
	docker-compose exec backend sh

frontend-shell: ## Abrir shell no container do frontend
	docker-compose exec frontend sh

restart: ## Reiniciar todos os serviços
	docker-compose restart

restart-backend: ## Reiniciar apenas o backend
	docker-compose restart backend

restart-frontend: ## Reiniciar apenas o frontend
	docker-compose restart frontend

ps: ## Listar containers em execução
	docker-compose ps

stats: ## Mostrar estatísticas dos containers
	docker stats

backup: ## Fazer backup do banco de dados
	@mkdir -p ./backups
	@docker-compose exec -T postgres pg_dump -U s3e_user s3e_db > ./backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Backup criado em ./backups/$(NC)"

restore: ## Restaurar backup do banco de dados (use BACKUP_FILE=nome_do_arquivo)
	@docker-compose exec -T postgres psql -U s3e_user -d s3e_db < $(BACKUP_FILE)
	@echo "$(GREEN)Backup restaurado!$(NC)"

test: ## Executar testes
	docker-compose exec backend npm test
	docker-compose exec frontend npm test

lint: ## Executar linter
	docker-compose exec backend npm run lint
	docker-compose exec frontend npm run lint

format: ## Formatar código
	docker-compose exec backend npm run format
	docker-compose exec frontend npm run format
