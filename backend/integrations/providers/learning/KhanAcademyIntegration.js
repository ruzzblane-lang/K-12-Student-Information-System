/**
 * Khan Academy API Integration
 * 
 * Provides integration with Khan Academy services including:
 * - Course content access
 * - Student progress tracking
 * - Exercise completion
 * - Badge and achievement tracking
 * - Teacher dashboard integration
 */

const axios = require('axios');
const winston = require('winston');

class KhanAcademyIntegration {
  constructor() {
    this.name = 'Khan Academy';
    this.provider = 'khan_academy';
    this.version = '1.0.0';
    this.category = 'learning';
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'khan-academy-integration' },
      transports: [
        new winston.transports.File({ filename: 'logs/khan-academy.log' }),
        new winston.transports.Console()
      ]
    });

    this.apiBaseUrl = 'https://www.khanacademy.org/api/v1';
    this.accessToken = null;
  }

  /**
   * Initialize the integration with tenant configuration
   * @param {Object} config - Tenant configuration
   */
  async initialize(config) {
    try {
      const {
        access_token,
        client_id,
        client_secret
      } = config;

      this.accessToken = access_token;

      this.logger.info('Khan Academy integration initialized', {
        clientId: client_id,
        services: ['courses', 'progress', 'exercises', 'badges']
      });

      return { success: true, message: 'Khan Academy integration initialized successfully' };
    } catch (error) {
      this.logger.error('Failed to initialize Khan Academy integration', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Authenticate with Khan Academy
   * @param {Object} config - Authentication configuration
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(config) {
    try {
      if (!this.accessToken) {
        throw new Error('Integration not initialized');
      }

      // Test authentication by getting user info
      const response = await axios.get(`${this.apiBaseUrl}/user`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      this.logger.info('Khan Academy authentication successful', {
        userId: response.data.id,
        username: response.data.username
      });

      return {
        success: true,
        authenticated: true,
        user: {
          id: response.data.id,
          username: response.data.username,
          email: response.data.email,
          nickname: response.data.nickname
        }
      };
    } catch (error) {
      this.logger.error('Khan Academy authentication failed', {
        error: error.message
      });
      return {
        success: false,
        authenticated: false,
        error: error.message
      };
    }
  }

  /**
   * Get available courses
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Courses list
   */
  async getCourses(config, options = {}) {
    try {
      const {
        subject = '',
        grade = '',
        limit = 50
      } = options;

      let url = `${this.apiBaseUrl}/topics`;
      const params = new URLSearchParams();
      
      if (subject) {
        params.append('subject', subject);
      }
      if (grade) {
        params.append('grade', grade);
      }
      params.append('limit', limit);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      this.logger.info('Khan Academy courses retrieved', {
        courseCount: response.data.length,
        subject,
        grade
      });

      return {
        success: true,
        courses: response.data,
        count: response.data.length
      };
    } catch (error) {
      this.logger.error('Failed to get Khan Academy courses', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get student progress
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Progress options
   * @returns {Promise<Object>} Student progress
   */
  async getStudentProgress(config, options) {
    try {
      const {
        studentId,
        courseId = null,
        startDate = null,
        endDate = null
      } = options;

      let url = `${this.apiBaseUrl}/user/${studentId}/progress`;
      const params = new URLSearchParams();
      
      if (courseId) {
        params.append('topic', courseId);
      }
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      this.logger.info('Khan Academy student progress retrieved', {
        studentId,
        courseId,
        progressCount: response.data.length
      });

      return {
        success: true,
        studentId,
        progress: response.data,
        count: response.data.length
      };
    } catch (error) {
      this.logger.error('Failed to get Khan Academy student progress', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get exercise details
   * @param {Object} config - Tenant configuration
   * @param {string} exerciseId - Exercise identifier
   * @returns {Promise<Object>} Exercise details
   */
  async getExercise(config, exerciseId) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/exercises/${exerciseId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      this.logger.info('Khan Academy exercise retrieved', {
        exerciseId,
        title: response.data.title
      });

      return {
        success: true,
        exercise: response.data
      };
    } catch (error) {
      this.logger.error('Failed to get Khan Academy exercise', {
        error: error.message,
        exerciseId
      });
      throw error;
    }
  }

  /**
   * Get student badges
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Badge options
   * @returns {Promise<Object>} Student badges
   */
  async getStudentBadges(config, options) {
    try {
      const {
        studentId,
        badgeType = null,
        limit = 50
      } = options;

      let url = `${this.apiBaseUrl}/user/${studentId}/badges`;
      const params = new URLSearchParams();
      
      if (badgeType) {
        params.append('badge_type', badgeType);
      }
      params.append('limit', limit);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      this.logger.info('Khan Academy student badges retrieved', {
        studentId,
        badgeCount: response.data.length,
        badgeType
      });

      return {
        success: true,
        studentId,
        badges: response.data,
        count: response.data.length
      };
    } catch (error) {
      this.logger.error('Failed to get Khan Academy student badges', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get teacher dashboard data
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Dashboard options
   * @returns {Promise<Object>} Dashboard data
   */
  async getTeacherDashboard(config, options = {}) {
    try {
      const {
        classId = null,
        startDate = null,
        endDate = null
      } = options;

      let url = `${this.apiBaseUrl}/teacher/dashboard`;
      const params = new URLSearchParams();
      
      if (classId) {
        params.append('class_id', classId);
      }
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      this.logger.info('Khan Academy teacher dashboard retrieved', {
        classId,
        studentCount: response.data.students?.length || 0
      });

      return {
        success: true,
        dashboard: response.data
      };
    } catch (error) {
      this.logger.error('Failed to get Khan Academy teacher dashboard', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create assignment
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Assignment options
   * @returns {Promise<Object>} Assignment result
   */
  async createAssignment(config, options) {
    try {
      const {
        title,
        description,
        exerciseIds = [],
        dueDate = null,
        classId = null
      } = options;

      const assignmentData = {
        title: title,
        description: description,
        exercises: exerciseIds,
        due_date: dueDate,
        class_id: classId
      };

      const response = await axios.post(`${this.apiBaseUrl}/assignments`, assignmentData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('Khan Academy assignment created successfully', {
        assignmentId: response.data.id,
        title,
        exerciseCount: exerciseIds.length
      });

      return {
        success: true,
        assignmentId: response.data.id,
        title,
        exerciseCount: exerciseIds.length
      };
    } catch (error) {
      this.logger.error('Failed to create Khan Academy assignment', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get assignment results
   * @param {Object} config - Tenant configuration
   * @param {string} assignmentId - Assignment identifier
   * @returns {Promise<Object>} Assignment results
   */
  async getAssignmentResults(config, assignmentId) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/assignments/${assignmentId}/results`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      this.logger.info('Khan Academy assignment results retrieved', {
        assignmentId,
        resultCount: response.data.length
      });

      return {
        success: true,
        assignmentId,
        results: response.data,
        count: response.data.length
      };
    } catch (error) {
      this.logger.error('Failed to get Khan Academy assignment results', {
        error: error.message,
        assignmentId
      });
      throw error;
    }
  }

  /**
   * Health check for the integration
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      if (!this.accessToken) {
        return {
          status: 'unhealthy',
          message: 'Integration not initialized'
        };
      }

      // Test API connectivity
      await axios.get(`${this.apiBaseUrl}/user`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return {
        status: 'healthy',
        message: 'Khan Academy integration is working properly',
        services: {
          courses: 'available',
          progress: 'available',
          exercises: 'available',
          badges: 'available',
          assignments: 'available'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        services: {
          courses: 'unavailable',
          progress: 'unavailable',
          exercises: 'unavailable',
          badges: 'unavailable',
          assignments: 'unavailable'
        }
      };
    }
  }
}

module.exports = KhanAcademyIntegration;
