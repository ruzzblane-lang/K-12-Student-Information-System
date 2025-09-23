#!/bin/bash

# Docker Setup Script for School SIS
# This script sets up the complete Docker infrastructure

set -e

echo "🚀 Setting up School SIS Docker Infrastructure..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs/{traefik,caddy,backend,postgres,redis}
mkdir -p traefik/{certs,acme}
mkdir -p postgres/{init,ssl}
mkdir -p redis
mkdir -p caddy
mkdir -p backups

# Set proper permissions
chmod 755 logs
chmod 700 traefik/acme
chmod 600 postgres/ssl

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.docker.example .env
    echo "⚠️  Please edit .env file with your actual configuration values"
    echo "   Key variables to update:"
    echo "   - DOMAIN=yourdomain.com"
    echo "   - ACME_EMAIL=admin@yourdomain.com"
    echo "   - POSTGRES_PASSWORD=your_secure_password"
    echo "   - JWT_SECRET=your_jwt_secret"
    echo "   - Integration API keys"
else
    echo "✅ .env file already exists"
fi

# Create Docker networks
echo "🌐 Creating Docker networks..."
docker network create traefik-public 2>/dev/null || echo "Network traefik-public already exists"

# Generate SSL certificates for development
echo "🔐 Generating SSL certificates..."
if [ ! -f traefik/certs/default.crt ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout traefik/certs/default.key \
        -out traefik/certs/default.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    echo "✅ SSL certificates generated"
else
    echo "✅ SSL certificates already exist"
fi

# Generate PostgreSQL SSL certificates
echo "🔐 Generating PostgreSQL SSL certificates..."
if [ ! -f postgres/ssl/server.crt ]; then
    # Generate CA key and certificate
    openssl genrsa -out postgres/ssl/ca.key 4096
    openssl req -new -x509 -days 365 -key postgres/ssl/ca.key -out postgres/ssl/ca.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=PostgreSQL-CA"
    
    # Generate server key and certificate
    openssl genrsa -out postgres/ssl/server.key 4096
    openssl req -new -key postgres/ssl/server.key -out postgres/ssl/server.csr \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=postgres"
    
    # Sign server certificate with CA
    openssl x509 -req -in postgres/ssl/server.csr -CA postgres/ssl/ca.crt -CAkey postgres/ssl/ca.key \
        -CAcreateserial -out postgres/ssl/server.crt -days 365
    
    # Set proper permissions
    chmod 600 postgres/ssl/*.key
    chmod 644 postgres/ssl/*.crt
    
    echo "✅ PostgreSQL SSL certificates generated"
else
    echo "✅ PostgreSQL SSL certificates already exist"
fi

# Create Traefik auth users (default: admin/admin)
echo "🔑 Setting up Traefik authentication..."
if ! grep -q "TRAEFIK_AUTH_USERS" .env; then
    # Generate bcrypt hash for admin/admin
    HASH=$(docker run --rm httpd:2.4-alpine htpasswd -nbB admin admin | cut -d: -f2)
    echo "TRAEFIK_AUTH_USERS=admin:\$$HASH" >> .env
    echo "✅ Traefik authentication configured (admin/admin)"
fi

# Validate environment file
echo "🔍 Validating environment configuration..."
if [ -f .env ]; then
    echo "✅ Environment file exists"
    echo "📋 Required variables check:"
    
    # Check critical variables
    if grep -q "DOMAIN=" .env && ! grep -q "DOMAIN=yourdomain.com" .env; then
        echo "✅ DOMAIN is configured"
    else
        echo "⚠️  DOMAIN needs to be configured"
    fi
    
    if grep -q "POSTGRES_PASSWORD=" .env && ! grep -q "POSTGRES_PASSWORD=your_secure_postgres_password_here" .env; then
        echo "✅ POSTGRES_PASSWORD is configured"
    else
        echo "⚠️  POSTGRES_PASSWORD needs to be configured"
    fi
    
    if grep -q "JWT_SECRET=" .env && ! grep -q "JWT_SECRET=your_jwt_secret_key_here" .env; then
        echo "✅ JWT_SECRET is configured"
    else
        echo "⚠️  JWT_SECRET needs to be configured"
    fi
else
    echo "❌ .env file not found"
    exit 1
fi

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose build --no-cache

echo ""
echo "🎉 Docker infrastructure setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your actual configuration values"
echo "2. Run 'make up' to start all services"
echo "3. Access the application at: https://\$(grep DOMAIN .env | cut -d'=' -f2)"
echo "4. Access Traefik dashboard at: https://traefik.\$(grep DOMAIN .env | cut -d'=' -f2):8080"
echo ""
echo "🛠️  Useful commands:"
echo "  make up          - Start all services"
echo "  make down        - Stop all services"
echo "  make logs        - View logs"
echo "  make health      - Check service health"
echo "  make shell       - Access backend container"
echo "  make help        - Show all available commands"
echo ""
echo "📚 Documentation: docs/Docker-Setup.md"

