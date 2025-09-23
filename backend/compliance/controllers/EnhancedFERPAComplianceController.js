/**
 * Enhanced FERPA Compliance Controller
 * Integrates photo consent, archive encryption, watermarking, and retention policies
 * Provides comprehensive FERPA compliance endpoints
 */

const FERPAService = require('../services/FERPAService');
const DataClassificationService = require('../services/DataClassificationService');
const ConsentManagementService = require('../services/ConsentManagementService');
const AccessControlService = require('../services/AccessControlService');
const PhotoConsentService = require('../services/PhotoConsentService');
const ArchiveEncryptionService = require('../services/ArchiveEncryptionService');
const WatermarkingService = require('../services/WatermarkingService');
const RetentionPolicyService = require('../services/RetentionPolicyService');

class EnhancedFERPAComplianceController {
  constructor() {
    this.ferpaService = new FERPAService();
    this.dataClassificationService = new DataClassificationService();
    this.consentManagementService = new ConsentManagementService();
    this.accessControlService = new AccessControlService();
    this.photoConsentService = new PhotoConsentService();
    this.archiveEncryptionService = new ArchiveEncryptionService();
    this.watermarkingService = new WatermarkingService();
    this.retentionPolicyService = new RetentionPolicyService();
  }

  // =============================================================================
  // PHOTO CONSENT MANAGEMENT ENDPOINTS
  // =============================================================================

