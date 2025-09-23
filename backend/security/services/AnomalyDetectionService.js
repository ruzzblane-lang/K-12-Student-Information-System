/**
 * Anomaly Detection Service
 * 
 * Provides continuous fraud detection, anomaly monitoring, and automated alerts
 * for security threats and suspicious activities across the system.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class AnomalyDetectionService {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;
    
    // Anomaly types
    this.anomalyTypes = {
      PAYMENT_FRAUD: 'payment_fraud',
      ACCOUNT_TAKEOVER: 'account_takeover',
      DATA_BREACH: 'data_breach',
      SUSPICIOUS_LOGIN: 'suspicious_login',
      UNUSUAL_ACTIVITY: 'unusual_activity',
      RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
      GEOGRAPHIC_ANOMALY: 'geographic_anomaly',
      DEVICE_ANOMALY: 'device_anomaly',
      BEHAVIORAL_ANOMALY: 'behavioral_anomaly',
      SYSTEM_INTRUSION: 'system_intrusion'
    };
    
    // Severity levels
    this.severityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
    
    // Detection rules
    this.detectionRules = new Map();
    this.initializeDetectionRules();
    
    // Baseline data for anomaly detection
    this.baselines = new Map();
    
    // Real-time monitoring
    this.monitoringActive = false;
    this.monitoringInterval = null;
  }

  /**
   * Initialize detection rules
   */
  initializeDetectionRules() {
    // Payment fraud detection rules
    this.detectionRules.set('payment_fraud', {
      name: 'Payment Fraud Detection',
      type: this.anomalyTypes.PAYMENT_FRAUD,
      rules: [
        {
          name: 'high_value_transaction',
          condition: (data) => data.amount > 10000,
          severity: this.severityLevels.HIGH,
          weight: 0.3
        },
        {
          name: 'unusual_time_transaction',
          condition: (data) => {
            const hour = new Date().getHours();
            return hour < 6 || hour > 22;
          },
          severity: this.severityLevels.MEDIUM,
          weight: 0.2
        },
        {
          name: 'rapid_successive_transactions',
          condition: (data) => data.rapidTransactions > 5,
          severity: this.severityLevels.HIGH,
          weight: 0.4
        },
        {
          name: 'unusual_geographic_location',
          condition: (data) => data.geographicRisk > 0.7,
          severity: this.severityLevels.MEDIUM,
          weight: 0.3
        }
      ]
    });

    // Account takeover detection rules
    this.detectionRules.set('account_takeover', {
      name: 'Account Takeover Detection',
      type: this.anomalyTypes.ACCOUNT_TAKEOVER,
      rules: [
        {
          name: 'multiple_failed_logins',
          condition: (data) => data.failedLogins > 5,
          severity: this.severityLevels.HIGH,
          weight: 0.4
        },
        {
          name: 'unusual_device',
          condition: (data) => data.deviceRisk > 0.8,
          severity: this.severityLevels.MEDIUM,
          weight: 0.3
        },
        {
          name: 'password_reset_abuse',
          condition: (data) => data.passwordResets > 3,
          severity: this.severityLevels.MEDIUM,
          weight: 0.2
        },
        {
          name: 'unusual_access_pattern',
          condition: (data) => data.accessPatternRisk > 0.6,
          severity: this.severityLevels.MEDIUM,
          weight: 0.3
        }
      ]
    });

    // Suspicious login detection rules
    this.detectionRules.set('suspicious_login', {
      name: 'Suspicious Login Detection',
      type: this.anomalyTypes.SUSPICIOUS_LOGIN,
      rules: [
        {
          name: 'new_device_login',
          condition: (data) => data.isNewDevice,
          severity: this.severityLevels.LOW,
          weight: 0.2
        },
        {
          name: 'unusual_location_login',
          condition: (data) => data.locationRisk > 0.5,
          severity: this.severityLevels.MEDIUM,
          weight: 0.3
        },
        {
          name: 'unusual_time_login',
          condition: (data) => {
            const hour = new Date().getHours();
            return hour < 5 || hour > 23;
          },
          severity: this.severityLevels.LOW,
          weight: 0.1
        },
        {
          name: 'vpn_proxy_detection',
          condition: (data) => data.isVpnOrProxy,
          severity: this.severityLevels.MEDIUM,
          weight: 0.3
        }
      ]
    });

    // Rate limiting detection rules
    this.detectionRules.set('rate_limit', {
      name: 'Rate Limit Detection',
      type: this.anomalyTypes.RATE_LIMIT_EXCEEDED,
      rules: [
        {
          name: 'api_rate_limit_exceeded',
          condition: (data) => data.requestsPerMinute > 100,
          severity: this.severityLevels.MEDIUM,
          weight: 0.3
        },
        {
          name: 'login_rate_limit_exceeded',
          condition: (data) => data.loginAttemptsPerMinute > 10,
          severity: this.severityLevels.HIGH,
          weight: 0.5
        },
        {
          name: 'payment_rate_limit_exceeded',
          condition: (data) => data.paymentAttemptsPerMinute > 5,
          severity: this.severityLevels.HIGH,
          weight: 0.4
        }
      ]
    });
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring() {
    if (this.monitoringActive) {
      return;
    }

    this.monitoringActive = true;
    this.monitoringInterval = setInterval(() => {
      this.performRealTimeMonitoring();
    }, 30000); // Check every 30 seconds

    console.log('Anomaly detection monitoring started');
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.monitoringActive = false;
    console.log('Anomaly detection monitoring stopped');
  }

  /**
   * Perform real-time monitoring
   */
  async performRealTimeMonitoring() {
    try {
      // Monitor recent activities
      await this.monitorRecentActivities();
      
      // Check for rate limit violations
      await this.checkRateLimitViolations();
      
      // Monitor suspicious patterns
      await this.monitorSuspiciousPatterns();
      
      // Update baselines
      await this.updateBaselines();

    } catch (error) {
      console.error('Real-time monitoring failed:', error);
    }
  }

  /**
   * Detect anomalies in payment data
   * @param {Object} paymentData - Payment data
   * @returns {Object} Anomaly detection result
   */
  async detectPaymentAnomalies(paymentData) {
    try {
      const detectionResult = {
        anomalies: [],
        riskScore: 0,
        riskLevel: 'low',
        recommendations: []
      };

      // Get payment fraud detection rules
      const rules = this.detectionRules.get('payment_fraud');
      if (!rules) {
        return detectionResult;
      }

      // Calculate additional context data
      const contextData = await this.calculatePaymentContext(paymentData);

      // Apply detection rules
      for (const rule of rules.rules) {
        try {
          if (rule.condition({ ...paymentData, ...contextData })) {
            const anomaly = {
              id: uuidv4(),
              type: rules.type,
              ruleName: rule.name,
              severity: rule.severity,
              weight: rule.weight,
              detectedAt: new Date().toISOString(),
              data: this.sanitizeAnomalyData(paymentData),
              context: contextData
            };

            detectionResult.anomalies.push(anomaly);
            detectionResult.riskScore += rule.weight * this.getSeverityWeight(rule.severity);
          }
        } catch (error) {
          console.error(`Error applying rule ${rule.name}:`, error);
        }
      }

      // Determine overall risk level
      detectionResult.riskLevel = this.determineRiskLevel(detectionResult.riskScore);

      // Generate recommendations
      detectionResult.recommendations = this.generateRecommendations(detectionResult.anomalies);

      // Store anomaly detection result
      if (detectionResult.anomalies.length > 0) {
        await this.storeAnomalyDetection(detectionResult, paymentData);
      }

      return detectionResult;

    } catch (error) {
      console.error('Payment anomaly detection failed:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in login data
   * @param {Object} loginData - Login data
   * @returns {Object} Anomaly detection result
   */
  async detectLoginAnomalies(loginData) {
    try {
      const detectionResult = {
        anomalies: [],
        riskScore: 0,
        riskLevel: 'low',
        recommendations: []
      };

      // Get suspicious login detection rules
      const rules = this.detectionRules.get('suspicious_login');
      if (!rules) {
        return detectionResult;
      }

      // Calculate additional context data
      const contextData = await this.calculateLoginContext(loginData);

      // Apply detection rules
      for (const rule of rules.rules) {
        try {
          if (rule.condition({ ...loginData, ...contextData })) {
            const anomaly = {
              id: uuidv4(),
              type: rules.type,
              ruleName: rule.name,
              severity: rule.severity,
              weight: rule.weight,
              detectedAt: new Date().toISOString(),
              data: this.sanitizeAnomalyData(loginData),
              context: contextData
            };

            detectionResult.anomalies.push(anomaly);
            detectionResult.riskScore += rule.weight * this.getSeverityWeight(rule.severity);
          }
        } catch (error) {
          console.error(`Error applying rule ${rule.name}:`, error);
        }
      }

      // Determine overall risk level
      detectionResult.riskLevel = this.determineRiskLevel(detectionResult.riskScore);

      // Generate recommendations
      detectionResult.recommendations = this.generateRecommendations(detectionResult.anomalies);

      // Store anomaly detection result
      if (detectionResult.anomalies.length > 0) {
        await this.storeAnomalyDetection(detectionResult, loginData);
      }

      return detectionResult;

    } catch (error) {
      console.error('Login anomaly detection failed:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in user behavior
   * @param {Object} behaviorData - User behavior data
   * @returns {Object} Anomaly detection result
   */
  async detectBehavioralAnomalies(behaviorData) {
    try {
      const detectionResult = {
        anomalies: [],
        riskScore: 0,
        riskLevel: 'low',
        recommendations: []
      };

      // Get user baseline
      const baseline = await this.getUserBaseline(behaviorData.userId);

      // Compare with baseline
      const deviations = this.calculateBehavioralDeviations(behaviorData, baseline);

      // Check for significant deviations
      for (const [metric, deviation] of Object.entries(deviations)) {
        if (Math.abs(deviation) > 2) { // 2 standard deviations
          const anomaly = {
            id: uuidv4(),
            type: this.anomalyTypes.BEHAVIORAL_ANOMALY,
            ruleName: `behavioral_deviation_${metric}`,
            severity: this.determineBehavioralSeverity(deviation),
            weight: Math.abs(deviation) / 10,
            detectedAt: new Date().toISOString(),
            data: this.sanitizeAnomalyData(behaviorData),
            context: { metric, deviation, baseline: baseline[metric] }
          };

          detectionResult.anomalies.push(anomaly);
          detectionResult.riskScore += anomaly.weight * this.getSeverityWeight(anomaly.severity);
        }
      }

      // Determine overall risk level
      detectionResult.riskLevel = this.determineRiskLevel(detectionResult.riskScore);

      // Generate recommendations
      detectionResult.recommendations = this.generateRecommendations(detectionResult.anomalies);

      // Store anomaly detection result
      if (detectionResult.anomalies.length > 0) {
        await this.storeAnomalyDetection(detectionResult, behaviorData);
      }

      return detectionResult;

    } catch (error) {
      console.error('Behavioral anomaly detection failed:', error);
      throw error;
    }
  }

  /**
   * Monitor recent activities for anomalies
   */
  async monitorRecentActivities() {
    try {
      // Get recent payment activities
      const recentPayments = await this.getRecentPayments();
      for (const payment of recentPayments) {
        await this.detectPaymentAnomalies(payment);
      }

      // Get recent login activities
      const recentLogins = await this.getRecentLogins();
      for (const login of recentLogins) {
        await this.detectLoginAnomalies(login);
      }

      // Get recent user activities
      const recentActivities = await this.getRecentUserActivities();
      for (const activity of recentActivities) {
        await this.detectBehavioralAnomalies(activity);
      }

    } catch (error) {
      console.error('Recent activities monitoring failed:', error);
    }
  }

  /**
   * Check for rate limit violations
   */
  async checkRateLimitViolations() {
    try {
      const violations = await this.getRateLimitViolations();
      
      for (const violation of violations) {
        const anomaly = {
          id: uuidv4(),
          type: this.anomalyTypes.RATE_LIMIT_EXCEEDED,
          ruleName: 'rate_limit_violation',
          severity: this.severityLevels.MEDIUM,
          weight: 0.5,
          detectedAt: new Date().toISOString(),
          data: this.sanitizeAnomalyData(violation),
          context: { violationType: violation.type }
        };

        await this.storeAnomalyEvent(anomaly, violation);
      }

    } catch (error) {
      console.error('Rate limit violation check failed:', error);
    }
  }

  /**
   * Monitor suspicious patterns
   */
  async monitorSuspiciousPatterns() {
    try {
      // Check for coordinated attacks
      await this.detectCoordinatedAttacks();
      
      // Check for data exfiltration patterns
      await this.detectDataExfiltration();
      
      // Check for privilege escalation attempts
      await this.detectPrivilegeEscalation();

    } catch (error) {
      console.error('Suspicious patterns monitoring failed:', error);
    }
  }

  /**
   * Update baselines for anomaly detection
   */
  async updateBaselines() {
    try {
      // Update user behavior baselines
      await this.updateUserBehaviorBaselines();
      
      // Update system performance baselines
      await this.updateSystemPerformanceBaselines();
      
      // Update geographic baselines
      await this.updateGeographicBaselines();

    } catch (error) {
      console.error('Baseline update failed:', error);
    }
  }

  /**
   * Store anomaly detection result
   * @param {Object} detectionResult - Detection result
   * @param {Object} sourceData - Source data
   */
  async storeAnomalyDetection(detectionResult, sourceData) {
    try {
      for (const anomaly of detectionResult.anomalies) {
        await this.storeAnomalyEvent(anomaly, sourceData);
      }
    } catch (error) {
      console.error('Failed to store anomaly detection:', error);
    }
  }

  /**
   * Store anomaly event
   * @param {Object} anomaly - Anomaly data
   * @param {Object} sourceData - Source data
   */
  async storeAnomalyEvent(anomaly, sourceData) {
    try {
      const query = `
        INSERT INTO anomaly_detection_events (
          id, tenant_id, event_type, anomaly_type, severity, detection_data,
          baseline_data, confidence_score, is_resolved, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        anomaly.id,
        sourceData.tenantId || null,
        anomaly.type,
        anomaly.anomalyType || anomaly.type,
        anomaly.severity,
        JSON.stringify(anomaly.data),
        JSON.stringify(anomaly.context?.baseline || {}),
        anomaly.weight * 100, // Convert to percentage
        false
      ]);

      // Send alert if severity is high or critical
      if (anomaly.severity === this.severityLevels.HIGH || 
          anomaly.severity === this.severityLevels.CRITICAL) {
        await this.sendAnomalyAlert(anomaly, sourceData);
      }

    } catch (error) {
      console.error('Failed to store anomaly event:', error);
    }
  }

  /**
   * Send anomaly alert
   * @param {Object} anomaly - Anomaly data
   * @param {Object} sourceData - Source data
   */
  async sendAnomalyAlert(anomaly, sourceData) {
    try {
      const alert = {
        id: uuidv4(),
        type: 'anomaly_detected',
        severity: anomaly.severity,
        title: `Anomaly Detected: ${anomaly.ruleName}`,
        message: `Anomaly of type ${anomaly.type} detected with ${anomaly.severity} severity`,
        data: {
          anomalyId: anomaly.id,
          anomalyType: anomaly.type,
          ruleName: anomaly.ruleName,
          severity: anomaly.severity,
          detectedAt: anomaly.detectedAt,
          sourceData: this.sanitizeAlertData(sourceData)
        },
        tenantId: sourceData.tenantId,
        createdAt: new Date().toISOString()
      };

      // Store alert
      await this.storeSecurityAlert(alert);

      // Send real-time notification
      await this.sendRealTimeNotification(alert);

    } catch (error) {
      console.error('Failed to send anomaly alert:', error);
    }
  }

  /**
   * Get anomaly statistics
   * @param {string} tenantId - Tenant ID (optional)
   * @param {string} period - Time period
   * @returns {Object} Anomaly statistics
   */
  async getAnomalyStatistics(tenantId, period = '30d') {
    try {
      const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
      const params = tenantId ? [tenantId] : [];

      const query = `
        SELECT 
          COUNT(*) as total_anomalies,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_severity,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_severity,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_severity,
          COUNT(CASE WHEN is_resolved = true THEN 1 END) as resolved_anomalies,
          COUNT(DISTINCT anomaly_type) as anomaly_types,
          AVG(confidence_score) as avg_confidence_score
        FROM anomaly_detection_events 
        ${whereClause}
        AND created_at >= NOW() - INTERVAL '${period}'
      `;

      const result = await this.db.query(query, params);
      const stats = result.rows[0];

      return {
        total: parseInt(stats.total_anomalies),
        bySeverity: {
          low: parseInt(stats.low_severity),
          medium: parseInt(stats.medium_severity),
          high: parseInt(stats.high_severity),
          critical: parseInt(stats.critical_severity)
        },
        resolved: parseInt(stats.resolved_anomalies),
        types: parseInt(stats.anomaly_types),
        avgConfidenceScore: parseFloat(stats.avg_confidence_score) || 0,
        period: period,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get anomaly statistics:', error);
      return {
        total: 0,
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        resolved: 0,
        types: 0,
        avgConfidenceScore: 0,
        period: period,
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Helper methods
  async calculatePaymentContext(paymentData) {
    // Calculate additional context for payment anomaly detection
    const context = {};

    // Get recent payment count for user
    const recentPayments = await this.getUserRecentPayments(paymentData.userId, 24); // Last 24 hours
    context.rapidTransactions = recentPayments.length;

    // Calculate geographic risk
    context.geographicRisk = await this.calculateGeographicRisk(paymentData);

    return context;
  }

  async calculateLoginContext(loginData) {
    // Calculate additional context for login anomaly detection
    const context = {};

    // Check if device is new
    context.isNewDevice = await this.isNewDevice(loginData.userId, loginData.deviceFingerprint);

    // Calculate location risk
    context.locationRisk = await this.calculateLocationRisk(loginData);

    // Check for VPN/Proxy
    context.isVpnOrProxy = await this.isVpnOrProxy(loginData.ipAddress);

    // Get recent failed logins
    const failedLogins = await this.getUserRecentFailedLogins(loginData.userId, 1); // Last hour
    context.failedLogins = failedLogins.length;

    return context;
  }

  async getUserBaseline(userId) {
    // Get user behavior baseline
    const baseline = this.baselines.get(userId);
    if (baseline) {
      return baseline;
    }

    // Calculate baseline from historical data
    const historicalData = await this.getUserHistoricalData(userId);
    const calculatedBaseline = this.calculateBaseline(historicalData);
    
    this.baselines.set(userId, calculatedBaseline);
    return calculatedBaseline;
  }

  calculateBehavioralDeviations(behaviorData, baseline) {
    const deviations = {};

    for (const [metric, value] of Object.entries(behaviorData)) {
      if (baseline[metric] && typeof value === 'number') {
        const mean = baseline[metric].mean;
        const stdDev = baseline[metric].stdDev;
        
        if (stdDev > 0) {
          deviations[metric] = (value - mean) / stdDev;
        }
      }
    }

    return deviations;
  }

  determineRiskLevel(riskScore) {
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    return 'low';
  }

  getSeverityWeight(severity) {
    const weights = {
      [this.severityLevels.LOW]: 0.2,
      [this.severityLevels.MEDIUM]: 0.5,
      [this.severityLevels.HIGH]: 0.8,
      [this.severityLevels.CRITICAL]: 1.0
    };
    return weights[severity] || 0.2;
  }

  determineBehavioralSeverity(deviation) {
    const absDeviation = Math.abs(deviation);
    if (absDeviation >= 3) return this.severityLevels.CRITICAL;
    if (absDeviation >= 2.5) return this.severityLevels.HIGH;
    if (absDeviation >= 2) return this.severityLevels.MEDIUM;
    return this.severityLevels.LOW;
  }

  generateRecommendations(anomalies) {
    const recommendations = [];

    for (const anomaly of anomalies) {
      switch (anomaly.type) {
        case this.anomalyTypes.PAYMENT_FRAUD:
          recommendations.push('Review payment for potential fraud');
          break;
        case this.anomalyTypes.ACCOUNT_TAKEOVER:
          recommendations.push('Consider account lockout or additional verification');
          break;
        case this.anomalyTypes.SUSPICIOUS_LOGIN:
          recommendations.push('Require additional authentication');
          break;
        case this.anomalyTypes.RATE_LIMIT_EXCEEDED:
          recommendations.push('Implement rate limiting or temporary blocking');
          break;
        default:
          recommendations.push('Investigate unusual activity');
      }
    }

    return recommendations;
  }

  sanitizeAnomalyData(data) {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.cardNumber;
    delete sanitized.cvv;
    delete sanitized.ssn;
    
    return sanitized;
  }

  sanitizeAlertData(data) {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.cardNumber;
    delete sanitized.cvv;
    delete sanitized.ssn;
    
    return sanitized;
  }

  // Placeholder methods for database operations
  async getRecentPayments() {
    // Implementation would query recent payments
    return [];
  }

  async getRecentLogins() {
    // Implementation would query recent logins
    return [];
  }

  async getRecentUserActivities() {
    // Implementation would query recent user activities
    return [];
  }

  async getRateLimitViolations() {
    // Implementation would query rate limit violations
    return [];
  }

  async getUserRecentPayments(userId, hours) {
    // Implementation would query user's recent payments
    return [];
  }

  async getUserRecentFailedLogins(userId, hours) {
    // Implementation would query user's recent failed logins
    return [];
  }

  async calculateGeographicRisk(paymentData) {
    // Implementation would calculate geographic risk
    return 0;
  }

  async isNewDevice(userId, deviceFingerprint) {
    // Implementation would check if device is new
    return false;
  }

  async calculateLocationRisk(loginData) {
    // Implementation would calculate location risk
    return 0;
  }

  async isVpnOrProxy(ipAddress) {
    // Implementation would check for VPN/Proxy
    return false;
  }

  async getUserHistoricalData(userId) {
    // Implementation would get user's historical data
    return [];
  }

  calculateBaseline(historicalData) {
    // Implementation would calculate baseline from historical data
    return {};
  }

  async detectCoordinatedAttacks() {
    // Implementation would detect coordinated attacks
  }

  async detectDataExfiltration() {
    // Implementation would detect data exfiltration
  }

  async detectPrivilegeEscalation() {
    // Implementation would detect privilege escalation
  }

  async updateUserBehaviorBaselines() {
    // Implementation would update user behavior baselines
  }

  async updateSystemPerformanceBaselines() {
    // Implementation would update system performance baselines
  }

  async updateGeographicBaselines() {
    // Implementation would update geographic baselines
  }

  async storeSecurityAlert(alert) {
    // Implementation would store security alert
  }

  async sendRealTimeNotification(alert) {
    // Implementation would send real-time notification
  }
}

module.exports = AnomalyDetectionService;
