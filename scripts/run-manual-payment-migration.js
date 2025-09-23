#!/usr/bin/env node

/**
 * Manual Payment Request System Migration Script
 * 
 * This script runs the database migration to create tables for the manual payment system
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'school_sis',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

async function runMigration() {
  console.log('🚀 Starting Manual Payment Request System Migration...');
  
  const migrationFile = path.join(__dirname, '..', 'db', 'migrations', '027_create_manual_payment_request_tables.sql');
  
  console.log(`📁 Migration file: ${migrationFile}`);
  
  // Check if migration file exists
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }
  
  // Read migration file
  const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
  
  // Create database connection
  const pool = new Pool(dbConfig);
  
  try {
    console.log('📊 Running migration...');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Created tables:');
    console.log('  - payment_request_types');
    console.log('  - manual_payment_requests');
    console.log('  - payment_approval_tickets');
    console.log('  - payment_approval_workflow_logs');
    console.log('  - payment_request_fraud_assessments');
    console.log('  - payment_request_documents');
    console.log('  - payment_request_notifications');
    console.log('  - payment_request_escalation_rules');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('  1. Restart the backend server to load new services');
    console.log('  2. Test the manual payment request endpoints');
    console.log('  3. Configure admin users with appropriate roles');
    console.log('  4. Set up notification preferences');
    console.log('');
    console.log('🎉 Manual Payment Request System is ready!');
    
  } catch (error) {
    console.error('❌ Migration failed!');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };
