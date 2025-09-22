const request = require('supertest');
const app = require('../app');
const { sequelize, User, Student } = require('../models');

describe('Student API', () => {
  let authToken;
  let testUser;
  let testStudent;

  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });
    
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'admin',
      first_name: 'Test',
      last_name: 'User'
    });

    // Create test student
    testStudent = await Student.create({
      user_id: testUser.id,
      student_id: 'STU001',
      enrollment_date: new Date(),
      status: 'active',
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_phone: '+1234567890'
    });

    // Mock JWT token (in real tests, you'd generate a proper token)
    authToken = 'mock_jwt_token';
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(() => {
    // Middleware is mocked globally in setup.js
  });

  describe('GET /api/students', () => {
    it('should return list of students', async () => {
      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter students by status', async () => {
      const response = await request(app)
        .get('/api/students?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(student => student.status === 'active')).toBe(true);
    });

    it('should search students by name', async () => {
      const response = await request(app)
        .get('/api/students?search=Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/students/:id', () => {
    it('should return student by ID', async () => {
      const response = await request(app)
        .get(`/api/students/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testStudent.id);
      expect(response.body.data.User).toBeDefined();
    });

    it('should return 404 for non-existent student', async () => {
      const response = await request(app)
        .get('/api/students/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STUDENT_NOT_FOUND');
    });
  });

  describe('POST /api/students', () => {
    it('should create new student', async () => {
      const newStudentData = {
        user_id: testUser.id,
        student_id: 'STU002',
        enrollment_date: new Date().toISOString(),
        status: 'active',
        emergency_contact_name: 'New Emergency Contact',
        emergency_contact_phone: '+1234567891'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newStudentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.student_id).toBe('STU002');
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        student_id: 'STU003'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/students/:id', () => {
    it('should update student', async () => {
      const updateData = {
        status: 'graduated',
        emergency_contact_phone: '+1234567892'
      };

      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('graduated');
    });

    it('should return 404 for non-existent student', async () => {
      const response = await request(app)
        .put('/api/students/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'active' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STUDENT_NOT_FOUND');
    });
  });

  describe('DELETE /api/students/:id', () => {
    it('should delete student', async () => {
      const response = await request(app)
        .delete(`/api/students/${testStudent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent student', async () => {
      const response = await request(app)
        .delete('/api/students/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STUDENT_NOT_FOUND');
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

  describe('GET /api/students/:id/enrollments', () => {
    it('should return student enrollments', async () => {
      const response = await request(app)
        .get(`/api/students/${testStudent.id}/enrollments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/students/:id/enroll', () => {
    it('should enroll student in course section', async () => {
      // This would require creating a course section first
      // For now, we'll test the endpoint structure
      const response = await request(app)
        .post(`/api/students/${testStudent.id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ course_section_id: 'test-section-id' })
        .expect(400); // Expected to fail due to non-existent course section

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/students')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should require admin role for creation', async () => {
      // Mock non-admin user
      jest.doMock('../middleware/auth', () => ({
        verifyToken: (req, res, next) => {
          req.user = { id: 1, role: 'student' }; // Use a fixed ID since testUser might not be available yet
          next();
        },
        requireRole: (roles) => (req, res, next) => {
          if (!roles.includes(req.user.role)) {
            return res.status(403).json({
              success: false,
              error: { code: 'AUTH_INSUFFICIENT_PERMISSIONS' }
            });
          }
          next();
        }
      }));

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          user_id: testUser.id,
          student_id: 'STU004',
          enrollment_date: new Date().toISOString(),
          status: 'active'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
    });
  });
});
