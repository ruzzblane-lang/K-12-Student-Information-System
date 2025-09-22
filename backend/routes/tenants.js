/**
 * Tenant Routes
 * Handles tenant-related API endpoints
 */

const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authMiddleware } = require('../middleware/auth');
const { rbacMiddleware } = require('../middleware/rbac');
const { general } = require('../middleware/rateLimiting');

// Apply authentication to all routes
router.use(authMiddleware);

// Apply general rate limiting
router.use(general);

/**
 * @route GET /api/tenants
 * @desc Get all tenants
 * @access Private (Super Admin)
 */
router.get('/',
  rbacMiddleware(['super_admin']),
  tenantController.getAllTenants
);

/**
 * @route GET /api/tenants/:id
 * @desc Get tenant by ID
 * @access Private (Super Admin)
 */
router.get('/:id',
  rbacMiddleware(['super_admin']),
  tenantController.getTenantById
);

module.exports = router;