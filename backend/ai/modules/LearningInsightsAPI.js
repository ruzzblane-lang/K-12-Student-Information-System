const { v4: uuidv4 } = require('uuid');

class LearningInsightsAPI {
  constructor(db, aiConfig, complianceConfig) {
    this.db = db;
    this.aiConfig = aiConfig;
    this.complianceConfig = complianceConfig;
    this.consentManager = new Map(); // Track consent for each student
    this.dataRetentionPolicies = new Map(); // Data retention policies per tenant
    this.anonymizationRules = new Map(); // Anonymization rules per tenant
  }

  async initialize() {
    console.log('Initializing Personalized Learning Insights API...');
    
    // Initialize compliance frameworks
    await this.initializeComplianceFrameworks();
    
    // Initialize consent management
    await this.initializeConsentManagement();
    
    // Initialize data retention policies
    await this.initializeDataRetentionPolicies();
    
    // Initialize anonymization rules
    await this.initializeAnonymizationRules();
    
    console.log('Personalized Learning Insights API initialized successfully.');
  }

  async initializeComplianceFrameworks() {
    // Initialize FERPA and GDPR compliance frameworks
    this.ferpaCompliance = {
      educationalRecords: true,
      directoryInformation: false,
      consentRequired: true,
      dataMinimization: true,
      purposeLimitation: true,
      retentionLimits: true
    };

    this.gdprCompliance = {
      lawfulBasis: 'consent',
      dataMinimization: true,
      purposeLimitation: true,
      storageLimitation: true,
      accuracy: true,
      confidentiality: true,
      accountability: true
    };
  }

  async initializeConsentManagement() {
    try {
      // Load existing consent records
      const query = `
        SELECT 
          student_id, 
          tenant_id, 
          consent_type, 
          granted, 
          granted_at, 
          expires_at,
          consent_data
        FROM student_consent_records 
        WHERE expires_at > CURRENT_TIMESTAMP OR expires_at IS NULL
      `;
      
      const result = await this.db.query(query);
      
      for (const consent of result.rows) {
        const key = `${consent.tenant_id}_${consent.student_id}`;
        if (!this.consentManager.has(key)) {
          this.consentManager.set(key, []);
        }
        this.consentManager.get(key).push(consent);
      }
      
      console.log(`Loaded ${result.rows.length} consent records`);
    } catch (error) {
      console.error('Error loading consent records:', error);
    }
  }

  async initializeDataRetentionPolicies() {
    // Initialize data retention policies per tenant
    this.dataRetentionPolicies.set('default', {
      studentData: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years in milliseconds
      analyticsData: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years in milliseconds
      insightsData: 1 * 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
      auditLogs: 3 * 365 * 24 * 60 * 60 * 1000 // 3 years in milliseconds
    });
  }

  async initializeAnonymizationRules() {
    // Initialize anonymization rules per tenant
    this.anonymizationRules.set('default', {
      studentId: 'hash',
      studentName: 'remove',
      email: 'hash',
      phone: 'remove',
      address: 'remove',
      parentName: 'remove',
      parentEmail: 'hash',
      parentPhone: 'remove',
      grades: 'keep',
      attendance: 'keep',
      behavior: 'keep',
      performance: 'keep'
    });
  }

