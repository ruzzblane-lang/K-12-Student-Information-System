/**
 * Analytics Routes
 * 
 * API routes for analytics, risk assessment, and predictive insights
 */

const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const auth = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const rateLimiting = require('../../middleware/rateLimiting');

// Initialize controller
const analyticsController = new AnalyticsController();

// Apply middleware
router.use(auth.verifyToken);
router.use(auth.requireTenant);
router.use(rateLimiting.analyticsLimiter);

/**
 * Risk Assessment Routes
 */

// Get student risk assessment
router.get('/students/:studentId/risk-assessment', 
  rbac.requireRole(['admin', 'teacher', 'counselor']),
  analyticsController.getStudentRiskAssessment.bind(analyticsController)
);

// Calculate new risk assessment
router.post('/students/:studentId/risk-assessment',
  rbac.requireRole(['admin', 'teacher', 'counselor']),
  analyticsController.calculateRiskAssessment.bind(analyticsController)
);

// Get high-risk students
router.get('/students/high-risk',
  rbac.requireRole(['admin', 'teacher', 'counselor']),
  analyticsController.getHighRiskStudents.bind(analyticsController)
);

// Get students with improving risk scores
router.get('/students/improving',
  rbac.requireRole(['admin', 'teacher', 'counselor']),
  analyticsController.getImprovingStudents.bind(analyticsController)
);

// Update intervention plan
router.put('/students/:studentId/intervention-plan',
  rbac.requireRole(['admin', 'teacher', 'counselor']),
  analyticsController.updateInterventionPlan.bind(analyticsController)
);

// Batch assess all students
router.post('/students/batch-assess',
  rbac.requireRole(['admin']),
  analyticsController.batchAssessStudents.bind(analyticsController)
);

/**
 * Attendance Analytics Routes
 */

// Get attendance analytics
router.get('/attendance',
  rbac.requireRole(['admin', 'teacher', 'counselor']),
  analyticsController.getAttendanceAnalytics.bind(analyticsController)
);

// Get students with declining attendance
router.get('/attendance/declining',
  rbac.requireRole(['admin', 'teacher', 'counselor']),
  analyticsController.getDecliningAttendance.bind(analyticsController)
);

// Get attendance predictions for a student
router.get('/attendance/students/:studentId/predictions',
  rbac.requireRole(['admin', 'teacher', 'counselor']),
  analyticsController.getAttendancePredictions.bind(analyticsController)
);

/**
 * Grade Analytics Routes
 */

// Get grade analytics
router.get('/grades',
  rbac.requireRole(['admin', 'teacher', 'counselor']),
  analyticsController.getGradeAnalytics.bind(analyticsController)
);

/**
 * Dashboard and Summary Routes
 */

// Get analytics dashboard data
router.get('/dashboard',
  rbac.requireRole(['admin', 'teacher', 'counselor']),
  analyticsController.getDashboardData.bind(analyticsController)
);

// Get analytics summary
router.get('/summary',
  rbac.requireRole(['admin', 'teacher', 'counselor']),
  analyticsController.getAnalyticsSummary.bind(analyticsController)
);

module.exports = router;
