#!/bin/bash

# Setup Third-Party Integrations
# This script installs dependencies and sets up the integration system

set -e

echo "🚀 Setting up Third-Party API Integrations..."

# Change to backend directory
cd /home/cmedia-tech-support/school-sis/backend

echo "📦 Installing integration dependencies..."
npm install googleapis@^128.0.0 @microsoft/microsoft-graph-client@^3.0.7 twilio@^4.19.0 @sendgrid/mail@^8.1.0 stripe@^14.7.0 axios@^1.6.2

echo "🗄️ Running database migration for integration tables..."
npm run db:migrate

echo "🔧 Creating logs directory for integrations..."
mkdir -p logs

echo "📝 Creating environment variables template..."
cat > .env.integrations << EOF
# Integration Security
INTEGRATION_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Google Workspace for Education
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Microsoft 365 Education
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=your-tenant-id

# Twilio Communication
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890

# SendGrid Email
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourschool.edu
SENDGRID_FROM_NAME=School SIS

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Weather API
WEATHER_API_KEY=your-openweathermap-api-key

# Khan Academy
KHAN_ACADEMY_ACCESS_TOKEN=your-khan-academy-access-token
KHAN_ACADEMY_CLIENT_ID=your-khan-academy-client-id
KHAN_ACADEMY_CLIENT_SECRET=your-khan-academy-client-secret
EOF

echo "✅ Integration setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Copy .env.integrations to .env and update with your actual API keys"
echo "2. Configure integrations for your tenants via the API"
echo "3. Test integrations using the health check endpoints"
echo ""
echo "🔗 Integration API endpoints:"
echo "  GET    /api/integrations/{tenantId}                    - List integrations"
echo "  GET    /api/integrations/{tenantId}/{provider}/health  - Check health"
echo "  POST   /api/integrations/{tenantId}/{provider}/{method} - Execute method"
echo "  PUT    /api/integrations/{tenantId}/{provider}/config  - Configure integration"
echo ""
echo "📚 See backend/integrations/README.md for detailed documentation"
