/**
 * Compliance Automation Service
 * 
 * Handles automated compliance checks, data residency enforcement,
 * auditable reporting, and regulatory compliance across different
 * jurisdictions and payment types.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class ComplianceAutomationService {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;
    
    // Compliance rules by jurisdiction
    this.complianceRules = {
      // PCI DSS Level 1
      pci: {
        cardDataEncryption: true,
        tokenization: true,
        secureTransmission: true,
        accessControl: true,
        monitoring: true,
        dataRetention: 2555, // days
        auditLogging: true
      },
      
      // GDPR (EU)
      gdpr: {
        dataMinimization: true,
        consentManagement: true,
        rightToErasure: true,
        dataPortability: true,
        breachNotification: true,
        dataRetention: 2555, // days
        crossBorderTransfer: true
      },
      
      // SOX (US)
      sox: {
        financialReporting: true,
        internalControls: true,
        auditTrail: true,
        dataIntegrity: true,
        retentionPeriod: 2555 // days
      },
      
      // FERPA (US Education)
      ferpa: {
        studentDataProtection: true,
        parentalRights: true,
        dataSharing: true,
        auditTrail: true,
        retentionPeriod: 2555 // days
      },
      
      // CCPA (California)
      ccpa: {
        consumerRights: true,
        dataTransparency: true,
        optOut: true,
        dataDeletion: true,
        auditTrail: true
      },
      
      // PSD2 (EU Banking)
      psd2: {
        strongCustomerAuthentication: true,
        openBanking: true,
        fraudPrevention: true,
        dataSharing: true,
        auditTrail: true
      },
      
      // RBI (India)
      rbi: {
        dataLocalization: true,
        fraudPrevention: true,
        auditTrail: true,
        dataRetention: 2555 // days
      }
    };
    
    // Data residency rules by country
    this.dataResidencyRules = {
      'IN': { // India
        personalData: 'local',
        financialData: 'local',
        auditData: 'local'
      },
      'CN': { // China
        personalData: 'local',
        financialData: 'local',
        auditData: 'local'
      },
      'RU': { // Russia
        personalData: 'local',
        financialData: 'local',
        auditData: 'local'
      },
      'BR': { // Brazil
        personalData: 'local',
        financialData: 'local',
        auditData: 'local'
      },
      'EU': { // European Union
        personalData: 'eu',
        financialData: 'eu',
        auditData: 'eu'
      },
      'US': { // United States
        personalData: 'us',
        financialData: 'us',
        auditData: 'us'
      }
    };
    
    // Audit event types
    this.auditEventTypes = {
      PAYMENT_PROCESSED: 'payment_processed',
      PAYMENT_FAILED: 'payment_failed',
      REFUND_PROCESSED: 'refund_processed',
      DATA_ACCESSED: 'data_accessed',
      DATA_MODIFIED: 'data_modified',
      DATA_DELETED: 'data_deleted',
      COMPLIANCE_CHECK: 'compliance_check',
      FRAUD_DETECTED: 'fraud_detected',
      SECURITY_BREACH: 'security_breach',
      USER_LOGIN: 'user_login',
      PERMISSION_GRANTED: 'permission_granted',
      PERMISSION_REVOKED: 'permission_revoked'
    };
  }

  /**
   * Validate payment compliance
   * @param {Object} paymentData - Payment data
   * @param {Object} tenantConfig - Tenant configuration
   * @returns {Object} Compliance validation result
   */
  async validatePaymentCompliance(paymentData, tenantConfig) {
    const complianceResult = {
      passed: true,
      violations: [],
      warnings: [],
      requiredActions: [],
      auditEvents: []
    };

    try {
      // Get tenant's compliance requirements
      const tenantCompliance = await this.getTenantComplianceRequirements(paymentData.tenantId);
      
      // Check PCI DSS compliance
      if (tenantCompliance.pci) {
        const pciResult = await this.validatePCICompliance(paymentData);
        if (!pciResult.passed) {
          complianceResult.passed = false;
          complianceResult.violations.push(...pciResult.violations);
        }
        complianceResult.auditEvents.push(...pciResult.auditEvents);
      }

      // Check GDPR compliance
      if (tenantCompliance.gdpr) {
        const gdprResult = await this.validateGDPRCompliance(paymentData);
        if (!gdprResult.passed) {
          complianceResult.passed = false;
          complianceResult.violations.push(...gdprResult.violations);
        }
        complianceResult.auditEvents.push(...gdprResult.auditEvents);
      }

      // Check regional compliance
      const regionalResult = await this.validateRegionalCompliance(paymentData, tenantConfig);
      if (!regionalResult.passed) {
        complianceResult.passed = false;
        complianceResult.violations.push(...regionalResult.violations);
      }
      complianceResult.auditEvents.push(...regionalResult.auditEvents);

      // Check data residency
      const residencyResult = await this.validateDataResidency(paymentData, tenantConfig);
      if (!residencyResult.passed) {
        complianceResult.passed = false;
        complianceResult.violations.push(...residencyResult.violations);
      }
      complianceResult.auditEvents.push(...residencyResult.auditEvents);

      // Log compliance check
      await this.logComplianceCheck('payment_validation', paymentData, complianceResult);

      return complianceResult;

    } catch (error) {
      console.error('Compliance validation failed:', error);
      complianceResult.passed = false;
      complianceResult.violations.push({
        type: 'system_error',
        message: 'Compliance validation system error',
        severity: 'high'
      });
      
      await this.logComplianceCheck('payment_validation', paymentData, complianceResult);
      return complianceResult;
    }
  }

  /**
   * Validate refund compliance
   * @param {Object} refundData - Refund data
   * @param {Object} originalTransaction - Original transaction
   * @returns {Object} Compliance validation result
   */
  async validateRefundCompliance(refundData, originalTransaction) {
    const complianceResult = {
      passed: true,
      violations: [],
      warnings: [],
      requiredActions: [],
      auditEvents: []
    };

    try {
      // Check refund amount limits
      if (refundData.amount > originalTransaction.amount) {
        complianceResult.passed = false;
        complianceResult.violations.push({
          type: 'refund_amount_exceeded',
          message: 'Refund amount exceeds original transaction amount',
          severity: 'high'
        });
      }

      // Check refund time limits
      const refundTimeLimit = await this.getRefundTimeLimit(originalTransaction.tenantId);
      const timeSinceTransaction = Date.now() - new Date(originalTransaction.created_at).getTime();
      
      if (timeSinceTransaction > refundTimeLimit) {
        complianceResult.passed = false;
        complianceResult.violations.push({
          type: 'refund_time_limit_exceeded',
          message: 'Refund time limit exceeded',
          severity: 'medium'
        });
      }

      // Check regulatory requirements for refunds
      const regulatoryResult = await this.validateRefundRegulatoryRequirements(refundData, originalTransaction);
      if (!regulatoryResult.passed) {
        complianceResult.passed = false;
        complianceResult.violations.push(...regulatoryResult.violations);
      }

      // Log compliance check
      await this.logComplianceCheck('refund_validation', refundData, complianceResult);

      return complianceResult;

    } catch (error) {
      console.error('Refund compliance validation failed:', error);
      complianceResult.passed = false;
      complianceResult.violations.push({
        type: 'system_error',
        message: 'Refund compliance validation system error',
        severity: 'high'
      });
      
      await this.logComplianceCheck('refund_validation', refundData, complianceResult);
      return complianceResult;
    }
  }

  /**
   * Validate PCI DSS compliance
   * @param {Object} paymentData - Payment data
   * @returns {Object} PCI compliance result
   */
  async validatePCICompliance(paymentData) {
    const result = {
      passed: true,
      violations: [],
      auditEvents: []
    };

    // Check if card data is properly tokenized
    if (paymentData.paymentMethod === 'card') {
      if (paymentData.cardNumber && !paymentData.tokenized) {
        result.passed = false;
        result.violations.push({
          type: 'pci_card_data_not_tokenized',
          message: 'Card data must be tokenized',
          severity: 'critical'
        });
      }

      // Check for sensitive data in logs
      if (this.containsSensitiveData(paymentData)) {
        result.passed = false;
        result.violations.push({
          type: 'pci_sensitive_data_exposure',
          message: 'Sensitive card data detected in payment data',
          severity: 'critical'
        });
      }
    }

    // Log PCI compliance check
    result.auditEvents.push({
      type: this.auditEventTypes.COMPLIANCE_CHECK,
      event: 'pci_validation',
      result: result.passed ? 'passed' : 'failed',
      violations: result.violations.length
    });

    return result;
  }

  /**
   * Validate GDPR compliance
   * @param {Object} paymentData - Payment data
   * @returns {Object} GDPR compliance result
   */
  async validateGDPRCompliance(paymentData) {
    const result = {
      passed: true,
      violations: [],
      auditEvents: []
    };

    // Check for EU data subjects
    if (this.isEUDataSubject(paymentData)) {
      // Check consent
      if (!paymentData.gdprConsent) {
        result.passed = false;
        result.violations.push({
          type: 'gdpr_consent_missing',
          message: 'GDPR consent required for EU data subjects',
          severity: 'high'
        });
      }

      // Check data minimization
      if (this.hasExcessiveData(paymentData)) {
        result.passed = false;
        result.violations.push({
          type: 'gdpr_data_minimization',
          message: 'Data collection exceeds necessary scope',
          severity: 'medium'
        });
      }

      // Check data retention
      const retentionPeriod = await this.getDataRetentionPeriod(paymentData.tenantId);
      if (retentionPeriod > this.complianceRules.gdpr.dataRetention) {
        result.passed = false;
        result.violations.push({
          type: 'gdpr_retention_period',
          message: 'Data retention period exceeds GDPR limits',
          severity: 'medium'
        });
      }
    }

    // Log GDPR compliance check
    result.auditEvents.push({
      type: this.auditEventTypes.COMPLIANCE_CHECK,
      event: 'gdpr_validation',
      result: result.passed ? 'passed' : 'failed',
      violations: result.violations.length
    });

    return result;
  }

  /**
   * Validate regional compliance requirements
   * @param {Object} paymentData - Payment data
   * @param {Object} tenantConfig - Tenant configuration
   * @returns {Object} Regional compliance result
   */
  async validateRegionalCompliance(paymentData, tenantConfig) {
    const result = {
      passed: true,
      violations: [],
      auditEvents: []
    };

    const country = paymentData.country;
    
    // US-specific requirements
    if (country === 'US') {
      // SOX compliance for financial data
      if (paymentData.amount > 10000) {
        if (!paymentData.soxCompliance) {
          result.passed = false;
          result.violations.push({
            type: 'sox_compliance_required',
            message: 'SOX compliance required for high-value transactions',
            severity: 'high'
          });
        }
      }

      // FERPA compliance for educational institutions
      if (tenantConfig.isEducationalInstitution) {
        if (!paymentData.ferpaCompliance) {
          result.passed = false;
          result.violations.push({
            type: 'ferpa_compliance_required',
            message: 'FERPA compliance required for educational transactions',
            severity: 'high'
          });
        }
      }
    }

    // EU-specific requirements
    if (this.isEUCountry(country)) {
      // PSD2 compliance
      if (paymentData.amount > 30) { // EU threshold for SCA
        if (!paymentData.psd2Compliance) {
          result.passed = false;
          result.violations.push({
            type: 'psd2_compliance_required',
            message: 'PSD2 Strong Customer Authentication required',
            severity: 'high'
          });
        }
      }
    }

    // India-specific requirements
    if (country === 'IN') {
      // RBI data localization
      if (!paymentData.rbiCompliance) {
        result.passed = false;
        result.violations.push({
          type: 'rbi_compliance_required',
          message: 'RBI data localization compliance required',
          severity: 'high'
        });
      }
    }

    // Log regional compliance check
    result.auditEvents.push({
      type: this.auditEventTypes.COMPLIANCE_CHECK,
      event: 'regional_validation',
      country: country,
      result: result.passed ? 'passed' : 'failed',
      violations: result.violations.length
    });

    return result;
  }

  /**
   * Validate data residency requirements
   * @param {Object} paymentData - Payment data
   * @param {Object} tenantConfig - Tenant configuration
   * @returns {Object} Data residency result
   */
  async validateDataResidency(paymentData, tenantConfig) {
    const result = {
      passed: true,
      violations: [],
      auditEvents: []
    };

    const country = paymentData.country;
    const residencyRules = this.dataResidencyRules[country];

    if (residencyRules) {
      // Check if data processing location complies with residency rules
      const processingLocation = await this.getDataProcessingLocation(paymentData.tenantId);
      
      for (const [dataType, requiredLocation] of Object.entries(residencyRules)) {
        if (!this.isDataLocationCompliant(processingLocation, requiredLocation, dataType)) {
          result.passed = false;
          result.violations.push({
            type: 'data_residency_violation',
            message: `${dataType} must be processed in ${requiredLocation}`,
            severity: 'high',
            dataType: dataType,
            requiredLocation: requiredLocation,
            actualLocation: processingLocation
          });
        }
      }
    }

    // Log data residency check
    result.auditEvents.push({
      type: this.auditEventTypes.COMPLIANCE_CHECK,
      event: 'data_residency_validation',
      country: country,
      result: result.passed ? 'passed' : 'failed',
      violations: result.violations.length
    });

    return result;
  }

  /**
   * Log compliance check
   * @param {string} checkType - Type of compliance check
   * @param {Object} data - Data being checked
   * @param {Object} result - Compliance check result
   */
  async logComplianceCheck(checkType, data, result) {
    try {
      const query = `
        INSERT INTO compliance_checks (
          id, tenant_id, check_type, data_hash, passed, violations,
          warnings, required_actions, audit_events, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `;

      const dataHash = this.hashSensitiveData(data);
      
      await this.db.query(query, [
        uuidv4(),
        data.tenantId,
        checkType,
        dataHash,
        result.passed,
        JSON.stringify(result.violations),
        JSON.stringify(result.warnings),
        JSON.stringify(result.requiredActions),
        JSON.stringify(result.auditEvents)
      ]);

      // Log audit events
      for (const auditEvent of result.auditEvents) {
        await this.logAuditEvent(auditEvent, data);
      }

    } catch (error) {
      console.error('Failed to log compliance check:', error);
    }
  }

  /**
   * Log audit event
   * @param {Object} auditEvent - Audit event data
   * @param {Object} context - Event context
   */
  async logAuditEvent(auditEvent, context) {
    try {
      const query = `
        INSERT INTO compliance_audit_events (
          id, tenant_id, event_type, event_data, context_data,
          user_id, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        uuidv4(),
        context.tenantId,
        auditEvent.type,
        JSON.stringify(auditEvent),
        JSON.stringify(this.sanitizeContextData(context)),
        context.userId || null,
        context.ipAddress || null,
        context.userAgent || null
      ]);

    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Generate compliance report
   * @param {string} tenantId - Tenant ID
   * @param {string} startDate - Report start date
   * @param {string} endDate - Report end date
   * @param {Array} complianceTypes - Types of compliance to include
   * @returns {Object} Compliance report
   */
  async generateComplianceReport(tenantId, startDate, endDate, complianceTypes = ['all']) {
    try {
      const report = {
        tenantId,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        summary: {},
        details: {},
        violations: [],
        recommendations: []
      };

      // Get compliance check summary
      const summaryQuery = `
        SELECT 
          check_type,
          COUNT(*) as total_checks,
          COUNT(CASE WHEN passed = true THEN 1 END) as passed_checks,
          COUNT(CASE WHEN passed = false THEN 1 END) as failed_checks
        FROM compliance_checks 
        WHERE tenant_id = $1 
          AND created_at BETWEEN $2 AND $3
        GROUP BY check_type
      `;

      const summaryResult = await this.db.query(summaryQuery, [tenantId, startDate, endDate]);
      
      for (const row of summaryResult.rows) {
        report.summary[row.check_type] = {
          total: parseInt(row.total_checks),
          passed: parseInt(row.passed_checks),
          failed: parseInt(row.failed_checks),
          passRate: (parseInt(row.passed_checks) / parseInt(row.total_checks)) * 100
        };
      }

      // Get violation details
      const violationsQuery = `
        SELECT check_type, violations, created_at
        FROM compliance_checks 
        WHERE tenant_id = $1 
          AND passed = false
          AND created_at BETWEEN $2 AND $3
        ORDER BY created_at DESC
      `;

      const violationsResult = await this.db.query(violationsQuery, [tenantId, startDate, endDate]);
      
      for (const row of violationsResult.rows) {
        const violations = JSON.parse(row.violations);
        report.violations.push({
          checkType: row.check_type,
          violations: violations,
          timestamp: row.created_at
        });
      }

      // Generate recommendations
      report.recommendations = await this.generateComplianceRecommendations(report);

      return report;

    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Get compliance statistics
   * @param {string} tenantId - Tenant ID (optional)
   * @param {string} period - Time period
   * @returns {Object} Compliance statistics
   */
  async getComplianceStatistics(tenantId, period = '30d') {
    try {
      const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
      const params = tenantId ? [tenantId] : [];

      const query = `
        SELECT 
          COUNT(*) as total_checks,
          COUNT(CASE WHEN passed = true THEN 1 END) as passed_checks,
          COUNT(CASE WHEN passed = false THEN 1 END) as failed_checks,
          COUNT(DISTINCT check_type) as check_types,
          AVG(CASE WHEN passed = true THEN 1.0 ELSE 0.0 END) * 100 as pass_rate
        FROM compliance_checks 
        ${whereClause}
        AND created_at >= NOW() - INTERVAL '${period}'
      `;

      const result = await this.db.query(query, params);
      const stats = result.rows[0];

      return {
        totalChecks: parseInt(stats.total_checks),
        passedChecks: parseInt(stats.passed_checks),
        failedChecks: parseInt(stats.failed_checks),
        checkTypes: parseInt(stats.check_types),
        passRate: parseFloat(stats.pass_rate),
        period: period,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get compliance statistics:', error);
      return {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        checkTypes: 0,
        passRate: 0,
        period: period,
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get system health status
   * @returns {Object} Health status
   */
  async getHealthStatus() {
    try {
      // Check database connectivity
      await this.db.query('SELECT 1');
      
      // Check recent compliance checks
      const recentChecks = await this.db.query(`
        SELECT COUNT(*) as count 
        FROM compliance_checks 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `);

      return {
        status: 'healthy',
        database: 'connected',
        recentChecks: parseInt(recentChecks.rows[0].count),
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  // Helper methods
  containsSensitiveData(data) {
    const sensitiveFields = ['cardNumber', 'cvv', 'ssn', 'password'];
    return sensitiveFields.some(field => data[field]);
  }

  isEUDataSubject(data) {
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    return euCountries.includes(data.country);
  }

  isEUCountry(country) {
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    return euCountries.includes(country);
  }

  hasExcessiveData(data) {
    // Check if more data is collected than necessary
    const requiredFields = ['amount', 'currency', 'paymentMethod', 'tenantId'];
    const collectedFields = Object.keys(data);
    return collectedFields.length > requiredFields.length * 2;
  }

  hashSensitiveData(data) {
    const sanitized = { ...data };
    delete sanitized.cardNumber;
    delete sanitized.cvv;
    delete sanitized.ssn;
    delete sanitized.password;
    return crypto.createHash('sha256').update(JSON.stringify(sanitized)).digest('hex');
  }

  sanitizeContextData(context) {
    const sanitized = { ...context };
    delete sanitized.cardNumber;
    delete sanitized.cvv;
    delete sanitized.ssn;
    delete sanitized.password;
    return sanitized;
  }

  async getTenantComplianceRequirements(tenantId) {
    // This would typically query tenant configuration
    // For now, return default requirements
    return {
      pci: true,
      gdpr: true,
      sox: true,
      ferpa: true,
      ccpa: true,
      psd2: true,
      rbi: true
    };
  }

  async getRefundTimeLimit(tenantId) {
    // This would typically query tenant configuration
    // Default 30 days in milliseconds
    return 30 * 24 * 60 * 60 * 1000;
  }

  async getDataRetentionPeriod(tenantId) {
    // This would typically query tenant configuration
    return this.complianceRules.gdpr.dataRetention;
  }

  async getDataProcessingLocation(tenantId) {
    // This would typically query tenant configuration
    return 'us-east-1'; // Default AWS region
  }

  isDataLocationCompliant(actualLocation, requiredLocation, dataType) {
    // Simplified location compliance check
    if (requiredLocation === 'local') {
      return actualLocation.includes(requiredLocation);
    }
    return true; // For now, assume compliance
  }

  async validateRefundRegulatoryRequirements(refundData, originalTransaction) {
    // Placeholder for regulatory refund requirements
    return { passed: true, violations: [] };
  }

  async generateComplianceRecommendations(report) {
    const recommendations = [];
    
    // Analyze pass rates and suggest improvements
    for (const [checkType, stats] of Object.entries(report.summary)) {
      if (stats.passRate < 95) {
        recommendations.push({
          type: 'improvement',
          checkType: checkType,
          message: `Improve ${checkType} compliance (current pass rate: ${stats.passRate.toFixed(1)}%)`,
          priority: stats.passRate < 80 ? 'high' : 'medium'
        });
      }
    }
    
    return recommendations;
  }
}

module.exports = ComplianceAutomationService;