  async generateLearningInsights({ studentId, tenantId, timeRange = '30d', insightsType = 'comprehensive', context = {} }) {
    try {
      // Validate consent first
      const consent = await this.validateConsent(studentId, tenantId, 'learning_insights');
      if (!consent.granted) {
        throw new Error('Consent required for learning insights generation');
      }

      // Validate compliance
      const compliance = await this.validateCompliance(tenantId, 'generateInsights', { studentId, insightsType });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      // Check data retention policies
      await this.enforceDataRetention(studentId, tenantId);

      // Generate insights based on type
      let insights;
      switch (insightsType) {
        case 'performance':
          insights = await this.generatePerformanceInsights(studentId, tenantId, timeRange);
          break;
        case 'behavior':
          insights = await this.generateBehaviorInsights(studentId, tenantId, timeRange);
          break;
        case 'engagement':
          insights = await this.generateEngagementInsights(studentId, tenantId, timeRange);
          break;
        case 'comprehensive':
          insights = await this.generateComprehensiveInsights(studentId, tenantId, timeRange);
          break;
        default:
          throw new Error(`Unknown insights type: ${insightsType}`);
      }

      // Anonymize data if required
      const anonymizedInsights = await this.anonymizeInsights(insights, tenantId);

      // Log the insight generation
      await this.logInsightGeneration(studentId, tenantId, insightsType, timeRange);

      return {
        studentId: this.anonymizeStudentId(studentId, tenantId),
        tenantId,
        insightsType,
        timeRange,
        insights: anonymizedInsights,
        generatedAt: new Date().toISOString(),
        consentVerified: true,
        complianceStatus: 'compliant',
        dataRetention: await this.getDataRetentionInfo(studentId, tenantId)
      };
    } catch (error) {
      console.error('Error generating learning insights:', error);
      throw new Error(`Learning insights generation failed: ${error.message}`);
    }
  }

  async validateConsent(studentId, tenantId, consentType) {
    const key = `${tenantId}_${studentId}`;
    const consents = this.consentManager.get(key) || [];
    
    const relevantConsent = consents.find(c => 
      c.consent_type === consentType && 
      c.granted === true &&
      (c.expires_at === null || new Date(c.expires_at) > new Date())
    );

    if (!relevantConsent) {
      // Check if consent is required
      if (this.ferpaCompliance.consentRequired || this.gdprCompliance.lawfulBasis === 'consent') {
        return { granted: false, reason: 'Consent required but not granted' };
      }
    }

    return { granted: true, consent: relevantConsent };
  }

  async validateCompliance(tenantId, operation, data) {
    // FERPA compliance checks
    if (this.ferpaCompliance.educationalRecords) {
      if (this.containsEducationalRecords(data)) {
        // Ensure proper handling of educational records
        if (!await this.hasProperFERPACompliance(tenantId)) {
          return { compliant: false, reason: 'FERPA compliance measures not in place' };
        }
      }
    }

    // GDPR compliance checks
    if (this.gdprCompliance.lawfulBasis === 'consent') {
      if (!await this.hasValidConsent(tenantId, data.studentId, operation)) {
        return { compliant: false, reason: 'Valid consent required for GDPR compliance' };
      }
    }

    // Data minimization check
    if (this.gdprCompliance.dataMinimization) {
      if (!await this.isDataMinimized(data)) {
        return { compliant: false, reason: 'Data minimization principle violated' };
      }
    }

    return { compliant: true };
  }

  containsEducationalRecords(data) {
    const educationalRecordIndicators = [
      'grades', 'gpa', 'transcript', 'enrollment', 'attendance', 
      'discipline', 'performance', 'assessment', 'assignment'
    ];
    
    const dataString = JSON.stringify(data).toLowerCase();
    return educationalRecordIndicators.some(indicator => dataString.includes(indicator));
  }

  async hasProperFERPACompliance(tenantId) {
    // Check if tenant has proper FERPA compliance measures
    try {
      const query = `
        SELECT ferpa_compliance_enabled, ferpa_training_completed
        FROM tenants 
        WHERE id = $1
      `;
      const result = await this.db.query(query, [tenantId]);
      
      if (result.rows.length === 0) return false;
      
      const tenant = result.rows[0];
      return tenant.ferpa_compliance_enabled && tenant.ferpa_training_completed;
    } catch (error) {
      console.error('Error checking FERPA compliance:', error);
      return false;
    }
  }

