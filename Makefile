# School SIS Docker Compose Makefile
# Simplified commands for development and operations

.PHONY: help build up down restart logs shell clean setup networks ssl-certs health status backup restore

# Default target
help: ## Show this help message
	@echo "School SIS Docker Compose Commands"
	@echo "=================================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make setup     # Initial setup and configuration"
	@echo "  make up        # Start all services"
	@echo "  make logs      # View logs from all services"
	@echo "  make shell     # Access backend container shell"

# Setup and configuration
setup: networks ssl-certs ## Initial setup - create networks and SSL certificates
	@echo "🚀 Setting up School SIS infrastructure..."
	@if [ ! -f .env ]; then \
		echo "📝 Creating .env file from template..."; \
		cp env.docker.example .env; \
		echo "⚠️  Please edit .env file with your actual configuration values"; \
	fi
	@echo "✅ Setup completed! Edit .env file and run 'make up' to start services."

networks: ## Create Docker networks
	@echo "🌐 Creating Docker networks..."
	@docker network create traefik-public 2>/dev/null || true
	@echo "✅ Networks created successfully"

ssl-certs: ## Generate self-signed SSL certificates for development
	@echo "🔐 Generating SSL certificates..."
	@mkdir -p traefik/certs postgres/ssl
	@if [ ! -f traefik/certs/default.crt ]; then \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout traefik/certs/default.key \
			-out traefik/certs/default.crt \
			-subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"; \
		echo "✅ SSL certificates generated"; \
	else \
		echo "✅ SSL certificates already exist"; \
	fi

# Container management
build: ## Build all Docker images
	@echo "🔨 Building Docker images..."
	@docker-compose build --no-cache
	@echo "✅ Build completed"

up: ## Start all services
	@echo "🚀 Starting School SIS services..."
	@docker-compose up -d
	@echo "✅ Services started successfully"
	@echo "🌐 Access the application at: https://$(shell grep DOMAIN .env 2>/dev/null | cut -d'=' -f2 || echo 'localhost')"
	@echo "📊 Traefik dashboard: https://traefik.$(shell grep DOMAIN .env 2>/dev/null | cut -d'=' -f2 || echo 'localhost'):8080"

down: ## Stop all services
	@echo "🛑 Stopping School SIS services..."
	@docker-compose down
	@echo "✅ Services stopped successfully"

restart: ## Restart all services
	@echo "🔄 Restarting School SIS services..."
	@docker-compose restart
	@echo "✅ Services restarted successfully"

# Logging and monitoring
logs: ## View logs from all services
	@echo "📋 Viewing logs from all services..."
	@docker-compose logs -f

logs-backend: ## View backend logs only
	@echo "📋 Viewing backend logs..."
	@docker-compose logs -f backend

logs-db: ## View database logs only
	@echo "📋 Viewing database logs..."
	@docker-compose logs -f postgres

logs-traefik: ## View Traefik logs only
	@echo "📋 Viewing Traefik logs..."
	@docker-compose logs -f traefik

# Container access
shell: ## Access backend container shell
	@echo "🐚 Accessing backend container shell..."
	@docker-compose exec backend /bin/sh

shell-db: ## Access database container shell
	@echo "🐚 Accessing database container shell..."
	@docker-compose exec postgres psql -U $(shell grep POSTGRES_USER .env 2>/dev/null | cut -d'=' -f2 || echo 'school_sis_admin') -d $(shell grep POSTGRES_DB .env 2>/dev/null | cut -d'=' -f2 || echo 'school_sis')

shell-redis: ## Access Redis container shell
	@echo "🐚 Accessing Redis container shell..."
	@docker-compose exec redis redis-cli

# Health and status
health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@echo "Backend:"
	@docker-compose exec backend curl -f http://localhost:3000/health 2>/dev/null && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo "Database:"
	@docker-compose exec postgres pg_isready -U $(shell grep POSTGRES_USER .env 2>/dev/null | cut -d'=' -f2 || echo 'school_sis_admin') 2>/dev/null && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo "Redis:"
	@docker-compose exec redis redis-cli ping 2>/dev/null | grep -q PONG && echo "✅ Healthy" || echo "❌ Unhealthy"

status: ## Show status of all containers
	@echo "📊 Container status:"
	@docker-compose ps

# Database operations
db-migrate: ## Run database migrations
	@echo "🗄️ Running database migrations..."
	@docker-compose exec backend npm run db:migrate
	@echo "✅ Migrations completed"

