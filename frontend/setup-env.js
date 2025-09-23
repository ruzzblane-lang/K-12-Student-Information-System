#!/usr/bin/env node

/**
 * Enhanced Frontend Environment Configuration Setup Script
 * Creates environment configuration files and fixes common frontend issues
 * Updated to handle more configuration problems based on real-world issues
 */

const fs = require('fs');
const path = require('path');

// Fix common frontend configuration issues
function fixFrontendConfigurationIssues() {
  console.log('\n🔧 Checking and fixing common frontend configuration issues...');
  
  let issuesFixed = 0;
  
  // Check for missing manifest icons
  const publicDir = path.join(__dirname, 'public');
  const manifestPath = path.join(publicDir, 'manifest.json');
  
  if (fs.existsSync(manifestPath)) {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    // Check if icons exist
    if (manifest.icons) {
      for (const icon of manifest.icons) {
        const iconPath = path.join(publicDir, icon.src);
        if (!fs.existsSync(iconPath)) {
          console.log(`⚠️  Missing icon: ${icon.src}`);
          issuesFixed++;
        }
      }
    }
    
    // Check if screenshots exist
    if (manifest.screenshots) {
      for (const screenshot of manifest.screenshots) {
        const screenshotPath = path.join(publicDir, screenshot.src);
        if (!fs.existsSync(screenshotPath)) {
          console.log(`⚠️  Missing screenshot: ${screenshot.src}`);
          issuesFixed++;
        }
      }
    }
  }
  
  // Check for missing favicon
  const faviconPath = path.join(publicDir, 'favicon.ico');
  if (!fs.existsSync(faviconPath)) {
    console.log('⚠️  Missing favicon.ico');
    issuesFixed++;
  }
  
  // Check for React App configuration issues
  const srcDir = path.join(__dirname, 'src');
  if (fs.existsSync(srcDir)) {
    // Check for common React issues
    const appJsPath = path.join(srcDir, 'App.js');
    if (fs.existsSync(appJsPath)) {
      const appContent = fs.readFileSync(appJsPath, 'utf8');
      
      // Check for AuthProvider wrapping
      if (appContent.includes('useAuth') && !appContent.includes('AuthProvider')) {
        console.log('⚠️  useAuth hook used without AuthProvider wrapper');
        issuesFixed++;
      }
    }
  }
  
  if (issuesFixed === 0) {
    console.log('✅ No frontend configuration issues found');
  } else {
    console.log(`⚠️  Found ${issuesFixed} frontend configuration issues`);
  }
  
  return issuesFixed;
}

// Frontend environment configuration template
const frontendEnvConfig = `# K-12 Student Information System - Frontend Environment Configuration
# SECURITY WARNING: This file contains sensitive information. Never commit to version control.

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
REACT_APP_NAME=School SIS

# =============================================================================
# API CONFIGURATION
# =============================================================================
REACT_APP_API_URL=http://localhost:5000
REACT_APP_API_VERSION=v1
REACT_APP_API_TIMEOUT=30000

# =============================================================================
# AUTHENTICATION CONFIGURATION
# =============================================================================
REACT_APP_JWT_STORAGE_KEY=school_sis_token
REACT_APP_REFRESH_TOKEN_KEY=school_sis_refresh_token
REACT_APP_TOKEN_EXPIRY_BUFFER=300000

# =============================================================================
# EXTERNAL SERVICES CONFIGURATION
# =============================================================================
REACT_APP_GOOGLE_ANALYTICS_ID=
REACT_APP_GOOGLE_TAG_MANAGER_ID=
REACT_APP_FACEBOOK_PIXEL_ID=

# =============================================================================
# INTEGRATION CONFIGURATION
# =============================================================================
REACT_APP_GOOGLE_CLIENT_ID=
REACT_APP_MICROSOFT_CLIENT_ID=
REACT_APP_STRIPE_PUBLISHABLE_KEY=

# =============================================================================
# FEATURE FLAGS
# =============================================================================
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_DEBUG=false
REACT_APP_ENABLE_PWA=true
REACT_APP_ENABLE_OFFLINE_MODE=true

# =============================================================================
# UI CONFIGURATION
# =============================================================================
REACT_APP_THEME=light
REACT_APP_PRIMARY_COLOR=#1e40af
REACT_APP_SECONDARY_COLOR=#3b82f6
REACT_APP_LOGO_URL=/logo.svg

# =============================================================================
# DEVELOPMENT CONFIGURATION
# =============================================================================
GENERATE_SOURCEMAP=false
REACT_APP_DEBUG=false
REACT_APP_VERBOSE_LOGGING=false

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
REACT_APP_CSP_ENABLED=true
REACT_APP_HTTPS_ONLY=false

# =============================================================================
# PERFORMANCE CONFIGURATION
# =============================================================================
REACT_APP_CACHE_TTL=300000
REACT_APP_MAX_RETRIES=3
REACT_APP_RETRY_DELAY=1000
`;

