/**
 * Alert Service
 * 
 * This service handles the generation, management, and delivery of alerts
 * based on analytics data and risk assessments.
 */

class AlertService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new alert
   */
  async createAlert(tenantId, alertData) {
    const {
      studentId,
      alertType,
      alertLevel,
      alertCategory,
      title,
      message,
      description,
      alertData: additionalData,
      triggerConditions,
      notifyTeachers = true,
      notifyParents = true,
      notifyAdministrators = true,
      expiresAt
    } = alertData;

    const query = `
      INSERT INTO alerts (
        tenant_id, student_id, alert_type, alert_level, alert_category,
        title, message, description, alert_data, trigger_conditions,
        notify_teachers, notify_parents, notify_administrators, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *
    `;

    const values = [
      tenantId, studentId, alertType, alertLevel, alertCategory,
      title, message, description, JSON.stringify(additionalData),
      JSON.stringify(triggerConditions), notifyTeachers, notifyParents,
      notifyAdministrators, expiresAt
    ];

    const result = await this.db.query(query, values);
    const alert = result.rows[0];

    // Trigger notifications if needed
    if (notifyTeachers || notifyParents || notifyAdministrators) {
      await this.triggerNotifications(alert);
    }

    return alert;
  }

  /**
   * Generate at-risk student alerts
   */
  async generateAtRiskAlerts(tenantId, studentId = null) {
    try {
      const alerts = [];

      // Get high-risk students
      const riskQuery = `
        SELECT DISTINCT ON (sra.student_id)
          sra.*, s.first_name, s.last_name, s.student_id as student_number,
          s.grade_level, s.primary_email
        FROM student_risk_assessments sra
        JOIN students s ON sra.student_id = s.id
        WHERE sra.tenant_id = $1
          AND sra.risk_level IN ('high', 'critical')
          AND sra.assessment_date >= CURRENT_DATE - INTERVAL '7 days'
          ${studentId ? 'AND sra.student_id = $2' : ''}
        ORDER BY sra.student_id, sra.overall_risk_score DESC
      `;

      const values = studentId ? [tenantId, studentId] : [tenantId];
      const riskResult = await this.db.query(riskQuery, values);

      for (const assessment of riskResult.rows) {
        // Check if alert already exists
        const existingAlert = await this.getActiveAlert(
          tenantId, assessment.student_id, 'risk_assessment', 'at_risk_student'
        );

        if (!existingAlert) {
          const alertData = {
            studentId: assessment.student_id,
            alertType: 'risk_assessment',
            alertLevel: assessment.risk_level === 'critical' ? 'critical' : 'warning',
            alertCategory: 'at_risk_student',
            title: `${assessment.first_name} ${assessment.last_name} - At Risk Student Alert`,
            message: `Student ${assessment.student_number} has been identified as at-risk with an overall risk score of ${assessment.overall_risk_score}/100.`,
            description: this.generateAtRiskDescription(assessment),
            alertData: {
              risk_score: assessment.overall_risk_score,
              risk_level: assessment.risk_level,
              assessment_date: assessment.assessment_date,
              intervention_required: assessment.intervention_required
            },
            triggerConditions: {
              risk_level: assessment.risk_level,
              overall_risk_score: assessment.overall_risk_score,
              assessment_date: assessment.assessment_date
            },
            notifyTeachers: true,
            notifyParents: true,
            notifyAdministrators: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          };

          const alert = await this.createAlert(tenantId, alertData);
          alerts.push(alert);
        }
      }

      return alerts;

    } catch (error) {
      console.error('Error generating at-risk alerts:', error);
      throw error;
    }
  }

  /**
   * Generate attendance alerts
   */
  async generateAttendanceAlerts(tenantId, studentId = null) {
    try {
      const alerts = [];

      // Get students with attendance issues
      const attendanceQuery = `
        SELECT DISTINCT ON (aa.student_id)
          aa.*, s.first_name, s.last_name, s.student_id as student_number,
          s.grade_level, s.primary_email
        FROM attendance_analytics aa
        JOIN students s ON aa.student_id = s.id
        WHERE aa.tenant_id = $1
          AND (aa.attendance_alert = true OR aa.chronic_absenteeism = true OR aa.tardiness_concern = true)
          AND aa.analysis_date >= CURRENT_DATE - INTERVAL '7 days'
          ${studentId ? 'AND aa.student_id = $2' : ''}
        ORDER BY aa.student_id, aa.analysis_date DESC
      `;

      const values = studentId ? [tenantId, studentId] : [tenantId];
      const attendanceResult = await this.db.query(attendanceQuery, values);

      for (const analytics of attendanceResult.rows) {
        let alertType = 'attendance';
        let alertLevel = 'warning';
        let alertCategory = 'attendance_trend';
        let title = '';
        let message = '';

        if (analytics.chronic_absenteeism) {
          alertLevel = 'critical';
          alertCategory = 'chronic_absenteeism';
          title = `${analytics.first_name} ${analytics.last_name} - Chronic Absenteeism Alert`;
          message = `Student ${analytics.student_number} has been identified as chronically absent with an attendance rate of ${analytics.attendance_rate}%.`;
        } else if (analytics.tardiness_concern) {
          alertCategory = 'tardiness';
          title = `${analytics.first_name} ${analytics.last_name} - Tardiness Concern`;
          message = `Student ${analytics.student_number} has frequent tardiness issues with a punctuality rate of ${analytics.punctuality_rate}%.`;
        } else {
          title = `${analytics.first_name} ${analytics.last_name} - Attendance Alert`;
          message = `Student ${analytics.student_number} has attendance concerns with a rate of ${analytics.attendance_rate}%.`;
        }

        // Check if alert already exists
        const existingAlert = await this.getActiveAlert(
          tenantId, analytics.student_id, alertType, alertCategory
        );

        if (!existingAlert) {
          const alertData = {
            studentId: analytics.student_id,
            alertType,
            alertLevel,
            alertCategory,
            title,
            message,
            description: this.generateAttendanceDescription(analytics),
            alertData: {
              attendance_rate: analytics.attendance_rate,
              punctuality_rate: analytics.punctuality_rate,
              attendance_trend: analytics.attendance_trend,
              chronic_absenteeism: analytics.chronic_absenteeism,
              tardiness_concern: analytics.tardiness_concern
            },
            triggerConditions: {
              attendance_rate: analytics.attendance_rate,
              chronic_absenteeism: analytics.chronic_absenteeism,
              tardiness_concern: analytics.tardiness_concern
            },
            notifyTeachers: true,
            notifyParents: true,
            notifyAdministrators: alertLevel === 'critical',
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
          };

          const alert = await this.createAlert(tenantId, alertData);
          alerts.push(alert);
        }
      }

      return alerts;

    } catch (error) {
      console.error('Error generating attendance alerts:', error);
      throw error;
    }
  }

  /**
   * Generate grade decline alerts
   */
  async generateGradeDeclineAlerts(tenantId, studentId = null) {
    try {
      const alerts = [];

      // Get students with grade issues
      const gradeQuery = `
        SELECT DISTINCT ON (ga.student_id)
          ga.*, s.first_name, s.last_name, s.student_id as student_number,
          s.grade_level, s.primary_email
        FROM grade_analytics ga
        JOIN students s ON ga.student_id = s.id
        WHERE ga.tenant_id = $1
          AND (ga.grade_alert = true OR ga.failing_risk = true OR ga.grade_trend = 'declining')
          AND ga.analysis_date >= CURRENT_DATE - INTERVAL '7 days'
          ${studentId ? 'AND ga.student_id = $2' : ''}
        ORDER BY ga.student_id, ga.analysis_date DESC
      `;

      const values = studentId ? [tenantId, studentId] : [tenantId];
      const gradeResult = await this.db.query(gradeQuery, values);

      for (const analytics of gradeResult.rows) {
        let alertLevel = 'warning';
        let alertCategory = 'grade_decline';
        let title = '';
        let message = '';

        if (analytics.failing_risk) {
          alertLevel = 'critical';
          alertCategory = 'failing_risk';
          title = `${analytics.first_name} ${analytics.last_name} - Failing Risk Alert`;
          message = `Student ${analytics.student_number} is at risk of failing with an average grade of ${analytics.average_grade}%.`;
        } else if (analytics.grade_trend === 'declining') {
          alertCategory = 'grade_decline';
          title = `${analytics.first_name} ${analytics.last_name} - Grade Decline Alert`;
          message = `Student ${analytics.student_number} shows declining academic performance with an average grade of ${analytics.average_grade}%.`;
        } else {
          title = `${analytics.first_name} ${analytics.last_name} - Academic Concern`;
          message = `Student ${analytics.student_number} has academic concerns with an average grade of ${analytics.average_grade}%.`;
        }

        // Check if alert already exists
        const existingAlert = await this.getActiveAlert(
          tenantId, analytics.student_id, 'academic', alertCategory
        );

        if (!existingAlert) {
          const alertData = {
            studentId: analytics.student_id,
            alertType: 'academic',
            alertLevel,
            alertCategory,
            title,
            message,
            description: this.generateGradeDescription(analytics),
            alertData: {
              average_grade: analytics.average_grade,
              grade_trend: analytics.grade_trend,
              grade_volatility: analytics.grade_volatility,
              missing_assignments: analytics.missing_assignments,
              failing_risk: analytics.failing_risk
            },
            triggerConditions: {
              average_grade: analytics.average_grade,
              grade_trend: analytics.grade_trend,
              failing_risk: analytics.failing_risk
            },
            notifyTeachers: true,
            notifyParents: true,
            notifyAdministrators: alertLevel === 'critical',
            expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // 21 days
          };

          const alert = await this.createAlert(tenantId, alertData);
          alerts.push(alert);
        }
      }

      return alerts;

    } catch (error) {
      console.error('Error generating grade decline alerts:', error);
      throw error;
    }
  }

  /**
   * Get active alert for a student
   */
  async getActiveAlert(tenantId, studentId, alertType, alertCategory) {
    const query = `
      SELECT * FROM alerts
      WHERE tenant_id = $1 AND student_id = $2
        AND alert_type = $3 AND alert_category = $4
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [tenantId, studentId, alertType, alertCategory]);
    return result.rows[0];
  }

  /**
   * Get alerts for a student
   */
  async getStudentAlerts(tenantId, studentId, options = {}) {
    const { 
      alertType = null,
      alertLevel = null,
      status = 'active',
      limit = 50,
      offset = 0
    } = options;

    let whereClause = 'WHERE tenant_id = $1 AND student_id = $2';
    let values = [tenantId, studentId];
    let paramIndex = 3;

    if (alertType) {
      whereClause += ` AND alert_type = $${paramIndex}`;
      values.push(alertType);
      paramIndex++;
    }

    if (alertLevel) {
      whereClause += ` AND alert_level = $${paramIndex}`;
      values.push(alertLevel);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    const query = `
      SELECT * FROM alerts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Get alerts for a tenant
   */
  async getTenantAlerts(tenantId, options = {}) {
    const {
      alertType = null,
      alertLevel = null,
      status = 'active',
      limit = 100,
      offset = 0
    } = options;

    let whereClause = 'WHERE tenant_id = $1';
    let values = [tenantId];
    let paramIndex = 2;

    if (alertType) {
      whereClause += ` AND alert_type = $${paramIndex}`;
      values.push(alertType);
      paramIndex++;
    }

    if (alertLevel) {
      whereClause += ` AND alert_level = $${paramIndex}`;
      values.push(alertLevel);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    const query = `
      SELECT a.*, s.first_name, s.last_name, s.student_id as student_number
      FROM alerts a
      LEFT JOIN students s ON a.student_id = s.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(tenantId, alertId, userId) {
    const query = `
      UPDATE alerts
      SET 
        status = 'acknowledged',
        acknowledged_by = $1,
        acknowledged_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $2 AND id = $3
      RETURNING *
    `;

    const result = await this.db.query(query, [userId, tenantId, alertId]);
    return result.rows[0];
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(tenantId, alertId, userId) {
    const query = `
      UPDATE alerts
      SET 
        status = 'resolved',
        resolved_by = $1,
        resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $2 AND id = $3
      RETURNING *
    `;

    const result = await this.db.query(query, [userId, tenantId, alertId]);
    return result.rows[0];
  }

  /**
   * Generate comprehensive alerts for all students
   */
  async generateAllAlerts(tenantId) {
    try {
      const results = {
        at_risk: [],
        attendance: [],
        academic: [],
        total_generated: 0,
        errors: []
      };

      // Generate all types of alerts
      try {
        results.at_risk = await this.generateAtRiskAlerts(tenantId);
        results.total_generated += results.at_risk.length;
      } catch (error) {
        results.errors.push({ type: 'at_risk', error: error.message });
      }

      try {
        results.attendance = await this.generateAttendanceAlerts(tenantId);
        results.total_generated += results.attendance.length;
      } catch (error) {
        results.errors.push({ type: 'attendance', error: error.message });
      }

      try {
        results.academic = await this.generateGradeDeclineAlerts(tenantId);
        results.total_generated += results.academic.length;
      } catch (error) {
        results.errors.push({ type: 'academic', error: error.message });
      }

      return results;

    } catch (error) {
      console.error('Error generating all alerts:', error);
      throw error;
    }
  }

  /**
   * Clean up expired alerts
   */
  async cleanupExpiredAlerts(tenantId) {
    const query = `
      UPDATE alerts
      SET status = 'dismissed', updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1
        AND expires_at IS NOT NULL
        AND expires_at < CURRENT_TIMESTAMP
        AND status = 'active'
      RETURNING COUNT(*) as expired_count
    `;

    const result = await this.db.query(query, [tenantId]);
    return result.rows[0];
  }

  // Helper methods for generating alert descriptions
  generateAtRiskDescription(assessment) {
    const factors = [];
    
    if (assessment.attendance_issues) factors.push('attendance concerns');
    if (assessment.grade_decline) factors.push('declining grades');
    if (assessment.frequent_tardiness) factors.push('frequent tardiness');
    if (assessment.discipline_issues) factors.push('behavioral issues');
    if (assessment.social_isolation) factors.push('social isolation');
    if (assessment.family_issues) factors.push('family concerns');

    return `This student has been identified as at-risk based on the following factors: ${factors.join(', ')}. ` +
           `Overall risk score: ${assessment.overall_risk_score}/100. ` +
           `${assessment.intervention_required ? 'Intervention required.' : 'Monitor closely.'}`;
  }

  generateAttendanceDescription(analytics) {
    let description = `Attendance rate: ${analytics.attendance_rate}%, Punctuality rate: ${analytics.punctuality_rate}%. `;
    
    if (analytics.chronic_absenteeism) {
      description += 'This student has been identified as chronically absent. ';
    }
    
    if (analytics.tardiness_concern) {
      description += 'This student has frequent tardiness issues. ';
    }
    
    if (analytics.attendance_trend) {
      description += `Attendance trend: ${analytics.attendance_trend}. `;
    }

    return description + 'Immediate attention and intervention may be required.';
  }

  generateGradeDescription(analytics) {
    let description = `Average grade: ${analytics.average_grade}%. `;
    
    if (analytics.failing_risk) {
      description += 'This student is at risk of failing. ';
    }
    
    if (analytics.grade_trend) {
      description += `Grade trend: ${analytics.grade_trend}. `;
    }
    
    if (analytics.missing_assignments > 0) {
      description += `Missing assignments: ${analytics.missing_assignments}. `;
    }

    return description + 'Academic support and intervention may be required.';
  }

  /**
   * Trigger notifications for an alert
   */
  async triggerNotifications(alert) {
    try {
      // This would integrate with your notification system
      // For now, we'll just log the notification
      console.log(`Alert notification triggered for alert ${alert.id}:`, {
        title: alert.title,
        student_id: alert.student_id,
        notify_teachers: alert.notify_teachers,
        notify_parents: alert.notify_parents,
        notify_administrators: alert.notify_administrators
      });

      // Here you would:
      // 1. Get list of teachers/parents/administrators to notify
      // 2. Send email notifications
      // 3. Send push notifications
      // 4. Create in-app notifications
      // 5. Log notification delivery status

    } catch (error) {
      console.error('Error triggering notifications:', error);
    }
  }
}

module.exports = AlertService;
