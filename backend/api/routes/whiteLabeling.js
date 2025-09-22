/**
 * White-Labeling Routes
 * Handles white-labeling related API endpoints
 */

const express = require('express');
const router = express.Router();
const whiteLabelingController = require('../controllers/whiteLabelingController');
const { authMiddleware } = require('../../middleware/auth');
const { rbacMiddleware } = require('../../middleware/rbac');
const { tenantContextMiddleware } = require('../../middleware/tenantContext');
const { general } = require('../../middleware/rateLimiting');

// Apply authentication and tenant context to all routes
router.use(authMiddleware);
router.use(tenantContextMiddleware);

// Apply general rate limiting
router.use(general);

/**
 * @route GET /api/white-labeling/:tenantId/branding
 * @desc Get tenant branding configuration
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/:tenantId/branding',
  rbacMiddleware(['tenant_admin', 'super_admin']),
  whiteLabelingController.getBranding
);

/**
 * @route PUT /api/white-labeling/:tenantId/branding
 * @desc Update tenant branding configuration
 * @access Private (Tenant Admin, Super Admin)
 */
router.put('/:tenantId/branding',
  rbacMiddleware(['tenant_admin', 'super_admin']),
  whiteLabelingController.updateBranding
);

/**
 * @route GET /api/white-labeling/:tenantId/css
 * @desc Generate CSS for tenant branding
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/:tenantId/css',
  rbacMiddleware(['tenant_admin', 'super_admin']),
  whiteLabelingController.generateCSS
);

/**
 * @route GET /api/white-labeling/:tenantId/preview
 * @desc Get branding preview
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/:tenantId/preview',
  rbacMiddleware(['tenant_admin', 'super_admin']),
  whiteLabelingController.getPreview
);

/**
 * @route POST /api/white-labeling/:tenantId/reset
 * @desc Reset branding to defaults
 * @access Private (Tenant Admin, Super Admin)
 */
router.post('/:tenantId/reset',
  rbacMiddleware(['tenant_admin', 'super_admin']),
  whiteLabelingController.resetToDefaults
);

/**
 * @route GET /api/white-labeling/:tenantId/export
 * @desc Export branding configuration
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/:tenantId/export',
  rbacMiddleware(['tenant_admin', 'super_admin']),
  whiteLabelingController.exportConfig
);

/**
 * @route POST /api/white-labeling/:tenantId/import
 * @desc Import branding configuration
 * @access Private (Tenant Admin, Super Admin)
 */
router.post('/:tenantId/import',
  rbacMiddleware(['tenant_admin', 'super_admin']),
  whiteLabelingController.importConfig
);

module.exports = router;