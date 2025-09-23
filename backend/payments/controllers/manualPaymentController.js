/**
 * Manual Payment Request Controller
 * 
 * Handles manual payment request submission, approval workflows,
 * and fraud prevention for alternative payment methods.
 */

const { v4: uuidv4 } = require('uuid');
const FraudDetectionService = require('../services/FraudDetectionService');
const ManualPaymentRequestService = require('../services/ManualPaymentRequestService');
const PaymentApprovalService = require('../services/PaymentApprovalService');
const NotificationService = require('../services/NotificationService');

class ManualPaymentController {
  constructor(db) {
    this.db = db;
    this.fraudDetectionService = new FraudDetectionService(db);
    this.manualPaymentService = new ManualPaymentRequestService(db);
    this.approvalService = new PaymentApprovalService(db);
    this.notificationService = new NotificationService(db);
  }

  /**
   * Submit a manual payment request
   * POST /api/payments/manual/request
   */
  async submitPaymentRequest(req, res) {
    try {
      const {
        paymentType,
        amount,
        currency = 'USD',
        description,
        paymentDetails,
        supportingDocuments = [],
        studentId,
        priority = 'normal'
      } = req.body;

      const tenantId = req.tenant.id;
      const userId = req.user.id;

      // Validate required fields
      if (!paymentType || !amount || !paymentDetails) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: paymentType, amount, paymentDetails'
        });
      }

      // Validate payment type
      const paymentTypeExists = await this.manualPaymentService.getPaymentRequestType(paymentType);
      if (!paymentTypeExists) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment type'
        });
      }

      // Validate payment details against type requirements
      const validationResult = await this.manualPaymentService.validatePaymentDetails(
        paymentType,
        paymentDetails
      );

      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment details',
          details: validationResult.errors
        });
      }

      // Prepare payment request data
      const paymentRequestData = {
        tenantId,
        userId,
        studentId,
        paymentType,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        description,
        paymentDetails,
        supportingDocuments,
        priority,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      // Run fraud assessment
      const fraudAssessment = await this.performFraudAssessment(paymentRequestData);

      // Create payment request
      const paymentRequest = await this.manualPaymentService.createPaymentRequest({
        ...paymentRequestData,
        fraudRiskScore: fraudAssessment.riskScore,
        fraudRiskLevel: fraudAssessment.riskLevel,
        fraudFlags: fraudAssessment.riskFactors
      });

      // Create approval ticket if needed
      if (fraudAssessment.riskLevel === 'medium' || fraudAssessment.riskLevel === 'high' || fraudAssessment.riskLevel === 'critical') {
        await this.approvalService.createApprovalTicket({
          paymentRequestId: paymentRequest.id,
          tenantId,
          priority: fraudAssessment.riskLevel === 'critical' ? 'high' : 'normal',
          fraudAssessment
        });
      }

      // Send notifications
      await this.notificationService.sendPaymentRequestNotifications({
        paymentRequestId: paymentRequest.id,
        tenantId,
        userId,
        status: 'submitted',
        fraudRiskLevel: fraudAssessment.riskLevel
      });

      res.status(201).json({
        success: true,
        data: {
          paymentRequest,
          fraudAssessment: {
            riskScore: fraudAssessment.riskScore,
            riskLevel: fraudAssessment.riskLevel,
            recommendation: fraudAssessment.recommendation
          }
        }
      });

    } catch (error) {
      console.error('Manual payment request submission error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get payment request types
   * GET /api/payments/manual/types
   */
  async getPaymentRequestTypes(req, res) {
    try {
      const types = await this.manualPaymentService.getPaymentRequestTypes();

      res.status(200).json({
        success: true,
        data: types
      });

    } catch (error) {
      console.error('Get payment request types error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user's payment requests
   * GET /api/payments/manual/requests
   */
  async getUserPaymentRequests(req, res) {
    try {
      const tenantId = req.tenant.id;
      const userId = req.user.id;
      const { status, limit = 50, offset = 0 } = req.query;

      const requests = await this.manualPaymentService.getUserPaymentRequests(
        tenantId,
        userId,
        { status, limit: parseInt(limit), offset: parseInt(offset) }
      );

      res.status(200).json({
        success: true,
        data: requests
      });

    } catch (error) {
      console.error('Get user payment requests error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get payment request details
   * GET /api/payments/manual/requests/:requestId
   */
  async getPaymentRequestDetails(req, res) {
    try {
      const { requestId } = req.params;
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      const request = await this.manualPaymentService.getPaymentRequestDetails(
        requestId,
        tenantId,
        userId
      );

      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Payment request not found'
        });
      }

      res.status(200).json({
        success: true,
        data: request
      });

    } catch (error) {
      console.error('Get payment request details error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Approve payment request (Admin only)
   * POST /api/payments/manual/requests/:requestId/approve
   */
  async approvePaymentRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { notes } = req.body;
      const tenantId = req.tenant.id;
      const adminId = req.user.id;

      // Check if user has admin privileges
      if (!this.hasAdminPrivileges(req.user)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient privileges to approve payment requests'
        });
      }

      const result = await this.approvalService.approvePaymentRequest({
        paymentRequestId: requestId,
        tenantId,
        adminId,
        notes
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      // Send notifications
      await this.notificationService.sendPaymentRequestNotifications({
        paymentRequestId: requestId,
        tenantId,
        userId: result.paymentRequest.user_id,
        status: 'approved',
        adminNotes: notes
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Approve payment request error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reject payment request (Admin only)
   * POST /api/payments/manual/requests/:requestId/reject
   */
  async rejectPaymentRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { reason, notes } = req.body;
      const tenantId = req.tenant.id;
      const adminId = req.user.id;

      // Check if user has admin privileges
      if (!this.hasAdminPrivileges(req.user)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient privileges to reject payment requests'
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required'
        });
      }

      const result = await this.approvalService.rejectPaymentRequest({
        paymentRequestId: requestId,
        tenantId,
        adminId,
        reason,
        notes
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      // Send notifications
      await this.notificationService.sendPaymentRequestNotifications({
        paymentRequestId: requestId,
        tenantId,
        userId: result.paymentRequest.user_id,
        status: 'rejected',
        rejectionReason: reason,
        adminNotes: notes
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Reject payment request error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get pending approval tickets (Admin only)
   * GET /api/payments/manual/approvals
   */
  async getPendingApprovals(req, res) {
    try {
      const tenantId = req.tenant.id;
      const { priority, assignedTo, limit = 50, offset = 0 } = req.query;

      // Check if user has admin privileges
      if (!this.hasAdminPrivileges(req.user)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient privileges to view approval tickets'
        });
      }

      const tickets = await this.approvalService.getPendingApprovals(
        tenantId,
        { priority, assignedTo, limit: parseInt(limit), offset: parseInt(offset) }
      );

      res.status(200).json({
        success: true,
        data: tickets
      });

    } catch (error) {
      console.error('Get pending approvals error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Assign approval ticket (Admin only)
   * POST /api/payments/manual/approvals/:ticketId/assign
   */
  async assignApprovalTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const { assignedTo } = req.body;
      const tenantId = req.tenant.id;
      const adminId = req.user.id;

      // Check if user has admin privileges
      if (!this.hasAdminPrivileges(req.user)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient privileges to assign tickets'
        });
      }

      const result = await this.approvalService.assignTicket({
        ticketId,
        tenantId,
        assignedTo,
        assignedBy: adminId
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Assign approval ticket error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Upload supporting document
   * POST /api/payments/manual/requests/:requestId/documents
   */
  async uploadSupportingDocument(req, res) {
    try {
      const { requestId } = req.params;
      const { documentType, fileName, filePath, fileSize, mimeType } = req.body;
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      // Validate required fields
      if (!documentType || !fileName || !filePath) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: documentType, fileName, filePath'
        });
      }

      const document = await this.manualPaymentService.uploadDocument({
        paymentRequestId: requestId,
        tenantId,
        userId,
        documentType,
        fileName,
        filePath,
        fileSize: parseInt(fileSize),
        mimeType
      });

      res.status(201).json({
        success: true,
        data: document
      });

    } catch (error) {
      console.error('Upload supporting document error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get payment request statistics
   * GET /api/payments/manual/stats
   */
  async getPaymentRequestStats(req, res) {
    try {
      const tenantId = req.tenant.id;
      const { period = '30d' } = req.query;

      const stats = await this.manualPaymentService.getPaymentRequestStats(tenantId, period);

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get payment request stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Perform fraud assessment for manual payment request
   * @param {Object} paymentRequestData - Payment request data
   * @returns {Object} Fraud assessment result
   */
  async performFraudAssessment(paymentRequestData) {
    try {
      // Prepare payment data for fraud assessment
      const paymentData = {
        tenantId: paymentRequestData.tenantId,
        userId: paymentRequestData.userId,
        amount: paymentRequestData.amount,
        currency: paymentRequestData.currency,
        paymentMethod: paymentRequestData.paymentType,
        paymentDetails: paymentRequestData.paymentDetails,
        ipAddress: paymentRequestData.ipAddress,
        userAgent: paymentRequestData.userAgent,
        location: paymentRequestData.location
      };

      // Run fraud assessment
      const assessment = await this.fraudDetectionService.assessPayment(paymentData);

      // Additional manual payment specific checks
      const manualChecks = await this.performManualPaymentFraudChecks(paymentRequestData);

      // Combine assessments
      const combinedRiskScore = Math.max(assessment.riskScore, manualChecks.riskScore);
      const combinedRiskLevel = this.determineRiskLevel(combinedRiskScore);
      const combinedRiskFactors = [...assessment.riskFactors, ...manualChecks.riskFactors];

      // Determine recommendation
      let recommendation = 'approve';
      if (combinedRiskLevel === 'critical' || combinedRiskLevel === 'high') {
        recommendation = 'review';
      } else if (manualChecks.recommendation === 'reject') {
        recommendation = 'reject';
      }

      return {
        riskScore: combinedRiskScore,
        riskLevel: combinedRiskLevel,
        riskFactors: [...new Set(combinedRiskFactors)],
        recommendation,
        manualChecks: manualChecks.details
      };

    } catch (error) {
      console.error('Fraud assessment error:', error);
      // Return safe default
      return {
        riskScore: 30,
        riskLevel: 'medium',
        riskFactors: ['assessment_error'],
        recommendation: 'review',
        manualChecks: {}
      };
    }
  }

  /**
   * Perform manual payment specific fraud checks
   * @param {Object} paymentRequestData - Payment request data
   * @returns {Object} Manual fraud check results
   */
  async performManualPaymentFraudChecks(paymentRequestData) {
    const riskFactors = [];
    let riskScore = 0;
    const details = {};

    try {
      // Check for duplicate payment details
      const duplicateCheck = await this.manualPaymentService.checkDuplicatePaymentDetails(
        paymentRequestData.tenantId,
        paymentRequestData.paymentDetails,
        paymentRequestData.paymentType
      );

      if (duplicateCheck.isDuplicate) {
        riskFactors.push('duplicate_payment_details');
        riskScore += 40;
        details.duplicateCheck = duplicateCheck;
      }

      // Check for unusual payment amounts
      const amountCheck = await this.manualPaymentService.checkUnusualAmounts(
        paymentRequestData.tenantId,
        paymentRequestData.userId,
        paymentRequestData.amount,
        paymentRequestData.currency
      );

      if (amountCheck.isUnusual) {
        riskFactors.push('unusual_payment_amount');
        riskScore += 25;
        details.amountCheck = amountCheck;
      }

      // Check for suspicious payment details patterns
      const patternCheck = await this.checkSuspiciousPatterns(paymentRequestData);
      if (patternCheck.hasSuspiciousPatterns) {
        riskFactors.push('suspicious_payment_patterns');
        riskScore += 35;
        details.patternCheck = patternCheck;
      }

      // Check for blacklisted payment details
      const blacklistCheck = await this.manualPaymentService.checkBlacklistedDetails(
        paymentRequestData.paymentDetails,
        paymentRequestData.paymentType
      );

      if (blacklistCheck.isBlacklisted) {
        riskFactors.push('blacklisted_payment_details');
        riskScore = 100; // Automatic high risk
        details.blacklistCheck = blacklistCheck;
      }

      let recommendation = 'approve';
      if (riskScore >= 80) {
        recommendation = 'reject';
      } else if (riskScore >= 40) {
        recommendation = 'review';
      }

      return {
        riskScore: Math.min(riskScore, 100),
        riskFactors,
        recommendation,
        details
      };

    } catch (error) {
      console.error('Manual fraud check error:', error);
      return {
        riskScore: 20,
        riskFactors: ['manual_check_error'],
        recommendation: 'review',
        details: { error: error.message }
      };
    }
  }

  /**
   * Check for suspicious patterns in payment details
   * @param {Object} paymentRequestData - Payment request data
   * @returns {Object} Pattern check results
   */
  async checkSuspiciousPatterns(paymentRequestData) {
    const { paymentDetails, paymentType } = paymentRequestData;
    const suspiciousPatterns = [];
    let hasSuspiciousPatterns = false;

    try {
      switch (paymentType) {
        case 'bank_transfer':
          // Check for suspicious bank account patterns
          if (paymentDetails.account_number && paymentDetails.account_number.match(/^(\d)\1+$/)) {
            suspiciousPatterns.push('sequential_account_number');
            hasSuspiciousPatterns = true;
          }
          
          if (paymentDetails.routing_number && !paymentDetails.routing_number.match(/^[0-9]{9}$/)) {
            suspiciousPatterns.push('invalid_routing_number_format');
            hasSuspiciousPatterns = true;
          }
          break;

        case 'card_payment':
          // Check for suspicious card patterns
          if (paymentDetails.card_number && paymentDetails.card_number.match(/^(\d)\1{15,18}$/)) {
            suspiciousPatterns.push('repeating_card_number');
            hasSuspiciousPatterns = true;
          }
          
          if (paymentDetails.cvv && paymentDetails.cvv.match(/^(\d)\1{2,3}$/)) {
            suspiciousPatterns.push('repeating_cvv');
            hasSuspiciousPatterns = true;
          }
          break;

        case 'e_wallet':
          // Check for suspicious wallet patterns
          if (paymentDetails.wallet_id && paymentDetails.wallet_id.match(/^(.)\1+$/)) {
            suspiciousPatterns.push('repeating_wallet_id');
            hasSuspiciousPatterns = true;
          }
          break;

        case 'cryptocurrency':
          // Check for suspicious crypto patterns
          if (paymentDetails.wallet_address && paymentDetails.wallet_address.match(/^(.)\1+$/)) {
            suspiciousPatterns.push('repeating_wallet_address');
            hasSuspiciousPatterns = true;
          }
          break;
      }

      return {
        hasSuspiciousPatterns,
        suspiciousPatterns,
        checkedFields: Object.keys(paymentDetails)
      };

    } catch (error) {
      console.error('Suspicious pattern check error:', error);
      return {
        hasSuspiciousPatterns: false,
        suspiciousPatterns: [],
        checkedFields: [],
        error: error.message
      };
    }
  }

  /**
   * Determine risk level based on score
   * @param {number} riskScore - Risk score
   * @returns {string} Risk level
   */
  determineRiskLevel(riskScore) {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Check if user has admin privileges
   * @param {Object} user - User object
   * @returns {boolean} Has admin privileges
   */
  hasAdminPrivileges(user) {
    const adminRoles = ['admin', 'super_admin', 'payment_admin', 'finance_admin'];
    return adminRoles.includes(user.role);
  }
}

module.exports = ManualPaymentController;
