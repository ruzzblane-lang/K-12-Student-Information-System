/**
 * Risk Assessment Service
 * 
 * This service implements algorithms for identifying at-risk students
 * based on academic, attendance, behavioral, and social factors.
 */

class RiskAssessmentService {
  constructor(db) {
    this.db = db;
    this.StudentRiskAssessment = require('../models/StudentRiskAssessment');
    this.AttendanceAnalytics = require('../models/AttendanceAnalytics');
    this.GradeAnalytics = require('../models/GradeAnalytics');
    
    this.riskAssessmentModel = new this.StudentRiskAssessment(db);
    this.attendanceAnalytics = new this.AttendanceAnalytics(db);
    this.gradeAnalytics = new this.GradeAnalytics(db);
  }

  /**
   * Calculate comprehensive risk assessment for a student
   */
  async calculateStudentRisk(tenantId, studentId, assessmentPeriod = 'monthly') {
    try {
      // Get student data
      const studentQuery = `
        SELECT s.*, u.email, u.first_name, u.last_name
        FROM students s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.tenant_id = $1 AND s.id = $2
      `;
      
      const studentResult = await this.db.query(studentQuery, [tenantId, studentId]);
      if (studentResult.rows.length === 0) {
        throw new Error('Student not found');
      }
      
      const student = studentResult.rows[0];

      // Calculate attendance risk score
      const attendanceRisk = await this.calculateAttendanceRisk(tenantId, studentId);
      
      // Calculate academic risk score
      const academicRisk = await this.calculateAcademicRisk(tenantId, studentId);
      
      // Calculate behavioral risk score
      const behavioralRisk = await this.calculateBehavioralRisk(tenantId, studentId);
      
      // Calculate social risk score
      const socialRisk = await this.calculateSocialRisk(tenantId, studentId);

      // Calculate overall risk score (weighted average)
      const overallRiskScore = this.calculateOverallRiskScore({
        attendance: attendanceRisk.score,
        academic: academicRisk.score,
        behavioral: behavioralRisk.score,
        social: socialRisk.score
      });

      // Determine risk level
      const riskLevel = this.determineRiskLevel(overallRiskScore);

      // Check if intervention is required
      const interventionRequired = riskLevel === 'high' || riskLevel === 'critical' || 
                                  attendanceRisk.issues.length > 0 || 
                                  academicRisk.issues.length > 0;

      // Create risk assessment record
      const assessmentData = {
        attendanceRiskScore: attendanceRisk.score,
        academicRiskScore: academicRisk.score,
        behavioralRiskScore: behavioralRisk.score,
        socialRiskScore: socialRisk.score,
        overallRiskScore,
        riskLevel,
        attendanceIssues: attendanceRisk.issues.includes('attendance'),
        gradeDecline: academicRisk.issues.includes('grade_decline'),
        frequentTardiness: attendanceRisk.issues.includes('tardiness'),
        disciplineIssues: behavioralRisk.issues.includes('discipline'),
        socialIsolation: socialRisk.issues.includes('social_isolation'),
        familyIssues: socialRisk.issues.includes('family_issues'),
        assessmentPeriod,
        algorithmVersion: '2.0',
        interventionRequired,
        interventionPlan: interventionRequired ? this.generateInterventionPlan({
          attendance: attendanceRisk,
          academic: academicRisk,
          behavioral: behavioralRisk,
          social: socialRisk
        }) : null
      };

      const assessment = await this.riskAssessmentModel.createAssessment(
        tenantId, studentId, assessmentData
      );

      return {
        ...assessment,
        detailedAnalysis: {
          attendance: attendanceRisk,
          academic: academicRisk,
          behavioral: behavioralRisk,
          social: socialRisk
        }
      };

    } catch (error) {
      console.error('Error calculating student risk:', error);
      throw error;
    }
  }