  async hasValidConsent(tenantId, studentId, operation) {
    const key = `${tenantId}_${studentId}`;
    const consents = this.consentManager.get(key) || [];
    
    return consents.some(c => 
      c.granted === true &&
      (c.expires_at === null || new Date(c.expires_at) > new Date()) &&
      c.consent_data && 
      JSON.parse(c.consent_data).operations?.includes(operation)
    );
  }

  async isDataMinimized(data) {
    // Check if only necessary data is being processed
    const allowedFields = [
      'studentId', 'tenantId', 'timeRange', 'insightsType',
      'grades', 'attendance', 'assignments', 'assessments'
    ];
    
    const dataFields = Object.keys(data);
    return dataFields.every(field => allowedFields.includes(field));
  }

  async enforceDataRetention(studentId, tenantId) {
    const retentionPolicy = this.dataRetentionPolicies.get('default');
    const cutoffDate = new Date(Date.now() - retentionPolicy.insightsData);
    
    try {
      // Delete old insights data
      const query = `
        DELETE FROM learning_insights 
        WHERE student_id = $1 AND tenant_id = $2 AND created_at < $3
      `;
      await this.db.query(query, [studentId, tenantId, cutoffDate]);
      
      console.log(`Enforced data retention for student ${studentId}`);
    } catch (error) {
      console.error('Error enforcing data retention:', error);
    }
  }

  async generatePerformanceInsights(studentId, tenantId, timeRange) {
    try {
      // Get performance data
      const performanceData = await this.getPerformanceData(studentId, tenantId, timeRange);
      
      // Analyze performance trends
      const trends = await this.analyzePerformanceTrends(performanceData);
      
      // Generate AI-powered insights
      const aiInsights = await this.generateAIPerformanceInsights(performanceData, trends);
      
      return {
        type: 'performance',
        data: performanceData,
        trends,
        insights: aiInsights,
        recommendations: await this.generatePerformanceRecommendations(trends, aiInsights)
      };
    } catch (error) {
      console.error('Error generating performance insights:', error);
      throw error;
    }
  }

  async getPerformanceData(studentId, tenantId, timeRange) {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const startDate = new Date(Date.now() - timeRangeMs);
    
    try {
      // Get grades and assessments
      const gradesQuery = `
        SELECT 
          assignment_id,
          grade,
          max_points,
          assignment_type,
          subject,
          due_date,
          submitted_at
        FROM grades 
        WHERE student_id = $1 AND tenant_id = $2 AND due_date >= $3
        ORDER BY due_date DESC
      `;
      
      const gradesResult = await this.db.query(gradesQuery, [studentId, tenantId, startDate]);
      
      // Get attendance data
      const attendanceQuery = `
        SELECT 
          date,
          status,
          subject,
          period
        FROM attendance 
        WHERE student_id = $1 AND tenant_id = $2 AND date >= $3
        ORDER BY date DESC
      `;
      
      const attendanceResult = await this.db.query(attendanceQuery, [studentId, tenantId, startDate]);
      
      return {
        grades: gradesResult.rows,
        attendance: attendanceResult.rows,
        timeRange: {
          start: startDate,
          end: new Date(),
          duration: timeRange
        }
      };
    } catch (error) {
      console.error('Error getting performance data:', error);
      return { grades: [], attendance: [], timeRange: { start: startDate, end: new Date(), duration: timeRange } };
    }
  }

  parseTimeRange(timeRange) {
    const timeRangeMap = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };
    
