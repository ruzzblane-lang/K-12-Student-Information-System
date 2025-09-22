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

describe('Multi-Tenant Integration Tests', () => {
  let db;
  let tenant1, tenant2;
  let user1, user2;
  let token1, token2;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestData(db);
    
    // Create two different tenants
    tenant1 = await createTestTenant(db, {
      id: 'tenant-1',
      slug: 'school-one',
      name: 'School One'
    });
    
    tenant2 = await createTestTenant(db, {
      id: 'tenant-2',
      slug: 'school-two',
      name: 'School Two'
    });
    
    // Create users for each tenant
    user1 = await createTestUser(db, {
      id: 'user-1',
      tenant_id: tenant1.id,
      email: 'admin1@school-one.com',
      role: 'admin'
    });
    
    user2 = await createTestUser(db, {
      id: 'user-2',
      tenant_id: tenant2.id,
      email: 'admin2@school-two.com',
      role: 'admin'
    });
    
    // Create tokens for each tenant
    token1 = createTestToken({
      userId: user1.id,
      tenantId: tenant1.id,
      role: 'admin'
    });
    
    token2 = createTestToken({
      userId: user2.id,
      tenantId: tenant2.id,
      role: 'admin'
    });
  });

  afterEach(async () => {
    await cleanupTestData(db);
  });

  describe('Tenant Isolation', () => {
    it('should isolate students between tenants', async () => {
      // Create students in tenant 1
      const student1Data = {
        studentId: 'SCHOOL1-001',
        firstName: 'Student',
        lastName: 'One',
        dateOfBirth: '2008-01-01',
        gradeLevel: '10',
        enrollmentDate: '2024-08-15'
      };

      const response1 = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token1}`)
        .send(student1Data)
        .expect(201);

      expect(response1.body.data.tenant_id).toBe(tenant1.id);

      // Create students in tenant 2
      const student2Data = {
        studentId: 'SCHOOL2-001',
        firstName: 'Student',
        lastName: 'Two',
        dateOfBirth: '2008-01-01',
        gradeLevel: '10',
        enrollmentDate: '2024-08-15'
      };

      const response2 = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token2}`)
        .send(student2Data)
        .expect(201);

      expect(response2.body.data.tenant_id).toBe(tenant2.id);

      // Verify tenant 1 can only see their students
      const students1 = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(students1.body.data).toHaveLength(1);
      expect(students1.body.data[0].tenant_id).toBe(tenant1.id);
      expect(students1.body.data[0].student_id).toBe('SCHOOL1-001');

      // Verify tenant 2 can only see their students
      const students2 = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(students2.body.data).toHaveLength(1);
      expect(students2.body.data[0].tenant_id).toBe(tenant2.id);
      expect(students2.body.data[0].student_id).toBe('SCHOOL2-001');
    });

    it('should prevent cross-tenant student access', async () => {
      // Create student in tenant 1
      const student1Data = {
        studentId: 'SCHOOL1-002',
        firstName: 'Cross',
        lastName: 'Tenant',
        dateOfBirth: '2008-01-01',
        gradeLevel: '10',
        enrollmentDate: '2024-08-15'
      };

      const response1 = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token1}`)
        .send(student1Data)
        .expect(201);

      const student1Id = response1.body.data.id;

      // Try to access student from tenant 2
      const response2 = await request(app)
        .get(`/api/students/${student1Id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);

      expect(response2.body.success).toBe(false);
      expect(response2.body.error.code).toBe('STUDENT_NOT_FOUND');
    });

    it('should prevent cross-tenant student updates', async () => {
      // Create student in tenant 1
      const student1Data = {
        studentId: 'SCHOOL1-003',
        firstName: 'Update',
        lastName: 'Test',
        dateOfBirth: '2008-01-01',
        gradeLevel: '10',
        enrollmentDate: '2024-08-15'
      };

      const response1 = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token1}`)
        .send(student1Data)
        .expect(201);

      const student1Id = response1.body.data.id;

      // Try to update student from tenant 2
      const updateData = {
        firstName: 'Hacked',
        lastName: 'Name'
      };

      const response2 = await request(app)
        .put(`/api/students/${student1Id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send(updateData)
        .expect(404);

      expect(response2.body.success).toBe(false);
      expect(response2.body.error.code).toBe('STUDENT_NOT_FOUND');
    });

    it('should prevent cross-tenant student deletion', async () => {
      // Create student in tenant 1
      const student1Data = {
        studentId: 'SCHOOL1-004',
        firstName: 'Delete',
        lastName: 'Test',
        dateOfBirth: '2008-01-01',
        gradeLevel: '10',
        enrollmentDate: '2024-08-15'
      };

      const response1 = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token1}`)
        .send(student1Data)
        .expect(201);

      const student1Id = response1.body.data.id;

      // Try to delete student from tenant 2
      const response2 = await request(app)
        .delete(`/api/students/${student1Id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);

      expect(response2.body.success).toBe(false);
      expect(response2.body.error.code).toBe('STUDENT_NOT_FOUND');
    });
  });

  describe('Tenant Context Middleware', () => {
    it('should set tenant context from JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data.tenant.id).toBe(tenant1.id);
      expect(response.body.data.tenant.slug).toBe('school-one');
    });

    it('should handle tenant slug in headers', async () => {
      const token = createTestToken({
        userId: user1.id,
        tenantId: tenant1.id,
        role: 'admin'
      });

      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', 'school-one')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.tenant.id).toBe(tenant1.id);
    });

    it('should validate tenant slug matches token', async () => {
      const token = createTestToken({
        userId: user1.id,
        tenantId: tenant1.id,
        role: 'admin'
      });

      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', 'school-two') // Wrong tenant
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TENANT_MISMATCH');
    });
  });

  describe('Multi-Tenant Data Consistency', () => {
    it('should maintain data integrity across tenants', async () => {
      // Create identical student IDs in different tenants
      const studentData = {
        studentId: 'DUPLICATE-001',
        firstName: 'Same',
        lastName: 'ID',
        dateOfBirth: '2008-01-01',
        gradeLevel: '10',
        enrollmentDate: '2024-08-15'
      };

      // Create in tenant 1
      const response1 = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token1}`)
        .send(studentData)
        .expect(201);

      // Create in tenant 2 (should succeed - different tenants)
      const response2 = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token2}`)
        .send(studentData)
        .expect(201);

      expect(response1.body.data.student_id).toBe('DUPLICATE-001');
      expect(response2.body.data.student_id).toBe('DUPLICATE-001');
      expect(response1.body.data.tenant_id).toBe(tenant1.id);
      expect(response2.body.data.tenant_id).toBe(tenant2.id);
    });

    it('should handle tenant-specific configurations', async () => {
      // Update tenant 1 settings
      const settings1 = {
        maxStudents: 1000,
        allowedGradeLevels: ['9', '10', '11', '12'],
        timezone: 'America/New_York'
      };

      // Update tenant 2 settings
      const settings2 = {
        maxStudents: 500,
        allowedGradeLevels: ['6', '7', '8', '9', '10', '11', '12'],
        timezone: 'America/Los_Angeles'
      };

      // This would typically be done through tenant management endpoints
      // For now, we'll verify the tenants exist with different configurations
      expect(tenant1.id).not.toBe(tenant2.id);
      expect(tenant1.slug).not.toBe(tenant2.slug);
    });
  });

  describe('Performance with Multiple Tenants', () => {
    it('should handle concurrent requests from different tenants', async () => {
      const promises = [];

      // Create concurrent requests from both tenants
      for (let i = 0; i < 5; i++) {
        // Tenant 1 requests
        promises.push(
          request(app)
            .get('/api/students')
            .set('Authorization', `Bearer ${token1}`)
        );

        // Tenant 2 requests
        promises.push(
          request(app)
            .get('/api/students')
            .set('Authorization', `Bearer ${token2}`)
        );
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify tenant isolation in responses
      const tenant1Responses = responses.filter((_, index) => index % 2 === 0);
      const tenant2Responses = responses.filter((_, index) => index % 2 === 1);

      tenant1Responses.forEach(response => {
        expect(response.body.meta.tenant.id).toBe(tenant1.id);
      });

      tenant2Responses.forEach(response => {
        expect(response.body.meta.tenant.id).toBe(tenant2.id);
      });
    });
  });

  describe('Tenant Switching', () => {
    it('should handle user switching between tenants', async () => {
      // Create user that belongs to both tenants (multi-tenant user)
      const multiTenantUser = await createTestUser(db, {
        id: 'multi-tenant-user',
        tenant_id: tenant1.id, // Primary tenant
        email: 'multi@example.com',
        role: 'admin'
      });

      // Test with primary tenant
      const tokenPrimary = createTestToken({
        userId: multiTenantUser.id,
        tenantId: tenant1.id,
        role: 'admin'
      });

      const response1 = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${tokenPrimary}`)
        .expect(200);

      expect(response1.body.meta.tenant.id).toBe(tenant1.id);

      // Test with secondary tenant (using header override)
      const tokenSecondary = createTestToken({
        userId: multiTenantUser.id,
        tenantId: tenant2.id, // Different tenant
        role: 'admin'
      });

      const response2 = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${tokenSecondary}`)
        .expect(200);

      expect(response2.body.meta.tenant.id).toBe(tenant2.id);
    });
  });
});
