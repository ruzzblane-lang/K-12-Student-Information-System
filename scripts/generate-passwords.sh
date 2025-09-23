#!/bin/bash

# Password Generation Script for School SIS
# Generates secure passwords for all services

set -e

echo "🔐 Generating secure passwords for School SIS..."

# Function to generate random password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to generate bcrypt hash
generate_bcrypt_hash() {
    local password=$1
    docker run --rm httpd:2.4-alpine htpasswd -nbB admin "$password" | cut -d: -f2
}

echo "📝 Generated passwords (save these securely):"
echo "=============================================="

# Database passwords
POSTGRES_PASSWORD=$(generate_password 32)
POSTGRES_APP_PASSWORD=$(generate_password 32)
POSTGRES_READONLY_PASSWORD=$(generate_password 32)

echo "Database Passwords:"
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo "POSTGRES_APP_PASSWORD=$POSTGRES_APP_PASSWORD"
echo "POSTGRES_READONLY_PASSWORD=$POSTGRES_READONLY_PASSWORD"
echo ""

# Redis password
REDIS_PASSWORD=$(generate_password 32)
echo "Redis Password:"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo ""

# JWT secrets
JWT_SECRET=$(generate_password 64)
JWT_REFRESH_SECRET=$(generate_password 64)
echo "JWT Secrets:"
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""

# Integration encryption key
INTEGRATION_ENCRYPTION_KEY=$(generate_password 32)
echo "Integration Encryption:"
echo "INTEGRATION_ENCRYPTION_KEY=$INTEGRATION_ENCRYPTION_KEY"
echo ""

# Session secret
SESSION_SECRET=$(generate_password 32)
echo "Session Secret:"
echo "SESSION_SECRET=$SESSION_SECRET"
echo ""

# Traefik auth
TRAEFIK_PASSWORD=$(generate_password 16)
TRAEFIK_HASH=$(generate_bcrypt_hash "$TRAEFIK_PASSWORD")
echo "Traefik Authentication:"
echo "Username: admin"
echo "Password: $TRAEFIK_PASSWORD"
echo "TRAEFIK_AUTH_USERS=admin:\$$TRAEFIK_HASH"
echo ""

echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "1. Save these passwords in a secure password manager"
echo "2. Update your .env file with these values"
echo "3. Never commit passwords to version control"
echo "4. Rotate passwords regularly in production"
echo "5. Use different passwords for each environment"
echo ""

# Optionally update .env file
if [ -f .env ]; then
    read -p "Do you want to update .env file with these passwords? (y/N): " update_env
    if [[ $update_env =~ ^[Yy]$ ]]; then
        echo "📝 Updating .env file..."
        
        # Update passwords in .env file
        sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
        sed -i "s/POSTGRES_APP_PASSWORD=.*/POSTGRES_APP_PASSWORD=$POSTGRES_APP_PASSWORD/" .env
        sed -i "s/POSTGRES_READONLY_PASSWORD=.*/POSTGRES_READONLY_PASSWORD=$POSTGRES_READONLY_PASSWORD/" .env
        sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
        sed -i "s/INTEGRATION_ENCRYPTION_KEY=.*/INTEGRATION_ENCRYPTION_KEY=$INTEGRATION_ENCRYPTION_KEY/" .env
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
        sed -i "s|TRAEFIK_AUTH_USERS=.*|TRAEFIK_AUTH_USERS=admin:\$$TRAEFIK_HASH|" .env
        
        echo "✅ .env file updated successfully"
    fi
else
    echo "⚠️  .env file not found. Please create it first with 'make setup'"
fi

echo ""
echo "🎉 Password generation completed!"
