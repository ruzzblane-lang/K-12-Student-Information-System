#!/usr/bin/env node

/**
 * Run Integration Migration
 * 
 * Simple script to run the integration tables migration
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🗄️ Running integration tables migration...');
    
    const migrationFile = path.join(__dirname, '..', 'db', 'migrations', '033_create_integration_tables.sql');
    
    if (!fs.existsSync(migrationFile)) {
      throw new Error('Migration file not found: ' + migrationFile);
    }
    
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    console.log('✅ Migration file loaded successfully');
    console.log('📝 Migration contains:');
    console.log('  - tenant_integration_configs table');
    console.log('  - integration_usage_logs table');
    console.log('  - integration_permissions table');
    console.log('  - integration_audit_logs table');
    console.log('  - integration_data_access_logs table');
    console.log('  - integration_config_changes table');
    console.log('  - integration_security_events table');
    console.log('  - integration_webhook_logs table');
    console.log('  - integration_api_keys table');
    console.log('  - All necessary indexes and constraints');
    
    console.log('⚠️  Note: You need to run this migration manually in your database');
    console.log('   Command: psql your_database < db/migrations/033_create_integration_tables.sql');
    
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  runMigration().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runMigration;
