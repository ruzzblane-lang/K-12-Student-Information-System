/**
 * Analytics Controller
 * 
 * Handles API endpoints for analytics, risk assessment, and predictive insights
 */

const RiskAssessmentService = require('../services/RiskAssessmentService');
const AttendanceAnalytics = require('../models/AttendanceAnalytics');
const GradeAnalytics = require('../models/GradeAnalytics');
const PredictiveModels = require('../models/PredictiveModels');
const Alerts = require('../models/Alerts');

class AnalyticsController {
  constructor(db) {
    this.db = db;
    this.riskAssessmentService = new RiskAssessmentService(db);
    this.attendanceAnalytics = new AttendanceAnalytics(db);
    this.gradeAnalytics = new GradeAnalytics(db);
    this.predictiveModels = new PredictiveModels(db);
    this.alerts = new Alerts(db);
  }

  /**
   * Get student risk assessment
   */
  async getStudentRiskAssessment(req, res) {
    try {
      const { studentId } = req.params;
      const { tenantId } = req.tenant;
      const { includeHistory = false } = req.query;

      const assessment = await this.riskAssessmentService.riskAssessmentModel.getLatestAssessment(tenantId, studentId);

      if (!assessment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ASSESSMENT_NOT_FOUND',
            message: 'No risk assessment found for this student'
          }
        });
      }

      let responseData = { assessment };

      if (includeHistory === 'true') {
        const history = await this.riskAssessmentService.riskAssessmentModel.getAssessmentTrends(tenantId, studentId);
        responseData.history = history;
      }

      res.json({
        success: true,
        data: responseData,
        meta: {
          tenant: { id: tenantId },
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting student risk assessment:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ASSESSMENT_ERROR',
          message: 'Failed to retrieve risk assessment'
        }
      });
    }
  }

  /**
   * Calculate new risk assessment for a student
   */
  async calculateRiskAssessment(req, res) {
    try {
      const { studentId } = req.params;
      const { tenantId } = req.tenant;
      const { assessmentPeriod = 'monthly' } = req.body;

      const assessment = await this.riskAssessmentService.calculateStudentRisk(
        tenantId, studentId, assessmentPeriod
      );

      res.status(201).json({
        success: true,
        data: assessment,
        meta: {
          tenant: { id: tenantId },
          calculated_at: new Date().toISOString(),
          algorithm_version: assessment.algorithm_version
        }
      });

    } catch (error) {
      console.error('Error calculating risk assessment:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: 'Failed to calculate risk assessment'
        }
      });
    }
  }

  /**
   * Get high-risk students
   */
  async getHighRiskStudents(req, res) {
    try {
      const { tenantId } = req.tenant;
      const { 
        riskLevel = 'high,critical',
        limit = 50,
        offset = 0,
        includeInterventions = false
      } = req.query;

      const riskLevels = riskLevel.split(',');
      const students = await this.riskAssessmentService.riskAssessmentModel.getStudentsByRiskLevel(
        tenantId, riskLevels[0], parseInt(limit), parseInt(offset)
      );

      // Get additional students for other risk levels
      for (let i = 1; i < riskLevels.length; i++) {
        const additionalStudents = await this.riskAssessmentService.riskAssessmentModel.getStudentsByRiskLevel(
          tenantId, riskLevels[i], parseInt(limit), parseInt(offset)
        );
        students.push(...additionalStudents);
      }

      let responseData = { students };

      if (includeInterventions === 'true') {
        const interventionRequired = students.filter(s => s.intervention_required);
        responseData.interventions = interventionRequired;
      }

      res.json({
        success: true,
        data: responseData,
        meta: {
          tenant: { id: tenantId },
          total_count: students.length,
          risk_levels: riskLevels,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting high-risk students:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HIGH_RISK_ERROR',
          message: 'Failed to retrieve high-risk students'
        }
      });
    }
  }

  /**
   * Get attendance analytics
   */
  async getAttendanceAnalytics(req, res) {
    try {
      const { tenantId } = req.tenant;
      const { 
        studentId,
        periodType = 'monthly',
        limit = 12,
        includeAlerts = false
      } = req.query;

      let analytics;

      if (studentId) {
        // Get analytics for specific student
        analytics = await this.attendanceAnalytics.getStudentAnalytics(
          tenantId, studentId, periodType, parseInt(limit)
        );
      } else {
        // Get class/grade level analytics
        const { gradeLevel, classId } = req.query;
        analytics = await this.attendanceAnalytics.getClassAttendanceTrends(
          tenantId, gradeLevel, classId, periodType
        );
      }

      let responseData = { analytics };

      if (includeAlerts === 'true') {
        const alerts = await this.attendanceAnalytics.getStudentsWithAlerts(tenantId);
        responseData.alerts = alerts;
      }

      res.json({
        success: true,
        data: responseData,
        meta: {
          tenant: { id: tenantId },
          period_type: periodType,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting attendance analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ATTENDANCE_ANALYTICS_ERROR',
          message: 'Failed to retrieve attendance analytics'
        }
      });
    }
  }

  /**
   * Get students with declining attendance
   */
  async getDecliningAttendance(req, res) {
    try {
      const { tenantId } = req.tenant;
      const { 
        declineThreshold = 10,
        limit = 50
      } = req.query;

      const students = await this.attendanceAnalytics.getDecliningAttendance(
        tenantId, parseInt(declineThreshold), parseInt(limit)
      );

      res.json({
        success: true,
        data: { students },
        meta: {
          tenant: { id: tenantId },
          decline_threshold: declineThreshold,
          total_count: students.length,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting declining attendance:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DECLINING_ATTENDANCE_ERROR',
          message: 'Failed to retrieve declining attendance data'
        }
      });
    }
  }

  /**
   * Get grade analytics
   */
  async getGradeAnalytics(req, res) {
    try {
      const { tenantId } = req.tenant;
      const { 
        studentId,
        periodType = 'monthly',
        limit = 12
      } = req.query;

      let analytics;

      if (studentId) {
        analytics = await this.gradeAnalytics.getStudentAnalytics(
          tenantId, studentId, periodType, parseInt(limit)
        );
      } else {
        // Get class/grade level analytics
        const { gradeLevel, classId } = req.query;
        analytics = await this.gradeAnalytics.getClassGradeTrends(
          tenantId, gradeLevel, classId, periodType
        );
      }

      res.json({
        success: true,
        data: { analytics },
        meta: {
          tenant: { id: tenantId },
          period_type: periodType,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting grade analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GRADE_ANALYTICS_ERROR',
          message: 'Failed to retrieve grade analytics'
        }
      });
    }
  }

  /**
   * Get attendance predictions
   */
  async getAttendancePredictions(req, res) {
    try {
      const { studentId } = req.params;
      const { tenantId } = req.tenant;
      const { futurePeriods = 3 } = req.query;

      const predictions = await this.attendanceAnalytics.getAttendancePredictions(
        tenantId, studentId, parseInt(futurePeriods)
      );

      res.json({
        success: true,
        data: predictions,
        meta: {
          tenant: { id: tenantId },
          student_id: studentId,
          future_periods: futurePeriods,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting attendance predictions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PREDICTION_ERROR',
          message: 'Failed to generate attendance predictions'
        }
      });
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(req, res) {
    try {
      const { tenantId } = req.tenant;
      const { dashboardType = 'administrator' } = req.query;

      // Get various analytics data for dashboard
      const [
        riskStats,
        attendanceStats,
        gradeStats,
        highRiskStudents,
        attendanceAlerts,
        decliningAttendance
      ] = await Promise.all([
        this.riskAssessmentService.riskAssessmentModel.getRiskStatistics(tenantId),
        this.attendanceAnalytics.getAttendanceStatistics(tenantId),
        this.gradeAnalytics.getGradeStatistics(tenantId),
        this.riskAssessmentService.riskAssessmentModel.getHighRiskStudents(tenantId, 10),
        this.attendanceAnalytics.getStudentsWithAlerts(tenantId),
        this.attendanceAnalytics.getDecliningAttendance(tenantId, 5, 10)
      ]);

      const dashboardData = {
        risk_statistics: riskStats,
        attendance_statistics: attendanceStats,
        grade_statistics: gradeStats,
        high_risk_students: highRiskStudents,
        attendance_alerts: attendanceAlerts,
        declining_attendance: decliningAttendance,
        dashboard_type: dashboardType
      };

      res.json({
        success: true,
        data: dashboardData,
        meta: {
          tenant: { id: tenantId },
          dashboard_type: dashboardType,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to retrieve dashboard data'
        }
      });
    }
  }

  /**
   * Get students with improving risk scores
   */
  async getImprovingStudents(req, res) {
    try {
      const { tenantId } = req.tenant;
      const { limit = 50 } = req.query;

      const students = await this.riskAssessmentService.riskAssessmentModel.getImprovingStudents(
        tenantId, parseInt(limit)
      );

      res.json({
        success: true,
        data: { students },
        meta: {
          tenant: { id: tenantId },
          total_count: students.length,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting improving students:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'IMPROVING_STUDENTS_ERROR',
          message: 'Failed to retrieve improving students data'
        }
      });
    }
  }

  /**
   * Batch assess all students
   */
  async batchAssessStudents(req, res) {
    try {
      const { tenantId } = req.tenant;
      const { assessmentPeriod = 'monthly' } = req.body;

      // Start batch assessment in background
      const assessmentPromise = this.riskAssessmentService.batchAssessStudents(
        tenantId, assessmentPeriod
      );

      // Return immediately with job ID
      const jobId = `batch_assessment_${Date.now()}`;

      res.status(202).json({
        success: true,
        data: {
          job_id: jobId,
          status: 'started',
          assessment_period: assessmentPeriod
        },
        meta: {
          tenant: { id: tenantId },
          started_at: new Date().toISOString()
        }
      });

      // Process in background and update status
      assessmentPromise.then(results => {
        console.log(`Batch assessment ${jobId} completed:`, results);
        // Here you could update a job status table or send notifications
      }).catch(error => {
        console.error(`Batch assessment ${jobId} failed:`, error);
      });

    } catch (error) {
      console.error('Error starting batch assessment:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_ASSESSMENT_ERROR',
          message: 'Failed to start batch assessment'
        }
      });
    }
  }

  /**
   * Update intervention plan
   */
  async updateInterventionPlan(req, res) {
    try {
      const { studentId } = req.params;
      const { tenantId } = req.tenant;
      const {
        interventionPlan,
        lastInterventionDate,
        interventionSuccessRate,
        interventionRequired
      } = req.body;

      const interventionData = {
        interventionPlan,
        lastInterventionDate,
        interventionSuccessRate,
        interventionRequired
      };

      const updatedAssessment = await this.riskAssessmentService.riskAssessmentModel.updateIntervention(
        tenantId, studentId, interventionData
      );

      if (!updatedAssessment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ASSESSMENT_NOT_FOUND',
            message: 'No risk assessment found for this student'
          }
        });
      }

      res.json({
        success: true,
        data: updatedAssessment,
        meta: {
          tenant: { id: tenantId },
          student_id: studentId,
          updated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error updating intervention plan:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERVENTION_UPDATE_ERROR',
          message: 'Failed to update intervention plan'
        }
      });
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(req, res) {
    try {
      const { tenantId } = req.tenant;
      const { period = '30_days' } = req.query;

      // Get summary statistics
      const [
        riskStats,
        attendanceStats,
        gradeStats
      ] = await Promise.all([
        this.riskAssessmentService.riskAssessmentModel.getRiskStatistics(tenantId),
        this.attendanceAnalytics.getAttendanceStatistics(tenantId),
        this.gradeAnalytics.getGradeStatistics(tenantId)
      ]);

      const summary = {
        risk_assessment: {
          total_assessments: riskStats.total_assessments,
          high_risk_students: riskStats.high_risk_count + riskStats.critical_risk_count,
          intervention_required: riskStats.intervention_required_count,
          average_risk_score: riskStats.average_risk_score
        },
        attendance: {
          average_attendance_rate: attendanceStats.average_attendance_rate,
          students_with_alerts: attendanceStats.students_with_alerts,
          chronic_absentees: attendanceStats.chronic_absentees,
          declining_trends: attendanceStats.declining_trends
        },
        grades: {
          average_grade: gradeStats.average_grade,
          students_with_alerts: gradeStats.students_with_alerts,
          failing_risk: gradeStats.failing_risk,
          improving_trends: gradeStats.improving_trends
        },
        period: period,
        generated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: summary,
        meta: {
          tenant: { id: tenantId },
          period: period,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting analytics summary:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SUMMARY_ERROR',
          message: 'Failed to retrieve analytics summary'
        }
      });
    }
  }
}

module.exports = AnalyticsController;