  /**
   * Create photo consent
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createPhotoConsent(req, res) {
    try {
      const { studentId } = req.body;
      const parentId = req.user.id;
      const tenantId = req.tenant.id;

      const consent = await this.photoConsentService.createPhotoConsent(
        studentId,
        parentId,
        tenantId,
        req.body.options || {}
      );

      res.status(201).json({
        success: true,
        data: consent,
        message: 'Photo consent created successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create photo consent',
        message: error.message
      });
    }
  }

  /**
   * Grant photo consent
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async grantPhotoConsent(req, res) {
    try {
      const { consentId } = req.params;
      const grantedBy = req.user.id;

      const consent = await this.photoConsentService.grantPhotoConsent(
        consentId,
        grantedBy,
        req.body
      );

      res.json({
        success: true,
        data: consent,
        message: 'Photo consent granted successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to grant photo consent',
        message: error.message
      });
    }
  }

  /**
   * Revoke photo consent
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async revokePhotoConsent(req, res) {
    try {
      const { consentId } = req.params;
      const revokedBy = req.user.id;
      const { reason } = req.body;

      const consent = await this.photoConsentService.revokePhotoConsent(
        consentId,
        revokedBy,
        reason
      );

      res.json({
        success: true,
        data: consent,
        message: 'Photo consent revoked successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to revoke photo consent',
        message: error.message
      });
    }
  }

  /**
   * Check photo usage permission
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkPhotoUsage(req, res) {
    try {
      const { studentId, photoType, usageType } = req.params;
      const context = req.body.context || {};

      const usageCheck = await this.photoConsentService.canUsePhoto(
        studentId,
        photoType,
        usageType,
        context
      );

      res.json({
        success: true,
        data: usageCheck
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to check photo usage',
        message: error.message
      });
    }
  }

  /**
   * Create photo record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createPhotoRecord(req, res) {
    try {
      const { studentId, photoPath, metadata } = req.body;
      const tenantId = req.tenant.id;

      const photoRecord = await this.photoConsentService.createPhotoRecord(
        studentId,
        photoPath,
        metadata,
        tenantId
      );

      res.status(201).json({
        success: true,
        data: photoRecord,
        message: 'Photo record created successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create photo record',
        message: error.message
      });
    }
  }

  // =============================================================================
  // ARCHIVE ENCRYPTION ENDPOINTS
  // =============================================================================

  /**
   * Encrypt file for archive
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async encryptFileForArchive(req, res) {
    try {
      const { filePath, archiveType, metadata } = req.body;
      const tenantId = req.tenant.id;

      const result = await this.archiveEncryptionService.encryptFileForArchive(
        filePath,
        archiveType,
        tenantId,
        metadata
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'File encrypted for archive successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to encrypt file for archive',
        message: error.message
      });
    }
  }

  /**
   * Decrypt archived file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async decryptArchivedFile(req, res) {
    try {
      const { archiveId } = req.params;
      const { outputPath } = req.body;
      const requesterId = req.user.id;

      const result = await this.archiveEncryptionService.decryptArchivedFile(
        archiveId,
        outputPath,
        requesterId
      );

      res.json({
        success: true,
        data: result,
        message: 'Archived file decrypted successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to decrypt archived file',
        message: error.message
      });
    }
  }

  /**
   * Get archive statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getArchiveStatistics(req, res) {
    try {
      const tenantId = req.tenant.id;
      const options = req.query;

      const statistics = await this.archiveEncryptionService.getArchiveStatistics(
        tenantId,
        options
      );

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get archive statistics',
        message: error.message
      });
    }
  }

  // =============================================================================
  // WATERMARKING ENDPOINTS
  // =============================================================================

  /**
   * Apply watermark to document
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async applyWatermark(req, res) {
    try {
      const { filePath, watermarkText, options } = req.body;
      const tenantId = req.tenant.id;

      const result = await this.watermarkingService.applyWatermark(
        filePath,
        watermarkText,
        tenantId,
        options
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Watermark applied successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to apply watermark',
        message: error.message
      });
    }
  }

  /**
   * Verify watermark
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyWatermark(req, res) {
    try {
      const { filePath, expectedWatermark } = req.body;

      const result = await this.watermarkingService.verifyWatermark(
        filePath,
        expectedWatermark
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to verify watermark',
        message: error.message
      });
    }
  }

  /**
   * Get watermark record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWatermarkRecord(req, res) {
    try {
      const { watermarkId } = req.params;

      const record = await this.watermarkingService.getWatermarkRecord(watermarkId);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Watermark record not found'
        });
      }

      res.json({
        success: true,
        data: record
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get watermark record',
        message: error.message
      });
    }
  }

  // =============================================================================
  // RETENTION POLICY ENDPOINTS
  // =============================================================================

  /**
   * Create retention policy
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createRetentionPolicy(req, res) {
    try {
      const { retentionType, policy } = req.body;
      const tenantId = req.tenant.id;

      const createdPolicy = await this.retentionPolicyService.createRetentionPolicy(
        tenantId,
        retentionType,
        policy
      );

      res.status(201).json({
        success: true,
        data: createdPolicy,
        message: 'Retention policy created successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create retention policy',
        message: error.message
      });
    }
  }

  /**
   * Get retention policy
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRetentionPolicy(req, res) {
    try {
      const { retentionType } = req.params;
      const tenantId = req.tenant.id;

      const policy = await this.retentionPolicyService.getRetentionPolicy(
        tenantId,
        retentionType
      );

      if (!policy) {
        return res.status(404).json({
          success: false,
          error: 'Retention policy not found'
        });
      }

      res.json({
        success: true,
        data: policy
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get retention policy',
        message: error.message
      });
    }
  }

  /**
   * Apply retention policy
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async applyRetentionPolicy(req, res) {
    try {
      const { retentionType } = req.params;
      const tenantId = req.tenant.id;
      const options = req.body.options || {};

      const result = await this.retentionPolicyService.applyRetentionPolicy(
        tenantId,
        retentionType,
        options
      );

      res.json({
        success: true,
        data: result,
        message: 'Retention policy applied successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to apply retention policy',
        message: error.message
      });
    }
  }

  /**
   * Run retention cleanup
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async runRetentionCleanup(req, res) {
    try {
      const tenantId = req.tenant.id;

      const result = await this.retentionPolicyService.runRetentionCleanup(tenantId);

      res.json({
        success: true,
        data: result,
        message: 'Retention cleanup completed successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to run retention cleanup',
        message: error.message
      });
    }
  }

  // =============================================================================
  // COMPREHENSIVE COMPLIANCE DASHBOARD
  // =============================================================================

  /**
   * Get enhanced compliance dashboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEnhancedComplianceDashboard(req, res) {
    try {
      const tenantId = req.tenant.id;
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      // Get comprehensive compliance statistics
      const dashboardData = {
        tenantId,
        period: {
          startDate: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: options.endDate || new Date().toISOString()
        },
        statistics: {
          // FERPA compliance statistics
          totalConsents: 0,
          activeConsents: 0,
          expiredConsents: 0,
          revokedConsents: 0,
          totalDisclosures: 0,
          directoryOptOuts: 0,
          accessAttempts: 0,
          deniedAccess: 0,
          
          // Photo consent statistics
          totalPhotoConsents: 0,
          activePhotoConsents: 0,
          photoUsageChecks: 0,
          photoConsentViolations: 0,
          
          // Archive encryption statistics
          totalArchivedFiles: 0,
          encryptedFiles: 0,
          decryptionRequests: 0,
          archiveErrors: 0,
          
          // Watermarking statistics
          totalWatermarkedFiles: 0,
          watermarkVerifications: 0,
          watermarkViolations: 0,
          
          // Retention policy statistics
          totalRetentionPolicies: 0,
          expiredRecords: 0,
          deletedRecords: 0,
          archivedRecords: 0,
          anonymizedRecords: 0
        },
        recentActivity: [],
        complianceStatus: 'compliant',
        alerts: []
      };

      // Get FERPA compliance statistics
      const ferpaStats = await this.getFERPAComplianceStatistics(tenantId, options);
      dashboardData.statistics = { ...dashboardData.statistics, ...ferpaStats };

      // Get photo consent statistics
      const photoStats = await this.getPhotoConsentStatistics(tenantId, options);
      dashboardData.statistics = { ...dashboardData.statistics, ...photoStats };

      // Get archive encryption statistics
      const archiveStats = await this.getArchiveEncryptionStatistics(tenantId, options);
      dashboardData.statistics = { ...dashboardData.statistics, ...archiveStats };

      // Get watermarking statistics
      const watermarkStats = await this.getWatermarkingStatistics(tenantId, options);
      dashboardData.statistics = { ...dashboardData.statistics, ...watermarkStats };

      // Get retention policy statistics
      const retentionStats = await this.getRetentionPolicyStatistics(tenantId, options);
      dashboardData.statistics = { ...dashboardData.statistics, ...retentionStats };

      // Get recent activity
      dashboardData.recentActivity = await this.getRecentComplianceActivity(tenantId, options);

      // Check for compliance alerts
      dashboardData.alerts = await this.getComplianceAlerts(tenantId);

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get enhanced compliance dashboard',
        message: error.message
      });
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Get FERPA compliance statistics
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options
   * @returns {Object} FERPA statistics
   */
  async getFERPAComplianceStatistics(tenantId, options) {
    try {
      // This would query the database for FERPA statistics
      // For now, return mock data
      return {
        totalConsents: 150,
        activeConsents: 120,
        expiredConsents: 20,
        revokedConsents: 10,
        totalDisclosures: 45,
        directoryOptOuts: 12,
        accessAttempts: 250,
        deniedAccess: 15
      };
    } catch (error) {
      return {
        totalConsents: 0,
        activeConsents: 0,
        expiredConsents: 0,
        revokedConsents: 0,
        totalDisclosures: 0,
        directoryOptOuts: 0,
        accessAttempts: 0,
        deniedAccess: 0
      };
    }
  }

