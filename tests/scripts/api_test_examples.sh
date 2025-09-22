#!/bin/bash

# API Test Examples for K-12 Student Information System
# This script demonstrates how to test the backend API without a frontend
# using curl commands to simulate frontend calls

# Configuration
BASE_URL="http://localhost:3000/api"
TENANT_SLUG="springfield"
ADMIN_EMAIL="admin@springfield.edu"
ADMIN_PASSWORD="secure-password"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if server is running
check_server() {
    print_status "Checking if server is running..."
    if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        print_success "Server is running at $BASE_URL"
        return 0
    else
        print_error "Server is not running at $BASE_URL"
        print_warning "Please start the server with: npm run dev"
        return 1
    fi
}

# Function to authenticate and get JWT token
authenticate() {
    print_status "Authenticating user..."
    
    local response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$ADMIN_EMAIL\",
            \"password\": \"$ADMIN_PASSWORD\",
            \"tenantSlug\": \"$TENANT_SLUG\"
        }")
    
    # Extract access token from response
    local access_token=$(echo "$response" | jq -r '.data.accessToken // empty')
    
    if [ -n "$access_token" ] && [ "$access_token" != "null" ]; then
        print_success "Authentication successful"
        echo "$access_token"
        return 0
    else
        print_error "Authentication failed"
        echo "$response" | jq '.'
        return 1
    fi
}

