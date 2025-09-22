#!/bin/bash

# K-12 Student Information System - Database Setup Script
# Description: Complete database setup with migrations, seeds, and validation
# Compliance: US (FERPA), EU (GDPR), Indonesia (UU No. 19 Tahun 2016)
# Created: 2024-09-22

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-school_sis}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if PostgreSQL is running
check_postgres() {
    print_status "Checking PostgreSQL connection..."
    
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        print_error "Cannot connect to PostgreSQL database"
        print_error "Please ensure PostgreSQL is running and credentials are correct"
        print_error "Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME, User: $DB_USER"
        exit 1
    fi
    
    print_success "PostgreSQL connection successful"
}

# Function to run migrations
run_migrations() {
    print_status "Running database migrations..."
    
    local migration_count=0
    for migration_file in "$SCRIPT_DIR/migrations"/*.sql; do
        if [ -f "$migration_file" ]; then
            print_status "Running migration: $(basename "$migration_file")"
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"
            ((migration_count++))
        fi
    done
    
    print_success "Completed $migration_count migrations"
}

# Function to run seed data
run_seeds() {
    local seed_type="$1"
    
    if [ "$seed_type" = "demo" ]; then
        print_status "Running demo data seeds..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/seeds/demo_data.sql"
        print_success "Demo data seeded successfully"
    else
        print_status "Running initial data seeds..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/seeds/initial_data.sql"
        print_success "Initial data seeded successfully"
    fi
}

# Function to run validation
run_validation() {
    print_status "Running data integrity validation..."
    
    local validation_results
    validation_results=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/validate/check_integrity.sql" -t)
    
    local failed_checks=0
    while IFS= read -r line; do
        if [[ "$line" =~ FAIL ]]; then
            print_error "Validation failed: $line"
            ((failed_checks++))
        elif [[ "$line" =~ PASS ]]; then
            print_success "Validation passed: $line"
        fi
    done <<< "$validation_results"
    
    if [ $failed_checks -eq 0 ]; then
        print_success "All validation checks passed"
    else
        print_warning "$failed_checks validation checks failed"
    fi
}

# Function to run anonymization
run_anonymization() {
    print_status "Running data anonymization..."
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/anonymize/anonymize_students.sql"
    
    print_success "Data anonymization completed"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --migrations-only    Run only migrations"
    echo "  --seeds-only         Run only seed data"
    echo "  --validation-only    Run only validation"
    echo "  --anonymize-only     Run only anonymization"
    echo "  --demo               Include demo data (default: initial data only)"
    echo "  --anonymize          Run anonymization after seeding"
    echo "  --help               Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST              Database host (default: localhost)"
    echo "  DB_PORT              Database port (default: 5432)"
    echo "  DB_NAME              Database name (default: school_sis)"
    echo "  DB_USER              Database user (default: postgres)"
    echo "  DB_PASSWORD          Database password (default: postgres)"
    echo ""
    echo "Examples:"
    echo "  $0                          # Full setup with initial data"
    echo "  $0 --demo                   # Full setup with demo data"
    echo "  $0 --demo --anonymize       # Full setup with demo data and anonymization"
    echo "  $0 --migrations-only        # Run only migrations"
    echo "  $0 --validation-only        # Run only validation"
}

# Main execution
main() {
    local migrations_only=false
    local seeds_only=false
    local validation_only=false
    local anonymize_only=false
    local include_demo=false
    local include_anonymize=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --migrations-only)
                migrations_only=true
                shift
                ;;
            --seeds-only)
                seeds_only=true
                shift
                ;;
            --validation-only)
                validation_only=true
                shift
                ;;
            --anonymize-only)
                anonymize_only=true
                shift
                ;;
            --demo)
                include_demo=true
                shift
                ;;
            --anonymize)
                include_anonymize=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Print header
    echo "=========================================="
    echo "K-12 Student Information System"
    echo "Database Setup Script"
    echo "=========================================="
    echo ""
    
    # Check PostgreSQL connection
    check_postgres
    
    # Execute based on options
    if [ "$anonymize_only" = true ]; then
        run_anonymization
    elif [ "$validation_only" = true ]; then
        run_validation
    elif [ "$seeds_only" = true ]; then
        run_seeds "$([ "$include_demo" = true ] && echo "demo" || echo "initial")"
        if [ "$include_anonymize" = true ]; then
            run_anonymization
        fi
    elif [ "$migrations_only" = true ]; then
        run_migrations
    else
        # Full setup
        run_migrations
        run_seeds "$([ "$include_demo" = true ] && echo "demo" || echo "initial")"
        run_validation
        if [ "$include_anonymize" = true ]; then
            run_anonymization
        fi
    fi
    
    print_success "Database setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Configure your application with the database connection"
    echo "2. Set up environment variables for production"
    echo "3. Review the seeded data and adjust as needed"
    echo "4. Run validation periodically to ensure data integrity"
}

# Run main function with all arguments
main "$@"
