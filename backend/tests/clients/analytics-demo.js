#!/usr/bin/env node

/**
 * Analytics Demo Client
 * 
 * This script demonstrates the advanced analytics features including:
 * - At-risk student identification
 * - Attendance trend analysis
 * - Predictive analytics
 * - Alert generation
 * - Dashboard analytics
 */

const axios = require('axios');
const fs = require('fs').promises;

class AnalyticsDemoClient {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000/api',
      tenantSlug: config.tenantSlug || 'springfield',
      email: config.email || 'admin@springfield.edu',
      password: config.password || 'secure-password',
      ...config
    };
    
    this.session = {
      isAuthenticated: false,
      accessToken: null,
      user: null,
      tenant: null
    };
    
    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AnalyticsDemoClient/1.0.0'
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
        if (this.config.tenantSlug) {
          config.headers['X-Tenant-Slug'] = this.config.tenantSlug;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }
  
  async authenticate() {
    console.log('🔐 Authenticating for analytics demo...');
    
    try {
      const response = await this.axios.post('/auth/login', {
        email: this.config.email,
        password: this.config.password,
        tenantSlug: this.config.tenantSlug
      });
      
      if (response.data.success) {
        this.session.isAuthenticated = true;
        this.session.accessToken = response.data.data.accessToken;
        this.session.user = response.data.data.user;
        this.session.tenant = response.data.data.tenant;
        
        console.log(`✅ Authenticated as ${this.session.user.email}`);
        console.log(`🏫 Tenant: ${this.session.tenant.schoolName}`);
        return true;
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }
  
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Demonstrate at-risk student identification
   */
  async demonstrateAtRiskStudents() {
    console.log('\n🎯 === AT-RISK STUDENT IDENTIFICATION ===');
    
    try {
      // Get high-risk students
      console.log('📊 Fetching high-risk students...');
      const highRiskResponse = await this.axios.get('/analytics/students/high-risk?riskLevel=high,critical&includeInterventions=true');
      
      if (highRiskResponse.data.success) {
        const { students, interventions } = highRiskResponse.data.data;
        
        console.log(`\n🚨 Found ${students.length} high-risk students:`);
        
        students.forEach((student, index) => {
          console.log(`\n${index + 1}. ${student.first_name} ${student.last_name} (${student.student_number})`);
          console.log(`   Risk Level: ${student.risk_level.toUpperCase()}`);
          console.log(`   Overall Risk Score: ${student.overall_risk_score}/100`);
          console.log(`   Attendance Risk: ${student.attendance_risk_score}/100`);
          console.log(`   Academic Risk: ${student.academic_risk_score}/100`);
          console.log(`   Behavioral Risk: ${student.behavioral_risk_score}/100`);
          console.log(`   Social Risk: ${student.social_risk_score}/100`);
          console.log(`   Intervention Required: ${student.intervention_required ? 'YES' : 'NO'}`);
          
          if (student.intervention_required && student.intervention_plan) {
            console.log(`   Intervention Plan: ${student.intervention_plan.substring(0, 100)}...`);
          }
        });
        
        if (interventions && interventions.length > 0) {
          console.log(`\n🎯 Students requiring immediate intervention: ${interventions.length}`);
        }
        
        // Get improving students
        console.log('\n📈 Fetching students with improving risk scores...');
        const improvingResponse = await this.axios.get('/analytics/students/improving');
        
        if (improvingResponse.data.success) {
          const improvingStudents = improvingResponse.data.data.students;
          console.log(`\n✅ Found ${improvingStudents.length} students with improving risk scores:`);
          
          improvingStudents.slice(0, 5).forEach((student, index) => {
            console.log(`${index + 1}. ${student.first_name} ${student.last_name}`);
            console.log(`   Improvement: ${student.improvement.toFixed(1)} points`);
            console.log(`   Current Score: ${student.current_score}/100`);
            console.log(`   Previous Score: ${student.previous_score}/100`);
          });
        }
        
      } else {
        console.log('❌ Failed to fetch high-risk students');
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating at-risk students:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Demonstrate attendance analytics
   */
  async demonstrateAttendanceAnalytics() {
    console.log('\n📊 === ATTENDANCE TREND ANALYSIS ===');
    
    try {
      // Get attendance statistics
      console.log('📈 Fetching attendance statistics...');
      const statsResponse = await this.axios.get('/analytics/attendance?periodType=monthly');
      
      if (statsResponse.data.success) {
        const analytics = statsResponse.data.data.analytics;
        console.log(`\n📊 Attendance Analytics (${analytics.length} periods):`);
        
        analytics.slice(0, 6).forEach((period, index) => {
          console.log(`${index + 1}. ${period.analysis_date}: ${period.average_attendance_rate.toFixed(1)}% avg attendance`);
          console.log(`   Students with alerts: ${period.students_with_alerts || 0}`);
          console.log(`   Chronic absentees: ${period.chronic_absentees || 0}`);
        });
      }
      
      // Get students with declining attendance
      console.log('\n📉 Fetching students with declining attendance...');
      const decliningResponse = await this.axios.get('/analytics/attendance/declining?declineThreshold=5&limit=10');
      
      if (decliningResponse.data.success) {
        const _decliningStudents = decliningResponse.data.data.students;
        console.log(`\n⚠️ Found ${_decliningStudents.length} students with declining attendance:`);
        
        decliningStudents.forEach((student, index) => {
          console.log(`${index + 1}. ${student.first_name} ${student.last_name} (${student.student_number})`);
          console.log(`   Current Rate: ${student.current_rate.toFixed(1)}%`);
          console.log(`   Previous Rate: ${student.previous_rate.toFixed(1)}%`);
          console.log(`   Decline: ${student.decline_percentage.toFixed(1)}%`);
        });
      }
      
      // Get attendance predictions for a student
      if (_decliningStudents && _decliningStudents.length > 0) {
        const studentId = _decliningStudents[0].student_id;
        console.log(`\n🔮 Getting attendance predictions for ${_decliningStudents[0].first_name} ${_decliningStudents[0].last_name}...`);
        
        const predictionsResponse = await this.axios.get(`/analytics/attendance/students/${studentId}/predictions?futurePeriods=3`);
        
        if (predictionsResponse.data.success) {
          const predictions = predictionsResponse.data.data.predictions;
          console.log(`\n📈 Attendance Predictions (${predictionsResponse.data.data.confidence} confidence):`);
          
          predictions.forEach((prediction, index) => {
            console.log(`   Period ${prediction.period}: ${prediction.predicted_attendance_rate.toFixed(1)}% (${prediction.confidence} confidence)`);
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating attendance analytics:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Demonstrate dashboard analytics
   */
  async demonstrateDashboardAnalytics() {
    console.log('\n📊 === DASHBOARD ANALYTICS ===');
    
    try {
      // Get dashboard data
      console.log('📈 Fetching comprehensive dashboard data...');
      const dashboardResponse = await this.axios.get('/analytics/dashboard?dashboardType=administrator');
      
      if (dashboardResponse.data.success) {
        const dashboard = dashboardResponse.data.data;
        
        console.log('\n🎯 Risk Assessment Summary:');
        const riskStats = dashboard.risk_statistics;
        console.log(`   Total Assessments: ${riskStats.total_assessments}`);
        console.log(`   High Risk Students: ${riskStats.high_risk_count}`);
        console.log(`   Critical Risk Students: ${riskStats.critical_risk_count}`);
        console.log(`   Average Risk Score: ${riskStats.average_risk_score?.toFixed(1) || 'N/A'}/100`);
        console.log(`   Intervention Required: ${riskStats.intervention_required_count}`);
        
        console.log('\n📊 Attendance Summary:');
        const attendanceStats = dashboard.attendance_statistics;
        console.log(`   Average Attendance Rate: ${attendanceStats.average_attendance_rate?.toFixed(1) || 'N/A'}%`);
        console.log(`   Average Punctuality Rate: ${attendanceStats.average_punctuality_rate?.toFixed(1) || 'N/A'}%`);
        console.log(`   Students with Alerts: ${attendanceStats.students_with_alerts}`);
        console.log(`   Chronic Absentees: ${attendanceStats.chronic_absentees}`);
        console.log(`   Tardiness Concerns: ${attendanceStats.tardiness_concerns}`);
        console.log(`   Declining Trends: ${attendanceStats.declining_trends}`);
        console.log(`   Improving Trends: ${attendanceStats.improving_trends}`);
        
        console.log('\n📚 Grade Summary:');
        const gradeStats = dashboard.grade_statistics;
        console.log(`   Average Grade: ${gradeStats.average_grade?.toFixed(1) || 'N/A'}%`);
        console.log(`   Students with Alerts: ${gradeStats.students_with_alerts}`);
        console.log(`   Failing Risk: ${gradeStats.failing_risk}`);
        console.log(`   Improvement Opportunities: ${gradeStats.improvement_opportunity}`);
        
        // Show high-risk students from dashboard
        if (dashboard.high_risk_students && dashboard.high_risk_students.length > 0) {
          console.log('\n🚨 Top High-Risk Students:');
          dashboard.high_risk_students.slice(0, 3).forEach((student, index) => {
            console.log(`   ${index + 1}. ${student.first_name} ${student.last_name} - Risk: ${student.overall_risk_score}/100 (${student.risk_level})`);
          });
        }
        
        // Show attendance alerts
        if (dashboard.attendance_alerts && dashboard.attendance_alerts.length > 0) {
          console.log('\n⚠️ Attendance Alerts:');
          dashboard.attendance_alerts.slice(0, 3).forEach((alert, index) => {
            console.log(`   ${index + 1}. ${alert.first_name} ${alert.last_name} - Rate: ${alert.attendance_rate}%`);
          });
        }
      }
      
      // Get analytics summary
      console.log('\n📋 Fetching analytics summary...');
      const summaryResponse = await this.axios.get('/analytics/summary?period=30_days');
      
      if (summaryResponse.data.success) {
        const summary = summaryResponse.data.data;
        
        console.log('\n📊 30-Day Analytics Summary:');
        console.log(`   Risk Assessments: ${summary.risk_assessment.total_assessments}`);
        console.log(`   High Risk Students: ${summary.risk_assessment.high_risk_students}`);
        console.log(`   Intervention Required: ${summary.risk_assessment.intervention_required}`);
        console.log(`   Average Attendance: ${summary.attendance.average_attendance_rate?.toFixed(1)}%`);
        console.log(`   Average Grade: ${summary.grades.average_grade?.toFixed(1)}%`);
        console.log(`   Improving Trends: ${summary.grades.improving_trends}`);
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating dashboard analytics:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Demonstrate risk assessment calculation
   */
  async demonstrateRiskAssessment() {
    console.log('\n🧮 === RISK ASSESSMENT CALCULATION ===');
    
    try {
      // First, get a list of students to assess
      console.log('👥 Fetching students for risk assessment...');
      const studentsResponse = await this.axios.get('/students?limit=3');
      
      if (studentsResponse.data.success && studentsResponse.data.data.length > 0) {
        const students = studentsResponse.data.data;
        
        for (const student of students) {
          console.log(`\n🔍 Calculating risk assessment for ${student.first_name} ${student.last_name}...`);
          
          // Calculate risk assessment
          const assessmentResponse = await this.axios.post(`/analytics/students/${student.id}/risk-assessment`, {
            assessmentPeriod: 'monthly'
          });
          
          if (assessmentResponse.data.success) {
            const assessment = assessmentResponse.data.data;
            
            console.log(`   ✅ Assessment completed (Algorithm v${assessment.algorithm_version})`);
            console.log(`   📊 Overall Risk Score: ${assessment.overall_risk_score}/100`);
            console.log(`   🎯 Risk Level: ${assessment.risk_level.toUpperCase()}`);
            console.log(`   📈 Attendance Risk: ${assessment.attendance_risk_score}/100`);
            console.log(`   📚 Academic Risk: ${assessment.academic_risk_score}/100`);
            console.log(`   ⚠️ Behavioral Risk: ${assessment.behavioral_risk_score}/100`);
            console.log(`   👥 Social Risk: ${assessment.social_risk_score}/100`);
            console.log(`   🎯 Intervention Required: ${assessment.intervention_required ? 'YES' : 'NO'}`);
            
            if (assessment.intervention_required) {
              console.log(`   📋 Intervention Plan: ${assessment.intervention_plan?.substring(0, 150)}...`);
            }
            
            // Get detailed analysis if available
            if (assessment.detailedAnalysis) {
              const analysis = assessment.detailedAnalysis;
              console.log('   🔍 Detailed Analysis:');
              console.log(`      - Attendance Issues: ${analysis.attendance.issues.join(', ') || 'None'}`);
              console.log(`      - Academic Issues: ${analysis.academic.issues.join(', ') || 'None'}`);
              console.log(`      - Behavioral Issues: ${analysis.behavioral.issues.join(', ') || 'None'}`);
              console.log(`      - Social Issues: ${analysis.social.issues.join(', ') || 'None'}`);
            }
          } else {
            console.log(`   ❌ Failed to calculate assessment: ${assessmentResponse.data.error.message}`);
          }
          
          await this.sleep(1000); // Brief pause between assessments
        }
      } else {
        console.log('❌ No students found for risk assessment');
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating risk assessment:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Demonstrate batch operations
   */
  async demonstrateBatchOperations() {
    console.log('\n⚡ === BATCH OPERATIONS ===');
    
    try {
      // Start batch assessment
      console.log('🚀 Starting batch risk assessment for all students...');
      const batchResponse = await this.axios.post('/analytics/students/batch-assess', {
        assessmentPeriod: 'monthly'
      });
      
      if (batchResponse.data.success) {
        const jobInfo = batchResponse.data.data;
        console.log('   ✅ Batch assessment started');
        console.log(`   📋 Job ID: ${jobInfo.job_id}`);
        console.log(`   📊 Status: ${jobInfo.status}`);
        console.log(`   📅 Assessment Period: ${jobInfo.assessment_period}`);
        console.log(`   ⏰ Started at: ${batchResponse.data.meta.started_at}`);
        
        console.log('\n   ℹ️ Note: Batch operations run in the background.');
        console.log('   Check system logs or implement job status tracking for completion updates.');
      }
      
    } catch (error) {
      console.error('❌ Error demonstrating batch operations:', error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Generate comprehensive analytics report
   */
  async generateAnalyticsReport() {
    console.log('\n📄 === GENERATING ANALYTICS REPORT ===');
    
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        tenant: {
          id: this.session.tenant.id,
          name: this.session.tenant.schoolName,
          slug: this.session.tenant.slug
        },
        user: {
          id: this.session.user.id,
          email: this.session.user.email,
          role: this.session.user.role
        },
        analytics: {}
      };
      
      // Collect all analytics data
      console.log('📊 Collecting analytics data for report...');
      
      // Risk assessment data
      const riskResponse = await this.axios.get('/analytics/students/high-risk?riskLevel=high,critical');
      if (riskResponse.data.success) {
        reportData.analytics.highRiskStudents = riskResponse.data.data.students;
      }
      
      // Attendance data
      const attendanceResponse = await this.axios.get('/analytics/attendance/declining?declineThreshold=10&limit=20');
      if (attendanceResponse.data.success) {
        reportData.analytics.decliningAttendance = attendanceResponse.data.data.students;
      }
      
      // Dashboard summary
      const summaryResponse = await this.axios.get('/analytics/summary?period=30_days');
      if (summaryResponse.data.success) {
        reportData.analytics.summary = summaryResponse.data.data;
      }
      
      // Save report
      const reportPath = `/tmp/analytics-demo-report-${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
      
      console.log('   ✅ Analytics report generated');
      console.log(`   📄 Report saved to: ${reportPath}`);
      console.log('   📊 Report contains:');
      console.log(`      - High-risk students: ${reportData.analytics.highRiskStudents?.length || 0}`);
      console.log(`      - Declining attendance: ${reportData.analytics.decliningAttendance?.length || 0}`);
      console.log('      - 30-day summary data');
      
      return reportData;
      
    } catch (error) {
      console.error('❌ Error generating analytics report:', error.response?.data?.message || error.message);
      throw error;
    }
  }
  
  /**
   * Run the complete analytics demonstration
   */
  async runDemo() {
    console.log('🚀 Analytics Demo Client - K-12 SIS');
    console.log('=====================================\n');
    
    try {
      // Authenticate
      await this.authenticate();
      
      // Run all demonstrations
      await this.demonstrateAtRiskStudents();
      await this.demonstrateAttendanceAnalytics();
      await this.demonstrateDashboardAnalytics();
      await this.demonstrateRiskAssessment();
      await this.demonstrateBatchOperations();
      await this.generateAnalyticsReport();
      
      console.log('\n🎉 Analytics demonstration completed successfully!');
      console.log('\n📋 Summary of demonstrated features:');
      console.log('   ✅ At-risk student identification');
      console.log('   ✅ Attendance trend analysis');
      console.log('   ✅ Predictive analytics');
      console.log('   ✅ Dashboard analytics');
      console.log('   ✅ Risk assessment calculation');
      console.log('   ✅ Batch operations');
      console.log('   ✅ Comprehensive reporting');
      
      console.log('\n🎯 Key Analytics Capabilities:');
      console.log('   🔍 Multi-factor risk assessment (attendance, academic, behavioral, social)');
      console.log('   📈 Trend analysis and pattern recognition');
      console.log('   🔮 Predictive modeling for student outcomes');
      console.log('   🚨 Automated alert generation');
      console.log('   📊 Real-time dashboard analytics');
      console.log('   ⚡ Batch processing for large-scale analysis');
      console.log('   📄 Comprehensive reporting and insights');
      
    } catch (error) {
      console.error('\n❌ Analytics demonstration failed:', error.message);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const client = new AnalyticsDemoClient({
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
    tenantSlug: process.env.TENANT_SLUG || 'springfield',
    email: process.env.ADMIN_EMAIL || 'admin@springfield.edu',
    password: process.env.ADMIN_PASSWORD || 'secure-password'
  });
  
  await client.runDemo();
}

// Export for use as module
module.exports = AnalyticsDemoClient;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
