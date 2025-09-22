const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const { studentValidation } = require('../middleware/validationSchemas');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /api/students - Get list of students
router.get('/', 
  authMiddleware.requireRole(['admin', 'teacher']),
  studentController.getAllStudents
);

// GET /api/students/:id - Get student by ID
router.get('/:id', 
  authMiddleware.requireRole(['admin', 'teacher', 'parent']),
  studentController.getStudentById
);

// POST /api/students - Create new student (admin only)
router.post('/', 
  authMiddleware.requireRole(['admin']),
  validationMiddleware.validate(studentValidation.create),
  studentController.createStudent
);

// PUT /api/students/:id - Update student information
router.put('/:id', 
  authMiddleware.requireRole(['admin']),
  validationMiddleware.validate(studentValidation.update),
  studentController.updateStudent
);

// DELETE /api/students/:id - Delete student (admin only)
router.delete('/:id', 
  authMiddleware.requireRole(['admin']),
  studentController.deleteStudent
);

// GET /api/students/:id/grades - Get student's grades
router.get('/:id/grades', 
  authMiddleware.requireRole(['admin', 'teacher', 'parent']),
  studentController.getStudentGrades
);

// GET /api/students/:id/attendance - Get student's attendance
router.get('/:id/attendance', 
  authMiddleware.requireRole(['admin', 'teacher', 'parent']),
  studentController.getStudentAttendance
);

// GET /api/students/:id/enrollments - Get student's course enrollments
router.get('/:id/enrollments', 
  authMiddleware.requireRole(['admin', 'teacher', 'parent']),
  studentController.getStudentEnrollments
);

// POST /api/students/:id/enroll - Enroll student in course
router.post('/:id/enroll', 
  authMiddleware.requireRole(['admin']),
  validationMiddleware.validate(studentValidation.enroll),
  studentController.enrollStudent
);

// DELETE /api/students/:id/unenroll/:enrollmentId - Unenroll student from course
router.delete('/:id/unenroll/:enrollmentId', 
  authMiddleware.requireRole(['admin']),
  studentController.unenrollStudent
);

module.exports = router;
