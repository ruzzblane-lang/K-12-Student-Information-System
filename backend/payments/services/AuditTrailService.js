/**
 * Audit Trail Service
 * 
 * Provides immutable audit trails, security event logging,
 * and comprehensive audit reporting for compliance and security.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class AuditTrailService {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;
    
    // Audit event types
    this.eventTypes = {
      // Payment events
      PAYMENT_INITIATED: 'payment_initiated',
      PAYMENT_PROCESSED: 'payment_processed',
      PAYMENT_FAILED: 'payment_failed',
      PAYMENT_CANCELLED: 'payment_cancelled',
      REFUND_INITIATED: 'refund_initiated',
      REFUND_PROCESSED: 'refund_processed',
      REFUND_FAILED: 'refund_failed',
      
      // Security events
      SECURITY_BREACH: 'security_breach',
      FRAUD_DETECTED: 'fraud_detected',
      PAYMENT_BLOCKED: 'payment_blocked',
      SUSPICIOUS_ACTIVITY: 'suspicious_activity',
      UNAUTHORIZED_ACCESS: 'unauthorized_access',
      LOGIN_FAILED: 'login_failed',
      LOGIN_SUCCESS: 'login_success',
      
      // Data events
      DATA_ACCESSED: 'data_accessed',
      DATA_MODIFIED: 'data_modified',
      DATA_DELETED: 'data_deleted',
      DATA_EXPORTED: 'data_exported',
      DATA_IMPORTED: 'data_imported',
      
      // Compliance events
      COMPLIANCE_CHECK: 'compliance_check',
      COMPLIANCE_VIOLATION: 'compliance_violation',
      AUDIT_LOG_ACCESSED: 'audit_log_accessed',
      DATA_RETENTION_APPLIED: 'data_retention_applied',
      
      // System events
      SYSTEM_STARTUP: 'system_startup',
      SYSTEM_SHUTDOWN: 'system_shutdown',
      CONFIGURATION_CHANGED: 'configuration_changed',
      BACKUP_CREATED: 'backup_created',
      BACKUP_RESTORED: 'backup_restored'
    };
    
    // Security levels
    this.securityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
    
    // Audit retention periods by event type
    this.retentionPeriods = {
      [this.eventTypes.PAYMENT_PROCESSED]: 2555, // 7 years
      [this.eventTypes.PAYMENT_FAILED]: 2555,
      [this.eventTypes.REFUND_PROCESSED]: 2555,
      [this.eventTypes.SECURITY_BREACH]: 2555,
      [this.eventTypes.FRAUD_DETECTED]: 2555,
      [this.eventTypes.COMPLIANCE_VIOLATION]: 2555,
      [this.eventTypes.DATA_ACCESSED]: 2555,
      [this.eventTypes.DATA_MODIFIED]: 2555,
      [this.eventTypes.DATA_DELETED]: 2555,
      [this.eventTypes.LOGIN_SUCCESS]: 2555,
      [this.eventTypes.LOGIN_FAILED]: 2555,
      [this.eventTypes.UNAUTHORIZED_ACCESS]: 2555,
      [this.eventTypes.SYSTEM_STARTUP]: 365, // 1 year
      [this.eventTypes.SYSTEM_SHUTDOWN]: 365,
      [this.eventTypes.CONFIGURATION_CHANGED]: 2555
    };
  }

  /**
   * Log a security event
   * @param {string} eventType - Type of security event
   * @param {Object} eventData - Event data
   * @param {Object} context - Additional context
   */
  async logSecurityEvent(eventType, eventData, context = {}) {
    const auditEvent = {
      id: uuidv4(),
      eventType: eventType,
      timestamp: new Date().toISOString(),
      securityLevel: this.determineSecurityLevel(eventType),
      eventData: this.sanitizeEventData(eventData),
      context: this.sanitizeContext(context),
      hash: null,
      previousHash: null,
      tenantId: eventData.tenantId || context.tenantId,
      userId: eventData.userId || context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      correlationId: eventData.correlationId || context.correlationId
    };

    // Calculate hash for immutability
    auditEvent.hash = this.calculateEventHash(auditEvent);
    
    // Get previous hash for chain integrity
    auditEvent.previousHash = await this.getLastEventHash(auditEvent.tenantId);

    // Store the audit event
    await this.storeAuditEvent(auditEvent);

    // Check for security alerts
    await this.checkSecurityAlerts(auditEvent);

    return auditEvent.id;
  }

  /**
   * Log a payment event
   * @param {string} eventType - Type of payment event
   * @param {Object} paymentData - Payment data
   * @param {Object} result - Payment result
   * @param {Object} context - Additional context
   */
  async logPaymentEvent(eventType, paymentData, result = null, context = {}) {
    const auditEvent = {
      id: uuidv4(),
      eventType: eventType,
      timestamp: new Date().toISOString(),
      securityLevel: this.determineSecurityLevel(eventType),
      eventData: {
        paymentId: paymentData.transactionId || paymentData.id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: paymentData.paymentMethod,
        provider: paymentData.provider,
        status: result?.status || paymentData.status,
        result: result ? this.sanitizeResult(result) : null
      },
      context: this.sanitizeContext(context),
      hash: null,
      previousHash: null,
      tenantId: paymentData.tenantId,
      userId: paymentData.userId || context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      correlationId: paymentData.correlationId || context.correlationId
    };

    // Calculate hash for immutability
    auditEvent.hash = this.calculateEventHash(auditEvent);
    
    // Get previous hash for chain integrity
    auditEvent.previousHash = await this.getLastEventHash(auditEvent.tenantId);

    // Store the audit event
    await this.storeAuditEvent(auditEvent);

    return auditEvent.id;
  }

  /**
   * Log a data access event
   * @param {string} eventType - Type of data event
   * @param {Object} dataInfo - Data information
   * @param {Object} context - Additional context
   */
  async logDataEvent(eventType, dataInfo, context = {}) {
    const auditEvent = {
      id: uuidv4(),
      eventType: eventType,
      timestamp: new Date().toISOString(),
      securityLevel: this.determineSecurityLevel(eventType),
      eventData: {
        dataType: dataInfo.dataType,
        dataId: dataInfo.dataId,
        operation: dataInfo.operation,
        fields: dataInfo.fields,
        oldValues: dataInfo.oldValues ? this.sanitizeSensitiveData(dataInfo.oldValues) : null,
        newValues: dataInfo.newValues ? this.sanitizeSensitiveData(dataInfo.newValues) : null
      },
      context: this.sanitizeContext(context),
      hash: null,
      previousHash: null,
      tenantId: dataInfo.tenantId || context.tenantId,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      correlationId: context.correlationId
    };

    // Calculate hash for immutability
    auditEvent.hash = this.calculateEventHash(auditEvent);
    
    // Get previous hash for chain integrity
    auditEvent.previousHash = await this.getLastEventHash(auditEvent.tenantId);

    // Store the audit event
    await this.storeAuditEvent(auditEvent);

    return auditEvent.id;
  }

  /**
   * Log a compliance event
   * @param {string} eventType - Type of compliance event
   * @param {Object} complianceData - Compliance data
   * @param {Object} context - Additional context
   */
  async logComplianceEvent(eventType, complianceData, context = {}) {
    const auditEvent = {
      id: uuidv4(),
      eventType: eventType,
      timestamp: new Date().toISOString(),
      securityLevel: this.determineSecurityLevel(eventType),
      eventData: {
        complianceType: complianceData.complianceType,
        checkType: complianceData.checkType,
        result: complianceData.result,
        violations: complianceData.violations,
        recommendations: complianceData.recommendations
      },
      context: this.sanitizeContext(context),
      hash: null,
      previousHash: null,
      tenantId: complianceData.tenantId || context.tenantId,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      correlationId: context.correlationId
    };

    // Calculate hash for immutability
    auditEvent.hash = this.calculateEventHash(auditEvent);
    
    // Get previous hash for chain integrity
    auditEvent.previousHash = await this.getLastEventHash(auditEvent.tenantId);

    // Store the audit event
    await this.storeAuditEvent(auditEvent);

    return auditEvent.id;
  }

  /**
   * Store audit event in database
   * @param {Object} auditEvent - Audit event object
   */
  async storeAuditEvent(auditEvent) {
    try {
      const query = `
        INSERT INTO audit_trail_events (
          id, tenant_id, event_type, security_level, event_data, context_data,
          hash, previous_hash, user_id, ip_address, user_agent, session_id,
          correlation_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        auditEvent.id,
        auditEvent.tenantId,
        auditEvent.eventType,
        auditEvent.securityLevel,
        JSON.stringify(auditEvent.eventData),
        JSON.stringify(auditEvent.context),
        auditEvent.hash,
        auditEvent.previousHash,
        auditEvent.userId,
        auditEvent.ipAddress,
        auditEvent.userAgent,
        auditEvent.sessionId,
        auditEvent.correlationId
      ]);

      // Update audit chain integrity
      await this.updateAuditChain(auditEvent.tenantId, auditEvent.hash);

    } catch (error) {
      console.error('Failed to store audit event:', error);
      throw error;
    }
  }

  /**
   * Calculate hash for event immutability
   * @param {Object} auditEvent - Audit event object
   * @returns {string} Event hash
   */
  calculateEventHash(auditEvent) {
    const hashData = {
      id: auditEvent.id,
      eventType: auditEvent.eventType,
      timestamp: auditEvent.timestamp,
      securityLevel: auditEvent.securityLevel,
      eventData: auditEvent.eventData,
      context: auditEvent.context,
      tenantId: auditEvent.tenantId,
      userId: auditEvent.userId,
      previousHash: auditEvent.previousHash
    };

    return crypto.createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Get the last event hash for chain integrity
   * @param {string} tenantId - Tenant ID
   * @returns {string} Last event hash
   */
  async getLastEventHash(tenantId) {
    try {
      const query = `
        SELECT hash FROM audit_trail_events 
        WHERE tenant_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const result = await this.db.query(query, [tenantId]);
      return result.rows.length > 0 ? result.rows[0].hash : null;

    } catch (error) {
      console.error('Failed to get last event hash:', error);
      return null;
    }
  }

  /**
   * Update audit chain integrity
   * @param {string} tenantId - Tenant ID
   * @param {string} currentHash - Current event hash
   */
  async updateAuditChain(tenantId, currentHash) {
    try {
      const query = `
        INSERT INTO audit_chain_integrity (
          id, tenant_id, event_hash, chain_position, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;

      // Get current chain position
      const positionQuery = `
        SELECT COUNT(*) as position FROM audit_chain_integrity 
        WHERE tenant_id = $1
      `;

      const positionResult = await this.db.query(positionQuery, [tenantId]);
      const position = parseInt(positionResult.rows[0].position) + 1;

      await this.db.query(query, [
        uuidv4(),
        tenantId,
        currentHash,
        position
      ]);

    } catch (error) {
      console.error('Failed to update audit chain:', error);
    }
  }

  /**
   * Verify audit trail integrity
   * @param {string} tenantId - Tenant ID
   * @param {string} startDate - Start date for verification
   * @param {string} endDate - End date for verification
   * @returns {Object} Integrity verification result
   */
  async verifyAuditTrailIntegrity(tenantId, startDate, endDate) {
    try {
      const query = `
        SELECT id, event_type, event_data, context_data, hash, previous_hash, created_at
        FROM audit_trail_events 
        WHERE tenant_id = $1 
          AND created_at BETWEEN $2 AND $3
        ORDER BY created_at ASC
      `;

      const result = await this.db.query(query, [tenantId, startDate, endDate]);
      const events = result.rows;

      const verification = {
        totalEvents: events.length,
        verifiedEvents: 0,
        failedEvents: [],
        chainIntegrity: true,
        startDate,
        endDate,
        verifiedAt: new Date().toISOString()
      };

      let previousHash = null;

      for (const event of events) {
        // Recalculate hash
        const calculatedHash = this.calculateEventHash({
          id: event.id,
          eventType: event.event_type,
          timestamp: event.created_at.toISOString(),
          securityLevel: this.determineSecurityLevel(event.event_type),
          eventData: JSON.parse(event.event_data),
          context: JSON.parse(event.context_data),
          tenantId: tenantId,
          userId: null,
          previousHash: previousHash
        });

        // Verify hash
        if (calculatedHash === event.hash) {
          verification.verifiedEvents++;
        } else {
          verification.failedEvents.push({
            eventId: event.id,
            expectedHash: calculatedHash,
            actualHash: event.hash,
            timestamp: event.created_at
          });
        }

        // Verify chain integrity
        if (event.previous_hash !== previousHash) {
          verification.chainIntegrity = false;
        }

        previousHash = event.hash;
      }

      verification.integrityScore = (verification.verifiedEvents / verification.totalEvents) * 100;

      return verification;

    } catch (error) {
      console.error('Failed to verify audit trail integrity:', error);
      throw error;
    }
  }

  /**
   * Generate audit report
   * @param {string} tenantId - Tenant ID
   * @param {string} startDate - Report start date
   * @param {string} endDate - Report end date
   * @param {Array} eventTypes - Event types to include
   * @param {Array} securityLevels - Security levels to include
   * @returns {Object} Audit report
   */
  async generateAuditReport(tenantId, startDate, endDate, eventTypes = [], securityLevels = []) {
    try {
      let whereClause = 'WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3';
      const params = [tenantId, startDate, endDate];
      let paramIndex = 4;

      if (eventTypes.length > 0) {
        whereClause += ` AND event_type = ANY($${paramIndex})`;
        params.push(eventTypes);
        paramIndex++;
      }

      if (securityLevels.length > 0) {
        whereClause += ` AND security_level = ANY($${paramIndex})`;
        params.push(securityLevels);
        paramIndex++;
      }

      const query = `
        SELECT 
          event_type,
          security_level,
          COUNT(*) as event_count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips,
          MIN(created_at) as first_event,
          MAX(created_at) as last_event
        FROM audit_trail_events 
        ${whereClause}
        GROUP BY event_type, security_level
        ORDER BY event_count DESC
      `;

      const result = await this.db.query(query, params);

      const report = {
        tenantId,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        summary: {
          totalEvents: 0,
          uniqueUsers: 0,
          uniqueIPs: 0,
          eventTypes: {},
          securityLevels: {}
        },
        details: result.rows,
        recommendations: []
      };

      // Calculate summary statistics
      for (const row of result.rows) {
        report.summary.totalEvents += parseInt(row.event_count);
        
        if (!report.summary.eventTypes[row.event_type]) {
          report.summary.eventTypes[row.event_type] = 0;
        }
        report.summary.eventTypes[row.event_type] += parseInt(row.event_count);
        
        if (!report.summary.securityLevels[row.security_level]) {
          report.summary.securityLevels[row.security_level] = 0;
        }
        report.summary.securityLevels[row.security_level] += parseInt(row.event_count);
      }

      // Get unique users and IPs
      const uniqueQuery = `
        SELECT 
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM audit_trail_events 
        ${whereClause}
      `;

      const uniqueResult = await this.db.query(uniqueQuery, params);
      report.summary.uniqueUsers = parseInt(uniqueResult.rows[0].unique_users);
      report.summary.uniqueIPs = parseInt(uniqueResult.rows[0].unique_ips);

      // Generate recommendations
      report.recommendations = await this.generateAuditRecommendations(report);

      return report;

    } catch (error) {
      console.error('Failed to generate audit report:', error);
      throw error;
    }
  }

  /**
   * Check for security alerts
   * @param {Object} auditEvent - Audit event
   */
  async checkSecurityAlerts(auditEvent) {
    const alerts = [];

    // Check for suspicious patterns
    if (auditEvent.eventType === this.eventTypes.LOGIN_FAILED) {
      const recentFailures = await this.getRecentLoginFailures(auditEvent.tenantId, auditEvent.ipAddress);
      if (recentFailures >= 5) {
        alerts.push({
          type: 'brute_force_attempt',
          severity: 'high',
          message: `Multiple failed login attempts from IP: ${auditEvent.ipAddress}`,
          eventId: auditEvent.id
        });
      }
    }

    if (auditEvent.eventType === this.eventTypes.UNAUTHORIZED_ACCESS) {
      alerts.push({
        type: 'unauthorized_access',
        severity: 'critical',
        message: 'Unauthorized access attempt detected',
        eventId: auditEvent.id
      });
    }

    if (auditEvent.eventType === this.eventTypes.FRAUD_DETECTED) {
      alerts.push({
        type: 'fraud_detected',
        severity: 'critical',
        message: 'Fraudulent activity detected',
        eventId: auditEvent.id
      });
    }

    // Store alerts
    for (const alert of alerts) {
      await this.storeSecurityAlert(alert, auditEvent);
    }
  }

  /**
   * Get recent login failures
   * @param {string} tenantId - Tenant ID
   * @param {string} ipAddress - IP address
   * @returns {number} Number of recent failures
   */
  async getRecentLoginFailures(tenantId, ipAddress) {
    try {
      const query = `
        SELECT COUNT(*) as failure_count
        FROM audit_trail_events 
        WHERE tenant_id = $1 
          AND event_type = $2
          AND ip_address = $3
          AND created_at >= NOW() - INTERVAL '1 hour'
      `;

      const result = await this.db.query(query, [tenantId, this.eventTypes.LOGIN_FAILED, ipAddress]);
      return parseInt(result.rows[0].failure_count);

    } catch (error) {
      console.error('Failed to get recent login failures:', error);
      return 0;
    }
  }

  /**
   * Store security alert
   * @param {Object} alert - Security alert
   * @param {Object} auditEvent - Related audit event
   */
  async storeSecurityAlert(alert, auditEvent) {
    try {
      const query = `
        INSERT INTO security_alerts (
          id, tenant_id, alert_type, severity, message, event_id,
          ip_address, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        uuidv4(),
        auditEvent.tenantId,
        alert.type,
        alert.severity,
        alert.message,
        alert.eventId,
        auditEvent.ipAddress,
        auditEvent.userId
      ]);

    } catch (error) {
      console.error('Failed to store security alert:', error);
    }
  }

  /**
   * Determine security level for event type
   * @param {string} eventType - Event type
   * @returns {string} Security level
   */
  determineSecurityLevel(eventType) {
    const criticalEvents = [
      this.eventTypes.SECURITY_BREACH,
      this.eventTypes.FRAUD_DETECTED,
      this.eventTypes.UNAUTHORIZED_ACCESS,
      this.eventTypes.PAYMENT_BLOCKED
    ];

    const highEvents = [
      this.eventTypes.PAYMENT_PROCESSED,
      this.eventTypes.REFUND_PROCESSED,
      this.eventTypes.DATA_DELETED,
      this.eventTypes.COMPLIANCE_VIOLATION
    ];

    const mediumEvents = [
      this.eventTypes.DATA_MODIFIED,
      this.eventTypes.DATA_ACCESSED,
      this.eventTypes.LOGIN_FAILED,
      this.eventTypes.SUSPICIOUS_ACTIVITY
    ];

    if (criticalEvents.includes(eventType)) {
      return this.securityLevels.CRITICAL;
    } else if (highEvents.includes(eventType)) {
      return this.securityLevels.HIGH;
    } else if (mediumEvents.includes(eventType)) {
      return this.securityLevels.MEDIUM;
    } else {
      return this.securityLevels.LOW;
    }
  }

  /**
   * Sanitize event data
   * @param {Object} eventData - Event data
   * @returns {Object} Sanitized event data
   */
  sanitizeEventData(eventData) {
    const sanitized = { ...eventData };
    
    // Remove sensitive fields
    delete sanitized.cardNumber;
    delete sanitized.cvv;
    delete sanitized.ssn;
    delete sanitized.password;
    delete sanitized.apiKey;
    delete sanitized.secret;
    
    return sanitized;
  }

  /**
   * Sanitize context data
   * @param {Object} context - Context data
   * @returns {Object} Sanitized context
   */
  sanitizeContext(context) {
    const sanitized = { ...context };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.apiKey;
    delete sanitized.secret;
    
    return sanitized;
  }

  /**
   * Sanitize sensitive data
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeSensitiveData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    
    // Mask sensitive fields
    if (sanitized.cardNumber) {
      sanitized.cardNumber = '****-****-****-' + sanitized.cardNumber.slice(-4);
    }
    
    if (sanitized.cvv) {
      sanitized.cvv = '***';
    }
    
    if (sanitized.ssn) {
      sanitized.ssn = '***-**-' + sanitized.ssn.slice(-4);
    }
    
    if (sanitized.password) {
      sanitized.password = '***';
    }
    
    return sanitized;
  }

  /**
   * Sanitize payment result
   * @param {Object} result - Payment result
   * @returns {Object} Sanitized result
   */
  sanitizeResult(result) {
    const sanitized = { ...result };
    
    // Remove sensitive fields from result
    delete sanitized.cardNumber;
    delete sanitized.cvv;
    delete sanitized.ssn;
    
    return sanitized;
  }

  /**
   * Generate audit recommendations
   * @param {Object} report - Audit report
   * @returns {Array} Recommendations
   */
  async generateAuditRecommendations(report) {
    const recommendations = [];

    // Check for high-risk events
    const highRiskEvents = report.summary.securityLevels[this.securityLevels.HIGH] || 0;
    const criticalEvents = report.summary.securityLevels[this.securityLevels.CRITICAL] || 0;

    if (criticalEvents > 0) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        message: `${criticalEvents} critical security events detected. Immediate review required.`
      });
    }

    if (highRiskEvents > 10) {
      recommendations.push({
        type: 'security',
        priority: 'medium',
        message: `${highRiskEvents} high-risk events detected. Consider security review.`
      });
    }

    // Check for unusual patterns
    const loginFailures = report.summary.eventTypes[this.eventTypes.LOGIN_FAILED] || 0;
    if (loginFailures > 50) {
      recommendations.push({
        type: 'authentication',
        priority: 'medium',
        message: `${loginFailures} login failures detected. Consider implementing additional security measures.`
      });
    }

    return recommendations;
  }
}

module.exports = AuditTrailService;
