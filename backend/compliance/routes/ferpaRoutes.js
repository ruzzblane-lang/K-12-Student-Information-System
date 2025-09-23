/**
 * FERPA Compliance Routes
 * Defines all FERPA compliance endpoints with proper middleware
 */

const express = require('express');
const router = express.Router();
const FERPAComplianceController = require('../controllers/FERPAComplianceController');
const ComplianceMiddleware = require('../middleware/complianceMiddleware');

// Initialize controller and middleware
const ferpaController = new FERPAComplianceController();
const complianceMiddleware = new ComplianceMiddleware();

// Apply FERPA compliance middleware to all routes
router.use(complianceMiddleware.enforceFERPA());

// =============================================================================
// EDUCATIONAL RECORDS ACCESS
// =============================================================================

/**
 * @route GET /api/compliance/ferpa/students/:studentId/records
 * @desc Get educational records for a student
 * @access Private (requires proper authorization)
 */
router.get('/students/:studentId/records', 
  ferpaController.getEducationalRecords.bind(ferpaController)
);

// =============================================================================
// CONSENT MANAGEMENT
// =============================================================================

/**
 * @route POST /api/compliance/ferpa/consents
 * @desc Create a new consent record
 * @access Private (parent/guardian only)
 */
router.post('/consents',
  ferpaController.createConsent.bind(ferpaController)
);

/**
 * @route PUT /api/compliance/ferpa/consents/:consentId/grant
 * @desc Grant consent
 * @access Private (parent/guardian only)
 */
router.put('/consents/:consentId/grant',
  ferpaController.grantConsent.bind(ferpaController)
);

/**
 * @route PUT /api/compliance/ferpa/consents/:consentId/revoke
 * @desc Revoke consent
 * @access Private (parent/guardian/student 18+ only)
 */
router.put('/consents/:consentId/revoke',
  ferpaController.revokeConsent.bind(ferpaController)
);

/**
 * @route GET /api/compliance/ferpa/students/:studentId/consents
 * @desc Get all consents for a student
 * @access Private (parent/guardian/student 18+ only)
 */
router.get('/students/:studentId/consents',
  ferpaController.getStudentConsents.bind(ferpaController)
);

// =============================================================================
// DIRECTORY INFORMATION MANAGEMENT
// =============================================================================

/**
 * @route POST /api/compliance/ferpa/directory-opt-out
 * @desc Create directory information opt-out
 * @access Private (parent/guardian only)
 */
router.post('/directory-opt-out',
  ferpaController.createDirectoryOptOut.bind(ferpaController)
);

/**
 * @route GET /api/compliance/ferpa/students/:studentId/directory-disclosure/:informationType
 * @desc Check if directory information can be disclosed
 * @access Private (school officials only)
 */
router.get('/students/:studentId/directory-disclosure/:informationType',
  ferpaController.checkDirectoryDisclosure.bind(ferpaController)
);

// =============================================================================
// DISCLOSURE TRACKING
// =============================================================================

/**
 * @route POST /api/compliance/ferpa/disclosures
 * @desc Track FERPA disclosure
 * @access Private (school officials only)
 */
router.post('/disclosures',
  ferpaController.trackDisclosure.bind(ferpaController)
);

// =============================================================================
// NOTIFICATIONS
// =============================================================================

/**
 * @route POST /api/compliance/ferpa/notifications/annual
 * @desc Send annual FERPA notification
 * @access Private (administrators only)
 */
router.post('/notifications/annual',
  ferpaController.sendAnnualNotification.bind(ferpaController)
);

// =============================================================================
// PARENT VERIFICATION
// =============================================================================

/**
 * @route POST /api/compliance/ferpa/parents/:parentId/students/:studentId/verify
 * @desc Verify parent identity
 * @access Private (system use)
 */
router.post('/parents/:parentId/students/:studentId/verify',
  ferpaController.verifyParentIdentity.bind(ferpaController)
);

// =============================================================================
// DATA CLASSIFICATION
// =============================================================================

/**
 * @route POST /api/compliance/ferpa/classify-data
 * @desc Classify data for FERPA compliance
 * @access Private (system use)
 */
router.post('/classify-data',
  ferpaController.classifyData.bind(ferpaController)
);

/**
 * @route GET /api/compliance/ferpa/classification-policy
 * @desc Get data classification policy
 * @access Private (administrators only)
 */
router.get('/classification-policy',
  ferpaController.getClassificationPolicy.bind(ferpaController)
);

/**
 * @route POST /api/compliance/ferpa/classification-policy
 * @desc Create data classification policy
 * @access Private (administrators only)
 */
router.post('/classification-policy',
  ferpaController.createClassificationPolicy.bind(ferpaController)
);

// =============================================================================
// ACCESS CONTROL
// =============================================================================

/**
 * @route GET /api/compliance/ferpa/students/:studentId/access/:dataType
 * @desc Check access permissions for student data
 * @access Private (system use)
 */
router.get('/students/:studentId/access/:dataType',
  ferpaController.checkAccessPermissions.bind(ferpaController)
);

// =============================================================================
// COMPLIANCE DASHBOARD
// =============================================================================

/**
 * @route GET /api/compliance/ferpa/dashboard
 * @desc Get FERPA compliance dashboard
 * @access Private (administrators only)
 */
router.get('/dashboard',
  ferpaController.getComplianceDashboard.bind(ferpaController)
);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// Handle 404 for FERPA routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'FERPA compliance endpoint not found',
    message: `The requested FERPA compliance endpoint ${req.originalUrl} does not exist`
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('FERPA compliance route error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: 'FERPA compliance error',
    message: error.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

module.exports = router;
