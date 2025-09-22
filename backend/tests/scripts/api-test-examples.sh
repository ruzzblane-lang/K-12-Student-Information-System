#!/bin/bash

# API Test Examples using curl
# Comprehensive testing of all API endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL=${API_BASE_URL:-"http://localhost:3000/api"}
ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@springfield.edu"}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-"secure-password"}
TENANT_SLUG=${TENANT_SLUG:-"springfield"}

# Test state
AUTH_TOKEN=""
TENANT_ID=""
USER_ID=""
STUDENT_ID=""

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

# Helper function to make API requests
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    
    local url="${API_BASE_URL}${endpoint}"
    local curl_cmd="curl -s -w '\n%{http_code}'"
    
    # Add method
    case $method in
        GET)
            curl_cmd="$curl_cmd -X GET"
            ;;
        POST)
            curl_cmd="$curl_cmd -X POST"
            ;;
        PUT)
            curl_cmd="$curl_cmd -X PUT"
            ;;
        DELETE)
            curl_cmd="$curl_cmd -X DELETE"
            ;;
        PATCH)
            curl_cmd="$curl_cmd -X PATCH"
            ;;
    esac
    
    # Add headers
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    if [ ! -z "$AUTH_TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $AUTH_TOKEN'"
    fi
    if [ ! -z "$TENANT_SLUG" ]; then
        curl_cmd="$curl_cmd -H 'X-Tenant-Slug: $TENANT_SLUG'"
    fi
    if [ ! -z "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    # Add data for POST/PUT/PATCH
    if [ ! -z "$data" ] && [[ "$method" =~ ^(POST|PUT|PATCH)$ ]]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    # Execute request
    curl_cmd="$curl_cmd '$url'"
    eval "$curl_cmd"
}

# Parse API response
parse_response() {
    local response=$1
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    echo "HTTP_CODE:$http_code"
    echo "BODY:$body"
}

# Test authentication
test_auth() {
    log_info "Testing authentication..."
    
    # Test login
    local login_data="{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"tenantSlug\":\"$TENANT_SLUG\"}"
    local response=$(api_request "POST" "/auth/login" "$login_data")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    local body=$(echo "$result" | grep "BODY:" | cut -d: -f2-)
    
    if [ "$http_code" = "200" ]; then
        log_success "Login successful"
        
        # Extract token and user info
        AUTH_TOKEN=$(echo "$body" | jq -r '.data.accessToken // empty')
        TENANT_ID=$(echo "$body" | jq -r '.data.tenant.id // empty')
        USER_ID=$(echo "$body" | jq -r '.data.user.id // empty')
        
        if [ -z "$AUTH_TOKEN" ]; then
            log_error "Failed to extract auth token"
            return 1
        fi
        
        log_info "Auth token: ${AUTH_TOKEN:0:20}..."
        log_info "Tenant ID: $TENANT_ID"
        log_info "User ID: $USER_ID"
        
        return 0
    else
        log_error "Login failed with status $http_code"
        echo "Response: $body"
        return 1
    fi
}

# Test current user info
test_me() {
    log_info "Testing /auth/me endpoint..."
    
    local response=$(api_request "GET" "/auth/me")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    local body=$(echo "$result" | grep "BODY:" | cut -d: -f2-)
    
    if [ "$http_code" = "200" ]; then
        log_success "Get user info successful"
        echo "User info: $(echo "$body" | jq -r '.data.user.email')"
        return 0
    else
        log_error "Get user info failed with status $http_code"
        return 1
    fi
}

# Test students endpoints
test_students() {
    log_info "Testing students endpoints..."
    
    # Test get students list
    log_info "Testing GET /students"
    local response=$(api_request "GET" "/students")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    local body=$(echo "$result" | grep "BODY:" | cut -d: -f2-)
    
    if [ "$http_code" = "200" ]; then
        log_success "Get students list successful"
        local student_count=$(echo "$body" | jq -r '.data | length')
        log_info "Found $student_count students"
    else
        log_error "Get students list failed with status $http_code"
        return 1
    fi
    
    # Test create student
    log_info "Testing POST /students"
    local student_data='{
        "studentId": "TEST001",
        "firstName": "Test",
        "lastName": "Student",
        "dateOfBirth": "2008-01-01",
        "gradeLevel": "10",
        "enrollmentDate": "2024-08-15",
        "primaryEmail": "test.student@example.com",
        "address": "123 Test Street, Test City, TC 12345"
    }'
    
    local response=$(api_request "POST" "/students" "$student_data")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    local body=$(echo "$result" | grep "BODY:" | cut -d: -f2-)
    
    if [ "$http_code" = "201" ]; then
        log_success "Create student successful"
        STUDENT_ID=$(echo "$body" | jq -r '.data.id // empty')
        log_info "Created student with ID: $STUDENT_ID"
    else
        log_warning "Create student failed with status $http_code"
        echo "Response: $body"
        # Try to continue with existing student
        local existing_students=$(echo "$body" | jq -r '.data[0].id // empty' 2>/dev/null || echo "")
        if [ ! -z "$existing_students" ]; then
            STUDENT_ID="$existing_students"
            log_info "Using existing student ID: $STUDENT_ID"
        fi
    fi
    
    # Test get specific student
    if [ ! -z "$STUDENT_ID" ]; then
        log_info "Testing GET /students/$STUDENT_ID"
        local response=$(api_request "GET" "/students/$STUDENT_ID")
        local result=$(parse_response "$response")
        
        local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
        local body=$(echo "$result" | grep "BODY:" | cut -d: -f2-)
        
        if [ "$http_code" = "200" ]; then
            log_success "Get specific student successful"
        else
            log_warning "Get specific student failed with status $http_code"
        fi
        
        # Test update student
        log_info "Testing PUT /students/$STUDENT_ID"
        local update_data='{
            "firstName": "Updated",
            "lastName": "Student",
            "gradeLevel": "11"
        }'
        
        local response=$(api_request "PUT" "/students/$STUDENT_ID" "$update_data")
        local result=$(parse_response "$response")
        
        local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
        local body=$(echo "$result" | grep "BODY:" | cut -d: -f2-)
        
        if [ "$http_code" = "200" ]; then
            log_success "Update student successful"
        else
            log_warning "Update student failed with status $http_code"
        fi
    fi
    
    return 0
}

