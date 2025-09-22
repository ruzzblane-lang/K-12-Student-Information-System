const { Op } = require('sequelize');
const Student = require('../models/Student');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const CourseSection = require('../models/CourseSection');
const Course = require('../models/Course');
const Term = require('../models/Term');

class StudentService {
  // Get all students with pagination and filtering
  async getAllStudents({ page = 1, limit = 10, filters = {} }) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = {};

      // Apply filters
      if (filters.grade) {
        whereClause.grade_id = filters.grade;
      }
      if (filters.status) {
        whereClause.status = filters.status;
      }
      if (filters.search) {
        whereClause[Op.or] = [
          { student_id: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }

      const { count, rows } = await Student.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ['id', 'email', 'first_name', 'last_name', 'phone', 'date_of_birth']
          }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [['created_at', 'DESC']]
      });

      return {
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit),
          has_next: page < Math.ceil(count / limit),
          has_prev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getAllStudents:', error);
      throw error;
    }
  }

  // Get student by ID with full details
  async getStudentById(id) {
    try {
      const student = await Student.findByPk(id, {
        include: [
          {
            model: User,
            attributes: ['id', 'email', 'first_name', 'last_name', 'phone', 'address', 'date_of_birth', 'profile_image_url']
          }
        ]
      });

      return student;
    } catch (error) {
      console.error('Error in getStudentById:', error);
      throw error;
    }
  }

  // Create new student
  async createStudent(studentData) {
    try {
      const student = await Student.create(studentData);
      return await this.getStudentById(student.id);
    } catch (error) {
      console.error('Error in createStudent:', error);
      throw error;
    }
  }

  // Update student information
  async updateStudent(id, updateData) {
    try {
      const [updatedRowsCount] = await Student.update(updateData, {
        where: { id }
      });

      if (updatedRowsCount === 0) {
        return null;
      }

      return await this.getStudentById(id);
    } catch (error) {
      console.error('Error in updateStudent:', error);
      throw error;
    }
  }

  // Delete student (soft delete)
  async deleteStudent(id) {
    try {
      const [updatedRowsCount] = await Student.update(
        { is_active: false },
        { where: { id } }
      );

      return updatedRowsCount > 0;
    } catch (error) {
      console.error('Error in deleteStudent:', error);
      throw error;
    }
  }

  // Get student's grades
  async getStudentGrades(studentId, termId = null) {
    try {
      const whereClause = { student_id: studentId };
      
      const grades = await Grade.findAll({
        where: whereClause,
        include: [
          {
            model: Assignment,
            include: [
              {
                model: CourseSection,
                include: [
                  {
                    model: Course,
                    attributes: ['name', 'code']
                  },
                  {
                    model: Term,
                    attributes: ['name', 'start_date', 'end_date']
                  }
                ]
              }
            ]
          }
        ],
        order: [['graded_at', 'DESC']]
      });

      // Filter by term if specified
      if (termId) {
        return grades.filter(grade => 
          grade.Assignment.CourseSection.term_id === termId
        );
      }

      return grades;
    } catch (error) {
      console.error('Error in getStudentGrades:', error);
      throw error;
    }
  }

  // Get student's attendance
  async getStudentAttendance(studentId, filters = {}) {
    try {
      const whereClause = { student_id: studentId };

      if (filters.start_date) {
        whereClause.date = { [Op.gte]: filters.start_date };
      }
      if (filters.end_date) {
        whereClause.date = { ...whereClause.date, [Op.lte]: filters.end_date };
      }
      if (filters.course_section_id) {
        whereClause.course_section_id = filters.course_section_id;
      }

      const attendance = await Attendance.findAll({
        where: whereClause,
        include: [
          {
            model: CourseSection,
            include: [
              {
                model: Course,
                attributes: ['name', 'code']
              }
            ]
          }
        ],
        order: [['date', 'DESC']]
      });

      return attendance;
    } catch (error) {
      console.error('Error in getStudentAttendance:', error);
      throw error;
    }
  }

  // Get student's enrollments
  async getStudentEnrollments(studentId, termId = null) {
    try {
      const whereClause = { student_id: studentId };

      const enrollments = await Enrollment.findAll({
        where: whereClause,
        include: [
          {
            model: CourseSection,
            include: [
              {
                model: Course,
                attributes: ['name', 'code', 'credits']
              },
              {
                model: Teacher,
                include: [
                  {
                    model: User,
                    attributes: ['first_name', 'last_name']
                  }
                ]
              },
              {
                model: Term,
                attributes: ['name', 'start_date', 'end_date']
              }
            ]
          }
        ],
        order: [['enrollment_date', 'DESC']]
      });

      // Filter by term if specified
      if (termId) {
        return enrollments.filter(enrollment => 
          enrollment.CourseSection.term_id === termId
        );
      }

      return enrollments;
    } catch (error) {
      console.error('Error in getStudentEnrollments:', error);
      throw error;
    }
  }

  // Enroll student in course section
  async enrollStudent(studentId, courseSectionId) {
    try {
      // Check if student is already enrolled
      const existingEnrollment = await Enrollment.findOne({
        where: {
          student_id: studentId,
          course_section_id: courseSectionId,
          status: 'enrolled'
        }
      });

      if (existingEnrollment) {
        throw new Error('Student is already enrolled in this course section');
      }

      // Check if course section has available spots
      const courseSection = await CourseSection.findByPk(courseSectionId);
      if (courseSection.current_enrollment >= courseSection.max_students) {
        throw new Error('Course section is at maximum capacity');
      }

      // Create enrollment
      const enrollment = await Enrollment.create({
        student_id: studentId,
        course_section_id: courseSectionId,
        enrollment_date: new Date(),
        status: 'enrolled'
      });

      // Update course section enrollment count
      await CourseSection.increment('current_enrollment', {
        where: { id: courseSectionId }
      });

      return enrollment;
    } catch (error) {
      console.error('Error in enrollStudent:', error);
      throw error;
    }
  }

  // Unenroll student from course section
  async unenrollStudent(studentId, enrollmentId) {
    try {
      const enrollment = await Enrollment.findOne({
        where: {
          id: enrollmentId,
          student_id: studentId
        }
      });

      if (!enrollment) {
        return false;
      }

      // Update enrollment status
      await enrollment.update({ status: 'dropped' });

      // Decrease course section enrollment count
      await CourseSection.decrement('current_enrollment', {
        where: { id: enrollment.course_section_id }
      });

      return true;
    } catch (error) {
      console.error('Error in unenrollStudent:', error);
      throw error;
    }
  }

  // Get student statistics
  async getStudentStats(studentId) {
    try {
      const [grades, attendance, enrollments] = await Promise.all([
        this.getStudentGrades(studentId),
        this.getStudentAttendance(studentId),
        this.getStudentEnrollments(studentId)
      ]);

      // Calculate GPA
      const totalPoints = grades.reduce((sum, grade) => sum + (grade.points_earned || 0), 0);
      const totalPossiblePoints = grades.reduce((sum, grade) => sum + (grade.Assignment?.total_points || 0), 0);
      const gpa = totalPossiblePoints > 0 ? (totalPoints / totalPossiblePoints) * 4.0 : 0;

      // Calculate attendance percentage
      const totalDays = attendance.length;
      const presentDays = attendance.filter(a => a.status === 'present').length;
      const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        gpa: Math.round(gpa * 100) / 100,
        attendance_percentage: Math.round(attendancePercentage * 100) / 100,
        total_courses: enrollments.filter(e => e.status === 'enrolled').length,
        total_assignments: grades.length,
        total_attendance_days: totalDays
      };
    } catch (error) {
      console.error('Error in getStudentStats:', error);
      throw error;
    }
  }
}

module.exports = new StudentService();
