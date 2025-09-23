/**
 * Compliance Routes
 * API endpoints for compliance operations
 * Provides comprehensive compliance management interface
 */

const express = require('express');
const router = express.Router();
const ComplianceController = require('../controllers/complianceController');
const ComplianceMiddleware = require('../middleware/complianceMiddleware');

// Initialize controller and middleware
const complianceController = new ComplianceController();
const complianceMiddleware = new ComplianceMiddleware();

// =============================================================================
// COMPLIANCE CHECK ROUTES
// =============================================================================

/**
 * Check compliance for a specific standard
 * GET /api/compliance/check/:standard
 */
router.get('/check/:standard', 
  complianceController.checkCompliance.bind(complianceController)
);

/**
 * Get compliance dashboard
 * GET /api/compliance/dashboard
 */
router.get('/dashboard',
  complianceController.getComplianceDashboard.bind(complianceController)
);

/**
 * Get compliance statistics
 * GET /api/compliance/statistics
 */
router.get('/statistics',
  complianceController.getComplianceStatistics.bind(complianceController)
);

/**
 * Get supported data types for tokenization
 * GET /api/compliance/supported-data-types
 */
router.get('/supported-data-types',
  complianceController.getSupportedDataTypes.bind(complianceController)
);

// =============================================================================
// SENSITIVE DATA PROCESSING ROUTES
// =============================================================================

/**
 * Process sensitive data with compliance
 * POST /api/compliance/process-sensitive-data
 */
router.post('/process-sensitive-data',
  complianceMiddleware.enforceDataResidency('sensitive_data'),
  complianceMiddleware.validateSensitiveData(['ssn', 'card_number', 'bank_account']),
  complianceController.processSensitiveData.bind(complianceController)
);

/**
 * Retrieve sensitive data with compliance
 * GET /api/compliance/retrieve-sensitive-data/:token
 */
router.get('/retrieve-sensitive-data/:token',
  complianceController.retrieveSensitiveData.bind(complianceController)
);

// =============================================================================
// TOKENIZATION ROUTES
// =============================================================================

/**
 * Tokenize data
 * POST /api/compliance/tokenize
 */
router.post('/tokenize',
  complianceMiddleware.enforcePCIDSS(),
  complianceController.tokenizeData.bind(complianceController)
);

/**
 * Detokenize data
 * POST /api/compliance/detokenize
 */
router.post('/detokenize',
  complianceController.detokenizeData.bind(complianceController)
);

// =============================================================================
// ENCRYPTION VAULT ROUTES
// =============================================================================

/**
 * Store data in encryption vault
 * POST /api/compliance/vault/store
 */
router.post('/vault/store',
  complianceMiddleware.enforceDataResidency('vault_data'),
  complianceController.storeInVault.bind(complianceController)
);

/**
 * Retrieve data from encryption vault
 * GET /api/compliance/vault/retrieve/:key
 */
router.get('/vault/retrieve/:key',
  complianceController.retrieveFromVault.bind(complianceController)
);

// =============================================================================
// AUDIT TRAIL ROUTES
// =============================================================================

/**
 * Get audit trail for a resource
 * GET /api/compliance/audit-trail/:resourceType/:resourceId
 */
router.get('/audit-trail/:resourceType/:resourceId',
  complianceController.getAuditTrail.bind(complianceController)
);

/**
 * Get user activity audit trail
 * GET /api/compliance/audit-trail/user/:userId
 */
router.get('/audit-trail/user/:userId',
  complianceController.getUserAuditTrail.bind(complianceController)
);

/**
 * Verify audit trail integrity
 * POST /api/compliance/audit-trail/verify
 */
router.post('/audit-trail/verify',
  complianceController.verifyAuditIntegrity.bind(complianceController)
);

// =============================================================================
// DATA RESIDENCY ROUTES
// =============================================================================

/**
 * Get data residency requirements
 * GET /api/compliance/data-residency/requirements
 */
router.get('/data-residency/requirements',
  complianceController.getDataResidencyRequirements.bind(complianceController)
);

/**
 * Validate data residency
 * POST /api/compliance/data-residency/validate
 */
router.post('/data-residency/validate',
  complianceController.validateDataResidency.bind(complianceController)
);

/**
 * Get allowed regions for data processing
 * GET /api/compliance/data-residency/allowed-regions
 */
router.get('/data-residency/allowed-regions',
  complianceController.getAllowedRegions.bind(complianceController)
);

// =============================================================================
// KYC/AML ROUTES
// =============================================================================

/**
 * Perform KYC/AML verification
 * POST /api/compliance/kyc-aml
 */
router.post('/kyc-aml',
  complianceMiddleware.enforceDataResidency('kyc_data'),
  complianceMiddleware.enforceGDPR(),
  complianceController.performKYCAML.bind(complianceController)
);

// =============================================================================
// ADMIN ROUTES
// =============================================================================

/**
 * Clean up old compliance data
 * POST /api/compliance/cleanup
 */
router.post('/cleanup',
  complianceController.cleanupComplianceData.bind(complianceController)
);

// =============================================================================
// COMPLIANCE MIDDLEWARE ROUTES
// =============================================================================

/**
 * Apply compliance middleware to all routes
 * This ensures all compliance routes are properly audited
 */
router.use(complianceMiddleware.auditAllRequests());

module.exports = router;
