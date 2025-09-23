/**
 * Manual Payment Routes
 * 
 * Defines all manual payment request API endpoints with proper
 * authentication, validation, and error handling.
 */

const express = require('express');
const router = express.Router();
const ManualPaymentController = require('../controllers/manualPaymentController');
const { authenticateToken } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenantContext');
const { requireRole } = require('../../middleware/rbac');

// Initialize manual payment controller
let manualPaymentController;

// Initialize controller with database connection
const initializeController = (db) => {
  if (!manualPaymentController) {
    manualPaymentController = new ManualPaymentController(db);
  }
  return manualPaymentController;
};

// Middleware to ensure controller is initialized
const ensureController = (req, res, next) => {
  if (!manualPaymentController) {
    return res.status(500).json({
      success: false,
      error: 'Manual payment service not initialized'
    });
  }
  next();
};

/**
 * @route   GET /api/payments/manual/types
 * @desc    Get available payment request types
 * @access  Private (Authenticated users)
 */
router.get('/types',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await manualPaymentController.getPaymentRequestTypes(req, res);
  }
);

/**
 * @route   POST /api/payments/manual/request
 * @desc    Submit a manual payment request
 * @access  Private (Authenticated users)
 * @body    { paymentType, amount, currency, description, paymentDetails, supportingDocuments, studentId, priority }
 */
router.post('/request',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await manualPaymentController.submitPaymentRequest(req, res);
  }
);

/**
 * @route   GET /api/payments/manual/requests
 * @desc    Get user's payment requests
 * @access  Private (Authenticated users)
 * @query   { status, limit, offset }
 */
router.get('/requests',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await manualPaymentController.getUserPaymentRequests(req, res);
  }
);

/**
 * @route   GET /api/payments/manual/requests/:requestId
 * @desc    Get payment request details
 * @access  Private (Authenticated users)
 * @params  { requestId }
 */
router.get('/requests/:requestId',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await manualPaymentController.getPaymentRequestDetails(req, res);
  }
);

/**
 * @route   POST /api/payments/manual/requests/:requestId/approve
 * @desc    Approve payment request (Admin only)
 * @access  Private (Admin users)
 * @params  { requestId }
 * @body    { notes }
 */
router.post('/requests/:requestId/approve',
  authenticateToken,
  requireTenant,
  requireRole(['admin', 'super_admin', 'payment_admin', 'finance_admin']),
  ensureController,
  async (req, res) => {
    await manualPaymentController.approvePaymentRequest(req, res);
  }
);

/**
 * @route   POST /api/payments/manual/requests/:requestId/reject
 * @desc    Reject payment request (Admin only)
 * @access  Private (Admin users)
 * @params  { requestId }
 * @body    { reason, notes }
 */
router.post('/requests/:requestId/reject',
  authenticateToken,
  requireTenant,
  requireRole(['admin', 'super_admin', 'payment_admin', 'finance_admin']),
  ensureController,
  async (req, res) => {
    await manualPaymentController.rejectPaymentRequest(req, res);
  }
);

/**
 * @route   GET /api/payments/manual/approvals
 * @desc    Get pending approval tickets (Admin only)
 * @access  Private (Admin users)
 * @query   { priority, assignedTo, limit, offset }
 */
router.get('/approvals',
  authenticateToken,
  requireTenant,
  requireRole(['admin', 'super_admin', 'payment_admin', 'finance_admin']),
  ensureController,
  async (req, res) => {
    await manualPaymentController.getPendingApprovals(req, res);
  }
);

/**
 * @route   POST /api/payments/manual/approvals/:ticketId/assign
 * @desc    Assign approval ticket (Admin only)
 * @access  Private (Admin users)
 * @params  { ticketId }
 * @body    { assignedTo }
 */
router.post('/approvals/:ticketId/assign',
  authenticateToken,
  requireTenant,
  requireRole(['admin', 'super_admin', 'payment_admin', 'finance_admin']),
  ensureController,
  async (req, res) => {
    await manualPaymentController.assignApprovalTicket(req, res);
  }
);

/**
 * @route   POST /api/payments/manual/requests/:requestId/documents
 * @desc    Upload supporting document
 * @access  Private (Authenticated users)
 * @params  { requestId }
 * @body    { documentType, fileName, filePath, fileSize, mimeType }
 */
router.post('/requests/:requestId/documents',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await manualPaymentController.uploadSupportingDocument(req, res);
  }
);

/**
 * @route   GET /api/payments/manual/stats
 * @desc    Get payment request statistics
 * @access  Private (Authenticated users)
 * @query   { period }
 */
router.get('/stats',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await manualPaymentController.getPaymentRequestStats(req, res);
  }
);

/**
 * @route   GET /api/payments/manual/notifications
 * @desc    Get user notifications
 * @access  Private (Authenticated users)
 * @query   { limit, offset, unreadOnly }
 */
router.get('/notifications',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    try {
      const { limit = 50, offset = 0, unreadOnly = false } = req.query;
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      const notifications = await manualPaymentController.notificationService.getUserNotifications(
        userId,
        tenantId,
        { limit: parseInt(limit), offset: parseInt(offset), unreadOnly: unreadOnly === 'true' }
      );

      res.status(200).json({
        success: true,
        data: notifications
      });

    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   PUT /api/payments/manual/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private (Authenticated users)
 * @params  { notificationId }
 */
router.put('/notifications/:notificationId/read',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    try {
      const { notificationId } = req.params;
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      await manualPaymentController.notificationService.markNotificationAsRead(
        notificationId,
        userId,
        tenantId
      );

      res.status(200).json({
        success: true,
        message: 'Notification marked as read'
      });

    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/payments/manual/notifications/stats
 * @desc    Get notification statistics
 * @access  Private (Authenticated users)
 * @query   { period }
 */
router.get('/notifications/stats',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    try {
      const { period = '30d' } = req.query;
      const tenantId = req.tenant.id;

      const stats = await manualPaymentController.notificationService.getNotificationStats(
        tenantId,
        period
      );

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/payments/manual/approvals/stats
 * @desc    Get approval statistics (Admin only)
 * @access  Private (Admin users)
 * @query   { period }
 */
router.get('/approvals/stats',
  authenticateToken,
  requireTenant,
  requireRole(['admin', 'super_admin', 'payment_admin', 'finance_admin']),
  ensureController,
  async (req, res) => {
    try {
      const { period = '30d' } = req.query;
      const tenantId = req.tenant.id;

      const stats = await manualPaymentController.approvalService.getApprovalStats(
        tenantId,
        period
      );

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get approval stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/payments/manual/health
 * @desc    Health check for manual payment service
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Manual payment service is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Export router and initialization function
module.exports = {
  router,
  initializeController
};
