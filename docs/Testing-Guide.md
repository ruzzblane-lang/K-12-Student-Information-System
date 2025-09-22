# Testing Guide - Backend API Without Frontend

## Overview

This guide provides comprehensive testing strategies for the K-12 Student Information System backend API. Since this is a backend-first project, all testing can be performed without any frontend components using various tools and methodologies.

## Testing Philosophy

### Backend-First Testing Approach

1. **API-Centric Testing**: Focus on API endpoints and business logic
2. **Multi-Tenant Testing**: Ensure complete tenant isolation
3. **Security Testing**: Validate authentication and authorization
4. **Performance Testing**: Test scalability and response times
5. **Integration Testing**: Test database and external service integration

### Testing Pyramid

```
                    E2E Tests (API)
                   /               \
              Integration Tests
             /                     \
        Unit Tests (Services/Models)
       /                               \
  Component Tests (Controllers/Middleware)
```

## Testing Tools and Frameworks

### Core Testing Stack

- **Jest**: JavaScript testing framework
- **Supertest**: HTTP assertion library for API testing
- **Postman/Newman**: API testing and collection runner
- **curl/httpie**: Command-line API testing
- **Artillery**: Load testing and performance testing

### Development Dependencies

```json
{
  "devDependencies": {
    "jest": "^29.0.0",
    "supertest": "^6.3.0",
    "newman": "^6.0.0",
    "artillery": "^2.0.0",
    "httpie": "^1.1.0",
    "@types/jest": "^29.0.0",
    "jest-environment-node": "^29.0.0"
  }
}
```

## Test Structure

### Directory Organization

```
backend/tests/
├── unit/                    # Unit tests for individual functions
│   ├── services/           # Service layer tests
│   ├── models/             # Model tests
│   ├── utils/              # Utility function tests
│   └── middleware/         # Middleware tests
├── integration/            # Integration tests
│   ├── database/           # Database integration tests
│   ├── auth/               # Authentication integration tests
│   └── tenant/             # Multi-tenant integration tests
├── api/                    # API endpoint tests
│   ├── auth.test.js        # Authentication endpoints
│   ├── students.test.js    # Student management endpoints
│   ├── teachers.test.js    # Teacher management endpoints
│   ├── grades.test.js      # Grade management endpoints
│   └── attendance.test.js  # Attendance endpoints
├── fixtures/               # Test data fixtures
│   ├── users.json          # Sample user data
│   ├── students.json       # Sample student data
│   └── tenants.json        # Sample tenant data
├── helpers/                # Test helper functions
│   ├── auth.js             # Authentication helpers
│   ├── database.js         # Database helpers
│   └── fixtures.js         # Fixture helpers
└── performance/            # Performance tests
    ├── load.test.js        # Load testing
    └── stress.test.js      # Stress testing
```

## Unit Testing

### Service Layer Tests

```javascript
// tests/unit/services/studentService.test.js
const StudentService = require('../../../services/studentService');
const Student = require('../../../models/Student');
const { mockTenant } = require('../../helpers/fixtures');

describe('StudentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStudent', () => {
    test('should create student with valid data', async () => {
      const studentData = {
        tenantId: mockTenant.id,
        studentId: 'STU001',
        firstName: 'Alice',
        lastName: 'Johnson',
        gradeLevel: '10',
        dateOfBirth: '2008-05-15'
      };

      const mockStudent = { id: 'student-uuid', ...studentData };
      Student.create = jest.fn().mockResolvedValue(mockStudent);

      const result = await StudentService.createStudent(studentData);

      expect(Student.create).toHaveBeenCalledWith(studentData);
      expect(result).toEqual(mockStudent);
    });

    test('should throw error for duplicate student ID', async () => {
      const studentData = {
        tenantId: mockTenant.id,
        studentId: 'STU001',
        firstName: 'Alice',
        lastName: 'Johnson',
        gradeLevel: '10'
      };

      Student.create = jest.fn().mockRejectedValue(
        new Error('Duplicate student ID')
      );

      await expect(StudentService.createStudent(studentData))
        .rejects.toThrow('Duplicate student ID');
    });
  });

  describe('getStudentsByTenant', () => {
    test('should return students for specific tenant', async () => {
      const mockStudents = [
        { id: 'student-1', tenantId: mockTenant.id, firstName: 'Alice' },
        { id: 'student-2', tenantId: mockTenant.id, firstName: 'Bob' }
      ];

      Student.findAll = jest.fn().mockResolvedValue(mockStudents);

      const result = await StudentService.getStudentsByTenant(mockTenant.id);

      expect(Student.findAll).toHaveBeenCalledWith({
        where: { tenantId: mockTenant.id }
      });
      expect(result).toEqual(mockStudents);
    });
  });
});
```

