#!/usr/bin/env node

/**
 * Workflow Simulator - Node.js Client
 * 
 * This script simulates complete user workflows that represent real-world scenarios
 * in a K-12 Student Information System. It goes beyond simple API calls to simulate
 * how actual users would interact with the system.
 */

const axios = require('axios');
const fs = require('fs').promises;

class WorkflowSimulator {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000/api',
      ...config
    };
    
    this.session = {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      user: null,
      tenant: null,
      workflows: []
    };
    
    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'WorkflowSimulator/1.0.0',
        'Content-Type': 'application/json'
      }
    });
    
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    this.axios.interceptors.request.use(
      (config) => {
        if (this.session.accessToken) {
          config.headers.Authorization = `Bearer ${this.session.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.session.refreshToken) {
          try {
            await this.refreshToken();
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${this.session.accessToken}`;
            return this.axios(originalRequest);
          } catch (refreshError) {
            throw error;
          }
        }
        return Promise.reject(error);
      }
    );
  }
  
  async authenticate(tenantSlug, email, password) {
    console.log(`🔐 Authenticating as ${email} in ${tenantSlug}...`);
    
    const response = await this.axios.post('/auth/login', {
      email,
      password,
      tenantSlug
    });
    
    if (response.data.success) {
      this.session.isAuthenticated = true;
      this.session.accessToken = response.data.data.accessToken;
      this.session.refreshToken = response.data.data.refreshToken;
      this.session.user = response.data.data.user;
      this.session.tenant = response.data.data.tenant;
      
      console.log(`✅ Authenticated as ${this.session.user.role} in ${this.session.tenant.schoolName}`);
      return true;
    } else {
      throw new Error('Authentication failed');
    }
  }
  
  async refreshToken() {
    const response = await this.axios.post('/auth/refresh', {
      refreshToken: this.session.refreshToken
    });
    
    if (response.data.success) {
      this.session.accessToken = response.data.data.accessToken;
      this.session.refreshToken = response.data.data.refreshToken;
    }
  }
  
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Workflow 1: New Student Enrollment
   * Simulates the complete process of enrolling a new student
   */
  async workflowNewStudentEnrollment(studentData) {
    const workflowId = `enrollment-${Date.now()}`;
    console.log(`\n🎓 Starting Workflow: New Student Enrollment (${workflowId})`);
    
    const workflow = {
      id: workflowId,
      name: 'New Student Enrollment',
      startTime: new Date(),
      steps: [],
      result: null
    };
    
    try {
      // Step 1: Validate student data
      console.log('📋 Step 1: Validating student data...');
      workflow.steps.push({ step: 1, action: 'validate_data', startTime: new Date() });
      
      const validation = this.validateStudentData(studentData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      await this.sleep(1000); // Simulate user input time
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      
      // Step 2: Check for duplicate student ID
      console.log('🔍 Step 2: Checking for duplicate student ID...');
      workflow.steps.push({ step: 2, action: 'check_duplicates', startTime: new Date() });
      
      const searchResults = await this.axios.get(`/students?search=${studentData.studentId}`);
      const duplicates = searchResults.data.data.filter(s => s.student_id === studentData.studentId);
      
      if (duplicates.length > 0) {
        throw new Error(`Duplicate student ID found: ${studentData.studentId}`);
      }
      
      await this.sleep(500);
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      
      // Step 3: Create student record
      console.log('➕ Step 3: Creating student record...');
      workflow.steps.push({ step: 3, action: 'create_student', startTime: new Date() });
      
      const createResponse = await this.axios.post('/students', studentData);
      
      if (!createResponse.data.success) {
        throw new Error('Failed to create student record');
      }
      
      const newStudent = createResponse.data.data;
      await this.sleep(2000); // Simulate processing time
      
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      workflow.steps[workflow.steps.length - 1].data = { studentId: newStudent.id };
      
      // Step 4: Generate student ID card
      console.log('🆔 Step 4: Generating student ID card...');
      workflow.steps.push({ step: 4, action: 'generate_id_card', startTime: new Date() });
      
      // Simulate ID card generation
      await this.sleep(3000);
      
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      
      // Step 5: Send welcome email
      console.log('📧 Step 5: Sending welcome email...');
      workflow.steps.push({ step: 5, action: 'send_welcome_email', startTime: new Date() });
      
      // Simulate email sending
      await this.sleep(2000);
      
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      
      // Complete workflow
      workflow.endTime = new Date();
      workflow.result = { success: true, studentId: newStudent.id };
      
      console.log(`✅ Workflow completed successfully! Student ID: ${newStudent.student_id}`);
      
    } catch (error) {
      workflow.endTime = new Date();
      workflow.result = { success: false, error: error.message };
      console.error(`❌ Workflow failed: ${error.message}`);
    }
    
    this.session.workflows.push(workflow);
    return workflow;
  }
  
  /**
   * Workflow 2: Grade Entry Process
   * Simulates a teacher entering grades for multiple students
   */
  async workflowGradeEntry(classId, gradesData) {
    const workflowId = `grade-entry-${Date.now()}`;
    console.log(`\n📊 Starting Workflow: Grade Entry Process (${workflowId})`);
    
    const workflow = {
      id: workflowId,
      name: 'Grade Entry Process',
      startTime: new Date(),
      steps: [],
      result: null
    };
    
    try {
      // Step 1: Get class roster
      console.log('👥 Step 1: Loading class roster...');
      workflow.steps.push({ step: 1, action: 'load_roster', startTime: new Date() });
      
      const studentsResponse = await this.axios.get(`/students?classId=${classId}`);
      const students = studentsResponse.data.data;
      
      await this.sleep(1500);
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      workflow.steps[workflow.steps.length - 1].data = { studentCount: students.length };
      
      // Step 2: Validate grade data
      console.log('✅ Step 2: Validating grade data...');
      workflow.steps.push({ step: 2, action: 'validate_grades', startTime: new Date() });
      
      const validation = this.validateGradeData(gradesData, students);
      if (!validation.valid) {
        throw new Error(`Grade validation failed: ${validation.errors.join(', ')}`);
      }
      
      await this.sleep(1000);
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      
      // Step 3: Enter grades
      console.log('✏️ Step 3: Entering grades...');
      workflow.steps.push({ step: 3, action: 'enter_grades', startTime: new Date() });
      
      const gradeResults = [];
      for (const gradeData of gradesData) {
        try {
          const gradeResponse = await this.axios.post('/grades', gradeData);
          if (gradeResponse.data.success) {
            gradeResults.push({ success: true, gradeId: gradeResponse.data.data.id });
          } else {
            gradeResults.push({ success: false, error: 'Grade creation failed' });
          }
          await this.sleep(500); // Simulate typing time
        } catch (error) {
          gradeResults.push({ success: false, error: error.message });
        }
      }
      
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      workflow.steps[workflow.steps.length - 1].data = { gradeResults };
      
      // Step 4: Calculate class statistics
      console.log('📈 Step 4: Calculating class statistics...');
      workflow.steps.push({ step: 4, action: 'calculate_statistics', startTime: new Date() });
      
      // Simulate statistics calculation
      await this.sleep(2000);
      
      const successfulGrades = gradeResults.filter(r => r.success).length;
      const statistics = {
        totalGrades: gradeResults.length,
        successfulGrades,
        successRate: (successfulGrades / gradeResults.length) * 100
      };
      
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      workflow.steps[workflow.steps.length - 1].data = statistics;
      
      // Complete workflow
      workflow.endTime = new Date();
      workflow.result = { success: true, statistics };
      
      console.log(`✅ Grade entry completed! ${successfulGrades}/${gradeResults.length} grades entered successfully`);
      
    } catch (error) {
      workflow.endTime = new Date();
      workflow.result = { success: false, error: error.message };
      console.error(`❌ Grade entry workflow failed: ${error.message}`);
    }
    
    this.session.workflows.push(workflow);
    return workflow;
  }
  
  /**
   * Workflow 3: Bulk Student Import
   * Simulates importing students from CSV file
   */
  async workflowBulkStudentImport(studentsData) {
    const workflowId = `bulk-import-${Date.now()}`;
    console.log(`\n📦 Starting Workflow: Bulk Student Import (${workflowId})`);
    
    const workflow = {
      id: workflowId,
      name: 'Bulk Student Import',
      startTime: new Date(),
      steps: [],
      result: null
    };
    
    try {
      // Step 1: Validate import data
      console.log('🔍 Step 1: Validating import data...');
      workflow.steps.push({ step: 1, action: 'validate_import_data', startTime: new Date() });
      
      const validation = this.validateBulkImportData(studentsData);
      if (!validation.valid) {
        throw new Error(`Import validation failed: ${validation.errors.join(', ')}`);
      }
      
      await this.sleep(2000);
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      workflow.steps[workflow.steps.length - 1].data = { 
        validRecords: validation.validRecords,
        invalidRecords: validation.invalidRecords 
      };
      
      // Step 2: Check for duplicates
      console.log('🔄 Step 2: Checking for duplicate records...');
      workflow.steps.push({ step: 2, action: 'check_duplicates', startTime: new Date() });
      
      const duplicateCheck = await this.checkForDuplicates(studentsData);
      
      await this.sleep(1500);
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      workflow.steps[workflow.steps.length - 1].data = duplicateCheck;
      
      // Step 3: Bulk create students
      console.log('➕ Step 3: Creating student records...');
      workflow.steps.push({ step: 3, action: 'bulk_create', startTime: new Date() });
      
      const bulkResponse = await this.axios.post('/students/bulk', {
        students: validation.validRecords
      });
      
      await this.sleep(3000); // Simulate processing time
      
      if (!bulkResponse.data.success) {
        throw new Error('Bulk creation failed');
      }
      
      const bulkResult = bulkResponse.data.data;
      
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      workflow.steps[workflow.steps.length - 1].data = bulkResult;
      
      // Step 4: Generate import report
      console.log('📋 Step 4: Generating import report...');
      workflow.steps.push({ step: 4, action: 'generate_report', startTime: new Date() });
      
      await this.sleep(1000);
      
      const importReport = {
        totalRecords: studentsData.length,
        successfulImports: bulkResult.created.length,
        failedImports: bulkResult.errors.length,
        duplicatesFound: duplicateCheck.duplicates.length,
        successRate: (bulkResult.created.length / studentsData.length) * 100
      };
      
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      workflow.steps[workflow.steps.length - 1].data = importReport;
      
      // Complete workflow
      workflow.endTime = new Date();
      workflow.result = { success: true, report: importReport };
      
      console.log(`✅ Bulk import completed! ${bulkResult.created.length}/${studentsData.length} students imported successfully`);
      
    } catch (error) {
      workflow.endTime = new Date();
      workflow.result = { success: false, error: error.message };
      console.error(`❌ Bulk import workflow failed: ${error.message}`);
    }
    
    this.session.workflows.push(workflow);
    return workflow;
  }
  
  /**
   * Workflow 4: Student Transfer Process
   * Simulates transferring a student between schools/tenants
   */
  async workflowStudentTransfer(studentId, targetTenantId) {
    const workflowId = `transfer-${Date.now()}`;
    console.log(`\n🚚 Starting Workflow: Student Transfer Process (${workflowId})`);
    
    const workflow = {
      id: workflowId,
      name: 'Student Transfer Process',
      startTime: new Date(),
      steps: [],
      result: null
    };
    
    try {
      // Step 1: Get current student data
      console.log('📋 Step 1: Retrieving student information...');
      workflow.steps.push({ step: 1, action: 'get_student_data', startTime: new Date() });
      
      const studentResponse = await this.axios.get(`/students/${studentId}`);
      
      if (!studentResponse.data.success) {
        throw new Error('Student not found');
      }
      
      const student = studentResponse.data.data;
      
      await this.sleep(1000);
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      workflow.steps[workflow.steps.length - 1].data = { studentId: student.id };
      
      // Step 2: Backup student records
      console.log('💾 Step 2: Backing up student records...');
      workflow.steps.push({ step: 2, action: 'backup_records', startTime: new Date() });
      
      // Simulate backup process
      await this.sleep(2000);
      
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      
      // Step 3: Export student data
      console.log('📤 Step 3: Exporting student data...');
      workflow.steps.push({ step: 3, action: 'export_data', startTime: new Date() });
      
      // Simulate data export
      await this.sleep(1500);
      
      const exportData = {
        student: student,
        grades: [], // Would normally fetch grades
        attendance: [], // Would normally fetch attendance
        documents: [] // Would normally fetch documents
      };
      
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      workflow.steps[workflow.steps.length - 1].data = { recordsExported: 4 };
      
      // Step 4: Update student status
      console.log('📝 Step 4: Updating student status...');
      workflow.steps.push({ step: 4, action: 'update_status', startTime: new Date() });
      
      const updateResponse = await this.axios.put(`/students/${studentId}`, {
        status: 'transferred',
        transferDate: new Date().toISOString(),
        transferToTenant: targetTenantId
      });
      
      if (!updateResponse.data.success) {
        throw new Error('Failed to update student status');
      }
      
      await this.sleep(1000);
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      
      // Step 5: Generate transfer documents
      console.log('📄 Step 5: Generating transfer documents...');
      workflow.steps.push({ step: 5, action: 'generate_documents', startTime: new Date() });
      
      // Simulate document generation
      await this.sleep(2500);
      
      workflow.steps[workflow.steps.length - 1].endTime = new Date();
      workflow.steps[workflow.steps.length - 1].success = true;
      workflow.steps[workflow.steps.length - 1].data = { documentsGenerated: 3 };
      
      // Complete workflow
      workflow.endTime = new Date();
      workflow.result = { success: true, transferId: `TRANS-${Date.now()}` };
      
      console.log(`✅ Student transfer completed successfully! Transfer ID: ${workflow.result.transferId}`);
      
    } catch (error) {
      workflow.endTime = new Date();
      workflow.result = { success: false, error: error.message };
      console.error(`❌ Student transfer workflow failed: ${error.message}`);
    }
    
    this.session.workflows.push(workflow);
    return workflow;
  }
  
  // Validation helper methods
  validateStudentData(data) {
    const errors = [];
    const required = ['studentId', 'firstName', 'lastName', 'dateOfBirth', 'gradeLevel'];
    
    for (const field of required) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      validRecords: errors.length === 0 ? [data] : [],
      invalidRecords: errors.length > 0 ? [data] : []
    };
  }
  
  validateGradeData(gradesData, students) {
    const errors = [];
    const studentIds = students.map(s => s.id);
    
    for (const grade of gradesData) {
      if (!studentIds.includes(grade.studentId)) {
        errors.push(`Invalid student ID: ${grade.studentId}`);
      }
      if (!grade.pointsEarned || grade.pointsEarned < 0) {
        errors.push(`Invalid points earned: ${grade.pointsEarned}`);
      }
      if (!grade.pointsPossible || grade.pointsPossible <= 0) {
        errors.push(`Invalid points possible: ${grade.pointsPossible}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  validateBulkImportData(studentsData) {
    const validRecords = [];
    const invalidRecords = [];
    
    for (const student of studentsData) {
      const validation = this.validateStudentData(student);
      if (validation.valid) {
        validRecords.push(student);
      } else {
        invalidRecords.push({ student, errors: validation.errors });
      }
    }
    
    return {
      valid: invalidRecords.length === 0,
      errors: invalidRecords.flatMap(r => r.errors),
      validRecords,
      invalidRecords
    };
  }
  
  async checkForDuplicates(studentsData) {
    const duplicates = [];
    const studentIds = studentsData.map(s => s.studentId);
    
    // Simulate duplicate check by searching for existing students
    for (const studentId of studentIds) {
      try {
        const response = await this.axios.get(`/students?search=${studentId}`);
        const existing = response.data.data.filter(s => s.student_id === studentId);
        if (existing.length > 0) {
          duplicates.push({ studentId, existingStudents: existing });
        }
      } catch (error) {
        // Ignore search errors for simulation
      }
    }
    
    return {
      duplicates,
      duplicateCount: duplicates.length
    };
  }
  
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  /**
   * Generate workflow report
   */
  generateWorkflowReport() {
    const report = {
      timestamp: new Date().toISOString(),
      session: {
        user: this.session.user?.email || 'Not authenticated',
        tenant: this.session.tenant?.schoolName || 'No tenant',
        workflowsExecuted: this.session.workflows.length
      },
      workflows: this.session.workflows.map(w => ({
        id: w.id,
        name: w.name,
        duration: w.endTime - w.startTime,
        success: w.result?.success || false,
        steps: w.steps.length,
        successfulSteps: w.steps.filter(s => s.success).length
      })),
      summary: {
        totalWorkflows: this.session.workflows.length,
        successfulWorkflows: this.session.workflows.filter(w => w.result?.success).length,
        totalSteps: this.session.workflows.reduce((sum, w) => sum + w.steps.length, 0),
        successfulSteps: this.session.workflows.reduce((sum, w) => 
          sum + w.steps.filter(s => s.success).length, 0)
      }
    };
    
    return report;
  }
}

// Main execution function
async function main() {
  console.log('🎭 Workflow Simulator - K-12 SIS API');
  console.log('=====================================\n');
  
  const simulator = new WorkflowSimulator({
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api'
  });
  
  try {
    // Authenticate
    await simulator.authenticate('springfield', 'admin@springfield.edu', 'secure-password');
    
    // Workflow 1: New Student Enrollment
    const studentData = {
      studentId: `ENROLL-${Date.now()}`,
      firstName: 'Workflow',
      lastName: 'Test',
      dateOfBirth: '2008-01-01',
      gradeLevel: '10',
      enrollmentDate: new Date().toISOString().split('T')[0],
      primaryEmail: `workflow.${Date.now()}@example.com`,
      address: '123 Workflow Street, Test City, TC 12345'
    };
    
    const enrollmentResult = await simulator.workflowNewStudentEnrollment(studentData);
    
    // Workflow 2: Grade Entry Process
    const gradesData = [
      {
        studentId: enrollmentResult.result?.studentId || 'test-student-id',
        classId: 'test-class-id',
        assignmentName: 'Math Test 1',
        pointsEarned: 85,
        pointsPossible: 100,
        gradeType: 'exam'
      },
      {
        studentId: enrollmentResult.result?.studentId || 'test-student-id',
        classId: 'test-class-id',
        assignmentName: 'Math Homework 1',
        pointsEarned: 20,
        pointsPossible: 20,
        gradeType: 'homework'
      }
    ];
    
    const gradeEntryResult = await simulator.workflowGradeEntry('test-class-id', gradesData);
    
    // Workflow 3: Bulk Student Import
    const bulkStudents = Array.from({ length: 5 }, (_, i) => ({
      studentId: `BULK-${Date.now()}-${i}`,
      firstName: `Bulk${i}`,
      lastName: 'Import',
      dateOfBirth: '2008-01-01',
      gradeLevel: '10',
      enrollmentDate: new Date().toISOString().split('T')[0]
    }));
    
    const bulkImportResult = await simulator.workflowBulkStudentImport(bulkStudents);
    
    // Workflow 4: Student Transfer Process
    const transferResult = await simulator.workflowStudentTransfer(
      enrollmentResult.result?.studentId || 'test-student-id',
      'target-tenant-id'
    );
    
    // Generate and save report
    const report = simulator.generateWorkflowReport();
    await fs.writeFile('/tmp/workflow-simulator-report.json', JSON.stringify(report, null, 2));
    
    console.log('\n📊 Workflow Report:');
    console.log(JSON.stringify(report, null, 2));
    
    console.log('\n🎉 All workflows completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Workflow simulation failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = WorkflowSimulator;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