  /**
   * Get photo consent statistics
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options
   * @returns {Object} Photo consent statistics
   */
  async getPhotoConsentStatistics(tenantId, options) {
    try {
      // This would query the database for photo consent statistics
      // For now, return mock data
      return {
        totalPhotoConsents: 200,
        activePhotoConsents: 180,
        photoUsageChecks: 500,
        photoConsentViolations: 5
      };
    } catch (error) {
      return {
        totalPhotoConsents: 0,
        activePhotoConsents: 0,
        photoUsageChecks: 0,
        photoConsentViolations: 0
      };
    }
  }

  /**
   * Get archive encryption statistics
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options
   * @returns {Object} Archive encryption statistics
   */
  async getArchiveEncryptionStatistics(tenantId, options) {
    try {
      const statistics = await this.archiveEncryptionService.getArchiveStatistics(tenantId, options);
      return {
        totalArchivedFiles: statistics.statistics.reduce((sum, stat) => sum + stat.total_files, 0),
        encryptedFiles: statistics.statistics.reduce((sum, stat) => sum + stat.encrypted_count, 0),
        decryptionRequests: 25,
        archiveErrors: statistics.statistics.reduce((sum, stat) => sum + stat.failed_count, 0)
      };
    } catch (error) {
      return {
        totalArchivedFiles: 0,
        encryptedFiles: 0,
        decryptionRequests: 0,
        archiveErrors: 0
      };
    }
  }

