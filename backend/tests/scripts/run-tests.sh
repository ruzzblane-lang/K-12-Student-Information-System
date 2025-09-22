#!/bin/bash

# Comprehensive Test Runner for K-12 Student Information System
# This script runs all types of tests with proper setup and reporting

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DB_NAME=${TEST_DB_NAME:-"school_sis_test"}
TEST_DB_HOST=${TEST_DB_HOST:-"localhost"}
TEST_DB_PORT=${TEST_DB_PORT:-"5432"}
TEST_DB_USER=${TEST_DB_USER:-"postgres"}
TEST_DB_PASSWORD=${TEST_DB_PASSWORD:-"postgres"}

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test result tracking
test_started() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log_info "Starting test: $1"
}

test_passed() {
    PASSED_TESTS=$((PASSED_TESTS + 1))
    log_success "Test passed: $1"
}

test_failed() {
    FAILED_TESTS=$((FAILED_TESTS + 1))
    log_error "Test failed: $1"
}

test_skipped() {
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
    log_warning "Test skipped: $1"
}

# Database setup
setup_test_database() {
    log_info "Setting up test database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" >/dev/null 2>&1; then
        log_error "PostgreSQL is not running or not accessible"
        log_info "Please ensure PostgreSQL is running on $TEST_DB_HOST:$TEST_DB_PORT"
        exit 1
    fi
    
    # Create test database if it doesn't exist
    PGPASSWORD="$TEST_DB_PASSWORD" psql -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" -d postgres -c "CREATE DATABASE $TEST_DB_NAME;" 2>/dev/null || true
    
    # Run database migrations
    log_info "Running database migrations..."
    if [ -f "scripts/migrate.js" ]; then
        node scripts/migrate.js --env=test
    elif [ -f "db/migrate.js" ]; then
        node db/migrate.js --env=test
    else
        log_warning "No migration script found, skipping database setup"
    fi
    
    log_success "Test database setup complete"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test environment..."
    
    # Kill any background processes
    jobs -p | xargs -r kill
    
    # Clean up test database (optional)
    if [ "$CLEANUP_DB" = "true" ]; then
        log_info "Dropping test database..."
        PGPASSWORD="$TEST_DB_PASSWORD" psql -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" 2>/dev/null || true
    fi
    
    log_success "Cleanup complete"
}

# Set up cleanup trap
trap cleanup EXIT

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check PostgreSQL
    if ! command -v psql >/dev/null 2>&1; then
        log_error "PostgreSQL client (psql) is not installed"
        exit 1
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install
    fi
    
    log_success "All dependencies satisfied"
}

# Run unit tests
run_unit_tests() {
    test_started "Unit Tests"
    
    if [ -d "tests/unit" ] && [ "$(ls -A tests/unit)" ]; then
        log_info "Running unit tests..."
        
        if command -v jest >/dev/null 2>&1; then
            if jest tests/unit --passWithNoTests --verbose; then
                test_passed "Unit Tests"
            else
                test_failed "Unit Tests"
                return 1
            fi
        else
            log_warning "Jest not found, skipping unit tests"
            test_skipped "Unit Tests"
        fi
    else
        log_warning "No unit tests found"
        test_skipped "Unit Tests"
    fi
}

# Run integration tests
run_integration_tests() {
    test_started "Integration Tests"
    
    if [ -d "tests/integration" ] && [ "$(ls -A tests/integration)" ]; then
        log_info "Running integration tests..."
        
        if command -v jest >/dev/null 2>&1; then
            if jest tests/integration --passWithNoTests --verbose; then
                test_passed "Integration Tests"
            else
                test_failed "Integration Tests"
                return 1
            fi
        else
            log_warning "Jest not found, skipping integration tests"
            test_skipped "Integration Tests"
        fi
    else
        log_warning "No integration tests found"
        test_skipped "Integration Tests"
    fi
}

# Run API tests
run_api_tests() {
    test_started "API Tests"
    
    if [ -d "tests/api" ] && [ "$(ls -A tests/api)" ]; then
        log_info "Running API tests..."
        
        if command -v jest >/dev/null 2>&1; then
            if jest tests/api --passWithNoTests --verbose; then
                test_passed "API Tests"
            else
                test_failed "API Tests"
                return 1
            fi
        else
            log_warning "Jest not found, skipping API tests"
            test_skipped "API Tests"
        fi
    else
        log_warning "No API tests found"
        test_skipped "API Tests"
    fi
}

# Run performance tests
run_performance_tests() {
    test_started "Performance Tests"
    
    if [ -d "tests/performance" ] && [ "$(ls -A tests/performance)" ]; then
        log_info "Running performance tests..."
        
        if command -v jest >/dev/null 2>&1; then
            if jest tests/performance --passWithNoTests --verbose; then
                test_passed "Performance Tests"
            else
                test_failed "Performance Tests"
                return 1
            fi
        else
            log_warning "Jest not found, skipping performance tests"
            test_skipped "Performance Tests"
        fi
    else
        log_warning "No performance tests found"
        test_skipped "Performance Tests"
    fi
}

# Run curl-based API tests
run_curl_tests() {
    test_started "Curl API Tests"
    
    if [ -f "tests/scripts/api_test_examples.sh" ]; then
        log_info "Running curl-based API tests..."
        
        # Start the server in background if not already running
        if ! curl -s http://localhost:3000/health >/dev/null 2>&1; then
            log_info "Starting server for API tests..."
            npm start &
            SERVER_PID=$!
            sleep 5  # Wait for server to start
        fi
        
        if bash tests/scripts/api_test_examples.sh; then
            test_passed "Curl API Tests"
        else
            test_failed "Curl API Tests"
            return 1
        fi
        
        # Kill background server if we started it
        if [ ! -z "$SERVER_PID" ]; then
            kill $SERVER_PID 2>/dev/null || true
        fi
    else
        log_warning "No curl test script found"
        test_skipped "Curl API Tests"
    fi
}

