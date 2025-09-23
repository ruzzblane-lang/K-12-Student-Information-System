#!/usr/bin/env node

/**
 * Enhanced Environment Configuration Setup Script
 * Creates secure environment configuration files and fixes common issues
 * Updated to handle more configuration problems based on real-world issues
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate secure random strings
function generateSecureString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate JWT secrets
function generateJWTSecret() {
  return generateSecureString(32);
}

// Generate encryption keys
function generateEncryptionKey() {
  return generateSecureString(16); // 32 characters
}

// Fix common configuration issues
function fixConfigurationIssues() {
  console.log('\n🔧 Checking and fixing common configuration issues...');
  
  let issuesFixed = 0;
  
  // Fix database configuration issues
  const dbConfigPath = path.join(__dirname, 'config', 'database.js');
  if (fs.existsSync(dbConfigPath)) {
    let dbConfigContent = fs.readFileSync(dbConfigPath, 'utf8');
    let contentChanged = false;
    
    // Fix underscore issues
    const fixes = [
      { pattern: /const\s*{\s*_Pool\s*}\s*=\s*require\('pg'\)/, replacement: "const { Pool } = require('pg')" },
      { pattern: /new\s+_Pool\s*\(/, replacement: 'new Pool(' },
      { pattern: /_password:\s*process\.env\.DB_PASSWORD/, replacement: 'password: process.env.DB_PASSWORD' },
      { pattern: /const\s+_query\s*=/, replacement: 'const query =' },
      { pattern: /pool\._query\s*\(/, replacement: 'pool.query(' },
      { pattern: /client\._query\s*\(/, replacement: 'client.query(' },
      { pattern: /module\.exports\s*=\s*{\s*_query/, replacement: 'module.exports = {\n  query' }
    ];
    
    for (const fix of fixes) {
      if (fix.pattern.test(dbConfigContent)) {
        dbConfigContent = dbConfigContent.replace(fix.pattern, fix.replacement);
        contentChanged = true;
        issuesFixed++;
      }
    }
    
    if (contentChanged) {
      fs.writeFileSync(dbConfigPath, dbConfigContent);
      console.log('✅ Fixed database configuration issues');
    }
  }
  
  // Fix auth middleware issues
  const authPath = path.join(__dirname, 'middleware', 'auth.js');
  if (fs.existsSync(authPath)) {
    let authContent = fs.readFileSync(authPath, 'utf8');
    let contentChanged = false;
    
    // Remove hardcoded fallback secrets
    const securityFixes = [
      { pattern: /process\.env\.JWT_SECRET\s*\|\|\s*['"][^'"]+['"]/, replacement: 'process.env.JWT_SECRET' },
      { pattern: /process\.env\.JWT_REFRESH_SECRET\s*\|\|\s*['"][^'"]+['"]/, replacement: 'process.env.JWT_REFRESH_SECRET' }
    ];
    
    for (const fix of securityFixes) {
      if (fix.pattern.test(authContent)) {
        authContent = authContent.replace(fix.pattern, fix.replacement);
        contentChanged = true;
        issuesFixed++;
      }
    }
    
    if (contentChanged) {
      fs.writeFileSync(authPath, authContent);
      console.log('✅ Fixed authentication middleware security issues');
    }
  }
  
  // Fix route middleware imports
  const routesDir = path.join(__dirname, 'api', 'routes');
  if (fs.existsSync(routesDir)) {
    const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
    
    for (const file of routeFiles) {
      const filePath = path.join(routesDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      let contentChanged = false;
      
      const routeFixes = [
        { pattern: /require\(['"][^'"]*_authMiddleware['"]\)/, replacement: "require('../../middleware/auth').authMiddleware" },
        { pattern: /require\(['"][^'"]*_general['"]\)/, replacement: "require('../../middleware/rateLimiting').general" },
        { pattern: /require\(['"][^'"]*_tenantContextMiddleware['"]\)/, replacement: "require('../../middleware/tenantContext').tenantContextMiddleware" }
      ];
      
      for (const fix of routeFixes) {
        if (fix.pattern.test(content)) {
          content = content.replace(fix.pattern, fix.replacement);
          contentChanged = true;
          issuesFixed++;
        }
      }
      
      if (contentChanged) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed middleware imports in ${file}`);
      }
    }
  }
  
  if (issuesFixed === 0) {
    console.log('✅ No configuration issues found');
  } else {
    console.log(`✅ Fixed ${issuesFixed} configuration issues`);
  }
  
  return issuesFixed;
}

// Environment configuration template
const envConfig = `# K-12 Student Information System - Backend Environment Configuration
# SECURITY WARNING: This file contains sensitive information. Never commit to version control.

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_sis
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_sis

# =============================================================================
# JWT CONFIGURATION (CRITICAL - MUST BE SET)
# =============================================================================
JWT_SECRET=${generateJWTSecret()}
JWT_REFRESH_SECRET=${generateJWTSecret()}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=school-sis
JWT_AUDIENCE=school-sis-users

# =============================================================================
# ENCRYPTION CONFIGURATION
# =============================================================================
ENCRYPTION_KEY=${generateEncryptionKey()}
INTEGRATION_ENCRYPTION_KEY=${generateEncryptionKey()}

# =============================================================================
# EMAIL CONFIGURATION (SMTP)
# =============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_FROM_NAME=School SIS
SMTP_FROM_EMAIL=noreply@yourschool.com

# =============================================================================
# FILE UPLOAD CONFIGURATION
# =============================================================================
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf
UPLOAD_PATH=./uploads

# =============================================================================
# RATE LIMITING CONFIGURATION
# =============================================================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
LOG_LEVEL=info
LOG_FILE=./logs/app.log
LOG_FORMAT=json

# =============================================================================
# REDIS CONFIGURATION (for session storage and caching)
# =============================================================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

# =============================================================================
# EXTERNAL SERVICES CONFIGURATION
# =============================================================================
GOOGLE_ANALYTICS_ID=
GOOGLE_TAG_MANAGER_ID=
FACEBOOK_PIXEL_ID=

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
BCRYPT_ROUNDS=12
SESSION_SECRET=${generateSecureString(32)}
COOKIE_SECURE=false
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=lax

# =============================================================================
# CORS CONFIGURATION
# =============================================================================
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# =============================================================================
# DEVELOPMENT CONFIGURATION
# =============================================================================
DEBUG=false
VERBOSE_LOGGING=false

# =============================================================================
# INTEGRATION CONFIGURATION (Optional)
# =============================================================================

# Google Workspace Integration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# Microsoft 365 Integration
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=

# Twilio Integration
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# SendGrid Integration
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@yourschool.com
SENDGRID_FROM_NAME=School SIS

# Stripe Integration
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Weather API Integration
WEATHER_API_KEY=

# Khan Academy Integration
KHAN_ACADEMY_ACCESS_TOKEN=
KHAN_ACADEMY_CLIENT_ID=
KHAN_ACADEMY_CLIENT_SECRET=

# =============================================================================
# HEALTH CHECK CONFIGURATION
# =============================================================================
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_TIMEOUT=10s

# =============================================================================
# BACKUP CONFIGURATION
# =============================================================================
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=
BACKUP_S3_REGION=us-east-1
BACKUP_S3_ACCESS_KEY=
BACKUP_S3_SECRET_KEY=

# =============================================================================
# SECURITY NOTES
# =============================================================================
# 1. Generate strong, unique passwords for all services
# 2. Use environment-specific API keys and secrets
# 3. Enable SSL/TLS for all external communications
# 4. Regularly rotate secrets and API keys
# 5. Monitor access logs and security events
# 6. Keep all dependencies updated
# 7. Use secrets management in production (AWS Secrets Manager, HashiCorp Vault, etc.)
# 8. Implement proper backup and disaster recovery procedures
`;

// Test environment configuration
const testEnvConfig = `# Test Environment Configuration
NODE_ENV=test
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_sis_test
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_sis_test

# JWT Configuration for testing
JWT_SECRET=test_jwt_secret_key_for_testing_purposes_only_32_chars
JWT_REFRESH_SECRET=test_refresh_secret_key_for_testing_purposes_only_32_chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=24h
JWT_ISSUER=school-sis-test
JWT_AUDIENCE=school-sis-test-users

# Encryption for testing
ENCRYPTION_KEY=test_encryption_key_32_chars_long
INTEGRATION_ENCRYPTION_KEY=test_integration_encryption_key_32_chars

# Disable external services for testing
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=School SIS Test
SMTP_FROM_EMAIL=test@yourschool.com

# Test configuration
LOG_LEVEL=error
DEBUG=false
VERBOSE_LOGGING=false
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true
`;

// Production environment configuration template
const productionEnvConfig = `# Production Environment Configuration Template
# SECURITY WARNING: This file contains sensitive information. Never commit to version control.

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DB_HOST=your_production_db_host
DB_PORT=5432
DB_NAME=school_sis_production
DB_USER=your_production_db_user
DB_PASSWORD=your_secure_production_db_password
DB_SSL=true
DATABASE_URL=postgresql://your_production_db_user:your_secure_production_db_password@your_production_db_host:5432/school_sis_production

# =============================================================================
# JWT CONFIGURATION (CRITICAL - MUST BE SET)
# =============================================================================
JWT_SECRET=your_production_jwt_secret_key_here_minimum_32_characters_long_for_security
JWT_REFRESH_SECRET=your_production_jwt_refresh_secret_key_here_minimum_32_characters_long_for_security
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=school-sis-production
JWT_AUDIENCE=school-sis-production-users

# =============================================================================
# ENCRYPTION CONFIGURATION
# =============================================================================
ENCRYPTION_KEY=your_production_32_character_encryption_key_here_for_data_protection
INTEGRATION_ENCRYPTION_KEY=your_production_32_character_integration_encryption_key_here

# =============================================================================
# EMAIL CONFIGURATION (SMTP)
# =============================================================================
SMTP_HOST=your_production_smtp_host
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your_production_smtp_user
SMTP_PASSWORD=your_production_smtp_password
SMTP_FROM_NAME=School SIS
SMTP_FROM_EMAIL=noreply@yourdomain.com

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
BCRYPT_ROUNDS=12
SESSION_SECRET=your_production_session_secret_here_minimum_32_characters_long
COOKIE_SECURE=true
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=strict

# =============================================================================
# CORS CONFIGURATION
# =============================================================================
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# =============================================================================
# PRODUCTION CONFIGURATION
# =============================================================================
LOG_LEVEL=warn
LOG_FORMAT=json
DEBUG=false
VERBOSE_LOGGING=false

# =============================================================================
# REDIS CONFIGURATION
# =============================================================================
REDIS_HOST=your_production_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_production_redis_password
REDIS_URL=redis://:your_production_redis_password@your_production_redis_host:6379

# =============================================================================
# EXTERNAL SERVICES (Configure with your production credentials)
# =============================================================================
GOOGLE_ANALYTICS_ID=your_production_ga_id
GOOGLE_TAG_MANAGER_ID=your_production_gtm_id
FACEBOOK_PIXEL_ID=your_production_fb_pixel_id

# =============================================================================
# INTEGRATION CONFIGURATION (Configure with your production credentials)
# =============================================================================
GOOGLE_CLIENT_ID=your_production_google_client_id
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

MICROSOFT_CLIENT_ID=your_production_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_production_microsoft_client_secret
MICROSOFT_TENANT_ID=your_production_microsoft_tenant_id

TWILIO_ACCOUNT_SID=your_production_twilio_account_sid
TWILIO_AUTH_TOKEN=your_production_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890

SENDGRID_API_KEY=your_production_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=School SIS

STRIPE_SECRET_KEY=sk_live_your_production_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_production_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_stripe_webhook_secret

WEATHER_API_KEY=your_production_weather_api_key

KHAN_ACADEMY_ACCESS_TOKEN=your_production_khan_academy_access_token
KHAN_ACADEMY_CLIENT_ID=your_production_khan_academy_client_id
KHAN_ACADEMY_CLIENT_SECRET=your_production_khan_academy_client_secret

# =============================================================================
# MONITORING AND LOGGING
# =============================================================================
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_TIMEOUT=10s

# =============================================================================
# BACKUP CONFIGURATION
# =============================================================================
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=your-production-backup-bucket
BACKUP_S3_REGION=us-east-1
BACKUP_S3_ACCESS_KEY=your_production_s3_access_key
BACKUP_S3_SECRET_KEY=your_production_s3_secret_key

# =============================================================================
# SECURITY NOTES FOR PRODUCTION
# =============================================================================
# 1. Generate strong, unique passwords for all services
# 2. Use environment-specific API keys and secrets
# 3. Enable SSL/TLS for all external communications
# 4. Regularly rotate secrets and API keys
# 5. Monitor access logs and security events
# 6. Keep all dependencies updated
# 7. Use secrets management in production (AWS Secrets Manager, HashiCorp Vault, etc.)
# 8. Implement proper backup and disaster recovery procedures
# 9. Enable all security headers and CORS properly
# 10. Use HTTPS everywhere in production
`;

// Create environment files
function createEnvironmentFiles() {
  const backendDir = __dirname;
  
  try {
    // Fix configuration issues first
    const issuesFixed = fixConfigurationIssues();
    
    // Create .env file for development
    const envPath = path.join(backendDir, '.env');
    fs.writeFileSync(envPath, envConfig);
    console.log('✅ Created .env file for development');
    
    // Create .env.test file for testing
    const testEnvPath = path.join(backendDir, '.env.test');
    fs.writeFileSync(testEnvPath, testEnvConfig);
    console.log('✅ Created .env.test file for testing');
    
    // Create .env.production.example file for production reference
    const productionEnvPath = path.join(backendDir, '.env.production.example');
    fs.writeFileSync(productionEnvPath, productionEnvConfig);
    console.log('✅ Created .env.production.example file for production reference');
    
    // Create .gitignore entry for .env files
    const gitignorePath = path.join(backendDir, '.gitignore');
    const gitignoreContent = `# Environment files
.env
.env.local
.env.production
.env.staging
.env.test

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Uploads directory
uploads/

# Temporary files
tmp/
temp/
`;
    
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('✅ Created .gitignore file to protect environment files');
    
    console.log('\n🔐 Enhanced environment configuration setup complete!');
    console.log(`🔧 Fixed ${issuesFixed} configuration issues`);
    console.log('\n📋 Next steps:');
    console.log('1. Review and update the .env file with your actual configuration');
    console.log('2. Set up your database with the credentials in .env');
    console.log('3. Configure external services (email, integrations) as needed');
    console.log('4. For production, use the .env.production.example as a template');
    console.log('5. Never commit .env files to version control');
    
  } catch (error) {
    console.error('❌ Error creating environment files:', error.message);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  createEnvironmentFiles();
}

module.exports = {
  createEnvironmentFiles,
  fixConfigurationIssues,
  generateSecureString,
  generateJWTSecret,
  generateEncryptionKey
};
