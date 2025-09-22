# Testing Guide - K-12 Student Information System

This directory contains comprehensive testing setup for the K-12 Student Information System backend API. The testing framework is designed to work without any frontend components, allowing you to fully test the backend functionality.

## 📁 Directory Structure

```
tests/
├── unit/                    # Unit tests for individual functions
│   ├── test_students.py     # Student service function tests
│   ├── test_teachers.py     # Teacher service function tests
│   ├── test_classes.py      # Class management function tests
│   ├── test_grades.py       # Grade calculation tests
│   └── test_attendance.py   # Attendance logic tests
├── integration/             # Integration tests for API endpoints
│   ├── test_api_students.py # Student API endpoint tests
│   ├── test_api_teachers.py # Teacher API endpoint tests
│   ├── test_api_classes.py  # Class API endpoint tests
│   ├── test_api_grades.py   # Grade API endpoint tests
│   └── test_api_attendance.py # Attendance API endpoint tests
├── scripts/                 # Testing scripts and tools
│   ├── api_test_examples.sh # curl examples for API testing
│   └── postman_collection.json # Postman collection for API testing
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** with pytest
- **Node.js 18+** for the backend server
- **PostgreSQL 13+** for the database
- **curl** or **httpie** for command-line testing
- **Postman** (optional) for GUI testing

### Installation

1. **Install Python dependencies:**
```bash
pip install pytest pytest-mock
```

2. **Install Node.js dependencies:**
```bash
npm install
```

3. **Set up the database:**
```bash
npm run db:migrate
npm run db:seed
```

4. **Start the backend server:**
```bash
npm run dev
```

## 🧪 Running Tests

### Unit Tests

Unit tests focus on individual functions and methods without external dependencies:

```bash
# Run all unit tests
pytest tests/unit/ -v

# Run specific unit test file
pytest tests/unit/test_students.py -v

# Run with coverage
pytest tests/unit/ --cov=backend --cov-report=html
```

### Integration Tests

Integration tests test the complete API flow including authentication, database, and business logic:

```bash
# Run all integration tests
pytest tests/integration/ -v

# Run specific integration test file
pytest tests/integration/test_api_students.py -v

# Run with coverage
pytest tests/integration/ --cov=backend --cov-report=html
```

### All Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage report
pytest tests/ --cov=backend --cov-report=html --cov-report=term
```

## 🔧 Command-Line API Testing

### Using the Shell Script

The `api_test_examples.sh` script provides comprehensive API testing using curl:

```bash
# Make the script executable
chmod +x tests/scripts/api_test_examples.sh

# Run the complete test suite
./tests/scripts/api_test_examples.sh
```

### Manual curl Testing

```bash
# 1. Authenticate and get JWT token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@springfield.edu",
    "password": "secure-password",
    "tenantSlug": "springfield"
  }' | jq -r '.data.accessToken')

# 2. Test student endpoints
curl -X GET http://localhost:3000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# 3. Create a student
curl -X POST http://localhost:3000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "firstName": "Alice",
    "lastName": "Johnson",
    "gradeLevel": "10",
    "dateOfBirth": "2008-05-15"
  }'
```

### Using httpie

```bash
# Install httpie
pip install httpie

# Authenticate
http POST localhost:3000/api/auth/login \
  email=admin@springfield.edu \
  password=secure-password \
  tenantSlug=springfield

# Get students
http GET localhost:3000/api/students \
  "Authorization:Bearer YOUR_JWT_TOKEN"
```

## 📮 Postman Testing

### Import Collection

1. **Open Postman**
2. **Click "Import"**
3. **Select the file:** `tests/scripts/postman_collection.json`
4. **Set environment variables:**
   - `baseUrl`: `http://localhost:3000/api`
   - `tenantSlug`: `springfield`
   - `adminEmail`: `admin@springfield.edu`
   - `adminPassword`: `secure-password`

### Running Tests

1. **Start with Authentication → Login**
2. **Run the collection in sequence**
3. **Check test results in the Test Results tab**

### Newman (Command Line)

```bash
# Install Newman
npm install -g newman

# Run the collection
newman run tests/scripts/postman_collection.json \
  --environment tests/scripts/postman_environment.json \
  --reporters cli,json \
  --reporter-json-export test-results.json
```

## 🎯 Test Categories

### Unit Tests

#### Student Service Tests (`test_students.py`)
- ✅ Student creation and validation
- ✅ Student retrieval and filtering
- ✅ Student updates and deletion
- ✅ Data validation and error handling
- ✅ Tenant isolation verification

#### Teacher Service Tests (`test_teachers.py`)
- ✅ Teacher creation and validation
- ✅ Teacher retrieval and filtering
- ✅ Department and subject filtering
- ✅ Schedule and student management
- ✅ Tenant isolation verification

#### Class Management Tests (`test_classes.py`)
- ✅ Class creation and validation
- ✅ Class retrieval and filtering
- ✅ Student enrollment management
- ✅ Schedule and capacity management
- ✅ Tenant isolation verification