  /**
   * Calculate attendance risk score
   */
  async calculateAttendanceRisk(tenantId, studentId) {
    try {
      // Get recent attendance data
      const attendanceQuery = `
        SELECT 
          attendance_rate,
          punctuality_rate,
          attendance_trend,
          chronic_absenteeism,
          tardiness_concern,
          frequent_absence_days
        FROM attendance_analytics
        WHERE tenant_id = $1 AND student_id = $2
        ORDER BY analysis_date DESC
        LIMIT 3
      `;

      const result = await this.db.query(attendanceQuery, [tenantId, studentId]);
      
      if (result.rows.length === 0) {
        return { score: 0, issues: [], confidence: 'low' };
      }

      const recent = result.rows[0];
      let riskScore = 0;
      const issues = [];

      // Attendance rate risk (0-40 points)
      if (recent.attendance_rate < 70) {
        riskScore += 40;
        issues.push('attendance');
      } else if (recent.attendance_rate < 85) {
        riskScore += 20;
      }

      // Chronic absenteeism (0-25 points)
      if (recent.chronic_absenteeism) {
        riskScore += 25;
        issues.push('chronic_absenteeism');
      }

      // Tardiness concerns (0-15 points)
      if (recent.tardiness_concern) {
        riskScore += 15;
        issues.push('tardiness');
      }

      // Attendance trend (0-20 points)
      if (recent.attendance_trend === 'declining') {
        riskScore += 20;
        issues.push('declining_attendance');
      } else if (recent.attendance_trend === 'critical') {
        riskScore += 30;
        issues.push('critical_attendance');
      }

      return {
        score: Math.min(100, riskScore),
        issues,
        confidence: result.rows.length >= 2 ? 'high' : 'medium',
        details: {
          attendanceRate: recent.attendance_rate,
          punctualityRate: recent.punctuality_rate,
          trend: recent.attendance_trend,
          chronicAbsenteeism: recent.chronic_absenteeism,
          tardinessConcern: recent.tardiness_concern
        }
      };

    } catch (error) {
      console.error('Error calculating attendance risk:', error);
      return { score: 0, issues: [], confidence: 'low', error: error.message };
    }
  }

  /**
   * Calculate academic risk score
   */
  async calculateAcademicRisk(tenantId, studentId) {
    try {
      // Get recent grade analytics
      const gradeQuery = `
        SELECT 
          average_grade,
          grade_trend,
          grade_volatility,
          grade_decline_probability,
          failing_risk,
          missing_assignments,
          late_assignments
        FROM grade_analytics
        WHERE tenant_id = $1 AND student_id = $2
        ORDER BY analysis_date DESC
        LIMIT 3
      `;

      const result = await this.db.query(gradeQuery, [tenantId, studentId]);
      
      if (result.rows.length === 0) {
        return { score: 0, issues: [], confidence: 'low' };
      }

      const recent = result.rows[0];
      let riskScore = 0;
      const issues = [];

      // Average grade risk (0-35 points)
      if (recent.average_grade < 60) {
        riskScore += 35;
        issues.push('failing_grades');
      } else if (recent.average_grade < 70) {
        riskScore += 25;
        issues.push('low_grades');
      } else if (recent.average_grade < 80) {
        riskScore += 15;
      }

      // Grade decline risk (0-25 points)
      if (recent.grade_trend === 'declining') {
        riskScore += 25;
        issues.push('grade_decline');
      } else if (recent.grade_trend === 'critical') {
        riskScore += 35;
        issues.push('critical_grades');
      }

      // Missing assignments (0-20 points)
      if (recent.missing_assignments > 5) {
        riskScore += 20;
        issues.push('missing_assignments');
      } else if (recent.missing_assignments > 2) {
        riskScore += 10;
      }

      // Late assignments (0-10 points)
      if (recent.late_assignments > 10) {
        riskScore += 10;
        issues.push('late_assignments');
      } else if (recent.late_assignments > 5) {
        riskScore += 5;
      }

      // Grade volatility (0-10 points)
      if (recent.grade_volatility > 20) {
        riskScore += 10;
        issues.push('unstable_grades');
      }

      return {
        score: Math.min(100, riskScore),
        issues,
        confidence: result.rows.length >= 2 ? 'high' : 'medium',
        details: {
          averageGrade: recent.average_grade,
          gradeTrend: recent.grade_trend,
          gradeVolatility: recent.grade_volatility,
          missingAssignments: recent.missing_assignments,
          lateAssignments: recent.late_assignments,
          failingRisk: recent.failing_risk
        }
      };

    } catch (error) {
      console.error('Error calculating academic risk:', error);
      return { score: 0, issues: [], confidence: 'low', error: error.message };
    }
  }

