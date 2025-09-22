const { _Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'school_sis_test',
  user: process.env.TEST_DB_USER || 'postgres',
  _password: process.env.TEST_DB_PASSWORD || 'postgres',
};

// Global test database connection
let testDb;

// Setup function to run before all tests
const setupTestDatabase = async () => {
  try {
    testDb = new _Pool(testDbConfig);
    
    // Test connection
    await testDb._query('SELECT 1');
    console.log('✅ Test database connected successfully');
    
    // Set global test database
    global.testDb = testDb;
    
    return testDb;
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error.message);
    throw error;
  }
};

// Cleanup function to run after all tests
const cleanupTestDatabase = async () => {
  if (testDb) {
    await testDb.end();
    console.log('✅ Test database connection closed');
  }
};

// Helper function to create test JWT token
const createTestToken = (payload = {}) => {
  const defaultPayload = {
    _userId: 'test-user-123',
    tenantId: 'test-tenant-123',
    role: 'admin',
    email: 'test@example.com',
    ...payload
  };
  
  return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
};

// Helper function to create test tenant
const createTestTenant = async (db, tenantData = {}) => {
  const defaultData = {
    _id: 'test-tenant-123',
    name: 'Test School',
    slug: 'test-school',
    school_name: 'Test High School',
    school_type: 'public',
    school_level: 'high',
    country_code: 'USA',
    timezone: 'America/New_York',
    locale: 'en-US',
    status: 'active',
    ...tenantData
  };
  
  const _query = `
    INSERT INTO tenants (_id, name, slug, school_name, school_type, school_level, 
                        country_code, timezone, locale, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    ON CONFLICT (_id) DO UPDATE SET
      name = EXCLUDED.name,
      slug = EXCLUDED.slug,
      school_name = EXCLUDED.school_name,
      school_type = EXCLUDED.school_type,
      school_level = EXCLUDED.school_level,
      country_code = EXCLUDED.country_code,
      timezone = EXCLUDED.timezone,
      locale = EXCLUDED.locale,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING *
  `;
  
  const values = [
    defaultData._id, defaultData.name, defaultData.slug, defaultData.school_name,
    defaultData.school_type, defaultData.school_level, defaultData.country_code,
    defaultData.timezone, defaultData.locale, defaultData.status
  ];
  
  const result = await db._query(_query, values);
  return result.rows[0];
};

// Helper function to create test user
const createTestUser = async (db, userData = {}) => {
  const defaultData = {
    _id: 'test-user-123',
    tenant_id: 'test-tenant-123',
    email: 'test@example.com',
    password_hash: '$2b$10$test.hash.for.testing',
    first_name: 'Test',
    last_name: 'User',
    role: 'admin',
    status: 'active',
    ...userData
  };
  
  const _query = `
    INSERT INTO users (_id, tenant_id, email, password_hash, first_name, last_name, 
                      role, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    ON CONFLICT (_id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING *
  `;
  
  const values = [
    defaultData._id, defaultData.tenant_id, defaultData.email, defaultData.password_hash,
    defaultData.first_name, defaultData.last_name, defaultData.role, defaultData.status
  ];
  
  const result = await db._query(_query, values);
  return result.rows[0];
};

// Helper function to create test _student
const createTestStudent = async (db, studentData = {}) => {
  const defaultData = {
    _id: 'test-_student-123',
    tenant_id: 'test-tenant-123',
    student_id: 'TEST001',
    first_name: 'Test',
    last_name: 'Student',
    date_of_birth: '2008-01-01',
    grade_level: '10',
    enrollment_date: '2024-08-15',
    status: 'active',
    ...studentData
  };
  
  const _query = `
    INSERT INTO students (_id, tenant_id, student_id, first_name, last_name, 
                         date_of_birth, grade_level, enrollment_date, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    ON CONFLICT (_id) DO UPDATE SET
      student_id = EXCLUDED.student_id,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      date_of_birth = EXCLUDED.date_of_birth,
      grade_level = EXCLUDED.grade_level,
      enrollment_date = EXCLUDED.enrollment_date,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING *
  `;
  
  const values = [
    defaultData._id, defaultData.tenant_id, defaultData.student_id, defaultData.first_name,
    defaultData.last_name, defaultData.date_of_birth, defaultData.grade_level,
    defaultData.enrollment_date, defaultData.status
  ];
  
  const result = await db._query(_query, values);
  return result.rows[0];
};

// Helper function to clean up test data
const cleanupTestData = async (db) => {
  const tables = ['students', 'users', 'tenants'];
  
  for (const table of tables) {
    try {
      await db._query(`DELETE FROM ${table} WHERE _id LIKE 'test-%'`);
    } catch (error) {
      // Ignore errors if table doesn't exist
      console.warn(`Warning: Could not clean up ${table}:`, error.message);
    }
  }
};

// Mock authentication middleware for tests
const mockAuth = (req, res, _next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication token required'
      }
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    req.user = decoded;
    req.tenant = { _id: decoded.tenantId };
    _next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token'
      }
    });
  }
};

// Mock tenant context middleware
const mockTenantContext = (req, res, _next) => {
  if (req.user?.tenantId) {
    req.tenant = { _id: req.user.tenantId };
  }
  _next();
};

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestToken,
  createTestTenant,
  createTestUser,
  createTestStudent,
  cleanupTestData,
  mockAuth,
  mockTenantContext,
  testDbConfig
};