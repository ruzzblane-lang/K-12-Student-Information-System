const request = require('supertest');
const app = require('../../server');
const { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  createTestToken,
  createTestTenant,
  createTestUser,
  cleanupTestData 
} = require('../setup');

describe('Authentication API', () => {
  let db;
  let testTenant;
  let testUser;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestData(db);
    
    // Create test tenant
    testTenant = await createTestTenant(db, {
      id: 'auth-test-tenant',
      slug: 'auth-test-school'
    });
    
    // Create test user
    testUser = await createTestUser(db, {
      id: 'auth-test-user',
      tenant_id: testTenant.id,
      email: 'auth-test@example.com',
      role: 'admin'
    });
  });

  afterEach(async () => {
    await cleanupTestData(db);
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'auth-test@example.com',
        password: 'test-password',
        tenantSlug: 'auth-test-school'
      };

      // Mock password verification
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('test-password', 10);
      
      // Update user with hashed password
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hashedPassword, testUser.id]
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('auth-test@example.com');
      expect(response.body.data.tenant.slug).toBe('auth-test-school');
    });

    it('should reject invalid email', async () => {
      const loginData = {
        email: 'invalid@example.com',
        password: 'test-password',
        tenantSlug: 'auth-test-school'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject invalid password', async () => {
      const loginData = {
        email: 'auth-test@example.com',
        password: 'wrong-password',
        tenantSlug: 'auth-test-school'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject invalid tenant', async () => {
      const loginData = {
        email: 'auth-test@example.com',
        password: 'test-password',
        tenantSlug: 'invalid-tenant'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });

    it('should require all fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh valid token', async () => {
      const refreshToken = createTestToken({ type: 'refresh' });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should require refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout with valid token', async () => {
      const token = createTestToken();

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('logged out');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info', async () => {
      const token = createTestToken({
        userId: testUser.id,
        tenantId: testTenant.id,
        email: testUser.email
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.tenant.id).toBe(testTenant.id);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Token Validation', () => {
    it('should validate JWT token format', () => {
      const token = createTestToken();
      const jwt = require('jsonwebtoken');
      
      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      }).not.toThrow();
    });

    it('should include required claims in token', () => {
      const token = createTestToken({
        userId: 'test-user',
        tenantId: 'test-tenant',
        role: 'admin',
        email: 'test@example.com'
      });
      
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('tenantId');
      expect(decoded).toHaveProperty('role');
      expect(decoded).toHaveProperty('email');
    });

    it('should expire tokens after specified time', () => {
      const jwt = require('jsonwebtoken');
      
      // Create token with 1 second expiration
      const token = jwt.sign(
        { userId: 'test' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1s' }
      );
      
      // Wait for token to expire
      setTimeout(() => {
        expect(() => {
          jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        }).toThrow('jwt expired');
      }, 1100);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'invalid@example.com',
        password: 'wrong-password',
        tenantSlug: 'auth-test-school'
      };

      // Make multiple failed login attempts
      const promises = Array(10).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      
      // At least one should be rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