  /**
   * Calculate behavioral risk score
   */
  async calculateBehavioralRisk(tenantId, studentId) {
    try {
      // Get discipline records (assuming we have a discipline table)
      const disciplineQuery = `
        SELECT 
          COUNT(*) as total_incidents,
          COUNT(CASE WHEN incident_type = 'major' THEN 1 END) as major_incidents,
          COUNT(CASE WHEN incident_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_incidents,
          MAX(incident_date) as last_incident_date
        FROM discipline_incidents
        WHERE tenant_id = $1 AND student_id = $2
      `;

      const result = await this.db.query(disciplineQuery, [tenantId, studentId]);
      const discipline = result.rows[0];
      
      let riskScore = 0;
      const issues = [];

      // Recent incidents (0-40 points)
      if (discipline.recent_incidents > 3) {
        riskScore += 40;
        issues.push('frequent_discipline');
      } else if (discipline.recent_incidents > 1) {
        riskScore += 20;
        issues.push('discipline');
      }

      // Major incidents (0-30 points)
      if (discipline.major_incidents > 1) {
        riskScore += 30;
        issues.push('major_discipline');
      } else if (discipline.major_incidents > 0) {
        riskScore += 15;
      }

      // Total incidents (0-30 points)
      if (discipline.total_incidents > 10) {
        riskScore += 30;
        issues.push('chronic_discipline');
      } else if (discipline.total_incidents > 5) {
        riskScore += 15;
      }

      return {
        score: Math.min(100, riskScore),
        issues,
        confidence: discipline.total_incidents > 0 ? 'high' : 'medium',
        details: {
          totalIncidents: discipline.total_incidents,
          majorIncidents: discipline.major_incidents,
          recentIncidents: discipline.recent_incidents,
          lastIncidentDate: discipline.last_incident_date
        }
      };

    } catch (error) {
      // If discipline table doesn't exist, return low risk
      console.warn('Discipline table not found, returning low behavioral risk');
      return { 
        score: 0, 
        issues: [], 
        confidence: 'low',
        details: {
          totalIncidents: 0,
          majorIncidents: 0,
          recentIncidents: 0,
          lastIncidentDate: null
        }
      };
    }
  }

  /**
   * Calculate social risk score
   */
  async calculateSocialRisk(tenantId, studentId) {
    try {
      // This would typically involve more complex social network analysis
      // For now, we'll use basic indicators
      
      const socialQuery = `
        SELECT 
          s.primary_email,
          s.emergency_contact_name,
          s.emergency_contact_phone,
          s.medical_conditions,
          s.allergies,
          COUNT(e.id) as enrollment_count
        FROM students s
        LEFT JOIN enrollments e ON s.id = e.student_id
        WHERE s.tenant_id = $1 AND s.id = $2
        GROUP BY s.id, s.primary_email, s.emergency_contact_name, 
                 s.emergency_contact_phone, s.medical_conditions, s.allergies
      `;

      const result = await this.db.query(socialQuery, [tenantId, studentId]);
      
      if (result.rows.length === 0) {
        return { score: 0, issues: [], confidence: 'low' };
      }

      const student = result.rows[0];
      let riskScore = 0;
      const issues = [];

      // Limited social connections (0-25 points)
      if (student.enrollment_count < 2) {
        riskScore += 25;
        issues.push('limited_engagement');
      }

      // Missing emergency contact info (0-20 points)
      if (!student.emergency_contact_name || !student.emergency_contact_phone) {
        riskScore += 20;
        issues.push('missing_emergency_info');
      }

      // Medical conditions that might affect social engagement (0-15 points)
      if (student.medical_conditions && student.medical_conditions.includes('social')) {
        riskScore += 15;
        issues.push('medical_social_concerns');
      }

      // No email contact (0-10 points)
      if (!student.primary_email) {
        riskScore += 10;
        issues.push('no_contact_info');
      }

      return {
        score: Math.min(100, riskScore),
        issues,
        confidence: 'medium',
        details: {
          enrollmentCount: student.enrollment_count,
          hasEmergencyContact: !!(student.emergency_contact_name && student.emergency_contact_phone),
          hasEmail: !!student.primary_email,
          medicalConditions: student.medical_conditions
        }
      };

    } catch (error) {
      console.error('Error calculating social risk:', error);
      return { score: 0, issues: [], confidence: 'low', error: error.message };
    }
  }