  /**
   * Get watermarking statistics
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options
   * @returns {Object} Watermarking statistics
   */
  async getWatermarkingStatistics(tenantId, options) {
    try {
      // This would query the database for watermarking statistics
      // For now, return mock data
      return {
        totalWatermarkedFiles: 300,
        watermarkVerifications: 150,
        watermarkViolations: 2
      };
    } catch (error) {
      return {
        totalWatermarkedFiles: 0,
        watermarkVerifications: 0,
        watermarkViolations: 0
      };
    }
  }

  /**
   * Get retention policy statistics
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options
   * @returns {Object} Retention policy statistics
   */
  async getRetentionPolicyStatistics(tenantId, options) {
    try {
      // This would query the database for retention policy statistics
      // For now, return mock data
      return {
        totalRetentionPolicies: 10,
        expiredRecords: 50,
        deletedRecords: 25,
        archivedRecords: 15,
        anonymizedRecords: 10
      };
    } catch (error) {
      return {
        totalRetentionPolicies: 0,
        expiredRecords: 0,
        deletedRecords: 0,
        archivedRecords: 0,
        anonymizedRecords: 0
      };
    }
  }

  /**
   * Get recent compliance activity
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options
   * @returns {Array} Recent activity
   */
  async getRecentComplianceActivity(tenantId, options) {
    try {
      // This would query the database for recent activity
      // For now, return mock data
      return [
        {
          type: 'photo_consent_granted',
          description: 'Photo consent granted for yearbook',
          timestamp: new Date().toISOString(),
          userId: 'user123'
        },
        {
          type: 'file_archived',
          description: 'Student record encrypted and archived',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          userId: 'user456'
        },
        {
          type: 'watermark_applied',
          description: 'Watermark applied to assessment document',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          userId: 'user789'
        },
        {
          type: 'retention_policy_applied',
          description: 'Retention policy applied to expired records',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          userId: 'system'
        }
      ];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get compliance alerts
   * @param {string} tenantId - Tenant ID
   * @returns {Array} Compliance alerts
   */
  async getComplianceAlerts(tenantId) {
    try {
      // This would check for compliance violations and alerts
      // For now, return mock data
      return [
        {
          type: 'warning',
          message: '5 photo consents will expire in 30 days',
          severity: 'medium',
          actionRequired: true
        },
        {
          type: 'info',
          message: 'Retention cleanup completed successfully',
          severity: 'low',
          actionRequired: false
        }
      ];
    } catch (error) {
      return [];
    }
  }
}

module.exports = EnhancedFERPAComplianceController;
