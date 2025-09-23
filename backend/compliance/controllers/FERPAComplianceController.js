/**
 * FERPA Compliance Controller
 * Provides comprehensive FERPA compliance endpoints
 * Handles data access, consent management, and disclosure tracking
 */

const FERPAService = require('../services/FERPAService');
const DataClassificationService = require('../services/DataClassificationService');
const ConsentManagementService = require('../services/ConsentManagementService');
const AccessControlService = require('../services/AccessControlService');

class FERPAComplianceController {
  constructor() {
    this.ferpaService = new FERPAService();
    this.dataClassificationService = new DataClassificationService();
    this.consentManagementService = new ConsentManagementService();
    this.accessControlService = new AccessControlService();
  }

  /**
   * Get educational records with proper authorization
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEducationalRecords(req, res) {
    try {
      const { studentId } = req.params;
      const requesterId = req.user.id;
      const context = {
        requesterRole: req.user.role,
        tenantId: req.tenant.id,
        requestId: req.headers['x-request-id']
      };

      // Check access permissions
      const accessCheck = await this.accessControlService.checkAccessPermissions(
        requesterId,
        studentId,
        'educational_records',
        context
      );

      if (!accessCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          reason: accessCheck.reason,
          restrictions: accessCheck.restrictions
        });
      }

      // Get educational records with enhanced authorization
      const records = await this.ferpaService.getEducationalRecordsEnhanced(
        studentId,
        requesterId,
        context
      );

      res.json({
        success: true,
        data: records,
        accessLevel: accessCheck.accessLevel,
        restrictions: accessCheck.restrictions
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve educational records',
        message: error.message
      });
    }
  }

  /**
   * Create consent record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createConsent(req, res) {
    try {
      const { studentId, consentType } = req.body;
      const parentId = req.user.id;
      const tenantId = req.tenant.id;

      const consent = await this.consentManagementService.createConsent(
        studentId,
        parentId,
        consentType,
        tenantId,
        req.body.options || {}
      );

      res.status(201).json({
        success: true,
        data: consent,
        message: 'Consent record created successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create consent record',
        message: error.message
      });
    }
  }

  /**
   * Grant consent
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async grantConsent(req, res) {
    try {
      const { consentId } = req.params;
      const grantedBy = req.user.id;

      const consent = await this.consentManagementService.grantConsent(
        consentId,
        grantedBy,
        req.body
      );

      res.json({
        success: true,
        data: consent,
        message: 'Consent granted successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to grant consent',
        message: error.message
      });
    }
  }

  /**
   * Revoke consent
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async revokeConsent(req, res) {
    try {
      const { consentId } = req.params;
      const revokedBy = req.user.id;
      const { reason } = req.body;

      const consent = await this.consentManagementService.revokeConsent(
        consentId,
        revokedBy,
        reason
      );

      res.json({
        success: true,
        data: consent,
        message: 'Consent revoked successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to revoke consent',
        message: error.message
      });
    }
  }

  /**
   * Get student consents
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStudentConsents(req, res) {
    try {
      const { studentId } = req.params;
      const options = {
        status: req.query.status,
        consentType: req.query.consentType,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined
      };

      const consents = await this.consentManagementService.getStudentConsents(
        studentId,
        options
      );

      res.json({
        success: true,
        data: consents
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve student consents',
        message: error.message
      });
    }
  }

  /**
   * Create directory information opt-out
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createDirectoryOptOut(req, res) {
    try {
      const { studentId } = req.body;
      const parentId = req.user.id;
      const tenantId = req.tenant.id;

      const optOut = await this.consentManagementService.createDirectoryOptOut(
        studentId,
        parentId,
        tenantId,
        req.body.options || {}
      );

      res.status(201).json({
        success: true,
        data: optOut,
        message: 'Directory information opt-out created successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create directory opt-out',
        message: error.message
      });
    }
  }

  /**
   * Check directory information disclosure
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkDirectoryDisclosure(req, res) {
    try {
      const { studentId, informationType } = req.params;

      const disclosureCheck = await this.consentManagementService.canDiscloseDirectoryInformation(
        studentId,
        informationType
      );

      res.json({
        success: true,
        data: disclosureCheck
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to check directory disclosure',
        message: error.message
      });
    }
  }

  /**
   * Track FERPA disclosure
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async trackDisclosure(req, res) {
    try {
      const { recordId, recipient, purpose } = req.body;
      const tenantId = req.tenant.id;

      const disclosure = await this.ferpaService.trackDisclosureEnhanced(
        recordId,
        recipient,
        purpose,
        tenantId,
        req.body.additionalInfo || {}
      );

      res.status(201).json({
        success: true,
        data: disclosure,
        message: 'Disclosure tracked successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to track disclosure',
        message: error.message
      });
    }
  }

  /**
   * Send annual FERPA notification
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendAnnualNotification(req, res) {
    try {
      const tenantId = req.tenant.id;
      const options = req.body.options || {};

      const result = await this.ferpaService.sendAnnualNotificationEnhanced(
        tenantId,
        options
      );

      res.json({
        success: true,
        data: result,
        message: 'Annual FERPA notification sent successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send annual notification',
        message: error.message
      });
    }
  }

  /**
   * Verify parent identity
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyParentIdentity(req, res) {
    try {
      const { parentId, studentId } = req.params;
      const verificationData = req.body;

      const verification = await this.ferpaService.verifyParentIdentityEnhanced(
        parentId,
        studentId,
        verificationData
      );

      res.json({
        success: true,
        data: verification
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to verify parent identity',
        message: error.message
      });
    }
  }

  /**
   * Classify data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async classifyData(req, res) {
    try {
      const { data } = req.body;
      const context = {
        tenantId: req.tenant.id,
        userId: req.user.id,
        ...req.body.context
      };

      const classification = await this.dataClassificationService.classifyData(
        data,
        context
      );

      // Log classification decision
      await this.dataClassificationService.logClassificationDecision(
        req.tenant.id,
        req.user.id,
        classification,
        context
      );

      res.json({
        success: true,
        data: classification
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to classify data',
        message: error.message
      });
    }
  }

  /**
   * Get data classification policy
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getClassificationPolicy(req, res) {
    try {
      const tenantId = req.tenant.id;

      const policy = await this.dataClassificationService.getClassificationPolicy(tenantId);

      res.json({
        success: true,
        data: policy
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get classification policy',
        message: error.message
      });
    }
  }

  /**
   * Create data classification policy
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createClassificationPolicy(req, res) {
    try {
      const tenantId = req.tenant.id;
      const policy = req.body;

      const createdPolicy = await this.dataClassificationService.createClassificationPolicy(
        tenantId,
        policy
      );

      res.status(201).json({
        success: true,
        data: createdPolicy,
        message: 'Classification policy created successfully'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create classification policy',
        message: error.message
      });
    }
  }

  /**
   * Check access permissions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkAccessPermissions(req, res) {
    try {
      const { studentId, dataType } = req.params;
      const requesterId = req.user.id;
      const context = {
        requesterRole: req.user.role,
        tenantId: req.tenant.id,
        ...req.body.context
      };

      const accessCheck = await this.accessControlService.checkAccessPermissions(
        requesterId,
        studentId,
        dataType,
        context
      );

      res.json({
        success: true,
        data: accessCheck
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to check access permissions',
        message: error.message
      });
    }
  }

  /**
   * Get FERPA compliance dashboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getComplianceDashboard(req, res) {
    try {
      const tenantId = req.tenant.id;
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      // Get compliance statistics
      const dashboardData = {
        tenantId,
        period: {
          startDate: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: options.endDate || new Date().toISOString()
        },
        statistics: {
          totalConsents: 0,
          activeConsents: 0,
          expiredConsents: 0,
          revokedConsents: 0,
          totalDisclosures: 0,
          directoryOptOuts: 0,
          accessAttempts: 0,
          deniedAccess: 0
        },
        recentActivity: [],
        complianceStatus: 'compliant'
      };

      // Get consent statistics
      const consentStats = await this.getConsentStatistics(tenantId, options);
      dashboardData.statistics = { ...dashboardData.statistics, ...consentStats };

      // Get disclosure statistics
      const disclosureStats = await this.getDisclosureStatistics(tenantId, options);
      dashboardData.statistics = { ...dashboardData.statistics, ...disclosureStats };

      // Get access statistics
      const accessStats = await this.getAccessStatistics(tenantId, options);
      dashboardData.statistics = { ...dashboardData.statistics, ...accessStats };

      // Get recent activity
      dashboardData.recentActivity = await this.getRecentActivity(tenantId, options);

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get compliance dashboard',
        message: error.message
      });
    }
  }

  /**
   * Get consent statistics
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options
   * @returns {Object} Consent statistics
   */
  async getConsentStatistics(tenantId, options) {
    try {
      // This would query the database for consent statistics
      // For now, return mock data
      return {
        totalConsents: 150,
        activeConsents: 120,
        expiredConsents: 20,
        revokedConsents: 10
      };
    } catch (error) {
      return {
        totalConsents: 0,
        activeConsents: 0,
        expiredConsents: 0,
        revokedConsents: 0
      };
    }
  }

