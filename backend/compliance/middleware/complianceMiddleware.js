/**
 * Compliance Middleware
 * Provides compliance checks and data protection for all requests
 * Ensures all operations meet compliance requirements
 */

const ComplianceEngine = require('../services/ComplianceEngine');
const DataResidencyService = require('../services/DataResidencyService');
const AuditTrailService = require('../services/AuditTrailService');

class ComplianceMiddleware {
  constructor() {
    this.complianceEngine = new ComplianceEngine();
    this.dataResidencyService = new DataResidencyService();
    this.auditTrailService = new AuditTrailService();
  }

  /**
   * Middleware to enforce data residency
   * @param {string} dataType - Type of data being processed
   * @returns {Function} Express middleware function
   */
  enforceDataResidency(dataType) {
    return async (req, res, next) => {
      try {
        const tenantId = req.tenant.id;
        const targetRegion = req.headers['x-target-region'] || 'US';
        
        // Validate data residency
        const residencyCheck = await this.dataResidencyService.validateDataResidency(
          tenantId,
          dataType,
          targetRegion,
          {
            operation: req.method,
            endpoint: req.path,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip
          }
        );

        if (!residencyCheck.valid) {
          return res.status(403).json({
            success: false,
            error: 'Data residency violation',
            details: {
              dataType,
              targetRegion,
              reason: 'Data cannot be processed in the specified region due to compliance requirements'
            }
          });
        }

        // Add residency info to request
        req.compliance = {
          ...req.compliance,
          dataResidency: residencyCheck
        };

        next();
      } catch (error) {
        console.error('Data residency enforcement error:', error);
        return res.status(500).json({
          success: false,
          error: 'Data residency check failed'
        });
      }
    };
  }

  /**
   * Middleware to log all requests for audit trail
   * @returns {Function} Express middleware function
   */
  auditAllRequests() {
    return async (req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;

      // Override res.send to capture response details
      res.send = function(data) {
        const executionTime = Date.now() - startTime;
        
        // Log the request asynchronously (don't block response)
        setImmediate(async () => {
          try {
            await this.auditTrailService.logEvent({
              tenantId: req.tenant?.id,
              userId: req.user?.id,
              userEmail: req.user?.email,
              userRole: req.user?.role,
              sessionId: req.sessionID,
              action: req.method.toLowerCase(),
              resourceType: this.extractResourceType(req.path),
              resourceId: this.extractResourceId(req.path, req.params),
              requestId: req.headers['x-request-id'] || this.generateRequestId(),
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              requestMethod: req.method,
              requestUrl: req.originalUrl,
              requestHeaders: this.sanitizeHeaders(req.headers),
              oldValues: req.method === 'PUT' || req.method === 'PATCH' ? req.body : null,
              newValues: req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' ? req.body : null,
              success: res.statusCode < 400,
              errorMessage: res.statusCode >= 400 ? data : null,
              responseStatus: res.statusCode,
              executionTimeMs: executionTime,
              metadata: {
                query: req.query,
                params: req.params
              }
            });
          } catch (auditError) {
            console.error('Audit logging error:', auditError);
          }
        });

        return originalSend.call(this, data);
      }.bind(res);

      next();
    };
  }

  /**
   * Middleware to validate sensitive data handling
   * @param {Array} sensitiveFields - Fields that contain sensitive data
   * @returns {Function} Express middleware function
   */
  validateSensitiveData(sensitiveFields = []) {
    return async (req, res, next) => {
      try {
        const sensitiveDataFound = this.findSensitiveData(req.body, sensitiveFields);
        
        if (sensitiveDataFound.length > 0) {
          // Check if data is properly tokenized
          const tokenizationCheck = await this.validateTokenization(req.body, sensitiveDataFound);
          
          if (!tokenizationCheck.valid) {
            return res.status(400).json({
              success: false,
              error: 'Sensitive data must be tokenized',
              details: {
                sensitiveFields: sensitiveDataFound,
                message: 'All sensitive data must be tokenized before transmission'
              }
            });
          }
        }

        next();
      } catch (error) {
        console.error('Sensitive data validation error:', error);
        return res.status(500).json({
          success: false,
          error: 'Sensitive data validation failed'
        });
      }
    };
  }

