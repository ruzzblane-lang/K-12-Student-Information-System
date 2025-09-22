/**
 * Onboarding Routes
 * Handles tenant onboarding API endpoints
 */

const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { _general } = require('../middleware/rateLimiting');

// Apply _general rate limiting
router.use(_general);

/**
 * @route POST /api/onboarding/tenants
 * @desc Create a new tenant
 * @access Public (for initial tenant creation)
 */
router.post('/tenants',
  onboardingController.createTenant
);

/**
 * @route GET /api/onboarding/:tenantId/status
 * @desc Get onboarding status
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/:tenantId/status',
  onboardingController.getOnboardingStatus
);

module.exports = router;