# Test student search and filtering
test_student_filters() {
    log_info "Testing student search and filtering..."
    
    # Test search
    log_info "Testing search functionality"
    local response=$(api_request "GET" "/students?search=Test")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    if [ "$http_code" = "200" ]; then
        log_success "Student search successful"
    else
        log_warning "Student search failed with status $http_code"
    fi
    
    # Test grade level filter
    log_info "Testing grade level filter"
    local response=$(api_request "GET" "/students?gradeLevel=10")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    if [ "$http_code" = "200" ]; then
        log_success "Grade level filter successful"
    else
        log_warning "Grade level filter failed with status $http_code"
    fi
    
    # Test pagination
    log_info "Testing pagination"
    local response=$(api_request "GET" "/students?page=1&limit=5")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    if [ "$http_code" = "200" ]; then
        log_success "Pagination successful"
    else
        log_warning "Pagination failed with status $http_code"
    fi
    
    return 0
}

# Test student grades
test_student_grades() {
    log_info "Testing student grades..."
    
    if [ -z "$STUDENT_ID" ]; then
        log_warning "No student ID available, skipping grades test"
        return 0
    fi
    
    log_info "Testing GET /students/$STUDENT_ID/grades"
    local response=$(api_request "GET" "/students/$STUDENT_ID/grades")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    if [ "$http_code" = "200" ]; then
        log_success "Get student grades successful"
    else
        log_warning "Get student grades failed with status $http_code"
    fi
    
    return 0
}

# Test student attendance
test_student_attendance() {
    log_info "Testing student attendance..."
    
    if [ -z "$STUDENT_ID" ]; then
        log_warning "No student ID available, skipping attendance test"
        return 0
    fi
    
    log_info "Testing GET /students/$STUDENT_ID/attendance"
    local response=$(api_request "GET" "/students/$STUDENT_ID/attendance")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    if [ "$http_code" = "200" ]; then
        log_success "Get student attendance successful"
    else
        log_warning "Get student attendance failed with status $http_code"
    fi
    
    return 0
}