  /**
   * Middleware to enforce PCI DSS compliance
   * @returns {Function} Express middleware function
   */
  enforcePCIDSS() {
    return async (req, res, next) => {
      try {
        // Check for card data in request
        const cardDataFields = ['card_number', 'card_cvv', 'card_expiry', 'cardholder_name'];
        const hasCardData = this.findSensitiveData(req.body, cardDataFields);
        
        if (hasCardData.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'PCI DSS violation',
            details: {
              message: 'Card data must not be transmitted in plaintext. Use hosted fields or tokenization.',
              sensitiveFields: hasCardData
            }
          });
        }

        // Add PCI DSS compliance flag
        req.compliance = {
          ...req.compliance,
          pciDSSCompliant: true
        };

        next();
      } catch (error) {
        console.error('PCI DSS enforcement error:', error);
        return res.status(500).json({
          success: false,
          error: 'PCI DSS compliance check failed'
        });
      }
    };
  }

  /**
   * Middleware to enforce GDPR compliance
   * @returns {Function} Express middleware function
   */
  enforceGDPR() {
    return async (req, res, next) => {
      try {
        const tenantId = req.tenant.id;
        
        // Check if tenant is in EU region
        const residencyRequirements = await this.dataResidencyService.getResidencyRequirements(tenantId);
        
        if (residencyRequirements && residencyRequirements.primaryRegion === 'EU') {
          // Enforce GDPR requirements
          const gdprCheck = await this.complianceEngine.checkCompliance('GDPR', tenantId, {
            userId: req.user.id,
            request: req
          });

          if (!gdprCheck.overallCompliance) {
            return res.status(403).json({
              success: false,
              error: 'GDPR compliance violation',
              details: {
                issues: gdprCheck.issues,
                message: 'Request does not meet GDPR requirements'
              }
            });
          }
        }

        // Add GDPR compliance flag
        req.compliance = {
          ...req.compliance,
          gdprCompliant: true
        };

        next();
      } catch (error) {
        console.error('GDPR enforcement error:', error);
        return res.status(500).json({
          success: false,
          error: 'GDPR compliance check failed'
        });
      }
    };
  }

  /**
   * Middleware to enforce FERPA compliance
   * @returns {Function} Express middleware function
   */
  enforceFERPA() {
    return async (req, res, next) => {
      try {
        const tenantId = req.tenant.id;
        
        // Check if this is educational data
        const isEducationalData = this.isEducationalData(req.path, req.body);
        
        if (isEducationalData) {
          const ferpaCheck = await this.complianceEngine.checkCompliance('FERPA', tenantId, {
            userId: req.user.id,
            request: req
          });

          if (!ferpaCheck.overallCompliance) {
            return res.status(403).json({
              success: false,
              error: 'FERPA compliance violation',
              details: {
                issues: ferpaCheck.issues,
                message: 'Request does not meet FERPA requirements'
              }
            });
          }
        }

        // Add FERPA compliance flag
        req.compliance = {
          ...req.compliance,
          ferpaCompliant: true
        };

        next();
      } catch (error) {
        console.error('FERPA enforcement error:', error);
        return res.status(500).json({
          success: false,
          error: 'FERPA compliance check failed'
        });
      }
    };
  }

  /**
   * Middleware to enforce COPPA compliance
   * @returns {Function} Express middleware function
   */
  enforceCOPPA() {
    return async (req, res, next) => {
      try {
        const tenantId = req.tenant.id;
        
        // Check if this involves student data (under 13)
        const involvesStudentData = this.involvesStudentData(req.path, req.body);
        
        if (involvesStudentData) {
          const coppaCheck = await this.complianceEngine.checkCompliance('COPPA', tenantId, {
            userId: req.user.id,
            request: req
          });

          if (!coppaCheck.overallCompliance) {
            return res.status(403).json({
              success: false,
              error: 'COPPA compliance violation',
              details: {
                issues: coppaCheck.issues,
                message: 'Request does not meet COPPA requirements for student data'
              }
            });
          }
        }

        // Add COPPA compliance flag
        req.compliance = {
          ...req.compliance,
          coppaCompliant: true
        };

        next();
      } catch (error) {
        console.error('COPPA enforcement error:', error);
        return res.status(500).json({
          success: false,
          error: 'COPPA compliance check failed'
        });
      }
    };
  }

  /**
   * Middleware to require KYC/AML verification for financial operations
   * @returns {Function} Express middleware function
   */
  requireKYCAML() {
    return async (req, res, next) => {
      try {
        const tenantId = req.tenant.id;
        const userId = req.user.id;
        
        // Check if this is a financial operation
        const isFinancialOperation = this.isFinancialOperation(req.path, req.method);
        
        if (isFinancialOperation) {
          // Check if user has completed KYC/AML
          const kycStatus = await this.checkKYCAMLStatus(tenantId, userId);
          
          if (!kycStatus.verified) {
            return res.status(403).json({
              success: false,
              error: 'KYC/AML verification required',
              details: {
                message: 'Financial operations require KYC/AML verification',
                kycStatus: kycStatus.status,
                amlStatus: kycStatus.amlStatus
              }
            });
          }
        }

        next();
      } catch (error) {
        console.error('KYC/AML requirement error:', error);
        return res.status(500).json({
          success: false,
          error: 'KYC/AML verification check failed'
        });
      }
    };
  }

  /**
   * Middleware to enforce PSD2 compliance for EU users
   * @returns {Function} Express middleware function
   */
  enforcePSD2() {
    return async (req, res, next) => {
      try {
        const tenantId = req.tenant.id;
        
        // Check if tenant is in EU region
        const residencyRequirements = await this.dataResidencyService.getResidencyRequirements(tenantId);
        
        if (residencyRequirements && residencyRequirements.primaryRegion === 'EU') {
          // Check if this is a payment operation
          const isPaymentOperation = this.isPaymentOperation(req.path, req.method);
          
          if (isPaymentOperation) {
            const psd2Check = await this.complianceEngine.checkCompliance('PSD2', tenantId, {
              userId: req.user.id,
              request: req
            });

            if (!psd2Check.overallCompliance) {
              return res.status(403).json({
                success: false,
                error: 'PSD2 compliance violation',
                details: {
                  issues: psd2Check.issues,
                  message: 'Payment operations must meet PSD2 requirements'
                }
              });
            }
          }
        }

        next();
      } catch (error) {
        console.error('PSD2 enforcement error:', error);
        return res.status(500).json({
          success: false,
          error: 'PSD2 compliance check failed'
        });
      }
    };
  }

  // Helper methods

  /**
   * Extract resource type from request path
   * @param {string} path - Request path
   * @returns {string} Resource type
   */
  extractResourceType(path) {
    const segments = path.split('/').filter(segment => segment);
    return segments[1] || 'unknown';
  }

  /**
   * Extract resource ID from request path and params
   * @param {string} path - Request path
   * @param {Object} params - Request params
   * @returns {string} Resource ID
   */
  extractResourceId(path, params) {
    // Try to get ID from params first
    if (params.id) return params.id;
    if (params.userId) return params.userId;
    if (params.studentId) return params.studentId;
    
    // Extract from path
    const segments = path.split('/').filter(segment => segment);
    const idSegment = segments.find(segment => /^[0-9a-f-]{36}$/i.test(segment));
    return idSegment || null;
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize headers for audit logging
   * @param {Object} headers - Request headers
   * @returns {Object} Sanitized headers
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    
    return sanitized;
  }

  /**
   * Find sensitive data in request body
   * @param {Object} body - Request body
   * @param {Array} sensitiveFields - Sensitive field names
   * @returns {Array} Found sensitive fields
   */
  findSensitiveData(body, sensitiveFields) {
    const found = [];
    
    const searchObject = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (sensitiveFields.includes(key) || sensitiveFields.includes(currentPath)) {
          found.push(currentPath);
        }
        
        if (typeof value === 'object' && value !== null) {
          searchObject(value, currentPath);
        }
      }
    };
    
    searchObject(body);
    return found;
  }

  /**
   * Validate tokenization of sensitive data
   * @param {Object} body - Request body
   * @param {Array} sensitiveFields - Sensitive fields found
   * @returns {Object} Validation result
   */
  async validateTokenization(body, sensitiveFields) {
    // This would check if sensitive fields are properly tokenized
    // For now, return valid if no sensitive fields found
    return {
      valid: sensitiveFields.length === 0,
      message: sensitiveFields.length === 0 ? 'No sensitive data found' : 'Sensitive data must be tokenized'
    };
  }

  /**
   * Check if request involves educational data
   * @param {string} path - Request path
   * @param {Object} body - Request body
   * @returns {boolean} Whether involves educational data
   */
  isEducationalData(path, body) {
    const educationalPaths = ['/students', '/grades', '/attendance', '/teachers', '/classes'];
    return educationalPaths.some(eduPath => path.includes(eduPath));
  }

  /**
   * Check if request involves student data
   * @param {string} path - Request path
   * @param {Object} body - Request body
   * @returns {boolean} Whether involves student data
   */
  involvesStudentData(path, body) {
    return path.includes('/students') || body.studentId || body.student_id;
  }

  /**
   * Check if request is a financial operation
   * @param {string} path - Request path
   * @param {string} method - Request method
   * @returns {boolean} Whether is financial operation
   */
  isFinancialOperation(path, method) {
    const financialPaths = ['/payments', '/billing', '/transactions', '/fees'];
    return financialPaths.some(finPath => path.includes(finPath));
  }

  /**
   * Check if request is a payment operation
   * @param {string} path - Request path
   * @param {string} method - Request method
   * @returns {boolean} Whether is payment operation
   */
  isPaymentOperation(path, method) {
    return path.includes('/payments') && (method === 'POST' || method === 'PUT');
  }

  /**
   * Check KYC/AML status for user
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @returns {Object} KYC/AML status
   */
  async checkKYCAMLStatus(tenantId, userId) {
    // This would check the database for KYC/AML status
    // For now, return verified
    return {
      verified: true,
      status: 'APPROVED',
      amlStatus: 'CLEAR'
    };
  }
}

module.exports = ComplianceMiddleware;
