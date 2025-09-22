const studentService = require('../../services/studentService');
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult: expressValidationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');

class StudentController {
  /**
   * Advanced query validation and sanitization
   */
  static validateAndSanitizeQuery(queryParams) {
    const sanitized = {};
    const errors = [];

    // Validate and sanitize pagination parameters
    if (queryParams.page) {
      const page = parseInt(queryParams.page);
      if (isNaN(page) || page < 1 || page > 10000) {
        errors.push('Page must be a valid number between 1 and 10000');
      } else {
        sanitized.page = page;
      }
    }

    if (queryParams.limit) {
      const limit = parseInt(queryParams.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        errors.push('Limit must be a valid number between 1 and 100');
      } else {
        sanitized.limit = limit;
      }
    }

    // Validate and sanitize grade parameter
    if (queryParams.grade) {
      const grade = queryParams.grade.toString().trim();
      if (!/^[K0-9]|1[0-2]$/.test(grade)) {
        errors.push('Grade must be K, 0-12');
      } else {
        sanitized.grade = grade;
      }
    }

    // Validate and sanitize status parameter
    if (queryParams.status) {
      const status = queryParams.status.toString().trim().toLowerCase();
      const validStatuses = ['active', 'inactive', 'graduated', 'transferred', 'withdrawn'];
      if (!validStatuses.includes(status)) {
        errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
      } else {
        sanitized.status = status;
      }
    }

    // Validate and sanitize search parameter
    if (queryParams.search) {
      const search = DOMPurify.sanitize(queryParams.search.toString().trim());
      if (search.length > 100) {
        errors.push('Search term must be 100 characters or less');
      } else if (search.length < 2) {
        errors.push('Search term must be at least 2 characters');
      } else {
        sanitized.search = search;
      }
    }

    // Validate and sanitize date parameters
    if (queryParams.start_date) {
      if (!validator.isISO8601(queryParams.start_date)) {
        errors.push('Start date must be a valid ISO 8601 date');
      } else {
        sanitized.start_date = queryParams.start_date;
      }
    }

    if (queryParams.end_date) {
      if (!validator.isISO8601(queryParams.end_date)) {
        errors.push('End date must be a valid ISO 8601 date');
      } else {
        sanitized.end_date = queryParams.end_date;
      }
    }

    // Validate UUID parameters
    if (queryParams.term_id) {
      if (!validator.isUUID(queryParams.term_id)) {
        errors.push('Term ID must be a valid UUID');
      } else {
        sanitized.term_id = queryParams.term_id;
      }
    }

    if (queryParams.course_section_id) {
      if (!validator.isUUID(queryParams.course_section_id)) {
        errors.push('Course section ID must be a valid UUID');
      } else {
        sanitized.course_section_id = queryParams.course_section_id;
      }
    }

    return { sanitized, errors };
  }

