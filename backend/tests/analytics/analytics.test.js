/**
 * Analytics Tests
 * 
 * Comprehensive tests for analytics, risk assessment, and predictive features
 */

const request = require('supertest');
const app = require('../../server');
const { generateToken } = require('../../utils/jwt');
const AnalyticsController = require('../../analytics/controllers/analyticsController');
const RiskAssessmentService = require('../../analytics/services/RiskAssessmentService');
const AlertService = require('../../alerts/services/AlertService');

// Mock the database for testing
const mockDb = {
  query: jest.fn()
};

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
  }),
  requireTenant: jest.fn((req, res, next) => {
    req.tenant = { id: 'test-tenant-id', slug: 'test-tenant' };
    next();
  })
}));

jest.mock('../../middleware/rbac', () => ({
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

jest.mock('../../middleware/rateLimiting', () => ({
  analyticsLimiter: jest.fn((req, res, next) => next())
}));

describe('Analytics API', () => {
  let adminToken;
  let analyticsController;
  let riskAssessmentService;
  let alertService;

  beforeAll(() => {
    adminToken = generateToken('admin-user-id', 'test-tenant-id', 'admin');
    analyticsController = new AnalyticsController(mockDb);
    riskAssessmentService = new RiskAssessmentService(mockDb);
    alertService = new AlertService(mockDb);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Risk Assessment', () => {
    describe('GET /api/analytics/students/:studentId/risk-assessment', () => {
      it('should get student risk assessment successfully', async () => {
        const mockAssessment = {
          id: 'assessment-123',
          student_id: 'student-456',
          overall_risk_score: 75.5,
          risk_level: 'high',
          attendance_risk_score: 80,
          academic_risk_score: 70,
          behavioral_risk_score: 60,
          social_risk_score: 50,
          intervention_required: true,
          assessment_date: '2024-01-15'
        };

        mockDb.query.mockResolvedValueOnce({ rows: [mockAssessment] });

        const response = await request(app)
          .get('/api/analytics/students/student-456/risk-assessment')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.assessment).toEqual(mockAssessment);
        expect(response.body.meta.tenant.id).toBe('test-tenant-id');
      });

      it('should return 404 when assessment not found', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/analytics/students/student-456/risk-assessment')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ASSESSMENT_NOT_FOUND');
      });

      it('should include history when requested', async () => {
        const mockAssessment = {
          id: 'assessment-123',
          student_id: 'student-456',
          overall_risk_score: 75.5,
          risk_level: 'high'
        };

        const mockHistory = [
          { assessment_date: '2024-01-15', overall_risk_score: 75.5 },
          { assessment_date: '2024-01-01', overall_risk_score: 80.0 }
        ];

        mockDb.query
          .mockResolvedValueOnce({ rows: [mockAssessment] })
          .mockResolvedValueOnce({ rows: mockHistory });

        const response = await request(app)
          .get('/api/analytics/students/student-456/risk-assessment?includeHistory=true')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.assessment).toEqual(mockAssessment);
        expect(response.body.data.history).toEqual(mockHistory);
      });
    });

    describe('POST /api/analytics/students/:studentId/risk-assessment', () => {
      it('should calculate new risk assessment successfully', async () => {
        const mockStudent = {
          id: 'student-456',
          first_name: 'John',
          last_name: 'Doe',
          grade_level: '10'
        };

        const mockAssessment = {
          id: 'assessment-123',
          student_id: 'student-456',
          overall_risk_score: 75.5,
          risk_level: 'high',
          intervention_required: true,
          algorithm_version: '2.0'
        };

        // Mock student query
        mockDb.query.mockResolvedValueOnce({ rows: [mockStudent] });

        // Mock attendance risk calculation
        mockDb.query.mockResolvedValueOnce({ rows: [] }); // No attendance data
        mockDb.query.mockResolvedValueOnce({ rows: [] }); // No grade data
        mockDb.query.mockResolvedValueOnce({ rows: [{ total_incidents: 0 }] }); // No discipline data
        mockDb.query.mockResolvedValueOnce({ rows: [{ enrollment_count: 3 }] }); // Social data

        // Mock assessment creation
        mockDb.query.mockResolvedValueOnce({ rows: [mockAssessment] });

        const response = await request(app)
          .post('/api/analytics/students/student-456/risk-assessment')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ assessmentPeriod: 'monthly' })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockAssessment);
        expect(response.body.meta.algorithm_version).toBe('2.0');
      });

      it('should return 500 when calculation fails', async () => {
        mockDb.query.mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .post('/api/analytics/students/student-456/risk-assessment')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ assessmentPeriod: 'monthly' })
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CALCULATION_ERROR');
      });
    });

    describe('GET /api/analytics/students/high-risk', () => {
      it('should get high-risk students successfully', async () => {
        const mockHighRiskStudents = [
          {
            id: 'assessment-123',
            student_id: 'student-456',
            first_name: 'John',
            last_name: 'Doe',
            overall_risk_score: 85,
            risk_level: 'high',
            intervention_required: true
          },
          {
            id: 'assessment-124',
            student_id: 'student-789',
            first_name: 'Jane',
            last_name: 'Smith',
            overall_risk_score: 95,
            risk_level: 'critical',
            intervention_required: true
          }
        ];

        mockDb.query.mockResolvedValueOnce({ rows: mockHighRiskStudents });

        const response = await request(app)
          .get('/api/analytics/students/high-risk?riskLevel=high,critical')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.students).toEqual(mockHighRiskStudents);
        expect(response.body.meta.risk_levels).toEqual(['high', 'critical']);
      });

      it('should include interventions when requested', async () => {
        const mockStudents = [
          {
            id: 'assessment-123',
            student_id: 'student-456',
            intervention_required: true
          }
        ];

        mockDb.query.mockResolvedValueOnce({ rows: mockStudents });

        const response = await request(app)
          .get('/api/analytics/students/high-risk?includeInterventions=true')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.interventions).toBeDefined();
      });
    });
  });

  describe('Attendance Analytics', () => {
    describe('GET /api/analytics/attendance', () => {
      it('should get student attendance analytics successfully', async () => {
        const mockAnalytics = [
          {
            analysis_date: '2024-01-15',
            attendance_rate: 85.5,
            punctuality_rate: 90.0,
            attendance_trend: 'stable',
            attendance_alert: false
          }
        ];

        mockDb.query.mockResolvedValueOnce({ rows: mockAnalytics });

        const response = await request(app)
          .get('/api/analytics/attendance?studentId=student-456')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.analytics).toEqual(mockAnalytics);
        expect(response.body.meta.period_type).toBe('monthly');
      });

      it('should get class attendance trends', async () => {
        const mockTrends = [
          {
            analysis_date: '2024-01-15',
            total_students: 25,
            average_attendance_rate: 88.5,
            students_with_alerts: 3
          }
        ];

        mockDb.query.mockResolvedValueOnce({ rows: mockTrends });

        const response = await request(app)
          .get('/api/analytics/attendance?gradeLevel=10&periodType=monthly')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.analytics).toEqual(mockTrends);
      });
    });

    describe('GET /api/analytics/attendance/declining', () => {
      it('should get students with declining attendance', async () => {
        const mockDecliningStudents = [
          {
            student_id: 'student-456',
            first_name: 'John',
            last_name: 'Doe',
            current_rate: 75.0,
            previous_rate: 85.0,
            decline_percentage: 10.0
          }
        ];

        mockDb.query.mockResolvedValueOnce({ rows: mockDecliningStudents });

        const response = await request(app)
          .get('/api/analytics/attendance/declining?declineThreshold=5')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.students).toEqual(mockDecliningStudents);
        expect(response.body.meta.decline_threshold).toBe(5);
      });
    });

    describe('GET /api/analytics/attendance/students/:studentId/predictions', () => {
      it('should get attendance predictions successfully', async () => {
        const mockPredictions = {
          predictions: [
            { period: 1, predicted_attendance_rate: 85.5, confidence: 'high' },
            { period: 2, predicted_attendance_rate: 84.0, confidence: 'high' },
            { period: 3, predicted_attendance_rate: 82.5, confidence: 'medium' }
          ],
          confidence: 'high',
          based_on_trend: 'stable'
        };

        const mockHistory = [
          { attendance_rate: 85.0, attendance_trend: 'stable' },
          { attendance_rate: 86.0, attendance_trend: 'stable' }
        ];

        mockDb.query.mockResolvedValueOnce({ rows: mockHistory });

        const response = await request(app)
          .get('/api/analytics/attendance/students/student-456/predictions?futurePeriods=3')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.predictions).toHaveLength(3);
        expect(response.body.data.confidence).toBe('high');
      });
    });
  });

  describe('Dashboard Data', () => {
    describe('GET /api/analytics/dashboard', () => {
      it('should get dashboard data successfully', async () => {
        const mockDashboardData = {
          risk_statistics: {
            total_assessments: 150,
            high_risk_count: 25,
            critical_risk_count: 5
          },
          attendance_statistics: {
            average_attendance_rate: 88.5,
            students_with_alerts: 12
          },
          grade_statistics: {
            average_grade: 78.5,
            students_with_alerts: 8
          },
          high_risk_students: [],
          attendance_alerts: [],
          declining_attendance: []
        };

        // Mock multiple queries for dashboard data
        mockDb.query
          .mockResolvedValueOnce({ rows: [mockDashboardData.risk_statistics] })
          .mockResolvedValueOnce({ rows: [mockDashboardData.attendance_statistics] })
          .mockResolvedValueOnce({ rows: [mockDashboardData.grade_statistics] })
          .mockResolvedValueOnce({ rows: mockDashboardData.high_risk_students })
          .mockResolvedValueOnce({ rows: mockDashboardData.attendance_alerts })
          .mockResolvedValueOnce({ rows: mockDashboardData.declining_attendance });

        const response = await request(app)
          .get('/api/analytics/dashboard?dashboardType=administrator')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.risk_statistics).toEqual(mockDashboardData.risk_statistics);
        expect(response.body.data.attendance_statistics).toEqual(mockDashboardData.attendance_statistics);
        expect(response.body.data.grade_statistics).toEqual(mockDashboardData.grade_statistics);
      });
    });

    describe('GET /api/analytics/summary', () => {
      it('should get analytics summary successfully', async () => {
        const mockSummary = {
          risk_assessment: {
            total_assessments: 150,
            high_risk_students: 30,
            intervention_required: 25,
            average_risk_score: 45.5
          },
          attendance: {
            average_attendance_rate: 88.5,
            students_with_alerts: 12,
            chronic_absentees: 5,
            declining_trends: 8
          },
          grades: {
            average_grade: 78.5,
            students_with_alerts: 8,
            failing_risk: 3,
            improving_trends: 15
          }
        };

        mockDb.query
          .mockResolvedValueOnce({ rows: [mockSummary.risk_assessment] })
          .mockResolvedValueOnce({ rows: [mockSummary.attendance] })
          .mockResolvedValueOnce({ rows: [mockSummary.grades] });

        const response = await request(app)
          .get('/api/analytics/summary?period=30_days')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockSummary);
      });
    });
  });

  describe('Batch Operations', () => {
    describe('POST /api/analytics/students/batch-assess', () => {
      it('should start batch assessment successfully', async () => {
        const mockStudents = [
          { id: 'student-1' },
          { id: 'student-2' },
          { id: 'student-3' }
        ];

        mockDb.query.mockResolvedValueOnce({ rows: mockStudents });

        const response = await request(app)
          .post('/api/analytics/students/batch-assess')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ assessmentPeriod: 'monthly' })
          .expect(202);

        expect(response.body.success).toBe(true);
        expect(response.body.data.job_id).toBeDefined();
        expect(response.body.data.status).toBe('started');
      });
    });
  });

  describe('Intervention Management', () => {
    describe('PUT /api/analytics/students/:studentId/intervention-plan', () => {
      it('should update intervention plan successfully', async () => {
        const mockUpdatedAssessment = {
          id: 'assessment-123',
          student_id: 'student-456',
          intervention_plan: 'New intervention plan',
          intervention_required: true,
          last_intervention_date: '2024-01-15'
        };

        mockDb.query.mockResolvedValueOnce({ rows: [mockUpdatedAssessment] });

        const response = await request(app)
          .put('/api/analytics/students/student-456/intervention-plan')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            interventionPlan: 'New intervention plan',
            interventionRequired: true,
            lastInterventionDate: '2024-01-15'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockUpdatedAssessment);
      });

      it('should return 404 when assessment not found', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .put('/api/analytics/students/student-456/intervention-plan')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            interventionPlan: 'New intervention plan'
          })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ASSESSMENT_NOT_FOUND');
      });
    });
  });

  describe('Authorization', () => {
    it('should require admin role for batch assessment', async () => {
      const teacherToken = generateToken('teacher-user-id', 'test-tenant-id', 'teacher');

      const response = await request(app)
        .post('/api/analytics/students/batch-assess')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ assessmentPeriod: 'monthly' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
    });

    it('should allow teachers to view analytics', async () => {
      const teacherToken = generateToken('teacher-user-id', 'test-tenant-id', 'teacher');

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/analytics/attendance?studentId=student-456')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

describe('Risk Assessment Service', () => {
  let riskAssessmentService;

  beforeAll(() => {
    riskAssessmentService = new RiskAssessmentService(mockDb);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateStudentRisk', () => {
    it('should calculate comprehensive risk assessment', async () => {
      const mockStudent = {
        id: 'student-456',
        first_name: 'John',
        last_name: 'Doe',
        grade_level: '10'
      };

      // Mock student query
      mockDb.query.mockResolvedValueOnce({ rows: [mockStudent] });

      // Mock attendance risk calculation (no data)
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock academic risk calculation (no data)
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock behavioral risk calculation
      mockDb.query.mockResolvedValueOnce({ rows: [{ total_incidents: 0 }] });

      // Mock social risk calculation
      mockDb.query.mockResolvedValueOnce({ rows: [{ enrollment_count: 3 }] });

      // Mock assessment creation
      const mockAssessment = {
        id: 'assessment-123',
        student_id: 'student-456',
        overall_risk_score: 25.0,
        risk_level: 'low'
      };
      mockDb.query.mockResolvedValueOnce({ rows: [mockAssessment] });

      const result = await riskAssessmentService.calculateStudentRisk(
        'test-tenant-id', 'student-456', 'monthly'
      );

      expect(result).toEqual(mockAssessment);
      expect(mockDb.query).toHaveBeenCalledTimes(6);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        riskAssessmentService.calculateStudentRisk('test-tenant-id', 'student-456')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('calculateAttendanceRisk', () => {
    it('should calculate attendance risk with chronic absenteeism', async () => {
      const mockAttendanceData = [
        {
          attendance_rate: 65.0,
          punctuality_rate: 70.0,
          attendance_trend: 'declining',
          chronic_absenteeism: true,
          tardiness_concern: true
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockAttendanceData });

      const result = await riskAssessmentService.calculateAttendanceRisk(
        'test-tenant-id', 'student-456'
      );

      expect(result.score).toBeGreaterThan(0);
      expect(result.issues).toContain('attendance');
      expect(result.issues).toContain('chronic_absenteeism');
      expect(result.issues).toContain('tardiness');
      expect(result.issues).toContain('declining_attendance');
    });

    it('should return low risk for good attendance', async () => {
      const mockAttendanceData = [
        {
          attendance_rate: 95.0,
          punctuality_rate: 98.0,
          attendance_trend: 'stable',
          chronic_absenteeism: false,
          tardiness_concern: false
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockAttendanceData });

      const result = await riskAssessmentService.calculateAttendanceRisk(
        'test-tenant-id', 'student-456'
      );

      expect(result.score).toBeLessThan(20);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('calculateAcademicRisk', () => {
    it('should calculate high academic risk for failing grades', async () => {
      const mockGradeData = [
        {
          average_grade: 45.0,
          grade_trend: 'critical',
          grade_volatility: 25.0,
          missing_assignments: 8,
          late_assignments: 12,
          failing_risk: true
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockGradeData });

      const result = await riskAssessmentService.calculateAcademicRisk(
        'test-tenant-id', 'student-456'
      );

      expect(result.score).toBeGreaterThan(80);
      expect(result.issues).toContain('failing_grades');
      expect(result.issues).toContain('critical_grades');
      expect(result.issues).toContain('missing_assignments');
      expect(result.issues).toContain('late_assignments');
      expect(result.issues).toContain('unstable_grades');
    });
  });

  describe('batchAssessStudents', () => {
    it('should process all students in batches', async () => {
      const mockStudents = [
        { id: 'student-1' },
        { id: 'student-2' },
        { id: 'student-3' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockStudents });

      // Mock individual assessment calls
      mockDb.query
        .mockResolvedValue({ rows: [{ id: 'student-1' }] }) // Student query
        .mockResolvedValue({ rows: [] }) // Attendance data
        .mockResolvedValue({ rows: [] }) // Grade data
        .mockResolvedValue({ rows: [{ total_incidents: 0 }] }) // Discipline data
        .mockResolvedValue({ rows: [{ enrollment_count: 3 }] }) // Social data
        .mockResolvedValue({ rows: [{ id: 'assessment-1' }] }); // Assessment creation

      const result = await riskAssessmentService.batchAssessStudents(
        'test-tenant-id', 'monthly'
      );

      expect(result.total).toBe(3);
      expect(result.processed).toBe(3);
      expect(result.errors).toBe(0);
    });
  });
});

describe('Alert Service', () => {
  let alertService;

  beforeAll(() => {
    alertService = new AlertService(mockDb);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAtRiskAlerts', () => {
    it('should generate alerts for high-risk students', async () => {
      const mockHighRiskStudents = [
        {
          student_id: 'student-456',
          first_name: 'John',
          last_name: 'Doe',
          student_number: 'STU001',
          overall_risk_score: 85.0,
          risk_level: 'high',
          intervention_required: true
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockHighRiskStudents }) // Get high-risk students
        .mockResolvedValueOnce({ rows: [] }); // Check for existing alerts

      // Mock alert creation
      const mockAlert = {
        id: 'alert-123',
        student_id: 'student-456',
        alert_type: 'risk_assessment',
        alert_level: 'warning',
        title: 'John Doe - At Risk Student Alert'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAlert] });

      const result = await alertService.generateAtRiskAlerts('test-tenant-id');

      expect(result).toHaveLength(1);
      expect(result[0].alert_type).toBe('risk_assessment');
      expect(result[0].alert_level).toBe('warning');
    });

    it('should not create duplicate alerts', async () => {
      const mockHighRiskStudents = [
        {
          student_id: 'student-456',
          first_name: 'John',
          last_name: 'Doe',
          overall_risk_score: 85.0,
          risk_level: 'high'
        }
      ];

      const mockExistingAlert = {
        id: 'existing-alert-123',
        status: 'active'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: mockHighRiskStudents })
        .mockResolvedValueOnce({ rows: [mockExistingAlert] }); // Existing alert found

      const result = await alertService.generateAtRiskAlerts('test-tenant-id');

      expect(result).toHaveLength(0);
    });
  });

  describe('generateAttendanceAlerts', () => {
    it('should generate chronic absenteeism alerts', async () => {
      const mockAttendanceIssues = [
        {
          student_id: 'student-456',
          first_name: 'John',
          last_name: 'Doe',
          student_number: 'STU001',
          attendance_rate: 60.0,
          punctuality_rate: 65.0,
          chronic_absenteeism: true,
          tardiness_concern: true
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockAttendanceIssues })
        .mockResolvedValueOnce({ rows: [] }); // No existing alerts

      const mockAlert = {
        id: 'alert-124',
        alert_type: 'attendance',
        alert_level: 'critical',
        alert_category: 'chronic_absenteeism'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAlert] });

      const result = await alertService.generateAttendanceAlerts('test-tenant-id');

      expect(result).toHaveLength(1);
      expect(result[0].alert_level).toBe('critical');
      expect(result[0].alert_category).toBe('chronic_absenteeism');
    });
  });

  describe('createAlert', () => {
    it('should create alert with notifications', async () => {
      const alertData = {
        studentId: 'student-456',
        alertType: 'attendance',
        alertLevel: 'warning',
        alertCategory: 'attendance_trend',
        title: 'Test Alert',
        message: 'Test message',
        description: 'Test description',
        notifyTeachers: true,
        notifyParents: true,
        notifyAdministrators: false
      };

      const mockAlert = {
        id: 'alert-125',
        ...alertData,
        tenant_id: 'test-tenant-id'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAlert] });

      const result = await alertService.createAlert('test-tenant-id', alertData);

      expect(result).toEqual(mockAlert);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO alerts'),
        expect.arrayContaining(['test-tenant-id', 'student-456'])
      );
    });
  });

  describe('getStudentAlerts', () => {
    it('should get active alerts for a student', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          alert_type: 'attendance',
          alert_level: 'warning',
          status: 'active'
        },
        {
          id: 'alert-2',
          alert_type: 'academic',
          alert_level: 'critical',
          status: 'active'
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockAlerts });

      const result = await alertService.getStudentAlerts(
        'test-tenant-id', 'student-456', { status: 'active' }
      );

      expect(result).toEqual(mockAlerts);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM alerts'),
        expect.arrayContaining(['test-tenant-id', 'student-456', 'active'])
      );
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert successfully', async () => {
      const mockAcknowledgedAlert = {
        id: 'alert-123',
        status: 'acknowledged',
        acknowledged_by: 'user-456',
        acknowledged_at: '2024-01-15T10:00:00Z'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAcknowledgedAlert] });

      const result = await alertService.acknowledgeAlert(
        'test-tenant-id', 'alert-123', 'user-456'
      );

      expect(result).toEqual(mockAcknowledgedAlert);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE alerts'),
        expect.arrayContaining(['user-456', 'test-tenant-id', 'alert-123'])
      );
    });
  });
});