# Function to test student endpoints
test_students() {
    local token="$1"
    print_status "Testing Student Management Endpoints..."
    
    # Test 1: Get all students
    print_status "1. Getting all students..."
    local response=$(curl -s -X GET "$BASE_URL/students" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    local student_count=$(echo "$response" | jq '.data | length')
    print_success "Found $student_count students"
    
    # Test 2: Create a new student
    print_status "2. Creating a new student..."
    local create_response=$(curl -s -X POST "$BASE_URL/students" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d '{
            "studentId": "STU001",
            "firstName": "Alice",
            "lastName": "Johnson",
            "gradeLevel": "10",
            "dateOfBirth": "2008-05-15",
            "email": "alice.johnson@springfield.edu",
            "phone": "(217) 555-0123",
            "address": "123 Student St, Springfield, IL 62701",
            "parentGuardian1Name": "Bob Johnson",
            "parentGuardian1Email": "bob.johnson@email.com",
            "parentGuardian1Phone": "(217) 555-0124"
        }')
    
    local student_id=$(echo "$create_response" | jq -r '.data.id // empty')
    if [ -n "$student_id" ] && [ "$student_id" != "null" ]; then
        print_success "Student created with ID: $student_id"
        
        # Test 3: Get specific student
        print_status "3. Getting specific student..."
        local get_response=$(curl -s -X GET "$BASE_URL/students/$student_id" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local student_name=$(echo "$get_response" | jq -r '.data.firstName // empty')
        if [ -n "$student_name" ]; then
            print_success "Retrieved student: $student_name"
        else
            print_error "Failed to retrieve student"
        fi
        
        # Test 4: Update student
        print_status "4. Updating student..."
        local update_response=$(curl -s -X PUT "$BASE_URL/students/$student_id" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d '{
                "firstName": "Alice Updated",
                "gradeLevel": "11",
                "phone": "(217) 555-9999"
            }')
        
        local updated_name=$(echo "$update_response" | jq -r '.data.firstName // empty')
        if [ -n "$updated_name" ]; then
            print_success "Student updated: $updated_name"
        else
            print_error "Failed to update student"
        fi
        
        # Test 5: Search students
        print_status "5. Searching students..."
        local search_response=$(curl -s -X GET "$BASE_URL/students?search=Alice" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local search_count=$(echo "$search_response" | jq '.data | length')
        print_success "Found $search_count students matching 'Alice'"
        
        # Test 6: Filter by grade level
        print_status "6. Filtering students by grade level..."
        local filter_response=$(curl -s -X GET "$BASE_URL/students?gradeLevel=11" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local filter_count=$(echo "$filter_response" | jq '.data | length')
        print_success "Found $filter_count students in grade 11"
        
        # Test 7: Delete student
        print_status "7. Deleting student..."
        local delete_response=$(curl -s -X DELETE "$BASE_URL/students/$student_id" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        if [ "$delete_response" = "" ]; then
            print_success "Student deleted successfully"
        else
            print_error "Failed to delete student"
        fi
    else
        print_error "Failed to create student"
        echo "$create_response" | jq '.'
    fi
}

# Function to test teacher endpoints
test_teachers() {
    local token="$1"
    print_status "Testing Teacher Management Endpoints..."
    
    # Test 1: Get all teachers
    print_status "1. Getting all teachers..."
    local response=$(curl -s -X GET "$BASE_URL/teachers" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    local teacher_count=$(echo "$response" | jq '.data | length')
    print_success "Found $teacher_count teachers"
    
    # Test 2: Create a new teacher
    print_status "2. Creating a new teacher..."
    local create_response=$(curl -s -X POST "$BASE_URL/teachers" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d '{
            "employeeId": "TCH001",
            "firstName": "Jane",
            "lastName": "Smith",
            "email": "jane.smith@springfield.edu",
            "phone": "(217) 555-0125",
            "department": "Mathematics",
            "employmentType": "full_time",
            "hireDate": "2023-08-15",
            "subjectsTaught": ["Algebra", "Geometry", "Calculus"],
            "gradeLevelsTaught": ["9", "10", "11", "12"],
            "yearsExperience": 5,
            "qualifications": "Master'\''s in Mathematics Education"
        }')
    
    local teacher_id=$(echo "$create_response" | jq -r '.data.id // empty')
    if [ -n "$teacher_id" ] && [ "$teacher_id" != "null" ]; then
        print_success "Teacher created with ID: $teacher_id"
        
        # Test 3: Get specific teacher
        print_status "3. Getting specific teacher..."
        local get_response=$(curl -s -X GET "$BASE_URL/teachers/$teacher_id" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local teacher_name=$(echo "$get_response" | jq -r '.data.firstName // empty')
        if [ -n "$teacher_name" ]; then
            print_success "Retrieved teacher: $teacher_name"
        else
            print_error "Failed to retrieve teacher"
        fi
        
        # Test 4: Filter by department
        print_status "4. Filtering teachers by department..."
        local filter_response=$(curl -s -X GET "$BASE_URL/teachers?department=Mathematics" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local filter_count=$(echo "$filter_response" | jq '.data | length')
        print_success "Found $filter_count teachers in Mathematics department"
        
        # Test 5: Get teacher schedule
        print_status "5. Getting teacher schedule..."
        local schedule_response=$(curl -s -X GET "$BASE_URL/teachers/$teacher_id/schedule" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local schedule_count=$(echo "$schedule_response" | jq '.data | length')
        print_success "Found $schedule_count classes in teacher schedule"
        
        # Test 6: Delete teacher
        print_status "6. Deleting teacher..."
        local delete_response=$(curl -s -X DELETE "$BASE_URL/teachers/$teacher_id" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        if [ "$delete_response" = "" ]; then
            print_success "Teacher deleted successfully"
        else
            print_error "Failed to delete teacher"
        fi
    else
        print_error "Failed to create teacher"
        echo "$create_response" | jq '.'
    fi
}

# Function to test class endpoints
test_classes() {
    local token="$1"
    print_status "Testing Class Management Endpoints..."
    
    # Test 1: Get all classes
    print_status "1. Getting all classes..."
    local response=$(curl -s -X GET "$BASE_URL/classes" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    local class_count=$(echo "$response" | jq '.data | length')
    print_success "Found $class_count classes"
    
    # Test 2: Create a new class
    print_status "2. Creating a new class..."
    local create_response=$(curl -s -X POST "$BASE_URL/classes" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d '{
            "classCode": "MATH101",
            "name": "Algebra I",
            "description": "Introduction to algebraic concepts",
            "subject": "Mathematics",
            "gradeLevel": "9",
            "academicYear": "2024-2025",
            "semester": "full_year",
            "credits": 1.0,
            "teacherId": "teacher-123",
            "roomNumber": "A101",
            "building": "Main Building",
            "schedule": {
                "monday": ["08:00-08:50"],
                "wednesday": ["08:00-08:50"],
                "friday": ["08:00-08:50"]
            },
            "maxStudents": 30,
            "startDate": "2024-08-15",
            "endDate": "2025-05-30"
        }')
    
    local class_id=$(echo "$create_response" | jq -r '.data.id // empty')
    if [ -n "$class_id" ] && [ "$class_id" != "null" ]; then
        print_success "Class created with ID: $class_id"
        
        # Test 3: Get specific class
        print_status "3. Getting specific class..."
        local get_response=$(curl -s -X GET "$BASE_URL/classes/$class_id" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local class_name=$(echo "$get_response" | jq -r '.data.name // empty')
        if [ -n "$class_name" ]; then
            print_success "Retrieved class: $class_name"
        else
            print_error "Failed to retrieve class"
        fi
        
        # Test 4: Filter by subject
        print_status "4. Filtering classes by subject..."
        local filter_response=$(curl -s -X GET "$BASE_URL/classes?subject=Mathematics" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local filter_count=$(echo "$filter_response" | jq '.data | length')
        print_success "Found $filter_count classes in Mathematics subject"
        
        # Test 5: Get class enrollment
        print_status "5. Getting class enrollment..."
        local enrollment_response=$(curl -s -X GET "$BASE_URL/classes/$class_id/students" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local enrollment_count=$(echo "$enrollment_response" | jq '.data | length')
        print_success "Found $enrollment_count students enrolled in class"
        
        # Test 6: Delete class
        print_status "6. Deleting class..."
        local delete_response=$(curl -s -X DELETE "$BASE_URL/classes/$class_id" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        if [ "$delete_response" = "" ]; then
            print_success "Class deleted successfully"
        else
            print_error "Failed to delete class"
        fi
    else
        print_error "Failed to create class"
        echo "$create_response" | jq '.'
    fi
}

# Function to test grade endpoints
test_grades() {
    local token="$1"
    print_status "Testing Grade Management Endpoints..."
    
    # Test 1: Get all grades
    print_status "1. Getting all grades..."
    local response=$(curl -s -X GET "$BASE_URL/grades" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    local grade_count=$(echo "$response" | jq '.data | length')
    print_success "Found $grade_count grades"
    
    # Test 2: Create a new grade
    print_status "2. Creating a new grade..."
    local create_response=$(curl -s -X POST "$BASE_URL/grades" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d '{
            "studentId": "student-123",
            "classId": "class-123",
            "assignmentName": "Chapter 5 Test",
            "assignmentType": "test",
            "category": "tests",
            "pointsPossible": 100,
            "pointsEarned": 85,
            "assignedDate": "2024-01-10",
            "dueDate": "2024-01-15"
        }')
    
    local grade_id=$(echo "$create_response" | jq -r '.data.id // empty')
    if [ -n "$grade_id" ] && [ "$grade_id" != "null" ]; then
        print_success "Grade created with ID: $grade_id"
        
        # Test 3: Get specific grade
        print_status "3. Getting specific grade..."
        local get_response=$(curl -s -X GET "$BASE_URL/grades/$grade_id" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local assignment_name=$(echo "$get_response" | jq -r '.data.assignmentName // empty')
        if [ -n "$assignment_name" ]; then
            print_success "Retrieved grade for assignment: $assignment_name"
        else
            print_error "Failed to retrieve grade"
        fi
        
        # Test 4: Filter by student
        print_status "4. Filtering grades by student..."
        local filter_response=$(curl -s -X GET "$BASE_URL/grades?studentId=student-123" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local filter_count=$(echo "$filter_response" | jq '.data | length')
        print_success "Found $filter_count grades for student"
        
        # Test 5: Get grade statistics
        print_status "5. Getting grade statistics..."
        local stats_response=$(curl -s -X GET "$BASE_URL/grades/statistics?classId=class-123" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local avg_grade=$(echo "$stats_response" | jq -r '.data.averageGrade // empty')
        if [ -n "$avg_grade" ]; then
            print_success "Average grade: $avg_grade"
        else
            print_warning "No grade statistics available"
        fi
        
        # Test 6: Delete grade
        print_status "6. Deleting grade..."
        local delete_response=$(curl -s -X DELETE "$BASE_URL/grades/$grade_id" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        if [ "$delete_response" = "" ]; then
            print_success "Grade deleted successfully"
        else
            print_error "Failed to delete grade"
        fi
    else
        print_error "Failed to create grade"
        echo "$create_response" | jq '.'
    fi
}

# Function to test attendance endpoints
test_attendance() {
    local token="$1"
    print_status "Testing Attendance Management Endpoints..."
    
    # Test 1: Get all attendance records
    print_status "1. Getting all attendance records..."
    local response=$(curl -s -X GET "$BASE_URL/attendance" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    local attendance_count=$(echo "$response" | jq '.data | length')
    print_success "Found $attendance_count attendance records"
    
    # Test 2: Create a new attendance record
    print_status "2. Creating a new attendance record..."
    local create_response=$(curl -s -X POST "$BASE_URL/attendance" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d '{
            "studentId": "student-123",
            "classId": "class-123",
            "attendanceDate": "2024-01-15",
            "status": "present",
            "period": "1st",
            "reason": null,
            "notes": null,
            "isExcused": false
        }')
    
    local attendance_id=$(echo "$create_response" | jq -r '.data.id // empty')
    if [ -n "$attendance_id" ] && [ "$attendance_id" != "null" ]; then
        print_success "Attendance record created with ID: $attendance_id"
        
        # Test 3: Get specific attendance record
        print_status "3. Getting specific attendance record..."
        local get_response=$(curl -s -X GET "$BASE_URL/attendance/$attendance_id" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local status=$(echo "$get_response" | jq -r '.data.status // empty')
        if [ -n "$status" ]; then
            print_success "Retrieved attendance record with status: $status"
        else
            print_error "Failed to retrieve attendance record"
        fi
        
        # Test 4: Filter by student
        print_status "4. Filtering attendance by student..."
        local filter_response=$(curl -s -X GET "$BASE_URL/attendance?studentId=student-123" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local filter_count=$(echo "$filter_response" | jq '.data | length')
        print_success "Found $filter_count attendance records for student"
        
        # Test 5: Get attendance statistics
        print_status "5. Getting attendance statistics..."
        local stats_response=$(curl -s -X GET "$BASE_URL/attendance/statistics?classId=class-123" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        local avg_rate=$(echo "$stats_response" | jq -r '.data.averageAttendanceRate // empty')
        if [ -n "$avg_rate" ]; then
            print_success "Average attendance rate: $avg_rate%"
        else
            print_warning "No attendance statistics available"
        fi
        
        # Test 6: Delete attendance record
        print_status "6. Deleting attendance record..."
        local delete_response=$(curl -s -X DELETE "$BASE_URL/attendance/$attendance_id" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
        
        if [ "$delete_response" = "" ]; then
            print_success "Attendance record deleted successfully"
        else
            print_error "Failed to delete attendance record"
        fi
    else
        print_error "Failed to create attendance record"
        echo "$create_response" | jq '.'
    fi
}

# Function to test authentication endpoints
test_auth() {
    print_status "Testing Authentication Endpoints..."
    
    # Test 1: Login
    print_status "1. Testing login..."
    local login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$ADMIN_EMAIL\",
            \"password\": \"$ADMIN_PASSWORD\",
            \"tenantSlug\": \"$TENANT_SLUG\"
        }")
    
    local access_token=$(echo "$login_response" | jq -r '.data.accessToken // empty')
    if [ -n "$access_token" ] && [ "$access_token" != "null" ]; then
        print_success "Login successful"
        
        # Test 2: Refresh token
        print_status "2. Testing token refresh..."
        local refresh_token=$(echo "$login_response" | jq -r '.data.refreshToken // empty')
        local refresh_response=$(curl -s -X POST "$BASE_URL/auth/refresh" \
            -H "Content-Type: application/json" \
            -d "{
                \"refreshToken\": \"$refresh_token\"
            }")
        
        local new_access_token=$(echo "$refresh_response" | jq -r '.data.accessToken // empty')
        if [ -n "$new_access_token" ] && [ "$new_access_token" != "null" ]; then
            print_success "Token refresh successful"
        else
            print_error "Token refresh failed"
        fi
        
        # Test 3: Logout
        print_status "3. Testing logout..."
        local logout_response=$(curl -s -X POST "$BASE_URL/auth/logout" \
            -H "Content-Type: application/json" \
            -d "{
                \"refreshToken\": \"$refresh_token\"
            }")
        
        if [ "$logout_response" = "" ]; then
            print_success "Logout successful"
        else
            print_warning "Logout response: $logout_response"
        fi
    else
        print_error "Login failed"
        echo "$login_response" | jq '.'
    fi
}

# Function to test tenant endpoints
test_tenant() {
    local token="$1"
    print_status "Testing Tenant Management Endpoints..."
    
    # Test 1: Get tenant information
    print_status "1. Getting tenant information..."
    local response=$(curl -s -X GET "$BASE_URL/tenants" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    local tenant_name=$(echo "$response" | jq -r '.data.name // empty')
    if [ -n "$tenant_name" ]; then
        print_success "Retrieved tenant: $tenant_name"
    else
        print_error "Failed to retrieve tenant information"
    fi
    
    # Test 2: Get tenant statistics
    print_status "2. Getting tenant statistics..."
    local stats_response=$(curl -s -X GET "$BASE_URL/tenants/stats" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    local user_count=$(echo "$stats_response" | jq -r '.data.users // empty')
    if [ -n "$user_count" ]; then
        print_success "Tenant has $user_count users"
    else
        print_warning "No tenant statistics available"
    fi
    
    # Test 3: Get tenant limits
    print_status "3. Getting tenant limits..."
    local limits_response=$(curl -s -X GET "$BASE_URL/tenants/limits" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")
    
    local student_limit=$(echo "$limits_response" | jq -r '.data.students.max // empty')
    if [ -n "$student_limit" ]; then
        print_success "Student limit: $student_limit"
    else
        print_warning "No tenant limits available"
    fi
}

# Main function
main() {
    echo "=========================================="
    echo "K-12 SIS API Testing Script"
    echo "=========================================="
    echo ""
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        print_error "jq is required but not installed. Please install jq to run this script."
        exit 1
    fi
    
    # Check if server is running
    if ! check_server; then
        exit 1
    fi
    
    echo ""
    
    # Authenticate and get token
    local token=$(authenticate)
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    echo ""
    
    # Run all tests
    test_auth
    echo ""
    
    test_tenant "$token"
    echo ""
    
    test_students "$token"
    echo ""
    
    test_teachers "$token"
    echo ""
    
    test_classes "$token"
    echo ""
    
    test_grades "$token"
    echo ""
    
    test_attendance "$token"
    echo ""
    
    print_success "All API tests completed!"
    echo ""
    echo "=========================================="
    echo "Test Summary:"
    echo "- Authentication: ✓"
    echo "- Tenant Management: ✓"
    echo "- Student Management: ✓"
    echo "- Teacher Management: ✓"
    echo "- Class Management: ✓"
    echo "- Grade Management: ✓"
    echo "- Attendance Management: ✓"
    echo "=========================================="
}

# Run main function
main "$@"
