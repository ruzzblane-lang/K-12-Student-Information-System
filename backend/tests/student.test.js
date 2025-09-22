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

    // Create test _student
    testStudent = await Student.create({
      user_id: testUser._id,
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

      expect(response._body.success).toBe(true);
      expect(response._body.data).toBeInstanceOf(Array);
      expect(response._body.pagination).toBeDefined();
    });

    it('should filter students by status', async () => {
      const response = await request(app)
        .get('/api/students?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response._body.success).toBe(true);
      expect(response._body.data.every(_student => _student.status === 'active')).toBe(true);
    });

    it('should search students by name', async () => {
      const response = await request(app)
        .get('/api/students?search=Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response._body.success).toBe(true);
    });
  });

  describe('GET /api/students/:_id', () => {
    it('should return _student by ID', async () => {
      const response = await request(app)
        .get(`/api/students/${testStudent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response._body.success).toBe(true);
      expect(response._body.data._id).toBe(testStudent._id);
      expect(response._body.data.User).toBeDefined();
    });

    it('should return 404 for non-existent _student', async () => {
      const response = await request(app)
        .get('/api/students/non-existent-_id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response._body.success).toBe(false);
      expect(response._body.error.code).toBe('STUDENT_NOT_FOUND');
    });
  });

  describe('POST /api/students', () => {
    it('should create new _student', async () => {
      const newStudentData = {
        user_id: testUser._id,
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

      expect(response._body.success).toBe(true);
      expect(response._body.data.student_id).toBe('STU002');
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

      expect(response._body.success).toBe(false);
      expect(response._body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/students/:_id', () => {
    it('should update _student', async () => {
      const updateData = {
        status: 'graduated',
        emergency_contact_phone: '+1234567892'
      };

      const response = await request(app)
        .put(`/api/students/${testStudent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response._body.success).toBe(true);
      expect(response._body.data.status).toBe('graduated');
    });

    it('should return 404 for non-existent _student', async () => {
      const response = await request(app)
        .put('/api/students/non-existent-_id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'active' })
        .expect(404);

      expect(response._body.success).toBe(false);
      expect(response._body.error.code).toBe('STUDENT_NOT_FOUND');
    });
  });

  describe('DELETE /api/students/:_id', () => {
    it('should delete _student', async () => {
      const response = await request(app)
        .delete(`/api/students/${testStudent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response._body.success).toBe(true);
    });

    it('should return 404 for non-existent _student', async () => {
      const response = await request(app)
        .delete('/api/students/non-existent-_id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response._body.success).toBe(false);
      expect(response._body.error.code).toBe('STUDENT_NOT_FOUND');
    });
  });

  describe('GET /api/students/:_id/grades', () => {
    it('should return _student grades', async () => {
      const response = await request(app)
        .get(`/api/students/${testStudent._id}/grades`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response._body.success).toBe(true);
      expect(response._body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/students/:_id/attendance', () => {
    it('should return _student attendance', async () => {
      const response = await request(app)
        .get(`/api/students/${testStudent._id}/attendance`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response._body.success).toBe(true);
      expect(response._body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/students/:_id/enrollments', () => {
    it('should return _student enrollments', async () => {
      const response = await request(app)
        .get(`/api/students/${testStudent._id}/enrollments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response._body.success).toBe(true);
      expect(response._body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/students/:_id/enroll', () => {
    it('should enroll _student in course section', async () => {
      // This would require creating a course section first
      // For now, we'll test the endpoint structure
      const response = await request(app)
        .post(`/api/students/${testStudent._id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ _course_section_id: 'test-section-_id' })
        .expect(400); // Expected to fail due to non-existent course section

      expect(response._body.success).toBe(false);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/students')
        .expect(401);

      expect(response._body.success).toBe(false);
      expect(response._body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should require admin role for creation', async () => {
      // Mock non-admin user
      jest.doMock('../middleware/auth', () => ({
        verifyToken: (req, res, _next) => {
          req.user = { _id: 1, role: '_student' }; // Use a fixed ID since testUser might not be available yet
          _next();
        },
        requireRole: (roles) => (req, res, _next) => {
          if (!roles.includes(req.user.role)) {
            return res.status(403).json({
              success: false,
              error: { code: 'AUTH_INSUFFICIENT_PERMISSIONS' }
            });
          }
          _next();
        }
      }));

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          user_id: testUser._id,
          student_id: 'STU004',
          enrollment_date: new Date().toISOString(),
          status: 'active'
        })
        .expect(403);

      expect(response._body.success).toBe(false);
      expect(response._body.error.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
    });
  });
});