  /**
   * Get disclosure statistics
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options
   * @returns {Object} Disclosure statistics
   */
  async getDisclosureStatistics(tenantId, options) {
    try {
      // This would query the database for disclosure statistics
      // For now, return mock data
      return {
        totalDisclosures: 45,
        directoryOptOuts: 12
      };
    } catch (error) {
      return {
        totalDisclosures: 0,
        directoryOptOuts: 0
      };
    }
  }

  /**
   * Get access statistics
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options
   * @returns {Object} Access statistics
   */
  async getAccessStatistics(tenantId, options) {
    try {
      // This would query the database for access statistics
      // For now, return mock data
      return {
        accessAttempts: 250,
        deniedAccess: 15
      };
    } catch (error) {
      return {
        accessAttempts: 0,
        deniedAccess: 0
      };
    }
  }

  /**
   * Get recent activity
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options
   * @returns {Array} Recent activity
   */
  async getRecentActivity(tenantId, options) {
    try {
      // This would query the database for recent activity
      // For now, return mock data
      return [
        {
          type: 'consent_granted',
          description: 'Parent consent granted for educational records',
          timestamp: new Date().toISOString(),
          userId: 'user123'
        },
        {
          type: 'disclosure_tracked',
          description: 'Educational records disclosed to college',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          userId: 'user456'
        }
      ];
    } catch (error) {
      return [];
    }
  }
}

module.exports = FERPAComplianceController;