  /**
   * Calculate overall risk score with weights
   */
  calculateOverallRiskScore(riskScores) {
    const weights = {
      attendance: 0.35,  // 35% weight
      academic: 0.40,    // 40% weight
      behavioral: 0.15,  // 15% weight
      social: 0.10       // 10% weight
    };

    const weightedScore = 
      (riskScores.attendance * weights.attendance) +
      (riskScores.academic * weights.academic) +
      (riskScores.behavioral * weights.behavioral) +
      (riskScores.social * weights.social);

    return Math.round(weightedScore * 100) / 100;
  }

  /**
   * Determine risk level based on overall score
   */
  determineRiskLevel(overallScore) {
    if (overallScore >= 80) return 'critical';
    if (overallScore >= 60) return 'high';
    if (overallScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Generate intervention plan based on risk factors
   */
  generateInterventionPlan(riskFactors) {
    const interventions = [];

    // Attendance interventions
    if (riskFactors.attendance.issues.includes('attendance')) {
      interventions.push({
        type: 'attendance_support',
        priority: 'high',
        description: 'Implement attendance monitoring and support system',
        actions: [
          'Daily attendance check-ins',
          'Parent/guardian notification system',
          'Attendance improvement plan'
        ]
      });
    }

    // Academic interventions
    if (riskFactors.academic.issues.includes('grade_decline')) {
      interventions.push({
        type: 'academic_support',
        priority: 'high',
        description: 'Provide additional academic support and tutoring',
        actions: [
          'Schedule tutoring sessions',
          'Implement study group participation',
          'Regular progress monitoring'
        ]
      });
    }

    // Behavioral interventions
    if (riskFactors.behavioral.issues.includes('discipline')) {
      interventions.push({
        type: 'behavioral_support',
        priority: 'medium',
        description: 'Implement behavioral intervention strategies',
        actions: [
          'Behavioral contract development',
          'Counseling services referral',
          'Positive behavior reinforcement'
        ]
      });
    }

    // Social interventions
    if (riskFactors.social.issues.includes('limited_engagement')) {
      interventions.push({
        type: 'social_support',
        priority: 'medium',
        description: 'Increase social engagement and peer connections',
        actions: [
          'Extracurricular activity participation',
          'Peer mentoring program',
          'Social skills development'
        ]
      });
    }

    return JSON.stringify(interventions);
  }

  /**
   * Batch assess all students in a tenant
   */
  async batchAssessStudents(tenantId, assessmentPeriod = 'monthly') {
    try {
      // Get all active students
      const studentsQuery = `
        SELECT id FROM students 
        WHERE tenant_id = $1 AND status = 'active'
      `;
      
      const studentsResult = await this.db.query(studentsQuery, [tenantId]);
      const students = studentsResult.rows;

      const results = {
        total: students.length,
        processed: 0,
        errors: 0,
        highRisk: 0,
        interventions: 0
      };

      // Process students in batches
      const batchSize = 10;
      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (student) => {
          try {
            const assessment = await this.calculateStudentRisk(
              tenantId, student.id, assessmentPeriod
            );
            
            results.processed++;
            if (assessment.risk_level === 'high' || assessment.risk_level === 'critical') {
              results.highRisk++;
            }
            if (assessment.intervention_required) {
              results.interventions++;
            }
          } catch (error) {
            console.error(`Error assessing student ${student.id}:`, error);
            results.errors++;
          }
        }));

        // Add delay between batches to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return results;

    } catch (error) {
      console.error('Error in batch assessment:', error);
      throw error;
    }
  }
}

module.exports = RiskAssessmentService;