db-seed: ## Seed database with initial data
	@echo "🌱 Seeding database..."
	@docker-compose exec backend npm run db:seed
	@echo "✅ Database seeded"

db-reset: ## Reset database (WARNING: This will delete all data)
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "🗑️ Resetting database..."
	@docker-compose exec postgres psql -U $(shell grep POSTGRES_USER .env 2>/dev/null | cut -d'=' -f2 || echo 'school_sis_admin') -d $(shell grep POSTGRES_DB .env 2>/dev/null | cut -d'=' -f2 || echo 'school_sis') -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@make db-migrate
	@make db-seed
	@echo "✅ Database reset completed"

# Backup and restore
backup: ## Create database backup
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	@docker-compose exec postgres pg_dump -U $(shell grep POSTGRES_USER .env 2>/dev/null | cut -d'=' -f2 || echo 'school_sis_admin') -d $(shell grep POSTGRES_DB .env 2>/dev/null | cut -d'=' -f2 || echo 'school_sis') > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in backups/ directory"

restore: ## Restore database from backup (specify BACKUP_FILE=filename.sql)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "❌ Please specify BACKUP_FILE=filename.sql"; \
		echo "Available backups:"; \
		ls -la backups/ 2>/dev/null || echo "No backups found"; \
		exit 1; \
	fi
	@echo "🔄 Restoring database from $(BACKUP_FILE)..."
	@docker-compose exec -T postgres psql -U $(shell grep POSTGRES_USER .env 2>/dev/null | cut -d'=' -f2 || echo 'school_sis_admin') -d $(shell grep POSTGRES_DB .env 2>/dev/null | cut -d'=' -f2 || echo 'school_sis') < backups/$(BACKUP_FILE)
	@echo "✅ Database restored successfully"

# Development helpers
dev: ## Start services in development mode
	@echo "🛠️ Starting development environment..."
	@sed -i 's/NODE_ENV=production/NODE_ENV=development/' .env 2>/dev/null || true
	@docker-compose up -d
	@echo "✅ Development environment started"

prod: ## Start services in production mode
	@echo "🏭 Starting production environment..."
	@sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env 2>/dev/null || true
	@docker-compose up -d
	@echo "✅ Production environment started"

# Cleanup
clean: ## Clean up containers, volumes, and images
	@echo "🧹 Cleaning up Docker resources..."
	@docker-compose down -v --remove-orphans
	@docker system prune -f
	@echo "✅ Cleanup completed"

clean-all: ## Clean up everything including images
	@echo "🧹 Cleaning up all Docker resources..."
	@docker-compose down -v --remove-orphans
	@docker system prune -af
	@echo "✅ Complete cleanup finished"

# Security
update: ## Update all container images
	@echo "🔄 Updating container images..."
	@docker-compose pull
	@docker-compose up -d
	@echo "✅ Images updated and services restarted"

# Monitoring
monitor: ## Show real-time resource usage
	@echo "📊 Real-time resource usage:"
	@docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# Quick commands
quick-start: setup up ## Quick start - setup and start all services
	@echo "🎉 School SIS is ready!"
	@echo "🌐 Application: https://$(shell grep DOMAIN .env 2>/dev/null | cut -d'=' -f2 || echo 'localhost')"
	@echo "📊 Dashboard: https://traefik.$(shell grep DOMAIN .env 2>/dev/null | cut -d'=' -f2 || echo 'localhost'):8080"

quick-stop: down ## Quick stop - stop all services
	@echo "🛑 All services stopped"

# Environment management
env-check: ## Check environment configuration
	@echo "🔍 Checking environment configuration..."
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found. Run 'make setup' first."; \
		exit 1; \
	fi
	@echo "✅ .env file exists"
	@echo "📋 Required variables:"
	@grep -E '^[A-Z_]+=' .env | cut -d'=' -f1 | sort

# Integration testing
test: ## Run integration tests
	@echo "🧪 Running integration tests..."
	@docker-compose exec backend npm test
	@echo "✅ Tests completed"

# Production deployment
deploy: build up health ## Deploy to production
	@echo "🚀 Production deployment completed"
	@echo "🌐 Application: https://$(shell grep DOMAIN .env 2>/dev/null | cut -d'=' -f2)"
	@echo "📊 Monitor: make logs"
	@echo "🏥 Health: make health"
