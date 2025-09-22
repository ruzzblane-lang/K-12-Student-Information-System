/**
 * Student Risk Assessment Model
 * 
 * This model handles comprehensive risk assessment for students including
 * academic, attendance, behavioral, and social risk factors.
 */

const { Pool } = require('pg');

class StudentRiskAssessment {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new risk assessment for a student
   */
  async createAssessment(tenantId, studentId, assessmentData) {
    const {
      attendanceRiskScore,
      academicRiskScore,
      behavioralRiskScore,
      socialRiskScore,
      overallRiskScore,
      riskLevel,
      attendanceIssues,
      gradeDecline,
      frequentTardiness,
      disciplineIssues,
      socialIsolation,
      familyIssues,
      assessmentPeriod,
      algorithmVersion,
      interventionRequired,
      interventionPlan,
      lastInterventionDate,
      interventionSuccessRate
    } = assessmentData;

    const query = `
      INSERT INTO student_risk_assessments (
        tenant_id, student_id, attendance_risk_score, academic_risk_score,
        behavioral_risk_score, social_risk_score, overall_risk_score,
        risk_level, attendance_issues, grade_decline, frequent_tardiness,
        discipline_issues, social_isolation, family_issues, assessment_period,
        algorithm_version, intervention_required, intervention_plan,
        last_intervention_date, intervention_success_rate
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      ) RETURNING *
    `;

    const values = [
      tenantId, studentId, attendanceRiskScore, academicRiskScore,
      behavioralRiskScore, socialRiskScore, overallRiskScore,
      riskLevel, attendanceIssues, gradeDecline, frequentTardiness,
      disciplineIssues, socialIsolation, familyIssues, assessmentPeriod,
      algorithmVersion, interventionRequired, interventionPlan,
      lastInterventionDate, interventionSuccessRate
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get the latest risk assessment for a student
   */
  async getLatestAssessment(tenantId, studentId) {
    const query = `
      SELECT sra.*, s.first_name, s.last_name, s.student_id as student_number
      FROM student_risk_assessments sra
      JOIN students s ON sra.student_id = s.id
      WHERE sra.tenant_id = $1 AND sra.student_id = $2
      ORDER BY sra.assessment_date DESC, sra.created_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [tenantId, studentId]);
    return result.rows[0];
  }

  /**
   * Get risk assessments for multiple students
   */
  async getAssessmentsByStudentIds(tenantId, studentIds) {
    if (studentIds.length === 0) return [];

    const placeholders = studentIds.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      SELECT sra.*, s.first_name, s.last_name, s.student_id as student_number
      FROM student_risk_assessments sra
      JOIN students s ON sra.student_id = s.id
      WHERE sra.tenant_id = $1 AND sra.student_id IN (${placeholders})
      ORDER BY sra.overall_risk_score DESC, sra.assessment_date DESC
    `;

    const values = [tenantId, ...studentIds];
    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Get students by risk level
   */
  async getStudentsByRiskLevel(tenantId, riskLevel, limit = 50, offset = 0) {
    const query = `
      SELECT DISTINCT ON (sra.student_id) 
        sra.*, s.first_name, s.last_name, s.student_id as student_number,
        s.grade_level, s.enrollment_date
      FROM student_risk_assessments sra
      JOIN students s ON sra.student_id = s.id
      WHERE sra.tenant_id = $1 AND sra.risk_level = $2
      ORDER BY sra.student_id, sra.assessment_date DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.db.query(query, [tenantId, riskLevel, limit, offset]);
    return result.rows;
  }

  /**
   * Get high-risk students requiring intervention
   */
  async getHighRiskStudents(tenantId, limit = 100) {
    const query = `
      SELECT DISTINCT ON (sra.student_id) 
        sra.*, s.first_name, s.last_name, s.student_id as student_number,
        s.grade_level, s.enrollment_date, s.primary_email
      FROM student_risk_assessments sra
      JOIN students s ON sra.student_id = s.id
      WHERE sra.tenant_id = $1 
        AND (sra.risk_level IN ('high', 'critical') OR sra.intervention_required = true)
      ORDER BY sra.student_id, sra.overall_risk_score DESC, sra.assessment_date DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [tenantId, limit]);
    return result.rows;
  }

  /**
   * Get risk assessment trends for a student
   */
  async getAssessmentTrends(tenantId, studentId, months = 6) {
    const query = `
      SELECT 
        assessment_date,
        overall_risk_score,
        risk_level,
        attendance_risk_score,
        academic_risk_score,
        behavioral_risk_score,
        social_risk_score,
        intervention_required
      FROM student_risk_assessments
      WHERE tenant_id = $1 AND student_id = $2
        AND assessment_date >= CURRENT_DATE - INTERVAL '${months} months'
      ORDER BY assessment_date DESC
    `;

    const result = await this.db.query(query, [tenantId, studentId]);
    return result.rows;
  }

  /**
   * Update intervention information
   */
  async updateIntervention(tenantId, studentId, interventionData) {
    const {
      interventionPlan,
      lastInterventionDate,
      interventionSuccessRate,
      interventionRequired
    } = interventionData;

    const query = `
      UPDATE student_risk_assessments
      SET 
        intervention_plan = $1,
        last_intervention_date = $2,
        intervention_success_rate = $3,
        intervention_required = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $5 AND student_id = $6
        AND assessment_date = (
          SELECT MAX(assessment_date) 
          FROM student_risk_assessments 
          WHERE tenant_id = $5 AND student_id = $6
        )
      RETURNING *
    `;

    const result = await this.db.query(query, [
      interventionPlan, lastInterventionDate, interventionSuccessRate,
      interventionRequired, tenantId, studentId
    ]);

    return result.rows[0];
  }

  /**
   * Get risk assessment statistics for a tenant
   */
  async getRiskStatistics(tenantId) {
    const query = `
      SELECT 
        COUNT(*) as total_assessments,
        COUNT(DISTINCT student_id) as total_students,
        AVG(overall_risk_score) as average_risk_score,
        COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk_count,
        COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk_count,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk_count,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_risk_count,
        COUNT(CASE WHEN intervention_required = true THEN 1 END) as intervention_required_count,
        COUNT(CASE WHEN attendance_issues = true THEN 1 END) as attendance_issues_count,
        COUNT(CASE WHEN grade_decline = true THEN 1 END) as grade_decline_count,
        COUNT(CASE WHEN discipline_issues = true THEN 1 END) as discipline_issues_count
      FROM student_risk_assessments
      WHERE tenant_id = $1
        AND assessment_date >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const result = await this.db.query(query, [tenantId]);
    return result.rows[0];
  }

  /**
   * Get students with improving risk scores
   */
  async getImprovingStudents(tenantId, limit = 50) {
    const query = `
      WITH recent_assessments AS (
        SELECT DISTINCT ON (student_id) 
          student_id, overall_risk_score, assessment_date
        FROM student_risk_assessments
        WHERE tenant_id = $1
          AND assessment_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY student_id, assessment_date DESC
      ),
      previous_assessments AS (
        SELECT DISTINCT ON (student_id) 
          student_id, overall_risk_score
        FROM student_risk_assessments
        WHERE tenant_id = $1
          AND assessment_date < CURRENT_DATE - INTERVAL '30 days'
          AND assessment_date >= CURRENT_DATE - INTERVAL '60 days'
        ORDER BY student_id, assessment_date DESC
      )
      SELECT 
        ra.student_id,
        s.first_name,
        s.last_name,
        s.student_id as student_number,
        ra.overall_risk_score as current_score,
        pa.overall_risk_score as previous_score,
        (pa.overall_risk_score - ra.overall_risk_score) as improvement
      FROM recent_assessments ra
      JOIN previous_assessments pa ON ra.student_id = pa.student_id
      JOIN students s ON ra.student_id = s.id
      WHERE pa.overall_risk_score > ra.overall_risk_score
      ORDER BY improvement DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [tenantId, limit]);
    return result.rows;
  }

  /**
   * Delete old assessments (cleanup)
   */
  async deleteOldAssessments(tenantId, olderThanDays = 365) {
    const query = `
      DELETE FROM student_risk_assessments
      WHERE tenant_id = $1
        AND assessment_date < CURRENT_DATE - INTERVAL '${olderThanDays} days'
      RETURNING COUNT(*) as deleted_count
    `;

    const result = await this.db.query(query, [tenantId]);
    return result.rows[0];
  }
}

module.exports = StudentRiskAssessment;
