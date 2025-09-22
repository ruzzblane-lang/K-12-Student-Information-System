#!/usr/bin/env node

/**
 * Frontend Simulator - Node.js Client
 * 
 * This script simulates real frontend behavior by performing complete user workflows
 * that a web application would perform when interacting with the K-12 SIS API.
 * 
 * Features:
 * - Complete authentication flow with token refresh
 * - Realistic user session management
 * - Multi-tenant switching simulation
 * - Student management workflows
 * - Error handling and retry logic
 * - Performance monitoring
 * - Realistic delays and user behavior patterns
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class FrontendSimulator {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000/api',
      tenantSlug: config.tenantSlug || 'springfield',
      email: config.email || 'admin@springfield.edu',
      password: config.password || 'secure-password',
      userAgent: 'FrontendSimulator/1.0.0',
      requestTimeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
    
    this.session = {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      user: null,
      tenant: null,
      lastActivity: null,
      requestsCount: 0,
      errorsCount: 0
    };
    
    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.requestTimeout,
      headers: {
        'User-Agent': this.config.userAgent,
        'Content-Type': 'application/json'
      }
    });
    
    // Add request interceptor for authentication
    this.axios.interceptors.request.use(
      (config) => {
        if (this.session.accessToken) {
          config.headers.Authorization = `Bearer ${this.session.accessToken}`;
        }
        if (this.config.tenantSlug) {
          config.headers['X-Tenant-Slug'] = this.config.tenantSlug;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => {
        this.session.requestsCount++;
        this.session.lastActivity = new Date();
        return response;
      },
      async (error) => {
        this.session.errorsCount++;
        
        // Handle token expiration
        if (error.response?.status === 401 && this.session.refreshToken) {
          console.log('🔄 Token expired, attempting refresh...');
          try {
            await this.refreshToken();
            // Retry the original request
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${this.session.accessToken}`;
            return this.axios(originalRequest);
          } catch (refreshError) {
            console.log('❌ Token refresh failed, re-authenticating...');
            await this.authenticate();
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${this.session.accessToken}`;
            return this.axios(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Authenticate user and establish session
   */
  async authenticate() {
    console.log('🔐 Authenticating user...');
    
    try {
      const response = await this.axios.post('/auth/login', {
        email: this.config.email,
        password: this.config.password,
        tenantSlug: this.config.tenantSlug
      });
      
      if (response.data.success) {
        this.session.isAuthenticated = true;
        this.session.accessToken = response.data.data.accessToken;
        this.session.refreshToken = response.data.data.refreshToken;
        this.session.user = response.data.data.user;
        this.session.tenant = response.data.data.tenant;
        this.session.lastActivity = new Date();
        
        console.log(`✅ Authenticated as ${this.session.user.email}`);
        console.log(`🏫 Tenant: ${this.session.tenant.schoolName}`);
        return true;
      } else {
        throw new Error('Authentication failed: ' + response.data.message);
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }
  
  /**
   * Refresh access token
   */
  async refreshToken() {
    if (!this.session.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await this.axios.post('/auth/refresh', {
      refreshToken: this.session.refreshToken
    });
    
    if (response.data.success) {
      this.session.accessToken = response.data.data.accessToken;
      this.session.refreshToken = response.data.data.refreshToken;
      console.log('✅ Token refreshed successfully');
    } else {
      throw new Error('Token refresh failed');
    }
  }
  
  /**
   * Get current user information
   */
  async getCurrentUser() {
    console.log('👤 Getting current user info...');
    
    const response = await this.axios.get('/auth/me');
    
    if (response.data.success) {
      this.session.user = response.data.data.user;
      this.session.tenant = response.data.data.tenant;
      console.log(`👤 User: ${this.session.user.firstName} ${this.session.user.lastName}`);
      console.log(`🎭 Role: ${this.session.user.role}`);
      return response.data.data;
    } else {
      throw new Error('Failed to get user info');
    }
  }
  
  /**
   * Simulate student dashboard loading
   */
  async loadStudentDashboard() {
    console.log('📊 Loading student dashboard...');
    
    const startTime = Date.now();
    
    try {
      // Load students with pagination
      const studentsResponse = await this.axios.get('/students?page=1&limit=20&sort=last_name:asc');
      
      // Load student statistics
      const statsResponse = await this.axios.get('/students/statistics');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`✅ Dashboard loaded in ${loadTime}ms`);
      console.log(`📈 Found ${studentsResponse.data.data.length} students`);
      console.log(`📊 Total students: ${statsResponse.data.data.total}`);
      
      return {
        students: studentsResponse.data.data,
        statistics: statsResponse.data.data,
        loadTime
      };
    } catch (error) {
      console.error('❌ Failed to load dashboard:', error.response?.data?.message || error.message);
      throw error;
    }
  }
  
  /**
   * Simulate student search workflow
   */
  async searchStudents(searchTerm, filters = {}) {
    console.log(`🔍 Searching students for: "${searchTerm}"`);
    
    const startTime = Date.now();
    
    try {
      let url = `/students?search=${encodeURIComponent(searchTerm)}`;
      
      // Add filters
      if (filters.gradeLevel) {
        url += `&gradeLevel=${filters.gradeLevel}`;
      }
      if (filters.status) {
        url += `&status=${filters.status}`;
      }
      if (filters.limit) {
        url += `&limit=${filters.limit}`;
      }
      
      const response = await this.axios.get(url);
      const searchTime = Date.now() - startTime;
      
      console.log(`✅ Search completed in ${searchTime}ms`);
      console.log(`🎯 Found ${response.data.data.length} matching students`);
      
      return {
        results: response.data.data,
        searchTime,
        totalResults: response.data.meta?.pagination?.total || response.data.data.length
      };
    } catch (error) {
      console.error('❌ Search failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }
  
  /**
   * Simulate student creation workflow
   */
  async createStudent(studentData) {
    console.log(`➕ Creating new student: ${studentData.firstName} ${studentData.lastName}`);
    
    const startTime = Date.now();
    
    try {
      const response = await this.axios.post('/students', studentData);
      const createTime = Date.now() - startTime;
      
      if (response.data.success) {
        console.log(`✅ Student created in ${createTime}ms`);
        console.log(`🆔 Student ID: ${response.data.data.id}`);
        console.log(`🎓 Student ID: ${response.data.data.student_id}`);
        
        return {
          student: response.data.data,
          createTime
        };
      } else {
        throw new Error('Student creation failed');
      }
    } catch (error) {
      console.error('❌ Student creation failed:', error.response?.data?.message || error.message);
      if (error.response?.data?.details) {
        console.error('📝 Validation errors:', error.response.data.details);
      }
      throw error;
    }
  }
  
  /**
   * Simulate student update workflow
   */
  async updateStudent(studentId, updateData) {
    console.log(`✏️ Updating student: ${studentId}`);
    
    const startTime = Date.now();
    
    try {
      // First get the current student data
      const getResponse = await this.axios.get(`/students/${studentId}`);
      const currentStudent = getResponse.data.data;
      
      // Then update with new data
      const updateResponse = await this.axios.put(`/students/${studentId}`, updateData);
      const updateTime = Date.now() - startTime;
      
      if (updateResponse.data.success) {
        console.log(`✅ Student updated in ${updateTime}ms`);
        console.log(`📝 Updated fields: ${Object.keys(updateData).join(', ')}`);
        
        return {
          student: updateResponse.data.data,
          updateTime,
          changes: updateData
        };
      } else {
        throw new Error('Student update failed');
      }
    } catch (error) {
      console.error('❌ Student update failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }
  
  /**
   * Simulate bulk operations workflow
   */
  async bulkCreateStudents(studentsData) {
    console.log(`📦 Bulk creating ${studentsData.length} students...`);
    
    const startTime = Date.now();
    
    try {
      const response = await this.axios.post('/students/bulk', {
        students: studentsData
      });
      
      const bulkTime = Date.now() - startTime;
      
      if (response.data.success) {
        const { created, errors } = response.data.data;
        
        console.log(`✅ Bulk operation completed in ${bulkTime}ms`);
        console.log(`✅ Created: ${created.length} students`);
        console.log(`❌ Errors: ${errors.length} failures`);
        
        if (errors.length > 0) {
          console.log('📝 Error details:');
          errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.error}`);
          });
        }
        
        return {
          created,
          errors,
          bulkTime,
          successRate: created.length / studentsData.length
        };
      } else {
        throw new Error('Bulk operation failed');
      }
    } catch (error) {
      console.error('❌ Bulk creation failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }
  
  /**
   * Simulate file upload workflow
   */
  async uploadStudentDocument(studentId, documentPath, documentType) {
    console.log(`📎 Uploading document for student: ${studentId}`);
    
    try {
      const FormData = require('form-data');
      const form = new FormData();
      
      // Create a sample document if path doesn't exist
      if (!await this.fileExists(documentPath)) {
        await this.createSampleDocument(documentPath);
      }
      
      form.append('file', await fs.readFile(documentPath));
      form.append('documentType', documentType);
      form.append('description', `Sample ${documentType} document`);
      
      const response = await this.axios.post(`/students/${studentId}/documents`, form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${this.session.accessToken}`
        }
      });
      
      if (response.data.success) {
        console.log('✅ Document uploaded successfully');
        console.log(`📁 File: ${response.data.data.filename}`);
        console.log(`🔗 URL: ${response.data.data.url}`);
        
        return response.data.data;
      } else {
        throw new Error('Document upload failed');
      }
    } catch (error) {
      console.error('❌ Document upload failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }
  
  /**
   * Simulate logout workflow
   */
  async logout() {
    console.log('👋 Logging out...');
    
    try {
      await this.axios.post('/auth/logout', {
        refreshToken: this.session.refreshToken
      });
      
      this.session = {
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        user: null,
        tenant: null,
        lastActivity: null,
        requestsCount: 0,
        errorsCount: 0
      };
      
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.warn('⚠️ Logout request failed, but clearing local session');
      this.session.isAuthenticated = false;
    }
  }
  
  /**
   * Simulate realistic user session with delays
   */
  async simulateUserSession(duration = 300000) { // 5 minutes default
    console.log(`🎭 Starting user session simulation (${duration / 1000}s)...`);
    
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    while (Date.now() < endTime) {
      try {
        // Randomly choose an action
        const actions = [
          () => this.loadStudentDashboard(),
          () => this.searchStudents('test'),
          () => this.getCurrentUser(),
          () => this.loadStudentDashboard() // More likely action
        ];
        
        const action = actions[Math.floor(Math.random() * actions.length)];
        await action();
        
        // Simulate realistic delay between actions (1-5 seconds)
        const delay = Math.random() * 4000 + 1000;
        await this.sleep(delay);
        
      } catch (error) {
        console.error('❌ Action failed during session simulation:', error.message);
        await this.sleep(2000); // Wait before retry
      }
    }
    
    const sessionTime = Date.now() - startTime;
    console.log(`✅ Session simulation completed (${sessionTime}ms)`);
    console.log('📊 Session stats:');
    console.log(`  - Requests made: ${this.session.requestsCount}`);
    console.log(`  - Errors encountered: ${this.session.errorsCount}`);
    console.log(`  - Success rate: ${((this.session.requestsCount - this.session.errorsCount) / this.session.requestsCount * 100).toFixed(1)}%`);
  }
  
  /**
   * Generate session report
   */
  generateSessionReport() {
    const report = {
      timestamp: new Date().toISOString(),
      config: {
        baseUrl: this.config.baseUrl,
        tenantSlug: this.config.tenantSlug,
        email: this.config.email
      },
      session: {
        isAuthenticated: this.session.isAuthenticated,
        user: this.session.user?.email || 'Not authenticated',
        tenant: this.session.tenant?.schoolName || 'No tenant',
        requestsCount: this.session.requestsCount,
        errorsCount: this.session.errorsCount,
        successRate: this.session.requestsCount > 0 ? 
          ((this.session.requestsCount - this.session.errorsCount) / this.session.requestsCount * 100).toFixed(1) + '%' : 'N/A',
        lastActivity: this.session.lastActivity
      }
    };
    
    return report;
  }
  
  // Utility methods
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async createSampleDocument(filePath) {
    const sampleContent = `Sample Document
This is a test document created by the Frontend Simulator.
Generated at: ${new Date().toISOString()}
Student ID: TEST-STUDENT
Document Type: Test Document
`;
    await fs.writeFile(filePath, sampleContent);
  }
}

// Main execution function
async function main() {
  console.log('🚀 Frontend Simulator - K-12 SIS API');
  console.log('=====================================\n');
  
  const simulator = new FrontendSimulator({
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
    tenantSlug: process.env.TENANT_SLUG || 'springfield',
    email: process.env.ADMIN_EMAIL || 'admin@springfield.edu',
    password: process.env.ADMIN_PASSWORD || 'secure-password'
  });
  
  try {
    // Authenticate
    await simulator.authenticate();
    
    // Get current user
    await simulator.getCurrentUser();
    
    // Load dashboard
    const dashboard = await simulator.loadStudentDashboard();
    
    // Search for students
    const searchResults = await simulator.searchStudents('test', { gradeLevel: '10', limit: 5 });
    
    // Create a new student
    const newStudent = await simulator.createStudent({
      studentId: `SIM${Date.now()}`,
      firstName: 'Simulator',
      lastName: 'Test',
      dateOfBirth: '2008-01-01',
      gradeLevel: '10',
      enrollmentDate: new Date().toISOString().split('T')[0],
      primaryEmail: `simulator.${Date.now()}@example.com`
    });
    
    // Update the student
    await simulator.updateStudent(newStudent.student.id, {
      preferredName: 'Sim',
      primaryPhone: '555-123-4567'
    });
    
    // Bulk create students
    const bulkStudents = Array.from({ length: 3 }, (_, i) => ({
      studentId: `BULK${Date.now()}-${i}`,
      firstName: `Bulk${i}`,
      lastName: 'Student',
      dateOfBirth: '2008-01-01',
      gradeLevel: '10',
      enrollmentDate: new Date().toISOString().split('T')[0]
    }));
    
    await simulator.bulkCreateStudents(bulkStudents);
    
    // Upload a document
    const documentPath = '/tmp/sample-document.txt';
    await simulator.uploadStudentDocument(newStudent.student.id, documentPath, 'transcript');
    
    // Simulate user session
    await simulator.simulateUserSession(30000); // 30 seconds
    
    // Generate and save report
    const report = simulator.generateSessionReport();
    await fs.writeFile('/tmp/frontend-simulator-report.json', JSON.stringify(report, null, 2));
    
    console.log('\n📊 Session Report:');
    console.log(JSON.stringify(report, null, 2));
    
    // Logout
    await simulator.logout();
    
    console.log('\n🎉 Frontend simulation completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Frontend simulation failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = FrontendSimulator;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
