const studentService = require('../../services/studentService');
const { validationResult } = require('express-validator');

class StudentController {
  // GET /api/students
  async getAllStudents(req, res) {
    try {
      const { page = 1, limit = 10, grade, status, search } = req.query;
      
      const filters = {
        grade: grade ? parseInt(grade) : undefined,
        status,
        search
      };

      const students = await studentService.getAllStudents({
        page: parseInt(page),
        limit: parseInt(limit),
        filters
      });

      res.json({
        success: true,
        data: students.data,
        pagination: students.pagination
      });
    } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_STUDENTS_ERROR',
          message: 'Failed to fetch students'
        }
      });
    }
  }

  // GET /api/students/:id
  async getStudentById(req, res) {
    try {
      const { id } = req.params;
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
      console.error('Error fetching student:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_STUDENT_ERROR',
          message: 'Failed to fetch student'
        }
      });
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

      const studentData = req.body;
      const student = await studentService.createStudent(studentData);

      res.status(201).json({
        success: true,
        data: student,
        message: 'Student created successfully'
      });
    } catch (error) {
      console.error('Error creating student:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_STUDENT_ERROR',
          message: 'Failed to create student'
        }
      });
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
      const updateData = req.body;
      
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
      console.error('Error updating student:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_STUDENT_ERROR',
          message: 'Failed to update student'
        }
      });
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