  /**
   * Rate limiting configuration for sensitive endpoints
   */
  static getRateLimitConfig() {
    return {
      // General rate limit for most endpoints
      general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
          }
        },
        standardHeaders: true,
        legacyHeaders: false,
      }),

      // Strict rate limit for sensitive operations
      strict: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // limit each IP to 10 requests per windowMs
        message: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many sensitive operations, please try again later'
          }
        },
        standardHeaders: true,
        legacyHeaders: false,
      }),

      // Moderate rate limit for read operations
      moderate: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 200, // limit each IP to 200 requests per windowMs
        message: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many read requests, please try again later'
          }
        },
        standardHeaders: true,
        legacyHeaders: false,
      })
    };
  }

  /**
   * Enhanced error handling with logging
   */
  static handleError(error, req, res, operation) {
    console.error(`Error in ${operation}:`, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      tenantId: req.tenant?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      success: false,
      error: {
        code: `${operation.toUpperCase()}_ERROR`,
        message: 'An internal server error occurred',
        ...(isDevelopment && { details: error.message })
      }
    });
  }

  /**
   * Sanitize student data to prevent XSS and injection attacks
   */
  sanitizeStudentData(data) {
    const sanitized = { ...data };

    // Sanitize string fields
    const stringFields = [
      'first_name', 'last_name', 'middle_name', 'preferred_name',
      'address', 'city', 'state', 'zip_code', 'phone', 'email',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
      'parent_guardian_1_name', 'parent_guardian_1_phone', 'parent_guardian_1_email', 'parent_guardian_1_relationship',
      'parent_guardian_2_name', 'parent_guardian_2_phone', 'parent_guardian_2_email', 'parent_guardian_2_relationship',
      'medical_conditions', 'allergies', 'medications', 'special_needs'
    ];

    stringFields.forEach(field => {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        sanitized[field] = DOMPurify.sanitize(sanitized[field].trim());
      }
    });

    // Validate and sanitize email fields
    const emailFields = ['email', 'parent_guardian_1_email', 'parent_guardian_2_email'];
    emailFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = validator.normalizeEmail(sanitized[field]);
        if (!validator.isEmail(sanitized[field])) {
          throw new Error(`Invalid email format for ${field}`);
        }
      }
    });

    // Validate phone numbers
    const phoneFields = ['phone', 'emergency_contact_phone', 'parent_guardian_1_phone', 'parent_guardian_2_phone'];
    phoneFields.forEach(field => {
      if (sanitized[field]) {
        // Remove all non-digit characters except + for international numbers
        sanitized[field] = sanitized[field].replace(/[^\d+]/g, '');
        if (!validator.isMobilePhone(sanitized[field])) {
          throw new Error(`Invalid phone format for ${field}`);
        }
      }
    });

    // Validate date fields
    if (sanitized.date_of_birth) {
      if (!validator.isISO8601(sanitized.date_of_birth)) {
        throw new Error('Invalid date of birth format');
      }
    }

    if (sanitized.enrollment_date) {
      if (!validator.isISO8601(sanitized.enrollment_date)) {
        throw new Error('Invalid enrollment date format');
      }
    }

    if (sanitized.graduation_date) {
      if (!validator.isISO8601(sanitized.graduation_date)) {
        throw new Error('Invalid graduation date format');
      }
    }

    // Validate grade level
    if (sanitized.grade_level) {
      const validGrades = ['K', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      if (!validGrades.includes(sanitized.grade_level)) {
        throw new Error('Invalid grade level');
      }
    }

    // Validate status
    if (sanitized.status) {
      const validStatuses = ['active', 'inactive', 'graduated', 'transferred', 'withdrawn'];
      if (!validStatuses.includes(sanitized.status)) {
        throw new Error('Invalid status');
      }
    }

    return sanitized;
  }

  // GET /api/students
  async getAllStudents(req, res) {
    try {
      // Validate and sanitize query parameters
      const { sanitized, errors } = StudentController.validateAndSanitizeQuery(req.query);
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY_PARAMETERS',
            message: 'Invalid query parameters',
            details: errors
          }
        });
      }

      const { page = 1, limit = 10, grade, status, search } = sanitized;
      
      const filters = {
        grade,
        status,
        search
      };

      const students = await studentService.getAllStudents({
        page,
        limit,
        filters
      });

      res.json({
        success: true,
        data: students.data,
        pagination: students.pagination
      });
    } catch (error) {
      StudentController.handleError(error, req, res, 'getAllStudents');
    }
  }

  // GET /api/students/:id
  async getStudentById(req, res) {
    try {
      const { id } = req.params;
      
      // Validate UUID format
      if (!validator.isUUID(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STUDENT_ID',
            message: 'Student ID must be a valid UUID'
          }
        });
      }

      const student = await studentService.getStudentById(id);

      if (!student) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found'
          }
        });
      }

      res.json({
        success: true,
        data: student
      });
    } catch (error) {
      StudentController.handleError(error, req, res, 'getStudentById');
    }
  }

  // POST /api/students
  async createStudent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      // Sanitize input data
      const studentData = this.sanitizeStudentData(req.body);
      const student = await studentService.createStudent(studentData);

      res.status(201).json({
        success: true,
        data: student,
        message: 'Student created successfully'
      });
    } catch (error) {
      StudentController.handleError(error, req, res, 'createStudent');
    }
  }

  // PUT /api/students/:id
  async updateStudent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { id } = req.params;
      
      // Validate UUID format
      if (!validator.isUUID(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STUDENT_ID',
            message: 'Student ID must be a valid UUID'
          }
        });
      }

      // Sanitize input data
      const updateData = this.sanitizeStudentData(req.body);
      
      const student = await studentService.updateStudent(id, updateData);

      if (!student) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found'
          }
        });
      }

      res.json({
        success: true,
        data: student,
        message: 'Student updated successfully'
      });
    } catch (error) {
      StudentController.handleError(error, req, res, 'updateStudent');
    }
  }

  // DELETE /api/students/:id
  async deleteStudent(req, res) {
    try {
      const { id } = req.params;
      const deleted = await studentService.deleteStudent(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found'
          }
        });
      }

      res.json({
        success: true,
        message: 'Student deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_STUDENT_ERROR',
          message: 'Failed to delete student'
        }
      });
    }
  }

  // GET /api/students/:id/grades
  async getStudentGrades(req, res) {
    try {
      const { id } = req.params;
      const { term_id } = req.query;
      
      const grades = await studentService.getStudentGrades(id, term_id);

      res.json({
        success: true,
        data: grades
      });
    } catch (error) {
      console.error('Error fetching student grades:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_GRADES_ERROR',
          message: 'Failed to fetch student grades'
        }
      });
    }
  }

  // GET /api/students/:id/attendance
  async getStudentAttendance(req, res) {
    try {
      const { id } = req.params;
      const { start_date, end_date, course_section_id } = req.query;
      
      const attendance = await studentService.getStudentAttendance(id, {
        start_date,
        end_date,
        course_section_id
      });

      res.json({
        success: true,
        data: attendance
      });
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ATTENDANCE_ERROR',
          message: 'Failed to fetch student attendance'
        }
      });
    }
  }

  // GET /api/students/:id/enrollments
  async getStudentEnrollments(req, res) {
    try {
      const { id } = req.params;
      const { term_id } = req.query;
      
      const enrollments = await studentService.getStudentEnrollments(id, term_id);

      res.json({
        success: true,
        data: enrollments
      });
    } catch (error) {
      console.error('Error fetching student enrollments:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ENROLLMENTS_ERROR',
          message: 'Failed to fetch student enrollments'
        }
      });
    }
  }

  // POST /api/students/:id/enroll
  async enrollStudent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { id } = req.params;
      const { course_section_id } = req.body;
      
      const enrollment = await studentService.enrollStudent(id, course_section_id);

      res.status(201).json({
        success: true,
        data: enrollment,
        message: 'Student enrolled successfully'
      });
    } catch (error) {
      console.error('Error enrolling student:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ENROLL_STUDENT_ERROR',
          message: 'Failed to enroll student'
        }
      });
    }
  }

  // DELETE /api/students/:id/unenroll/:enrollmentId
  async unenrollStudent(req, res) {
    try {
      const { id, enrollmentId } = req.params;
      
      const unenrolled = await studentService.unenrollStudent(id, enrollmentId);

      if (!unenrolled) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ENROLLMENT_NOT_FOUND',
            message: 'Enrollment not found'
          }
        });
      }

      res.json({
        success: true,
        message: 'Student unenrolled successfully'
      });
    } catch (error) {
      console.error('Error unenrolling student:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UNENROLL_STUDENT_ERROR',
          message: 'Failed to unenroll student'
        }
      });
    }
  }
}

module.exports = new StudentController();
