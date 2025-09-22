/**
 * Tenant Routes
 * Handles tenant-related API endpoints
 */

const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { _authMiddleware } = require('../middleware/auth');
const { rbacMiddleware } = require('../middleware/rbac');
const { _general } = require('../middleware/rateLimiting');

// Apply authentication to all routes
router.use(_authMiddleware);

// Apply _general rate limiting
router.use(_general);

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
 * @route GET /api/tenants/:_id
 * @desc Get tenant by ID
 * @access Private (Super Admin)
 */
router.get('/:_id',
  rbacMiddleware(['super_admin']),
  tenantController.getTenantById
);

module.exports = router;