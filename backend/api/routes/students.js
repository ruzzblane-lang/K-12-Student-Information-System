/**
 * Student Routes with Enhanced Security and Validation
 * Demonstrates the implementation of rate limiting, validation, and sanitization
 */

const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../../middleware/auth');
const rbacMiddleware = require('../../middleware/rbac');
const tenantContextMiddleware = require('../../middleware/tenantContext');
const { 
  createStudentValidation,
  updateStudentValidation,
  studentIdValidation,
  enrollmentValidation,
  unenrollmentValidation,
  studentListQueryValidation,
  gradesQueryValidation,
  attendanceQueryValidation,
  enrollmentsQueryValidation,
  handleValidationErrors
} = require('../../middleware/studentValidation');
const { 
  general, 
  strict, 
  moderate,
  createRoleBasedRateLimit 
} = require('../../middleware/rateLimiting');

// Apply authentication and tenant context to all routes
router.use(authMiddleware);
router.use(tenantContextMiddleware);

// Role-based rate limiting for student operations
const studentRateLimit = createRoleBasedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Base limit for unauthenticated users
  superAdmin: 1000, // Super admins get 10x the limit
  tenantAdmin: 500, // Tenant admins get 5x the limit
  principal: 300, // Principals get 3x the limit
  teacher: 200, // Teachers get 2x the limit
  message: 'Too many student-related requests, please try again later'
});

// Apply role-based rate limiting to all student routes
router.use(studentRateLimit);

/**
 * @route GET /api/students
 * @desc Get all students with pagination and filtering
 * @access Private (Teacher, Principal, Tenant Admin, Super Admin)
 */
router.get('/',
  rbacMiddleware(['teacher', 'principal', 'tenant_admin', 'super_admin']),
  moderate, // Additional moderate rate limiting for read operations
  studentListQueryValidation,
  handleValidationErrors,
  studentController.getAllStudents
);

/**
 * @route GET /api/students/:id
 * @desc Get student by ID
 * @access Private (Teacher, Principal, Tenant Admin, Super Admin)
 */
router.get('/:id',
  rbacMiddleware(['teacher', 'principal', 'tenant_admin', 'super_admin']),
  moderate, // Additional moderate rate limiting for read operations
  studentIdValidation,
  handleValidationErrors,
  studentController.getStudentById
);

/**
 * @route POST /api/students
 * @desc Create a new student
 * @access Private (Principal, Tenant Admin, Super Admin)
 */
router.post('/',
  rbacMiddleware(['principal', 'tenant_admin', 'super_admin']),
  strict, // Strict rate limiting for sensitive operations
  createStudentValidation,
  handleValidationErrors,
  studentController.createStudent
);

/**
 * @route PUT /api/students/:id
 * @desc Update student information
 * @access Private (Principal, Tenant Admin, Super Admin)
 */
router.put('/:id',
  rbacMiddleware(['principal', 'tenant_admin', 'super_admin']),
  strict, // Strict rate limiting for sensitive operations
  studentIdValidation,
  updateStudentValidation,
  handleValidationErrors,
  studentController.updateStudent
);

/**
 * @route DELETE /api/students/:id
 * @desc Delete a student (soft delete)
 * @access Private (Tenant Admin, Super Admin)
 */
router.delete('/:id',
  rbacMiddleware(['tenant_admin', 'super_admin']),
  strict, // Strict rate limiting for sensitive operations
  studentIdValidation,
  handleValidationErrors,
  studentController.deleteStudent
);

/**
 * @route GET /api/students/:id/grades
 * @desc Get student grades with pagination
 * @access Private (Teacher, Principal, Tenant Admin, Super Admin)
 */
router.get('/:id/grades',
  rbacMiddleware(['teacher', 'principal', 'tenant_admin', 'super_admin']),
  moderate, // Additional moderate rate limiting for read operations
  gradesQueryValidation,
  handleValidationErrors,
  studentController.getStudentGrades
);

/**
 * @route GET /api/students/:id/attendance
 * @desc Get student attendance with pagination
 * @access Private (Teacher, Principal, Tenant Admin, Super Admin)
 */
router.get('/:id/attendance',
  rbacMiddleware(['teacher', 'principal', 'tenant_admin', 'super_admin']),
  moderate, // Additional moderate rate limiting for read operations
  attendanceQueryValidation,
  handleValidationErrors,
  studentController.getStudentAttendance
);

/**
 * @route GET /api/students/:id/enrollments
 * @desc Get student enrollments with pagination
 * @access Private (Teacher, Principal, Tenant Admin, Super Admin)
 */
router.get('/:id/enrollments',
  rbacMiddleware(['teacher', 'principal', 'tenant_admin', 'super_admin']),
  moderate, // Additional moderate rate limiting for read operations
  enrollmentsQueryValidation,
  handleValidationErrors,
  studentController.getStudentEnrollments
);

/**
 * @route POST /api/students/:id/enroll
 * @desc Enroll student in a course section
 * @access Private (Principal, Tenant Admin, Super Admin)
 */
router.post('/:id/enroll',
  rbacMiddleware(['principal', 'tenant_admin', 'super_admin']),
  strict, // Strict rate limiting for sensitive operations
  enrollmentValidation,
  handleValidationErrors,
  studentController.enrollStudent
);

/**
 * @route DELETE /api/students/:id/unenroll/:enrollmentId
 * @desc Unenroll student from a course section
 * @access Private (Principal, Tenant Admin, Super Admin)
 */
router.delete('/:id/unenroll/:enrollmentId',
  rbacMiddleware(['principal', 'tenant_admin', 'super_admin']),
  strict, // Strict rate limiting for sensitive operations
  unenrollmentValidation,
  handleValidationErrors,
  studentController.unenrollStudent
);

module.exports = router;