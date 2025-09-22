/**
 * Attendance Analytics Model
 * 
 * This model handles attendance trend analysis, pattern recognition,
 * and predictive analytics for student attendance.
 */

class AttendanceAnalytics {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create attendance analytics record
   */
  async createAnalytics(tenantId, studentId, analyticsData) {
    const {
      analysisDate,
      periodType,
      totalDays,
      presentDays,
      absentDays,
      tardyDays,
      excusedAbsences,
      unexcusedAbsences,
      attendanceRate,
      punctualityRate,
      attendanceTrend,
      trendDirection,
      trendMagnitude,
      frequentAbsenceDays,
      seasonalPatterns,
      timePatterns,
      attendanceAlert,
      chronicAbsenteeism,
      tardinessConcern
    } = analyticsData;

    const query = `
      INSERT INTO attendance_analytics (
        tenant_id, student_id, analysis_date, period_type,
        total_days, present_days, absent_days, tardy_days,
        excused_absences, unexcused_absences, attendance_rate,
        punctuality_rate, attendance_trend, trend_direction,
        trend_magnitude, frequent_absence_days, seasonal_patterns,
        time_patterns, attendance_alert, chronic_absenteeism,
        tardiness_concern
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `;

    const values = [
      tenantId, studentId, analysisDate, periodType,
      totalDays, presentDays, absentDays, tardyDays,
      excusedAbsences, unexcusedAbsences, attendanceRate,
      punctualityRate, attendanceTrend, trendDirection,
      trendMagnitude, frequentAbsenceDays, seasonalPatterns,
      timePatterns, attendanceAlert, chronicAbsenteeism,
      tardinessConcern
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get attendance analytics for a student
   */
  async getStudentAnalytics(tenantId, studentId, periodType = 'monthly', limit = 12) {
    const query = `
      SELECT 
        analysis_date,
        period_type,
        total_days,
        present_days,
        absent_days,
        tardy_days,
        attendance_rate,
        punctuality_rate,
        attendance_trend,
        trend_direction,
        attendance_alert,
        chronic_absenteeism,
        tardiness_concern
      FROM attendance_analytics
      WHERE tenant_id = $1 AND student_id = $2
        AND period_type = $3
      ORDER BY analysis_date DESC
      LIMIT $4
    `;

    const result = await this.db.query(query, [tenantId, studentId, periodType, limit]);
    return result.rows;
  }

  /**
   * Get students with attendance alerts
   */
  async getStudentsWithAlerts(tenantId, alertTypes = ['attendance_alert', 'chronic_absenteeism', 'tardiness_concern']) {
    const conditions = alertTypes.map((type) => `${type} = true`).join(' OR ');
    const query = `
      SELECT DISTINCT ON (aa.student_id) 
        aa.*, s.first_name, s.last_name, s.student_id as student_number,
        s.grade_level, s.primary_email
      FROM attendance_analytics aa
      JOIN students s ON aa.student_id = s.id
      WHERE aa.tenant_id = $1 
        AND (${conditions})
        AND aa.analysis_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY aa.student_id, aa.analysis_date DESC
    `;

    const result = await this.db.query(query, [tenantId]);
    return result.rows;
  }

  /**
   * Get attendance trends for a class or grade level
   */
  async getClassAttendanceTrends(tenantId, gradeLevel = null, classId = null, periodType = 'monthly') {
    let whereClause = 'aa.tenant_id = $1 AND aa.period_type = $2';
    let values = [tenantId, periodType];

    if (gradeLevel) {
      whereClause += ' AND s.grade_level = $3';
      values.push(gradeLevel);
    }

    if (classId) {
      whereClause += ' AND e.class_id = $4';
      values.push(classId);
    }

    const query = `
      SELECT 
        aa.analysis_date,
        COUNT(DISTINCT aa.student_id) as total_students,
        AVG(aa.attendance_rate) as average_attendance_rate,
        AVG(aa.punctuality_rate) as average_punctuality_rate,
        COUNT(CASE WHEN aa.attendance_alert = true THEN 1 END) as students_with_alerts,
        COUNT(CASE WHEN aa.chronic_absenteeism = true THEN 1 END) as chronic_absentees,
        COUNT(CASE WHEN aa.tardiness_concern = true THEN 1 END) as tardiness_concerns
      FROM attendance_analytics aa
      JOIN students s ON aa.student_id = s.id
      ${classId ? 'LEFT JOIN enrollments e ON s.id = e.student_id' : ''}
      WHERE ${whereClause}
        AND aa.analysis_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY aa.analysis_date
      ORDER BY aa.analysis_date DESC
    `;

    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Get students with declining attendance
   */
  async getDecliningAttendance(tenantId, declineThreshold = 10, limit = 50) {
    const query = `
      WITH recent_attendance AS (
        SELECT DISTINCT ON (student_id) 
          student_id, attendance_rate, analysis_date
        FROM attendance_analytics
        WHERE tenant_id = $1
          AND period_type = 'monthly'
          AND analysis_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY student_id, analysis_date DESC
      ),
      previous_attendance AS (
        SELECT DISTINCT ON (student_id) 
          student_id, attendance_rate
        FROM attendance_analytics
        WHERE tenant_id = $1
          AND period_type = 'monthly'
          AND analysis_date < CURRENT_DATE - INTERVAL '30 days'
          AND analysis_date >= CURRENT_DATE - INTERVAL '60 days'
        ORDER BY student_id, analysis_date DESC
      )
      SELECT 
        ra.student_id,
        s.first_name,
        s.last_name,
        s.student_id as student_number,
        s.grade_level,
        ra.attendance_rate as current_rate,
        pa.attendance_rate as previous_rate,
        (pa.attendance_rate - ra.attendance_rate) as decline_percentage
      FROM recent_attendance ra
      JOIN previous_attendance pa ON ra.student_id = pa.student_id
      JOIN students s ON ra.student_id = s.id
      WHERE (pa.attendance_rate - ra.attendance_rate) >= $2
      ORDER BY decline_percentage DESC
      LIMIT $3
    `;

    const result = await this.db.query(query, [tenantId, declineThreshold, limit]);
    return result.rows;
  }

  /**
   * Get attendance patterns for a student
   */
  async getAttendancePatterns(tenantId, studentId) {
    const query = `
      SELECT 
        frequent_absence_days,
        seasonal_patterns,
        time_patterns,
        attendance_trend,
        trend_direction,
        trend_magnitude
      FROM attendance_analytics
      WHERE tenant_id = $1 AND student_id = $2
        AND analysis_date >= CURRENT_DATE - INTERVAL '6 months'
      ORDER BY analysis_date DESC
      LIMIT 6
    `;

    const result = await this.db.query(query, [tenantId, studentId]);
    return result.rows;
  }

  /**
   * Get attendance statistics for a tenant
   */
  async getAttendanceStatistics(tenantId, periodType = 'monthly') {
    const query = `
      SELECT 
        COUNT(DISTINCT student_id) as total_students,
        AVG(attendance_rate) as average_attendance_rate,
        AVG(punctuality_rate) as average_punctuality_rate,
        COUNT(CASE WHEN attendance_alert = true THEN 1 END) as students_with_alerts,
        COUNT(CASE WHEN chronic_absenteeism = true THEN 1 END) as chronic_absentees,
        COUNT(CASE WHEN tardiness_concern = true THEN 1 END) as tardiness_concerns,
        COUNT(CASE WHEN attendance_trend = 'declining' THEN 1 END) as declining_trends,
        COUNT(CASE WHEN attendance_trend = 'improving' THEN 1 END) as improving_trends
      FROM attendance_analytics
      WHERE tenant_id = $1 
        AND period_type = $2
        AND analysis_date >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const result = await this.db.query(query, [tenantId, periodType]);
    return result.rows[0];
  }

  /**
   * Get attendance predictions for a student
   */
  async getAttendancePredictions(tenantId, studentId, futurePeriods = 3) {
    // This would typically integrate with a machine learning model
    // For now, we'll return trend-based predictions
    const query = `
      SELECT 
        attendance_rate,
        attendance_trend,
        trend_direction,
        trend_magnitude,
        analysis_date
      FROM attendance_analytics
      WHERE tenant_id = $1 AND student_id = $2
        AND period_type = 'monthly'
      ORDER BY analysis_date DESC
      LIMIT 6
    `;

    const result = await this.db.query(query, [tenantId, studentId]);
    
    if (result.rows.length < 2) {
      return { predictions: [], confidence: 'low' };
    }

    // Simple trend-based prediction
    const recent = result.rows[0];
    const previous = result.rows[1];
    
    const trendChange = recent.attendance_rate - previous.attendance_rate;
    const predictions = [];
    
    for (let i = 1; i <= futurePeriods; i++) {
      const predictedRate = Math.max(0, Math.min(100, 
        recent.attendance_rate + (trendChange * i)
      ));
      
      predictions.push({
        period: i,
        predicted_attendance_rate: Math.round(predictedRate * 100) / 100,
        confidence: recent.trend_direction === 'stable' ? 'high' : 'medium'
      });
    }

    return {
      predictions,
      confidence: recent.trend_direction === 'stable' ? 'high' : 'medium',
      based_on_trend: recent.attendance_trend
    };
  }

  /**
   * Get chronic absenteeism report
   */
  async getChronicAbsenteeismReport(tenantId, threshold = 90) {
    const query = `
      SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.student_id as student_number,
        s.grade_level,
        aa.attendance_rate,
        aa.analysis_date,
        aa.chronic_absenteeism,
        aa.frequent_absence_days,
        aa.seasonal_patterns
      FROM attendance_analytics aa
      JOIN students s ON aa.student_id = s.id
      WHERE aa.tenant_id = $1
        AND aa.attendance_rate < $2
        AND aa.analysis_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY aa.attendance_rate ASC
    `;

    const result = await this.db.query(query, [tenantId, threshold]);
    return result.rows;
  }

  /**
   * Update attendance analytics (for batch processing)
   */
  async updateAnalytics(tenantId, studentId, analysisDate, periodType, updateData) {
    const setClause = Object.keys(updateData)
      .map((key, index) => `${key} = $${index + 4}`)
      .join(', ');

    const values = [
      tenantId, studentId, analysisDate, periodType,
      ...Object.values(updateData)
    ];

    const query = `
      UPDATE attendance_analytics
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND student_id = $2 
        AND analysis_date = $3 AND period_type = $4
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete old analytics records (cleanup)
   */
  async deleteOldAnalytics(tenantId, olderThanDays = 365) {
    const query = `
      DELETE FROM attendance_analytics
      WHERE tenant_id = $1
        AND analysis_date < CURRENT_DATE - INTERVAL '${olderThanDays} days'
      RETURNING COUNT(*) as deleted_count
    `;

    const result = await this.db.query(query, [tenantId]);
    return result.rows[0];
  }
}

module.exports = AttendanceAnalytics;