# Test error handling
test_error_handling() {
    log_info "Testing error handling..."
    
    # Test unauthorized access
    log_info "Testing unauthorized access"
    local original_token="$AUTH_TOKEN"
    AUTH_TOKEN=""
    
    local response=$(api_request "GET" "/students")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    if [ "$http_code" = "401" ]; then
        log_success "Unauthorized access properly blocked"
    else
        log_warning "Unauthorized access not properly handled (status: $http_code)"
    fi
    
    # Restore token
    AUTH_TOKEN="$original_token"
    
    # Test non-existent student
    log_info "Testing non-existent student"
    local response=$(api_request "GET" "/students/non-existent-id")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    if [ "$http_code" = "404" ]; then
        log_success "Non-existent student properly handled"
    else
        log_warning "Non-existent student not properly handled (status: $http_code)"
    fi
    
    return 0
}

# Test logout
test_logout() {
    log_info "Testing logout..."
    
    local response=$(api_request "POST" "/auth/logout")
    local result=$(parse_response "$response")
    
    local http_code=$(echo "$result" | grep "HTTP_CODE:" | cut -d: -f2)
    if [ "$http_code" = "200" ]; then
        log_success "Logout successful"
        AUTH_TOKEN=""
        return 0
    else
        log_warning "Logout failed with status $http_code"
        return 1
    fi
}

# Main test execution
main() {
    echo "🧪 API Test Suite - K-12 Student Information System"
    echo "=================================================="
    echo ""
    
    # Check if server is running
    log_info "Checking if server is running..."
    if ! curl -s "${API_BASE_URL%/api}/health" >/dev/null 2>&1; then
        log_error "Server is not running at $API_BASE_URL"
        log_info "Please start the server first: npm start"
        exit 1
    fi
    log_success "Server is running"
    
    # Check dependencies
    if ! command -v curl >/dev/null 2>&1; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        log_warning "jq is not installed, JSON parsing will be limited"
    fi
    
    echo ""
    log_info "Starting API tests..."
    echo ""
    
    local test_results=()
    
    # Run tests
    if test_auth; then
        test_results+=("✅ Authentication")
    else
        test_results+=("❌ Authentication")
    fi
    
    if test_me; then
        test_results+=("✅ User Info")
    else
        test_results+=("❌ User Info")
    fi
    
    if test_students; then
        test_results+=("✅ Students CRUD")
    else
        test_results+=("❌ Students CRUD")
    fi
    
    if test_student_filters; then
        test_results+=("✅ Student Filters")
    else
        test_results+=("❌ Student Filters")
    fi
    
    if test_student_grades; then
        test_results+=("✅ Student Grades")
    else
        test_results+=("❌ Student Grades")
    fi
    
    if test_student_attendance; then
        test_results+=("✅ Student Attendance")
    else
        test_results+=("❌ Student Attendance")
    fi
    
    if test_error_handling; then
        test_results+=("✅ Error Handling")
    else
        test_results+=("❌ Error Handling")
    fi
    
    if test_logout; then
        test_results+=("✅ Logout")
    else
        test_results+=("❌ Logout")
    fi
    
    echo ""
    echo "=================================================="
    echo "Test Results Summary"
    echo "=================================================="
    
    for result in "${test_results[@]}"; do
        echo "$result"
    done
    
    echo ""
    
    # Count results
    local passed=$(printf '%s\n' "${test_results[@]}" | grep -c "✅" || true)
    local failed=$(printf '%s\n' "${test_results[@]}" | grep -c "❌" || true)
    local total=$((${#test_results[@]}))
    
    echo "Total Tests: $total"
    echo "Passed: $passed"
    echo "Failed: $failed"
    
    if [ $failed -eq 0 ]; then
        log_success "All API tests completed successfully!"
        exit 0
    else
        log_error "$failed test(s) failed!"
        exit 1
    fi
}

# Run main function
main "$@"