### Model Tests

```javascript
// tests/unit/models/Student.test.js
const Student = require('../../../models/Student');
const { mockTenant } = require('../../helpers/fixtures');

describe('Student Model', () => {
  describe('validation', () => {
    test('should require tenantId', async () => {
      const student = new Student({
        studentId: 'STU001',
        firstName: 'Alice',
        lastName: 'Johnson'
      });

      await expect(student.validate()).rejects.toThrow();
    });

    test('should require unique studentId per tenant', async () => {
      const student1 = new Student({
        tenantId: mockTenant.id,
        studentId: 'STU001',
        firstName: 'Alice',
        lastName: 'Johnson'
      });

      const student2 = new Student({
        tenantId: mockTenant.id,
        studentId: 'STU001', // Duplicate
        firstName: 'Bob',
        lastName: 'Smith'
      });

      await student1.save();
      await expect(student2.save()).rejects.toThrow();
    });
  });

  describe('associations', () => {
    test('should belong to tenant', () => {
      expect(Student.associations.tenant).toBeDefined();
    });

    test('should have many enrollments', () => {
      expect(Student.associations.enrollments).toBeDefined();
    });
  });
});
```

### Middleware Tests

```javascript
// tests/unit/middleware/auth.test.js
const auth = require('../../../middleware/auth');
const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn(),
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('should authenticate valid token', async () => {
    const token = jwt.sign(
      { userId: 'user-123', tenantId: 'tenant-123' },
      process.env.JWT_SECRET
    );

    req.header.mockReturnValue(`Bearer ${token}`);
    jwt.verify = jest.fn().mockReturnValue({
      userId: 'user-123',
      tenantId: 'tenant-123'
    });

    await auth(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe('user-123');
    expect(next).toHaveBeenCalled();
  });

  test('should reject invalid token', async () => {
    req.header.mockReturnValue('Bearer invalid-token');
    jwt.verify = jest.fn().mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Authentication failed'
    });
    expect(next).not.toHaveBeenCalled();
  });
});
```

## Integration Testing

### Database Integration Tests

```javascript
// tests/integration/database/student.test.js
const request = require('supertest');
const app = require('../../../app');
const { setupTestDB, cleanupTestDB } = require('../../helpers/database');
const { createTestTenant, createTestUser } = require('../../helpers/fixtures');

describe('Student Database Integration', () => {
  let testTenant;
  let testUser;
  let authToken;

  beforeAll(async () => {
    await setupTestDB();
    testTenant = await createTestTenant();
    testUser = await createTestUser(testTenant.id, 'admin');
    authToken = await getAuthToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  describe('Student CRUD Operations', () => {
    test('should create student in database', async () => {
      const studentData = {
        studentId: 'STU001',
        firstName: 'Alice',
        lastName: 'Johnson',
        gradeLevel: '10',
        dateOfBirth: '2008-05-15'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(studentData)
        .expect(201);

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.firstName).toBe('Alice');
      expect(response.body.data.tenantId).toBe(testTenant.id);
    });

    test('should retrieve student from database', async () => {
      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});
```

### Multi-Tenant Integration Tests

