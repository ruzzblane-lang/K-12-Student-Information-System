/**
 * Integration Routes
 * 
 * Defines API routes for third-party integration management.
 * Includes authentication, authorization, and rate limiting middleware.
 */

const express = require('express');
const router = express.Router();
const IntegrationController = require('../controllers/IntegrationController');
const auth = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const rateLimiting = require('../../middleware/rateLimiting');

const integrationController = new IntegrationController();

// Apply authentication middleware to all routes
router.use(auth);

// Apply rate limiting
router.use(rateLimiting);

/**
 * @route GET /api/integrations/:tenantId
 * @desc Get all available integrations for a tenant
 * @access Private (Admin, Teacher)
 */
router.get('/:tenantId', 
  rbac(['admin', 'teacher']),
  integrationController.getAvailableIntegrations.bind(integrationController)
);

/**
 * @route GET /api/integrations/:tenantId/:provider/config
 * @desc Get integration configuration
 * @access Private (Admin, Teacher)
 */
router.get('/:tenantId/:provider/config',
  rbac(['admin', 'teacher']),
  integrationController.getIntegrationConfig.bind(integrationController)
);

/**
 * @route PUT /api/integrations/:tenantId/:provider/config
 * @desc Set integration configuration
 * @access Private (Admin only)
 */
router.put('/:tenantId/:provider/config',
  rbac(['admin']),
  integrationController.setIntegrationConfig.bind(integrationController)
);

/**
 * @route POST /api/integrations/:tenantId/:provider/:method
 * @desc Execute integration method
 * @access Private (Role-based)
 */
router.post('/:tenantId/:provider/:method',
  rbac(['admin', 'teacher', 'staff']),
  integrationController.executeIntegration.bind(integrationController)
);

/**
 * @route GET /api/integrations/:tenantId/:provider/health
 * @desc Get integration health status
 * @access Private (Admin, Teacher)
 */
router.get('/:tenantId/:provider/health',
  rbac(['admin', 'teacher']),
  integrationController.getIntegrationHealth.bind(integrationController)
);

/**
 * @route GET /api/integrations/:tenantId/health
 * @desc Get all integration health statuses
 * @access Private (Admin, Teacher)
 */
router.get('/:tenantId/health',
  rbac(['admin', 'teacher']),
  integrationController.getAllIntegrationHealth.bind(integrationController)
);

/**
 * @route GET /api/integrations/:tenantId/stats
 * @desc Get integration usage statistics
 * @access Private (Admin, Teacher)
 */
router.get('/:tenantId/stats',
  rbac(['admin', 'teacher']),
  integrationController.getUsageStats.bind(integrationController)
);

/**
 * @route GET /api/integrations/:tenantId/audit
 * @desc Get integration audit trail
 * @access Private (Admin only)
 */
router.get('/:tenantId/audit',
  rbac(['admin']),
  integrationController.getAuditTrail.bind(integrationController)
);

/**
 * @route GET /api/integrations/:tenantId/compliance
 * @desc Get compliance report
 * @access Private (Admin only)
 */
router.get('/:tenantId/compliance',
  rbac(['admin']),
  integrationController.getComplianceReport.bind(integrationController)
);

/**
 * @route PUT /api/integrations/:tenantId/:userId/:provider/permissions
 * @desc Set user permissions for integration
 * @access Private (Admin only)
 */
router.put('/:tenantId/:userId/:provider/permissions',
  rbac(['admin']),
  integrationController.setUserPermissions.bind(integrationController)
);

/**
 * @route GET /api/integrations/:tenantId/:userId/:provider/permissions
 * @desc Get user permissions for integration
 * @access Private (Admin, Teacher)
 */
router.get('/:tenantId/:userId/:provider/permissions',
  rbac(['admin', 'teacher']),
  integrationController.getUserPermissions.bind(integrationController)
);

/**
 * @route POST /api/integrations/webhooks/:provider
 * @desc Handle webhook from third-party service
 * @access Public (with signature validation)
 */
router.post('/webhooks/:provider',
  integrationController.handleWebhook.bind(integrationController)
);

module.exports = router;