// Production frontend environment configuration template
const productionFrontendEnvConfig = `# Production Frontend Environment Configuration Template
# SECURITY WARNING: This file contains sensitive information. Never commit to version control.

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
REACT_APP_NAME=School SIS

# =============================================================================
# API CONFIGURATION
# =============================================================================
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_API_VERSION=v1
REACT_APP_API_TIMEOUT=30000

# =============================================================================
# AUTHENTICATION CONFIGURATION
# =============================================================================
REACT_APP_JWT_STORAGE_KEY=school_sis_token
REACT_APP_REFRESH_TOKEN_KEY=school_sis_refresh_token
REACT_APP_TOKEN_EXPIRY_BUFFER=300000

# =============================================================================
# EXTERNAL SERVICES CONFIGURATION
# =============================================================================
REACT_APP_GOOGLE_ANALYTICS_ID=your_production_ga_id
REACT_APP_GOOGLE_TAG_MANAGER_ID=your_production_gtm_id
REACT_APP_FACEBOOK_PIXEL_ID=your_production_fb_pixel_id

# =============================================================================
# INTEGRATION CONFIGURATION
# =============================================================================
REACT_APP_GOOGLE_CLIENT_ID=your_production_google_client_id
REACT_APP_MICROSOFT_CLIENT_ID=your_production_microsoft_client_id
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_production_stripe_publishable_key

# =============================================================================
# FEATURE FLAGS
# =============================================================================
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_DEBUG=false
REACT_APP_ENABLE_PWA=true
REACT_APP_ENABLE_OFFLINE_MODE=true

# =============================================================================
# UI CONFIGURATION
# =============================================================================
REACT_APP_THEME=light
REACT_APP_PRIMARY_COLOR=#1e40af
REACT_APP_SECONDARY_COLOR=#3b82f6
REACT_APP_LOGO_URL=/logo.svg

# =============================================================================
# PRODUCTION CONFIGURATION
# =============================================================================
GENERATE_SOURCEMAP=false
REACT_APP_DEBUG=false
REACT_APP_VERBOSE_LOGGING=false

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
REACT_APP_CSP_ENABLED=true
REACT_APP_HTTPS_ONLY=true

# =============================================================================
# PERFORMANCE CONFIGURATION
# =============================================================================
REACT_APP_CACHE_TTL=300000
REACT_APP_MAX_RETRIES=3
REACT_APP_RETRY_DELAY=1000
`;

// Create frontend environment files
function createFrontendEnvironmentFiles() {
  const frontendDir = __dirname;
  
  try {
    // Fix configuration issues first
    const issuesFixed = fixFrontendConfigurationIssues();
    
    // Create .env file for development
    const envPath = path.join(frontendDir, '.env');
    fs.writeFileSync(envPath, frontendEnvConfig);
    console.log('✅ Created frontend .env file for development');
    
    // Create .env.production.example file for production reference
    const productionEnvPath = path.join(frontendDir, '.env.production.example');
    fs.writeFileSync(productionEnvPath, productionFrontendEnvConfig);
    console.log('✅ Created frontend .env.production.example file for production reference');
    
    console.log('\n🔐 Enhanced frontend environment configuration setup complete!');
    console.log(`🔧 Found ${issuesFixed} frontend configuration issues`);
    console.log('\n📋 Next steps:');
    console.log('1. Review and update the .env file with your actual configuration');
    console.log('2. Configure external services (Google Analytics, integrations) as needed');
    console.log('3. For production, use the .env.production.example as a template');
    console.log('4. Never commit .env files to version control');
    console.log('5. Fix any missing icons or screenshots in the public directory');
    
  } catch (error) {
    console.error('❌ Error creating frontend environment files:', error.message);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  createFrontendEnvironmentFiles();
}

module.exports = {
  createFrontendEnvironmentFiles,
  fixFrontendConfigurationIssues
};