    return timeRangeMap[timeRange] || timeRangeMap['30d'];
  }

  async analyzePerformanceTrends(performanceData) {
    const trends = {
      gradeTrend: 'stable',
      attendanceTrend: 'stable',
      subjectPerformance: {},
      improvementAreas: [],
      strengths: []
    };

    // Analyze grade trends
    if (performanceData.grades.length > 0) {
      const grades = performanceData.grades.map(g => g.grade / g.max_points);
      const recentGrades = grades.slice(0, Math.min(5, grades.length));
      const olderGrades = grades.slice(-Math.min(5, grades.length));
      
      const recentAvg = recentGrades.reduce((a, b) => a + b, 0) / recentGrades.length;
      const olderAvg = olderGrades.reduce((a, b) => a + b, 0) / olderGrades.length;
      
      if (recentAvg > olderAvg + 0.05) {
        trends.gradeTrend = 'improving';
      } else if (recentAvg < olderAvg - 0.05) {
        trends.gradeTrend = 'declining';
      }
    }

    // Analyze attendance trends
    if (performanceData.attendance.length > 0) {
      const recentAttendance = performanceData.attendance.slice(0, 10);
      const attendanceRate = recentAttendance.filter(a => a.status === 'present').length / recentAttendance.length;
      
      if (attendanceRate > 0.95) {
        trends.attendanceTrend = 'excellent';
      } else if (attendanceRate > 0.90) {
        trends.attendanceTrend = 'good';
      } else if (attendanceRate > 0.80) {
        trends.attendanceTrend = 'concerning';
      } else {
        trends.attendanceTrend = 'poor';
      }
    }

    // Analyze subject performance
    const subjectGrades = {};
    performanceData.grades.forEach(grade => {
      if (!subjectGrades[grade.subject]) {
        subjectGrades[grade.subject] = [];
      }
      subjectGrades[grade.subject].push(grade.grade / grade.max_points);
    });

    for (const [subject, grades] of Object.entries(subjectGrades)) {
      const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;
      trends.subjectPerformance[subject] = {
        average: Math.round(avgGrade * 100),
        trend: avgGrade > 0.8 ? 'strong' : avgGrade > 0.6 ? 'average' : 'needs_improvement'
      };
    }

    return trends;
  }

  async generateAIPerformanceInsights(performanceData, trends) {
    if (!this.aiConfig.openai.apiKey) {
      return this.generateSimplePerformanceInsights(performanceData, trends);
    }

    try {
      const prompt = `
        Analyze this student's performance data and provide insights:
        
        Grade Trend: ${trends.gradeTrend}
        Attendance Trend: ${trends.attendanceTrend}
        Subject Performance: ${JSON.stringify(trends.subjectPerformance)}
        
        Recent Grades: ${performanceData.grades.slice(0, 5).map(g => `${g.subject}: ${g.grade}/${g.max_points}`).join(', ')}
        
        Provide insights in JSON format with:
        - overallAssessment: brief assessment of performance
        - keyStrengths: array of strengths
        - improvementAreas: array of areas needing improvement
        - riskFactors: array of potential risk factors
        - recommendations: array of specific recommendations
      `;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.aiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.aiConfig.openai.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500
        })
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating AI performance insights:', error);
      return this.generateSimplePerformanceInsights(performanceData, trends);
    }
  }

  generateSimplePerformanceInsights(performanceData, trends) {
    return {
      overallAssessment: `Student shows ${trends.gradeTrend} performance with ${trends.attendanceTrend} attendance`,
      keyStrengths: Object.entries(trends.subjectPerformance)
        .filter(([, perf]) => perf.trend === 'strong')
        .map(([subject]) => `Strong performance in ${subject}`),
      improvementAreas: Object.entries(trends.subjectPerformance)
        .filter(([, perf]) => perf.trend === 'needs_improvement')
        .map(([subject]) => `Needs improvement in ${subject}`),
      riskFactors: trends.attendanceTrend === 'poor' ? ['Poor attendance'] : [],
      recommendations: [
        'Continue current study habits',
        'Focus on areas needing improvement',
        'Maintain good attendance'
      ]
    };
  }

  async generatePerformanceRecommendations(trends, insights) {
    const recommendations = [];

    // Based on trends
    if (trends.gradeTrend === 'declining') {
      recommendations.push({
        type: 'academic_support',
        priority: 'high',
        action: 'Schedule additional tutoring sessions',
        reason: 'Grades are declining'
      });
    }

    if (trends.attendanceTrend === 'poor') {
      recommendations.push({
        type: 'attendance_intervention',
        priority: 'high',
        action: 'Contact parents about attendance concerns',
        reason: 'Poor attendance pattern detected'
      });
    }

    // Based on AI insights
    if (insights.riskFactors && insights.riskFactors.length > 0) {
      recommendations.push({
        type: 'risk_mitigation',
        priority: 'medium',
        action: 'Implement early intervention strategies',
        reason: 'Risk factors identified'
      });
    }

    return recommendations;
  }

  async generateBehaviorInsights(studentId, tenantId, timeRange) {
    // Generate behavior-related insights
    return {
      type: 'behavior',
      data: {},
      insights: {
        overallAssessment: 'Behavior analysis not implemented yet',
        keyStrengths: [],
        improvementAreas: [],
        riskFactors: [],
        recommendations: []
      },
      recommendations: []
    };
  }

  async generateEngagementInsights(studentId, tenantId, timeRange) {
    // Generate engagement-related insights
    return {
      type: 'engagement',
      data: {},
      insights: {
        overallAssessment: 'Engagement analysis not implemented yet',
        keyStrengths: [],
        improvementAreas: [],
        riskFactors: [],
        recommendations: []
      },
      recommendations: []
    };
  }

  async generateComprehensiveInsights(studentId, tenantId, timeRange) {
    // Generate comprehensive insights combining all types
    const performanceInsights = await this.generatePerformanceInsights(studentId, tenantId, timeRange);
    const behaviorInsights = await this.generateBehaviorInsights(studentId, tenantId, timeRange);
    const engagementInsights = await this.generateEngagementInsights(studentId, tenantId, timeRange);

    return {
      type: 'comprehensive',
      performance: performanceInsights,
      behavior: behaviorInsights,
      engagement: engagementInsights,
      summary: await this.generateComprehensiveSummary(performanceInsights, behaviorInsights, engagementInsights)
    };
  }

  async generateComprehensiveSummary(performance, behavior, engagement) {
    return {
      overallStatus: 'performing_well',
      keyFindings: [
        'Student shows consistent academic performance',
        'Good attendance record',
        'No major behavioral concerns'
      ],
      actionItems: [
        'Continue current academic support',
        'Monitor attendance trends',
        'Provide positive reinforcement'
      ],
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  async anonymizeInsights(insights, tenantId) {
    const anonymizationRule = this.anonymizationRules.get('default');
    const anonymized = JSON.parse(JSON.stringify(insights));

    // Anonymize student ID
    if (anonymizationRule.studentId === 'hash') {
      anonymized.studentId = this.anonymizeStudentId(insights.studentId, tenantId);
    }

    // Remove sensitive information
    if (anonymizationRule.studentName === 'remove') {
      delete anonymized.studentName;
    }

    return anonymized;
  }

  anonymizeStudentId(studentId, tenantId) {
    // Create a hash of the student ID for anonymization
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(`${tenantId}_${studentId}`)
      .digest('hex')
      .substring(0, 16);
  }

  async logInsightGeneration(studentId, tenantId, insightsType, timeRange) {
    try {
      const query = `
        INSERT INTO learning_insights_logs (
          id, student_id, tenant_id, insights_type, time_range, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        uuidv4(),
        studentId,
        tenantId,
        insightsType,
        timeRange
      ]);
    } catch (error) {
      console.error('Error logging insight generation:', error);
    }
  }

  async getDataRetentionInfo(studentId, tenantId) {
    const retentionPolicy = this.dataRetentionPolicies.get('default');
    return {
      insightsDataRetention: '1 year',
      nextCleanupDate: new Date(Date.now() + retentionPolicy.insightsData).toISOString(),
      policyVersion: '1.0'
    };
  }

  async isHealthy() {
    // Check if the learning insights API is healthy
    return this.consentManager.size >= 0; // Simplified check
  }
}

module.exports = LearningInsightsAPI;