```javascript
// tests/integration/tenant/isolation.test.js
const request = require('supertest');
const app = require('../../../app');
const { setupTestDB, cleanupTestDB } = require('../../helpers/database');
const { createTestTenant, createTestUser } = require('../../helpers/fixtures');

describe('Tenant Isolation', () => {
  let tenant1, tenant2;
  let user1, user2;
  let token1, token2;

  beforeAll(async () => {
    await setupTestDB();
    
    // Create two separate tenants
    tenant1 = await createTestTenant({ name: 'School A', slug: 'school-a' });
    tenant2 = await createTestTenant({ name: 'School B', slug: 'school-b' });
    
    // Create users for each tenant
    user1 = await createTestUser(tenant1.id, 'admin');
    user2 = await createTestUser(tenant2.id, 'admin');
    
    token1 = await getAuthToken(user1);
    token2 = await getAuthToken(user2);
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  test('should not allow cross-tenant data access', async () => {
    // Create student in tenant1
    const studentData = {
      studentId: 'STU001',
      firstName: 'Alice',
      lastName: 'Johnson',
      gradeLevel: '10'
    };

    await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token1}`)
      .send(studentData)
      .expect(201);

    // Try to access student from tenant2
    const response = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);

    // Should not see tenant1's student
    expect(response.body.data).toHaveLength(0);
  });

  test('should enforce tenant context in all operations', async () => {
    // Create student in tenant1
    const studentData = {
      studentId: 'STU002',
      firstName: 'Bob',
      lastName: 'Smith',
      gradeLevel: '11'
    };

    const createResponse = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token1}`)
      .send(studentData)
      .expect(201);

    const studentId = createResponse.body.data.id;

    // Try to access student from tenant2
    await request(app)
      .get(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(404); // Should not find student from different tenant
  });
});
```

## API Testing

### Authentication Endpoints

```javascript
// tests/api/auth.test.js
const request = require('supertest');
const app = require('../../app');
const { setupTestDB, cleanupTestDB } = require('../helpers/database');
const { createTestTenant, createTestUser } = require('../helpers/fixtures');

describe('Authentication API', () => {
  let testTenant;
  let testUser;

  beforeAll(async () => {
    await setupTestDB();
    testTenant = await createTestTenant();
    testUser = await createTestUser(testTenant.id, 'admin');
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'test-password',
          tenantSlug: testTenant.slug
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.tenant.id).toBe(testTenant.id);
    });

    test('should reject invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrong-password',
          tenantSlug: testTenant.slug
        })
        .expect(401);
    });

    test('should reject invalid tenant', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'test-password',
          tenantSlug: 'invalid-tenant'
        })
        .expect(404);
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should refresh valid token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'test-password',
          tenantSlug: testTenant.slug
        });

      const refreshToken = loginResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });
  });
});
```

### Student Management Endpoints

```javascript
// tests/api/students.test.js
const request = require('supertest');
const app = require('../../app');
const { setupTestDB, cleanupTestDB } = require('../helpers/database');
const { createTestTenant, createTestUser } = require('../helpers/fixtures');

describe('Students API', () => {
  let testTenant;
  let testUser;
  let authToken;

  beforeAll(async () => {
    await setupTestDB();
    testTenant = await createTestTenant();
    testUser = await createTestUser(testTenant.id, 'admin');
    authToken = await getAuthToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  describe('GET /api/students', () => {
    test('should return students for authenticated user', async () => {
      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta.tenant.id).toBe(testTenant.id);
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/students?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.limit).toBe(10);
    });

    test('should support filtering by grade level', async () => {
      const response = await request(app)
        .get('/api/students?gradeLevel=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach(student => {
        expect(student.gradeLevel).toBe('10');
      });
    });
  });

  describe('POST /api/students', () => {
    test('should create student with valid data', async () => {
      const studentData = {
        studentId: 'STU001',
        firstName: 'Alice',
        lastName: 'Johnson',
        gradeLevel: '10',
        dateOfBirth: '2008-05-15',
        email: 'alice.johnson@school.edu'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(studentData)
        .expect(201);

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.firstName).toBe('Alice');
      expect(response.body.data.tenantId).toBe(testTenant.id);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        firstName: 'Alice'
        // Missing required fields
      };

      await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(422);
    });
  });

  describe('PUT /api/students/:id', () => {
    test('should update student with valid data', async () => {
      // First create a student
      const studentData = {
        studentId: 'STU002',
        firstName: 'Bob',
        lastName: 'Smith',
        gradeLevel: '11',
        dateOfBirth: '2007-03-20'
      };

      const createResponse = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(studentData);

      const studentId = createResponse.body.data.id;

      // Update the student
      const updateData = {
        firstName: 'Robert',
        gradeLevel: '12'
      };

      const response = await request(app)
        .put(`/api/students/${studentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.firstName).toBe('Robert');
      expect(response.body.data.gradeLevel).toBe('12');
    });
  });
});
```

## Command-Line Testing

### Using curl

```bash
#!/bin/bash
# tests/scripts/test-api.sh