# Run linting
run_linting() {
    test_started "Code Linting"
    
    if [ -f "package.json" ] && grep -q '"lint"' package.json; then
        log_info "Running code linting..."
        
        if npm run lint; then
            test_passed "Code Linting"
        else
            test_failed "Code Linting"
            return 1
        fi
    else
        log_warning "No lint script found in package.json"
        test_skipped "Code Linting"
    fi
}

# Run type checking
run_type_checking() {
    test_started "Type Checking"
    
    if [ -f "package.json" ] && grep -q '"type-check"' package.json; then
        log_info "Running type checking..."
        
        if npm run type-check; then
            test_passed "Type Checking"
        else
            test_failed "Type Checking"
            return 1
        fi
    else
        log_warning "No type-check script found in package.json"
        test_skipped "Type Checking"
    fi
}

# Generate test report
generate_report() {
    log_info "Generating test report..."
    
    local report_file="test-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "K-12 Student Information System - Test Report"
        echo "Generated: $(date)"
        echo "=============================================="
        echo ""
        echo "Test Summary:"
        echo "  Total Tests: $TOTAL_TESTS"
        echo "  Passed: $PASSED_TESTS"
        echo "  Failed: $FAILED_TESTS"
        echo "  Skipped: $SKIPPED_TESTS"
        echo ""
        
        if [ $FAILED_TESTS -eq 0 ]; then
            echo "Result: ALL TESTS PASSED ✅"
        else
            echo "Result: SOME TESTS FAILED ❌"
        fi
        
        echo ""
        echo "Environment:"
        echo "  Node.js: $(node --version)"
        echo "  npm: $(npm --version)"
        echo "  Test Database: $TEST_DB_NAME"
        echo "  Database Host: $TEST_DB_HOST:$TEST_DB_PORT"
    } > "$report_file"
    
    log_success "Test report saved to: $report_file"
}

# Main execution
main() {
    echo "🧪 K-12 Student Information System - Test Suite"
    echo "=============================================="
    echo ""
    
    # Parse command line arguments
    RUN_UNIT=true
    RUN_INTEGRATION=true
    RUN_API=true
    RUN_PERFORMANCE=true
    RUN_CURL=true
    RUN_LINT=true
    RUN_TYPE_CHECK=true
    SETUP_DB=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit-only)
                RUN_INTEGRATION=false
                RUN_API=false
                RUN_PERFORMANCE=false
                RUN_CURL=false
                RUN_LINT=false
                RUN_TYPE_CHECK=false
                shift
                ;;
            --integration-only)
                RUN_UNIT=false
                RUN_API=false
                RUN_PERFORMANCE=false
                RUN_CURL=false
                RUN_LINT=false
                RUN_TYPE_CHECK=false
                shift
                ;;
            --api-only)
                RUN_UNIT=false
                RUN_INTEGRATION=false
                RUN_PERFORMANCE=false
                RUN_CURL=false
                RUN_LINT=false
                RUN_TYPE_CHECK=false
                shift
                ;;
            --performance-only)
                RUN_UNIT=false
                RUN_INTEGRATION=false
                RUN_API=false
                RUN_CURL=false
                RUN_LINT=false
                RUN_TYPE_CHECK=false
                shift
                ;;
            --no-db-setup)
                SETUP_DB=false
                shift
                ;;
            --cleanup-db)
                CLEANUP_DB=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --unit-only        Run only unit tests"
                echo "  --integration-only Run only integration tests"
                echo "  --api-only         Run only API tests"
                echo "  --performance-only Run only performance tests"
                echo "  --no-db-setup      Skip database setup"
                echo "  --cleanup-db       Clean up test database after tests"
                echo "  --help             Show this help message"
                echo ""
                echo "Environment Variables:"
                echo "  TEST_DB_NAME       Test database name (default: school_sis_test)"
                echo "  TEST_DB_HOST       Test database host (default: localhost)"
                echo "  TEST_DB_PORT       Test database port (default: 5432)"
                echo "  TEST_DB_USER       Test database user (default: postgres)"
                echo "  TEST_DB_PASSWORD   Test database password (default: postgres)"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Check dependencies
    check_dependencies
    
    # Setup test database
    if [ "$SETUP_DB" = "true" ]; then
        setup_test_database
    fi
    
    echo ""
    log_info "Starting test execution..."
    echo ""
    
    # Run tests based on configuration
    if [ "$RUN_LINT" = "true" ]; then
        run_linting || true
    fi
    
    if [ "$RUN_TYPE_CHECK" = "true" ]; then
        run_type_checking || true
    fi
    
    if [ "$RUN_UNIT" = "true" ]; then
        run_unit_tests || true
    fi
    
    if [ "$RUN_INTEGRATION" = "true" ]; then
        run_integration_tests || true
    fi
    
    if [ "$RUN_API" = "true" ]; then
        run_api_tests || true
    fi
    
    if [ "$RUN_PERFORMANCE" = "true" ]; then
        run_performance_tests || true
    fi
    
    if [ "$RUN_CURL" = "true" ]; then
        run_curl_tests || true
    fi
    
    echo ""
    echo "=============================================="
    echo "Test Execution Complete"
    echo "=============================================="
    echo ""
    
    # Generate report
    generate_report
    
    # Exit with appropriate code
    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "All tests completed successfully!"
        exit 0
    else
        log_error "$FAILED_TESTS test(s) failed!"
        exit 1
    fi
}

# Run main function
main "$@"
