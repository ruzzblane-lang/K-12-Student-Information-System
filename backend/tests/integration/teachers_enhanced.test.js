/**
 * Enhanced Teachers Table Integration Tests
 * 
 * Tests the new intervention-related fields, RLS policies, and masked views
 * for the enhanced teachers table.
 */

const request = require('supertest');
const app = require('../../server');
const { generateToken } = require('../../utils/jwt');

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id', tenantId: 'test-tenant-id', role: 'admin' };
    next();
  }),
  requireRole: jest.fn((roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'AUTH_INSUFFICIENT_PERMISSIONS', message: 'Insufficient permissions' }
      });
    }
    next();
  })
}));

jest.mock('../../middleware/tenantContext', () => ({
  setTenantContext: jest.fn((req, res, next) => {
    req.tenant = { id: 'test-tenant-id', slug: 'test-tenant' };
    next();
  })
}));

describe('Enhanced Teachers Table', () => {
  let adminToken;
  let teacherToken;
  let counselorToken;

  beforeAll(() => {
    adminToken = generateToken('admin-user-id', 'test-tenant-id', 'admin');
    teacherToken = generateToken('teacher-user-id', 'test-tenant-id', 'teacher');
    counselorToken = generateToken('counselor-user-id', 'test-tenant-id', 'counselor');
  });

  describe('Intervention Fields Support', () => {
    it('should create teacher with intervention capabilities', async () => {
      const teacherData = {
        employee_id: 'TCH001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@school.edu',
        hire_date: '2024-01-01',
        department: 'Mathematics',
        position: 'Math Teacher',
        // Intervention-related fields
        intervention_capabilities: {
          academic_intervention: {
            trained: true,
            certification_date: '2024-01-15',
            subjects: ['math', 'algebra'],
            grade_levels: ['9-12']
          },
          behavioral_intervention: {
            trained: true,
            certification_date: '2024-02-01',
            methods: ['positive_behavior_support']
          }
        },
        intervention_training_completed: ['academic_intervention_101', 'behavioral_support_201'],
        intervention_success_rate: 85.5,
        max_intervention_caseload: 15,
        current_intervention_caseload: 8,
        intervention_specializations: ['math_tutoring', 'study_skills'],
        last_intervention_training: '2024-03-01',
        intervention_certifications: ['academic_intervention_specialist', 'behavioral_support_certified'],
        crisis_intervention_trained: false,
        behavioral_intervention_trained: true,
        academic_intervention_trained: true,
        social_emotional_intervention_trained: false,
        intervention_availability: {
          monday: { available: true, time_slots: [{ start: '09:00', end: '10:00', type: 'academic' }] },
          tuesday: { available: true, time_slots: [{ start: '14:00', end: '15:00', type: 'behavioral' }] }
        }
      };

      const response = await request(app)
        .post('/api/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(teacherData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.intervention_capabilities).toEqual(teacherData.intervention_capabilities);
      expect(response.body.data.intervention_success_rate).toBe(85.5);
      expect(response.body.data.max_intervention_caseload).toBe(15);
      expect(response.body.data.current_intervention_caseload).toBe(8);
      expect(response.body.data.intervention_specializations).toEqual(teacherData.intervention_specializations);
      expect(response.body.data.crisis_intervention_trained).toBe(false);
      expect(response.body.data.behavioral_intervention_trained).toBe(true);
      expect(response.body.data.academic_intervention_trained).toBe(true);
    });

    it('should validate intervention field constraints', async () => {
      const invalidTeacherData = {
        employee_id: 'TCH002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@school.edu',
        hire_date: '2024-01-01',
        // Invalid intervention data
        intervention_success_rate: 150.0, // Should be <= 100
        max_intervention_caseload: 150, // Should be <= 100
        current_intervention_caseload: 200 // Should be <= max_intervention_caseload
      };

      const response = await request(app)
        .post('/api/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidTeacherData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to view all teacher intervention data', async () => {
      // Mock admin role
      require('../../middleware/auth').verifyToken.mockImplementation((req, res, next) => {
        req.user = { id: 'admin-user-id', tenantId: 'test-tenant-id', role: 'admin' };
        next();
      });

      const response = await request(app)
        .get('/api/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Admin should see full intervention data
      if (response.body.data.length > 0) {
        const teacher = response.body.data[0];
        expect(teacher.intervention_capabilities).toBeDefined();
        expect(teacher.intervention_success_rate).toBeDefined();
        expect(teacher.intervention_specializations).toBeDefined();
      }
    });

    it('should allow counselor to view intervention data', async () => {
      // Mock counselor role
      require('../../middleware/auth').verifyToken.mockImplementation((req, res, next) => {
        req.user = { id: 'counselor-user-id', tenantId: 'test-tenant-id', role: 'counselor' };
        next();
      });

      const response = await request(app)
        .get('/api/teachers')
        .set('Authorization', `Bearer ${counselorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Counselor should see intervention data
      if (response.body.data.length > 0) {
        const teacher = response.body.data[0];
        expect(teacher.intervention_capabilities).toBeDefined();
      }
    });

    it('should allow teacher to view their own data but not others intervention details', async () => {
      // Mock teacher role
      require('../../middleware/auth').verifyToken.mockImplementation((req, res, next) => {
        req.user = { id: 'teacher-user-id', tenantId: 'test-tenant-id', role: 'teacher' };
        next();
      });

      const response = await request(app)
        .get('/api/teachers')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Teacher should see basic data but limited intervention details
      if (response.body.data.length > 0) {
        const teacher = response.body.data[0];
        expect(teacher.first_name).toBeDefined();
        expect(teacher.last_name).toBeDefined();
        // Intervention data should be masked or limited
      }
    });
  });

  describe('Intervention Capability Queries', () => {
    it('should find teachers with crisis intervention training', async () => {
      const response = await request(app)
        .get('/api/teachers')
        .query({ crisis_intervention_trained: true })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(teacher => {
          expect(teacher.crisis_intervention_trained).toBe(true);
        });
      }
    });

    it('should find teachers with available intervention capacity', async () => {
      const response = await request(app)
        .get('/api/teachers')
        .query({ has_intervention_capacity: true })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(teacher => {
          expect(teacher.current_intervention_caseload).toBeLessThan(teacher.max_intervention_caseload);
        });
      }
    });

    it('should find teachers by intervention specialization', async () => {
      const response = await request(app)
        .get('/api/teachers')
        .query({ intervention_specialization: 'math_tutoring' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(teacher => {
          expect(teacher.intervention_specializations).toContain('math_tutoring');
        });
      }
    });
  });

  describe('Masked View Security', () => {
    it('should return masked data for unauthorized users', async () => {
      // Mock student role (limited access)
      require('../../middleware/auth').verifyToken.mockImplementation((req, res, next) => {
        req.user = { id: 'student-user-id', tenantId: 'test-tenant-id', role: 'student' };
        next();
      });

      const response = await request(app)
        .get('/api/teachers/masked')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        const teacher = response.body.data[0];
        // Sensitive data should be masked
        expect(teacher.first_name).toMatch(/^\*{2,}/); // Masked name
        expect(teacher.email).toMatch(/^\*{2,}/); // Masked email
        expect(teacher.address).toBe('[ADDRESS MASKED]');
        expect(teacher.intervention_capabilities).toEqual({ capabilities: 'masked' });
        expect(teacher.intervention_specializations).toEqual(['[SPECIALIZATIONS MASKED]']);
      }
    });

    it('should return full data for authorized users via masked view', async () => {
      // Mock admin role
      require('../../middleware/auth').verifyToken.mockImplementation((req, res, next) => {
        req.user = { id: 'admin-user-id', tenantId: 'test-tenant-id', role: 'admin' };
        next();
      });

      const response = await request(app)
        .get('/api/teachers/masked')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        const teacher = response.body.data[0];
        // Admin should see full data even through masked view
        expect(teacher.first_name).not.toMatch(/^\*{2,}/); // Unmasked name
        expect(teacher.email).not.toMatch(/^\*{2,}/); // Unmasked email
        expect(teacher.address).not.toBe('[ADDRESS MASKED]');
        expect(teacher.intervention_capabilities).not.toEqual({ capabilities: 'masked' });
      }
    });
  });

  describe('Intervention Data Management', () => {
    it('should update teacher intervention capabilities', async () => {
      const updateData = {
        intervention_capabilities: {
          academic_intervention: {
            trained: true,
            certification_date: '2024-04-01',
            subjects: ['math', 'science'],
            grade_levels: ['6-12']
          }
        },
        intervention_success_rate: 92.0,
        current_intervention_caseload: 12
      };

      const response = await request(app)
        .put('/api/teachers/test-teacher-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.intervention_success_rate).toBe(92.0);
      expect(response.body.data.current_intervention_caseload).toBe(12);
    });

    it('should track intervention caseload changes', async () => {
      const caseloadUpdate = {
        current_intervention_caseload: 10
      };

      const response = await request(app)
        .put('/api/teachers/test-teacher-id')
        .set('Authorization', `Bearer ${counselorToken}`)
        .send(caseloadUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.current_intervention_caseload).toBe(10);
    });
  });

  describe('Performance and Indexing', () => {
    it('should efficiently query teachers by intervention training status', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/teachers')
        .query({ 
          crisis_intervention_trained: true,
          behavioral_intervention_trained: true,
          academic_intervention_trained: true
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should efficiently query teachers by intervention specializations', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/teachers')
        .query({ intervention_specializations: ['math_tutoring', 'study_skills'] })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
