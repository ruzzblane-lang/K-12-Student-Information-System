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

describe('Students API', () => {
  let db;
  let testTenant;
  let testUser;
  let testStudent;
  let authToken;

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
      id: 'students-test-tenant',
      slug: 'students-test-school'
    });
    
    // Create test user
    testUser = await createTestUser(db, {
      id: 'students-test-user',
      tenant_id: testTenant.id,
      email: 'students-test@example.com',
      role: 'admin'
    });
    
    // Create test student
    testStudent = await createTestStudent(db, {
      id: 'students-test-student',
      tenant_id: testTenant.id,
      student_id: 'STU001',
      first_name: 'Test',
      last_name: 'Student'
    });
    
    // Create auth token
    authToken = createTestToken({
      userId: testUser.id,
      tenantId: testTenant.id,
      role: 'admin'
    });
  });

  afterEach(async () => {
    await cleanupTestData(db);
  });

  describe('GET /api/students', () => {
    it('should return list of students', async () => {
      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('first_name');
      expect(response.body.data[0]).toHaveProperty('last_name');
      expect(response.body.data[0]).toHaveProperty('student_id');
    });

    it('should support pagination', async () => {
      // Create multiple test students
      for (let i = 2; i <= 5; i++) {
        await createTestStudent(db, {
          id: `students-test-student-${i}`,
          tenant_id: testTenant.id,
          student_id: `STU${i.toString().padStart(3, '0')}`,
          first_name: `Test${i}`,
          last_name: 'Student'
        });
      }

      const response = await request(app)
        .get('/api/students?page=1&limit=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.limit).toBe(3);
      expect(response.body.meta.pagination.total).toBeGreaterThanOrEqual(5);
    });

    it('should filter by grade level', async () => {
      const response = await request(app)
        .get('/api/students?gradeLevel=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All returned students should be grade 10
      response.body.data.forEach(student => {
        expect(student.grade_level).toBe('10');
      });
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/students?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All returned students should be active
      response.body.data.forEach(student => {
        expect(student.status).toBe('active');
      });
    });

    it('should search students by name', async () => {
      const response = await request(app)
        .get('/api/students?search=Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All returned students should match search term
      response.body.data.forEach(student => {
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
        expect(fullName).toContain('test');
      });
    });

    it('should sort students', async () => {
      const response = await request(app)
        .get('/api/students?sort=last_name:asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Verify sorting (if multiple students exist)
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i-1].last_name).toBeLessThanOrEqual(
            response.body.data[i].last_name
          );
        }
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/students')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should enforce tenant isolation', async () => {
      // Create another tenant and student
      const otherTenant = await createTestTenant(db, {
        id: 'other-tenant',
        slug: 'other-school'
      });
      
      await createTestStudent(db, {
        id: 'other-student',
        tenant_id: otherTenant.id,
        student_id: 'OTHER001',
        first_name: 'Other',
        last_name: 'Student'
      });

      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Should only return students from the authenticated tenant
      response.body.data.forEach(student => {
        expect(student.tenant_id).toBe(testTenant.id);
      });
    });
  });

  describe('GET /api/students/:id', () => {
    it('should return specific student', async () => {
      const response = await request(app)
        .get(`/api/students/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testStudent.id);
      expect(response.body.data.first_name).toBe('Test');
      expect(response.body.data.last_name).toBe('Student');
      expect(response.body.data.student_id).toBe('STU001');
    });

    it('should return 404 for non-existent student', async () => {
      const response = await request(app)
        .get('/api/students/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STUDENT_NOT_FOUND');
    });

    it('should enforce tenant isolation', async () => {
      // Create student in different tenant
      const otherTenant = await createTestTenant(db, {
        id: 'other-tenant-2',
        slug: 'other-school-2'
      });
      
      const otherStudent = await createTestStudent(db, {
        id: 'other-student-2',
        tenant_id: otherTenant.id,
        student_id: 'OTHER002',
        first_name: 'Other',
        last_name: 'Student'
      });

      const response = await request(app)
        .get(`/api/students/${otherStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STUDENT_NOT_FOUND');
    });
  });

  describe('POST /api/students', () => {
    it('should create new student', async () => {
      const newStudentData = {
        studentId: 'STU002',
        firstName: 'New',
        lastName: 'Student',
        dateOfBirth: '2008-06-15',
        gradeLevel: '10',
        enrollmentDate: '2024-08-15',
        primaryEmail: 'new.student@example.com',
        address: '123 New Street, City, State 12345'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newStudentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.student_id).toBe('STU002');
      expect(response.body.data.first_name).toBe('New');
      expect(response.body.data.last_name).toBe('Student');
      expect(response.body.data.tenant_id).toBe(testTenant.id);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        studentId: 'STU003'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details.length).toBeGreaterThan(0);
    });

    it('should validate email format', async () => {
      const invalidData = {
        studentId: 'STU004',
        firstName: 'Test',
        lastName: 'Student',
        dateOfBirth: '2008-01-01',
        gradeLevel: '10',
        enrollmentDate: '2024-08-15',
        primaryEmail: 'invalid-email-format'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent duplicate student IDs', async () => {
      const duplicateData = {
        studentId: 'STU001', // Same as existing test student
        firstName: 'Duplicate',
        lastName: 'Student',
        dateOfBirth: '2008-01-01',
        gradeLevel: '10',
        enrollmentDate: '2024-08-15'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DUPLICATE_STUDENT_ID');
    });

    it('should require admin role', async () => {
      const teacherToken = createTestToken({
        userId: testUser.id,
        tenantId: testTenant.id,
        role: 'teacher'
      });

      const newStudentData = {
        studentId: 'STU005',
        firstName: 'Teacher',
        lastName: 'Student',
        dateOfBirth: '2008-01-01',
        gradeLevel: '10',
        enrollmentDate: '2024-08-15'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(newStudentData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('PUT /api/students/:id', () => {
    it('should update student', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Student',
        gradeLevel: '11',
        primaryPhone: '555-123-4567'
      };

      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.first_name).toBe('Updated');
      expect(response.body.data.last_name).toBe('Student');
      expect(response.body.data.grade_level).toBe('11');
      expect(response.body.data.primary_phone).toBe('555-123-4567');
    });

    it('should return 404 for non-existent student', async () => {
      const updateData = {
        firstName: 'Updated'
      };

      const response = await request(app)
        .put('/api/students/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STUDENT_NOT_FOUND');
    });

    it('should validate updated data', async () => {
      const invalidData = {
        primaryEmail: 'invalid-email-format'
      };

      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/students/:id', () => {
    it('should delete student', async () => {
      const response = await request(app)
        .delete(`/api/students/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify student is deleted
      const getResponse = await request(app)
        .get(`/api/students/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('should return 404 for non-existent student', async () => {
      const response = await request(app)
        .delete('/api/students/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STUDENT_NOT_FOUND');
    });

    it('should require admin role', async () => {
      const teacherToken = createTestToken({
        userId: testUser.id,
        tenantId: testTenant.id,
        role: 'teacher'
      });

      const response = await request(app)
        .delete(`/api/students/${testStudent.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET /api/students/:id/grades', () => {
    it('should return student grades', async () => {
      const response = await request(app)
        .get(`/api/students/${testStudent.id}/grades`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/students/:id/attendance', () => {
    it('should return student attendance', async () => {
      const response = await request(app)
        .get(`/api/students/${testStudent.id}/attendance`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Bulk Operations', () => {
    it('should create multiple students', async () => {
      const bulkData = {
        students: [
          {
            studentId: 'STU101',
            firstName: 'Bulk1',
            lastName: 'Student',
            dateOfBirth: '2008-01-01',
            gradeLevel: '10',
            enrollmentDate: '2024-08-15'
          },
          {
            studentId: 'STU102',
            firstName: 'Bulk2',
            lastName: 'Student',
            dateOfBirth: '2008-02-01',
            gradeLevel: '10',
            enrollmentDate: '2024-08-15'
          }
        ]
      };

      const response = await request(app)
        .post('/api/students/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toHaveLength(2);
      expect(response.body.data.errors).toHaveLength(0);
    });

    it('should handle partial bulk creation failures', async () => {
      const bulkData = {
        students: [
          {
            studentId: 'STU201',
            firstName: 'Valid',
            lastName: 'Student',
            dateOfBirth: '2008-01-01',
            gradeLevel: '10',
            enrollmentDate: '2024-08-15'
          },
          {
            studentId: 'STU001', // Duplicate
            firstName: 'Invalid',
            lastName: 'Student',
            dateOfBirth: '2008-01-01',
            gradeLevel: '10',
            enrollmentDate: '2024-08-15'
          }
        ]
      };

      const response = await request(app)
        .post('/api/students/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toHaveLength(1);
      expect(response.body.data.errors).toHaveLength(1);
    });
  });
});