BASE_URL="http://localhost:3000/api"
TENANT_SLUG="springfield"
ADMIN_EMAIL="admin@springfield.edu"
ADMIN_PASSWORD="secure-password"

echo "Testing K-12 SIS API..."

# Test 1: Login
echo "1. Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"tenantSlug\": \"$TENANT_SLUG\"
  }")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

if [ "$ACCESS_TOKEN" = "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"

# Test 2: Get students
echo "2. Testing get students..."
STUDENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/students" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

STUDENT_COUNT=$(echo $STUDENTS_RESPONSE | jq '.data | length')
echo "✅ Found $STUDENT_COUNT students"

# Test 3: Create student
echo "3. Testing create student..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/students" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "firstName": "Alice",
    "lastName": "Johnson",
    "gradeLevel": "10",
    "dateOfBirth": "2008-05-15"
  }')

STUDENT_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')

if [ "$STUDENT_ID" = "null" ]; then
  echo "❌ Student creation failed"
  exit 1
fi

echo "✅ Student created with ID: $STUDENT_ID"

# Test 4: Get specific student
echo "4. Testing get specific student..."
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/students/$STUDENT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

STUDENT_NAME=$(echo $GET_RESPONSE | jq -r '.data.firstName')

if [ "$STUDENT_NAME" = "Alice" ]; then
  echo "✅ Student retrieved successfully"
else
  echo "❌ Student retrieval failed"
  exit 1
fi

echo "🎉 All API tests passed!"
```

### Using httpie

```bash
# tests/scripts/test-api-httpie.sh

#!/bin/bash
BASE_URL="http://localhost:3000/api"
TENANT_SLUG="springfield"
ADMIN_EMAIL="admin@springfield.edu"
ADMIN_PASSWORD="secure-password"

echo "Testing K-12 SIS API with httpie..."

# Test 1: Login
echo "1. Testing login..."
LOGIN_RESPONSE=$(http POST "$BASE_URL/auth/login" \
  email="$ADMIN_EMAIL" \
  password="$ADMIN_PASSWORD" \
  tenantSlug="$TENANT_SLUG")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

