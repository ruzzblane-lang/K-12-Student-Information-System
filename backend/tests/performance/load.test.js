const request = require('supertest');
const app = require('../../server');
const { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  createTestToken,
  createTestTenant,
  createTestUser,
  createTestStudent,
  cleanupTestData 
} = require('../setup');

describe('Performance and Load Tests', () => {
  let db;
  let testTenant;
  let testUser;
  let authToken;
  let testStudents = [];

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
      id: 'perf-test-tenant',
      slug: 'perf-test-school'
    });
    
    // Create test user
    testUser = await createTestUser(db, {
      id: 'perf-test-user',
      tenant_id: testTenant.id,
      email: 'perf-test@example.com',
      role: 'admin'
    });
    
    // Create auth token
    authToken = createTestToken({
      userId: testUser.id,
      tenantId: testTenant.id,
      role: 'admin'
    });

    // Create multiple test students for load testing
    testStudents = [];
    for (let i = 1; i <= 100; i++) {
      const student = await createTestStudent(db, {
        id: `perf-student-${i}`,
        tenant_id: testTenant.id,
        student_id: `PERF${i.toString().padStart(3, '0')}`,
        first_name: `Student${i}`,
        last_name: 'LoadTest',
        grade_level: (i % 4 + 9).toString() // Grades 9-12
      });
      testStudents.push(student);
    }
  });

  afterEach(async () => {
    await cleanupTestData(db);
  });

  describe('API Response Times', () => {
    it('should respond to student list requests within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should handle pagination efficiently', async () => {
      const pageSize = 20;
      const totalPages = Math.ceil(testStudents.length / pageSize);
      
      const promises = [];
      
      // Test multiple pages concurrently
      for (let page = 1; page <= Math.min(totalPages, 5); page++) {
        promises.push(
          request(app)
            .get(`/api/students?page=${page}&limit=${pageSize}`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const responseTime = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      // Concurrent requests should complete quickly
      expect(responseTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle search queries efficiently', async () => {
      const searchTerms = ['Student', 'Load', 'PERF'];
      
      const promises = searchTerms.map(term =>
        request(app)
          .get(`/api/students?search=${term}`)
          .set('Authorization', `Bearer ${authToken}`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const responseTime = Date.now() - startTime;
      
      // All searches should succeed and return results
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });
      
      // Multiple searches should complete quickly
      expect(responseTime).toBeLessThan(1500);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle high concurrent load', async () => {
      const concurrentRequests = 50;
      const promises = [];
      
      // Create many concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/students')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const responseTime = Date.now() - startTime;
      
      // All requests should succeed
      const successfulRequests = responses.filter(r => r.status === 200);
      expect(successfulRequests.length).toBe(concurrentRequests);
      
      // Should handle concurrent load efficiently
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify data consistency
      successfulRequests.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });
    });

    it('should handle mixed concurrent operations', async () => {
      const promises = [];
      
      // Mix of different operations
      for (let i = 0; i < 10; i++) {
        // Read operations
        promises.push(
          request(app)
            .get('/api/students')
            .set('Authorization', `Bearer ${authToken}`)
        );
        
        // Individual student lookups
        if (testStudents[i]) {
          promises.push(
            request(app)
              .get(`/api/students/${testStudents[i].id}`)
              .set('Authorization', `Bearer ${authToken}`)
          );
        }
        
        // Search operations
        promises.push(
          request(app)
            .get(`/api/students?search=Student${i + 1}`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const responseTime = Date.now() - startTime;
      
      // Most requests should succeed (some might fail due to non-existent students)
      const successfulRequests = responses.filter(r => r.status === 200);
      expect(successfulRequests.length).toBeGreaterThan(promises.length * 0.8); // At least 80% success rate
      
      // Should handle mixed operations efficiently
      expect(responseTime).toBeLessThan(3000);
    });
  });

  describe('Database Performance', () => {
    it('should handle large result sets efficiently', async () => {
      // Test with maximum page size
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/students?limit=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(100);
      expect(responseTime).toBeLessThan(1500); // Should handle 100 records quickly
    });

    it('should maintain performance with complex queries', async () => {
      const complexQueries = [
        '/api/students?gradeLevel=10&status=active&sort=last_name:asc',
        '/api/students?search=Student&gradeLevel=11&limit=50',
        '/api/students?sort=student_id:desc&limit=25'
      ];
      
      const promises = complexQueries.map(query =>
        request(app)
          .get(query)
          .set('Authorization', `Bearer ${authToken}`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const responseTime = Date.now() - startTime;
      
      // All complex queries should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      // Complex queries should still be reasonably fast
      expect(responseTime).toBeLessThan(2000);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory with repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make many requests
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/students?limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle connection pooling efficiently', async () => {
      // Make many concurrent database operations
      const promises = [];
      
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get(`/api/students/${testStudents[i % testStudents.length].id}`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const responseTime = Date.now() - startTime;
      
      // All requests should succeed
      const successfulRequests = responses.filter(r => r.status === 200);
      expect(successfulRequests.length).toBe(promises.length);
      
      // Should handle connection pooling well
      expect(responseTime).toBeLessThan(2000);
    });
  });

  describe('Error Handling Under Load', () => {
    it('should handle errors gracefully under load', async () => {
      const promises = [];
      
      // Mix of valid and invalid requests
      for (let i = 0; i < 20; i++) {
        // Valid requests
        promises.push(
          request(app)
            .get('/api/students')
            .set('Authorization', `Bearer ${authToken}`)
        );
        
        // Invalid requests (non-existent student)
        promises.push(
          request(app)
            .get('/api/students/non-existent-id')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Valid requests should succeed
      const validRequests = responses.filter((_, index) => index % 2 === 0);
      validRequests.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      // Invalid requests should fail gracefully
      const invalidRequests = responses.filter((_, index) => index % 2 === 1);
      invalidRequests.forEach(response => {
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('STUDENT_NOT_FOUND');
      });
    });

    it('should maintain rate limiting under load', async () => {
      // Make many requests quickly
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .get('/api/students')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Most requests should succeed
      const successfulRequests = responses.filter(r => r.status === 200);
      expect(successfulRequests.length).toBeGreaterThan(responses.length * 0.9); // At least 90% success
      
      // Some requests might be rate limited
      const rateLimitedRequests = responses.filter(r => r.status === 429);
      // Rate limiting should be reasonable (not too aggressive)
      expect(rateLimitedRequests.length).toBeLessThan(responses.length * 0.2); // Less than 20% rate limited
    });
  });

  describe('Scalability Tests', () => {
    it('should handle increasing load gracefully', async () => {
      const loadLevels = [1, 5, 10, 20];
      const results = [];
      
      for (const load of loadLevels) {
        const promises = [];
        
        for (let i = 0; i < load; i++) {
          promises.push(
            request(app)
              .get('/api/students?limit=10')
              .set('Authorization', `Bearer ${authToken}`)
          );
        }
        
        const startTime = Date.now();
        const responses = await Promise.all(promises);
        const responseTime = Date.now() - startTime;
        
        const successfulRequests = responses.filter(r => r.status === 200);
        const avgResponseTime = responseTime / responses.length;
        
        results.push({
          load,
          successRate: successfulRequests.length / responses.length,
          avgResponseTime,
          totalTime: responseTime
        });
      }
      
      // Success rate should remain high across load levels
      results.forEach(result => {
        expect(result.successRate).toBeGreaterThan(0.9); // At least 90% success rate
      });
      
      // Response time should not degrade dramatically
      const maxResponseTime = Math.max(...results.map(r => r.avgResponseTime));
      expect(maxResponseTime).toBeLessThan(500); // Average response time under 500ms
    });
  });
});
