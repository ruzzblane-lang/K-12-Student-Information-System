#!/bin/bash

# Script to run the manual payment request tables migration
# This script creates the necessary database tables for the manual payment system

set -e

echo "🚀 Starting Manual Payment Request System Migration..."

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-school_sis}"
DB_USER="${DB_USER:-postgres}"

# Migration file path
MIGRATION_FILE="db/migrations/027_create_manual_payment_request_tables.sql"

echo "📁 Migration file: $MIGRATION_FILE"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📊 Running migration..."

# Run the migration
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📋 Created tables:"
    echo "  - payment_request_types"
    echo "  - manual_payment_requests"
    echo "  - payment_approval_tickets"
    echo "  - payment_approval_workflow_logs"
    echo "  - payment_request_fraud_assessments"
    echo "  - payment_request_documents"
    echo "  - payment_request_notifications"
    echo "  - payment_request_escalation_rules"
    echo ""
    echo "🔧 Next steps:"
    echo "  1. Restart the backend server to load new services"
    echo "  2. Test the manual payment request endpoints"
    echo "  3. Configure admin users with appropriate roles"
    echo "  4. Set up notification preferences"
    echo ""
    echo "🎉 Manual Payment Request System is ready!"
else
    echo "❌ Migration failed!"
    exit 1
fi