if [ "$ACCESS_TOKEN" = "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"

# Test 2: Get students
echo "2. Testing get students..."
http GET "$BASE_URL/students" \
  "Authorization:Bearer $ACCESS_TOKEN"

# Test 3: Create student
echo "3. Testing create student..."
http POST "$BASE_URL/students" \
  "Authorization:Bearer $ACCESS_TOKEN" \
  studentId="STU001" \
  firstName="Alice" \
  lastName="Johnson" \
  gradeLevel="10" \
  dateOfBirth="2008-05-15"

echo "🎉 All API tests completed!"
```

## Postman Testing

### Postman Collection

```json
{
  "info": {
    "name": "K-12 SIS API",
    "description": "Complete API testing collection for K-12 Student Information System",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api",
      "type": "string"
    },
    {
      "key": "accessToken",
      "value": "",
      "type": "string"
    },
    {
      "key": "tenantId",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@springfield.edu\",\n  \"password\": \"secure-password\",\n  \"tenantSlug\": \"springfield\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    pm.collectionVariables.set('accessToken', response.data.accessToken);",
                  "    pm.collectionVariables.set('tenantId', response.data.tenant.id);",
                  "    pm.test('Login successful', () => {",
                  "        pm.expect(response.data.accessToken).to.exist;",
                  "        pm.expect(response.data.refreshToken).to.exist;",
                  "    });",
                  "}"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Students",
      "item": [
        {
          "name": "Get All Students",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/students",
              "host": ["{{baseUrl}}"],
              "path": ["students"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200', () => {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Response has students array', () => {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.data).to.be.an('array');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          "name": "Create Student",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"studentId\": \"STU001\",\n  \"firstName\": \"Alice\",\n  \"lastName\": \"Johnson\",\n  \"gradeLevel\": \"10\",\n  \"dateOfBirth\": \"2008-05-15\",\n  \"email\": \"alice.johnson@springfield.edu\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/students",
              "host": ["{{baseUrl}}"],
              "path": ["students"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 201', () => {",
                  "    pm.response.to.have.status(201);",
                  "});",
                  "",
                  "pm.test('Student created successfully', () => {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.data.id).to.exist;",
                  "    pm.expect(response.data.firstName).to.eql('Alice');",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

### Running Postman Tests

```bash
# Install Newman (Postman CLI)
npm install -g newman

# Run the collection
newman run tests/postman/K-12-SIS-API.postman_collection.json \
  --environment tests/postman/local-environment.json \
  --reporters cli,json \
  --reporter-json-export test-results.json

# Run with specific environment variables
newman run tests/postman/K-12-SIS-API.postman_collection.json \
  --env-var "baseUrl=http://localhost:3000/api" \
  --env-var "tenantSlug=springfield" \
  --env-var "adminEmail=admin@springfield.edu"
```

## Performance Testing

### Load Testing with Artillery

```yaml
# tests/performance/load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
  variables:
    baseUrl: "http://localhost:3000/api"
    tenantSlug: "springfield"
    adminEmail: "admin@springfield.edu"
    adminPassword: "secure-password"

scenarios:
  - name: "Authentication and Student Management"
    weight: 100
    flow:
      - post:
          url: "{{ baseUrl }}/auth/login"
          json:
            email: "{{ adminEmail }}"
            password: "{{ adminPassword }}"
            tenantSlug: "{{ tenantSlug }}"
          capture:
            - json: "$.data.accessToken"
              as: "accessToken"
      - get:
          url: "{{ baseUrl }}/students"
          headers:
            Authorization: "Bearer {{ accessToken }}"
      - post:
          url: "{{ baseUrl }}/students"
          headers:
            Authorization: "Bearer {{ accessToken }}"
          json:
            studentId: "STU{{ $randomInt(1000, 9999) }}"
            firstName: "Test{{ $randomInt(1, 1000) }}"
            lastName: "Student"
            gradeLevel: "{{ $randomInt(9, 12) }}"
            dateOfBirth: "2008-05-15"
```

### Running Performance Tests

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run tests/performance/load-test.yml

# Run with custom configuration
artillery run tests/performance/load-test.yml \
  --config tests/performance/config.yml \
  --output test-results.json

# Generate report
artillery report test-results.json
```

## Test Automation

### NPM Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:api": "jest tests/api",
    "test:auth": "jest tests/api/auth.test.js",
    "test:students": "jest tests/api/students.test.js",
    "test:teachers": "jest tests/api/teachers.test.js",
    "test:grades": "jest tests/api/grades.test.js",
    "test:attendance": "jest tests/api/attendance.test.js",
    "test:tenant": "jest tests/integration/tenant",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:curl": "bash tests/scripts/test-api.sh",
    "test:postman": "newman run tests/postman/K-12-SIS-API.postman_collection.json",
    "test:performance": "artillery run tests/performance/load-test.yml",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:api"
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Backend Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

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
      run: npm run db:migrate
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/sis_test
    
    - name: Run unit tests
      run: npm run test:unit
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/sis_test
        JWT_SECRET: test-jwt-secret
        JWT_REFRESH_SECRET: test-refresh-secret
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/sis_test
        JWT_SECRET: test-jwt-secret
        JWT_REFRESH_SECRET: test-refresh-secret
    
    - name: Run API tests
      run: npm run test:api
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/sis_test
        JWT_SECRET: test-jwt-secret
        JWT_REFRESH_SECRET: test-refresh-secret
    
    - name: Generate coverage report
      run: npm run test:coverage
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/sis_test
        JWT_SECRET: test-jwt-secret
        JWT_REFRESH_SECRET: test-refresh-secret
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v2
      with:
        file: ./coverage/lcov.info
```

## Test Data Management

### Test Fixtures

```javascript
// tests/fixtures/users.json
{
  "admin": {
    "email": "admin@springfield.edu",
    "password": "secure-password",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin"
  },
  "teacher": {
    "email": "teacher@springfield.edu",
    "password": "secure-password",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "teacher"
  },
  "student": {
    "email": "student@springfield.edu",
    "password": "secure-password",
    "firstName": "Alice",
    "lastName": "Johnson",
    "role": "student"
  }
}
```

### Test Helpers

```javascript
// tests/helpers/fixtures.js
const { createHash } = require('crypto');
const User = require('../../models/User');
const Student = require('../../models/Student');
const Tenant = require('../../models/Tenant');

const createTestTenant = async (overrides = {}) => {
  const tenantData = {
    name: 'Test School',
    slug: 'test-school',
    schoolName: 'Test School',
    schoolType: 'public',
    schoolLevel: 'high',
    subscriptionPlan: 'professional',
    ...overrides
  };
  
  return await Tenant.create(tenantData);
};

const createTestUser = async (tenantId, role = 'admin', overrides = {}) => {
  const userData = {
    tenantId,
    email: `${role}@test-school.edu`,
    passwordHash: await bcrypt.hash('test-password', 12),
    firstName: 'Test',
    lastName: 'User',
    role,
    ...overrides
  };
  
  return await User.create(userData);
};

const createTestStudent = async (tenantId, overrides = {}) => {
  const studentData = {
    tenantId,
    studentId: `STU${Date.now()}`,
    firstName: 'Test',
    lastName: 'Student',
    gradeLevel: '10',
    dateOfBirth: '2008-05-15',
    ...overrides
  };
  
  return await Student.create(studentData);
};

const getAuthToken = async (user) => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: user.email,
      password: 'test-password',
      tenantSlug: 'test-school'
    });
  
  return response.body.data.accessToken;
};

module.exports = {
  createTestTenant,
  createTestUser,
  createTestStudent,
  getAuthToken
};
```

## Best Practices

### Testing Guidelines

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clean State**: Reset database state between tests
3. **Realistic Data**: Use realistic test data that matches production scenarios
4. **Edge Cases**: Test boundary conditions and error scenarios
5. **Performance**: Monitor test execution time and optimize slow tests

### Test Organization

1. **Descriptive Names**: Use clear, descriptive test names
2. **Group Related Tests**: Use `describe` blocks to group related tests
3. **Setup and Teardown**: Use `beforeEach` and `afterEach` for test setup
4. **Mock External Dependencies**: Mock external services and APIs
5. **Test Data Factories**: Use factories for creating test data

### Continuous Testing

1. **Pre-commit Hooks**: Run tests before commits
2. **CI/CD Integration**: Run tests on every push and pull request
3. **Test Coverage**: Maintain high test coverage (aim for 80%+)
4. **Performance Monitoring**: Monitor test performance and optimize
5. **Test Reports**: Generate and review test reports regularly

This comprehensive testing guide ensures that the K-12 Student Information System backend can be thoroughly tested without any frontend components, providing confidence in the API's functionality, security, and performance.