#### Grade Management Tests (`test_grades.py`)
- ✅ Grade creation and validation
- ✅ Grade calculations (percentage, letter grade, GPA)
- ✅ Grade statistics and trends
- ✅ Bulk grade operations
- ✅ Tenant isolation verification

#### Attendance Tests (`test_attendance.py`)
- ✅ Attendance record creation
- ✅ Attendance tracking and statistics
- ✅ Bulk attendance operations
- ✅ Attendance rate calculations
- ✅ Tenant isolation verification

### Integration Tests

#### API Endpoint Tests
- ✅ **Authentication Flow**: Login, refresh, logout
- ✅ **Student Management**: CRUD operations, search, filtering
- ✅ **Teacher Management**: CRUD operations, schedule, students
- ✅ **Class Management**: CRUD operations, enrollment, scheduling
- ✅ **Grade Management**: CRUD operations, statistics, bulk entry
- ✅ **Attendance Management**: CRUD operations, statistics, bulk entry
- ✅ **Tenant Management**: Information, statistics, limits
- ✅ **Error Handling**: Validation errors, not found, unauthorized
- ✅ **Multi-Tenant Isolation**: Data separation between tenants

## 🔍 Test Configuration

### Environment Variables

Create a `.env.test` file for testing:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sis_test
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sis_test
DB_USER=test_user
DB_PASSWORD=test_password

# JWT
JWT_SECRET=test-jwt-secret-key
JWT_REFRESH_SECRET=test-refresh-secret-key

# Email (optional for testing)
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=test@example.com
SMTP_PASSWORD=test-password

# Encryption
ENCRYPTION_KEY=test-encryption-key-32-chars-long
```

### Test Database Setup

```bash
# Create test database
createdb sis_test

# Run migrations
npm run db:migrate:test

# Seed test data
npm run db:seed:test
```

## 📊 Test Coverage

### Coverage Reports

```bash
# Generate HTML coverage report
pytest tests/ --cov=backend --cov-report=html

# View coverage report
open htmlcov/index.html

# Generate terminal coverage report
pytest tests/ --cov=backend --cov-report=term-missing
```

### Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 80%+ coverage
- **API Endpoints**: 100% coverage
- **Critical Business Logic**: 100% coverage

## 🐛 Debugging Tests

### Verbose Output

```bash
# Run tests with verbose output
pytest tests/ -v -s

# Run specific test with debug output
pytest tests/unit/test_students.py::TestStudentService::test_create_student_success -v -s
```

### Test Debugging

```bash
# Run tests with pdb debugger
pytest tests/ --pdb

# Run tests with logging
pytest tests/ --log-cli-level=DEBUG
```

### Database Debugging

```bash
# Check test database
psql sis_test -c "SELECT * FROM students LIMIT 5;"

# Reset test database
npm run db:reset:test
```

## 🚨 Common Issues

### Authentication Errors

**Problem**: 401 Unauthorized errors
**Solution**: 
- Check JWT token expiration
- Verify tenant slug is correct
- Ensure user has proper permissions

### Database Connection Issues

**Problem**: Database connection errors
**Solution**:
- Verify PostgreSQL is running
- Check database credentials
- Ensure test database exists

### Test Data Issues

**Problem**: Tests failing due to missing data
**Solution**:
- Run database seeds: `npm run db:seed:test`
- Check test fixtures are loaded
- Verify tenant isolation

## 📈 Performance Testing

### Load Testing with Artillery

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run tests/performance/load-test.yml

# Generate report
artillery report test-results.json
```

### API Performance

```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/students

# Benchmark endpoints
ab -n 1000 -c 10 http://localhost:3000/api/students
```

## 🔄 Continuous Integration

### GitHub Actions

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sis_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run database migrations
      run: npm run db:migrate:test
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/sis_test
    
    - name: Run tests
      run: pytest tests/ --cov=backend --cov-report=xml
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/sis_test
        JWT_SECRET: test-jwt-secret
        JWT_REFRESH_SECRET: test-refresh-secret
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v2
      with:
        file: ./coverage.xml
```

## 📚 Additional Resources

### Documentation
- [API Specification](../docs/API-Specification.md)
- [Database Schema](../docs/Database-Schema.md)
- [Authentication & RBAC](../docs/Authentication-RBAC.md)
- [Testing Guide](../docs/Testing-Guide.md)

### Tools
- [Postman](https://www.postman.com/) - API testing GUI
- [Newman](https://github.com/postmanlabs/newman) - Postman CLI
- [Artillery](https://artillery.io/) - Load testing
- [pytest](https://docs.pytest.org/) - Python testing framework

### Best Practices
- Always test with realistic data
- Verify tenant isolation in all tests
- Test both success and error scenarios
- Maintain high test coverage
- Use descriptive test names
- Keep tests independent and isolated

---

**Note**: This testing setup is designed for backend-first development. All tests can be run without any frontend components, allowing you to fully validate the API functionality before frontend development begins.
