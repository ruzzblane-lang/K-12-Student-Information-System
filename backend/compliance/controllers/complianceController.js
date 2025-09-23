/**
 * Compliance Controller
 * Handles compliance-related API endpoints
 * Provides unified interface for compliance operations
 */

const ComplianceEngine = require('../services/ComplianceEngine');
const DataTokenizationService = require('../services/DataTokenizationService');
const EncryptionVault = require('../services/EncryptionVault');
const AuditTrailService = require('../services/AuditTrailService');
const DataResidencyService = require('../services/DataResidencyService');
const KYCAMLService = require('../services/KYCAMLService');

class ComplianceController {
  constructor(db) {
    this.db = db;
    this.complianceEngine = new ComplianceEngine();
    this.tokenizationService = new DataTokenizationService();
    this.encryptionVault = new EncryptionVault();
    this.auditTrailService = new AuditTrailService();
    this.dataResidencyService = new DataResidencyService();
    this.kycamlService = new KYCAMLService();
  }

  /**
   * Check compliance for a specific standard
   * GET /api/compliance/check/:standard
   */
  async checkCompliance(req, res) {
    try {
      const { standard } = req.params;
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      const result = await this.complianceEngine.checkCompliance(
        standard.toUpperCase(),
        tenantId,
        { userId, ...req.query }
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Compliance check error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get compliance dashboard
   * GET /api/compliance/dashboard
   */
  async getComplianceDashboard(req, res) {
    try {
      const tenantId = req.tenant.id;
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        standards: req.query.standards ? req.query.standards.split(',') : undefined
      };

      const dashboard = await this.complianceEngine.getComplianceDashboard(tenantId, options);

      res.status(200).json({
        success: true,
        data: dashboard
      });

    } catch (error) {
      console.error('Compliance dashboard error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Process sensitive data with compliance
   * POST /api/compliance/process-sensitive-data
   */
  async processSensitiveData(req, res) {
    try {
      const { data, dataType, targetRegion } = req.body;
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      if (!data || !dataType) {
        return res.status(400).json({
          success: false,
          error: 'data and dataType are required'
        });
      }

      const result = await this.complianceEngine.processSensitiveData(
        data,
        dataType,
        tenantId,
        { userId, targetRegion }
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Process sensitive data error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Retrieve sensitive data with compliance
   * GET /api/compliance/retrieve-sensitive-data/:token
   */
  async retrieveSensitiveData(req, res) {
    try {
      const { token } = req.params;
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      const result = await this.complianceEngine.retrieveSensitiveData(
        token,
        tenantId,
        { userId }
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Retrieve sensitive data error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Perform KYC/AML verification
   * POST /api/compliance/kyc-aml
   */
  async performKYCAML(req, res) {
    try {
      const { userData, options } = req.body;
      const tenantId = req.tenant.id;

      if (!userData) {
        return res.status(400).json({
          success: false,
          error: 'userData is required'
        });
      }

      const result = await this.complianceEngine.performCompliantKYCAML(
        userData,
        tenantId,
        options || {}
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('KYC/AML verification error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Tokenize data
   * POST /api/compliance/tokenize
   */
  async tokenizeData(req, res) {
    try {
      const { data, dataType } = req.body;
      const tenantId = req.tenant.id;

      if (!data || !dataType) {
        return res.status(400).json({
          success: false,
          error: 'data and dataType are required'
        });
      }

      const result = await this.tokenizationService.tokenize(
        JSON.stringify(data),
        dataType,
        tenantId
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Tokenization error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Detokenize data
   * POST /api/compliance/detokenize
   */
  async detokenizeData(req, res) {
    try {
      const { token } = req.body;
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'token is required'
        });
      }

      const result = await this.tokenizationService.detokenize(
        token,
        tenantId,
        userId
      );

      res.status(200).json({
        success: true,
        data: JSON.parse(result)
      });

    } catch (error) {
      console.error('Detokenization error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Store data in encryption vault
   * POST /api/compliance/vault/store
   */
  async storeInVault(req, res) {
    try {
      const { key, data, metadata } = req.body;
      const tenantId = req.tenant.id;

      if (!key || !data) {
        return res.status(400).json({
          success: false,
          error: 'key and data are required'
        });
      }

      const result = await this.encryptionVault.store(
        key,
        data,
        tenantId,
        metadata || {}
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Vault storage error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Retrieve data from encryption vault
   * GET /api/compliance/vault/retrieve/:key
   */
  async retrieveFromVault(req, res) {
    try {
      const { key } = req.params;
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      const result = await this.encryptionVault.retrieve(
        key,
        tenantId,
        userId
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Vault retrieval error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get audit trail for a resource
   * GET /api/compliance/audit-trail/:resourceType/:resourceId
   */
  async getAuditTrail(req, res) {
    try {
      const { resourceType, resourceId } = req.params;
      const tenantId = req.tenant.id;
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0,
        includeMetadata: req.query.includeMetadata === 'true'
      };

      const auditTrail = await this.auditTrailService.getResourceAuditTrail(
        tenantId,
        resourceType,
        resourceId,
        options
      );

      res.status(200).json({
        success: true,
        data: auditTrail
      });

    } catch (error) {
      console.error('Get audit trail error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user activity audit trail
   * GET /api/compliance/audit-trail/user/:userId
   */
  async getUserAuditTrail(req, res) {
    try {
      const { userId } = req.params;
      const tenantId = req.tenant.id;
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0,
        actions: req.query.actions ? req.query.actions.split(',') : undefined
      };

      const auditTrail = await this.auditTrailService.getUserActivityTrail(
        tenantId,
        userId,
        options
      );

      res.status(200).json({
        success: true,
        data: auditTrail
      });

    } catch (error) {
      console.error('Get user audit trail error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Verify audit trail integrity
   * POST /api/compliance/audit-trail/verify
   */
  async verifyAuditIntegrity(req, res) {
    try {
      const { startDate, endDate } = req.body;
      const tenantId = req.tenant.id;

      const result = await this.auditTrailService.verifyIntegrity(
        tenantId,
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Verify audit integrity error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get data residency requirements
   * GET /api/compliance/data-residency/requirements
   */
  async getDataResidencyRequirements(req, res) {
    try {
      const tenantId = req.tenant.id;

      const requirements = await this.dataResidencyService.getResidencyRequirements(tenantId);

      res.status(200).json({
        success: true,
        data: requirements
      });

    } catch (error) {
      console.error('Get data residency requirements error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Validate data residency
   * POST /api/compliance/data-residency/validate
   */
  async validateDataResidency(req, res) {
    try {
      const { dataType, targetRegion, operationContext } = req.body;
      const tenantId = req.tenant.id;

      if (!dataType || !targetRegion) {
        return res.status(400).json({
          success: false,
          error: 'dataType and targetRegion are required'
        });
      }

      const result = await this.dataResidencyService.validateDataResidency(
        tenantId,
        dataType,
        targetRegion,
        operationContext || {}
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Validate data residency error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get allowed regions for data processing
   * GET /api/compliance/data-residency/allowed-regions
   */
  async getAllowedRegions(req, res) {
    try {
      const { dataType } = req.query;
      const tenantId = req.tenant.id;

      const allowedRegions = await this.dataResidencyService.getAllowedRegions(
        tenantId,
        dataType
      );

      res.status(200).json({
        success: true,
        data: { allowedRegions }
      });

    } catch (error) {
      console.error('Get allowed regions error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get compliance statistics
   * GET /api/compliance/statistics
   */
  async getComplianceStatistics(req, res) {
    try {
      const tenantId = req.tenant.id;
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const [
        auditStats,
        tokenizationStats,
        vaultStats,
        residencyStats
      ] = await Promise.all([
        this.auditTrailService.getAuditStatistics(tenantId, options),
        this.tokenizationService.getTokenizationStats(tenantId),
        this.encryptionVault.getVaultStats(tenantId),
        this.dataResidencyService.getResidencyStats(tenantId)
      ]);

      const statistics = {
        audit: auditStats,
        tokenization: tokenizationStats,
        vault: vaultStats,
        residency: residencyStats,
        generatedAt: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: statistics
      });

    } catch (error) {
      console.error('Get compliance statistics error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get supported data types for tokenization
   * GET /api/compliance/supported-data-types
   */
  async getSupportedDataTypes(req, res) {
    try {
      const supportedTypes = this.tokenizationService.getSupportedDataTypes();

      res.status(200).json({
        success: true,
        data: { supportedTypes }
      });

    } catch (error) {
      console.error('Get supported data types error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Clean up old compliance data
   * POST /api/compliance/cleanup
   */
  async cleanupComplianceData(req, res) {
    try {
      const { retentionDays } = req.body;
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      // Only allow super admins to perform cleanup
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Only super admins can perform cleanup operations'
        });
      }

      const [
        auditCleanup,
        vaultCleanup
      ] = await Promise.all([
        this.auditTrailService.cleanupOldLogs(retentionDays),
        this.encryptionVault.cleanupDeletedEntries(retentionDays)
      ]);

      const result = {
        auditLogsCleaned: auditCleanup,
        vaultEntriesCleaned: vaultCleanup,
        cleanedAt: new Date().toISOString()
      };

      // Log cleanup operation
      await this.auditTrailService.logEvent({
        tenantId,
        userId,
        action: 'compliance_cleanup',
        resourceType: 'compliance',
        resourceId: 'cleanup',
        newValues: result,
        success: true,
        metadata: { retentionDays }
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Cleanup compliance data error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = ComplianceController;
