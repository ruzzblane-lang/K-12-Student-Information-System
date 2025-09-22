const express = require('express');
const { body, param, query } = require('express-validator');
const tenantController = require('../controllers/tenantController');
const { authenticate, requireRole } = require('../middleware/auth');
const { 
  tenantContext, 
  requireTenantContext, 
  checkTenantFeature,
  validateUserTenant 
} = require('../middleware/tenantContext');

const router = express.Router();

// Validation middleware
const validateTenantCreation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('schoolName').notEmpty().withMessage('School name is required'),
  body('schoolType').isIn(['public', 'private', 'charter', 'international']).withMessage('Invalid school type'),
  body('schoolLevel').isIn(['elementary', 'middle', 'high', 'k12']).withMessage('Invalid school level'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  body('primaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid primary color format'),
  body('secondaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid secondary color format'),
  body('subscriptionPlan').optional().isIn(['basic', 'professional', 'enterprise']).withMessage('Invalid subscription plan')
];

const validateTenantUpdate = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('schoolName').optional().notEmpty().withMessage('School name cannot be empty'),
  body('schoolType').optional().isIn(['public', 'private', 'charter', 'international']).withMessage('Invalid school type'),
  body('schoolLevel').optional().isIn(['elementary', 'middle', 'high', 'k12']).withMessage('Invalid school level'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  body('primaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid primary color format'),
  body('secondaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid secondary color format')
];

const validateSubscriptionUpdate = [
  body('plan').isIn(['basic', 'professional', 'enterprise']).withMessage('Invalid subscription plan'),
  body('status').isIn(['active', 'suspended', 'cancelled', 'trial']).withMessage('Invalid subscription status'),
  body('maxStudents').optional().isInt({ min: 1 }).withMessage('Max students must be a positive integer'),
  body('maxTeachers').optional().isInt({ min: 1 }).withMessage('Max teachers must be a positive integer')
];

// Super Admin Routes (no tenant context required)
router.post('/',
  authenticate,
  requireRole(['super_admin']),
  validateTenantCreation,
  tenantController.createTenant
);

router.get('/all',
  authenticate,
  requireRole(['super_admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['active', 'suspended', 'cancelled', 'trial']).withMessage('Invalid status'),
    query('plan').optional().isIn(['basic', 'professional', 'enterprise']).withMessage('Invalid plan')
  ],
  tenantController.getAllTenants
);

// Tenant-specific routes (require tenant context)
router.get('/',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  tenantController.getTenant
);

router.put('/',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['admin', 'super_admin']),
  validateTenantUpdate,
  tenantController.updateTenant
);

router.get('/stats',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['admin', 'principal', 'super_admin']),
  tenantController.getTenantStats
);

router.get('/limits',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['admin', 'principal', 'super_admin']),
  tenantController.getTenantLimits
);

router.put('/subscription',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['super_admin']),
  validateSubscriptionUpdate,
  tenantController.updateSubscription
);

router.post('/suspend',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['super_admin']),
  [
    body('reason').notEmpty().withMessage('Suspension reason is required')
  ],
  tenantController.suspendTenant
);

router.post('/reactivate',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['super_admin']),
  tenantController.reactivateTenant
);

router.delete('/',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['super_admin']),
  tenantController.deleteTenant
);

// Feature-specific routes
router.get('/features',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  (req, res) => {
    res.json({
      success: true,
      data: {
        features: req.tenant.features,
        subscriptionPlan: req.tenant.subscriptionPlan,
        subscriptionStatus: req.tenant.subscriptionStatus
      }
    });
  }
);

// Branding routes
router.get('/branding',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  (req, res) => {
    res.json({
      success: true,
      data: {
        logoUrl: req.tenant.logoUrl,
        primaryColor: req.tenant.primaryColor,
        secondaryColor: req.tenant.secondaryColor,
        customCss: req.tenant.customCss,
        schoolName: req.tenant.schoolName
      }
    });
  }
);

router.put('/branding',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['admin', 'super_admin']),
  checkTenantFeature('customBranding'),
  [
    body('logoUrl').optional().isURL().withMessage('Invalid logo URL'),
    body('primaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid primary color format'),
    body('secondaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid secondary color format'),
    body('customCss').optional().isString().withMessage('Custom CSS must be a string')
  ],
  async (req, res) => {
    try {
      const { logoUrl, primaryColor, secondaryColor, customCss } = req.body;
      
      await req.tenant.update({
        logoUrl,
        primaryColor,
        secondaryColor,
        customCss
      });

      res.json({
        success: true,
        message: 'Branding updated successfully',
        data: {
          logoUrl: req.tenant.logoUrl,
          primaryColor: req.tenant.primaryColor,
          secondaryColor: req.tenant.secondaryColor,
          customCss: req.tenant.customCss
        }
      });
    } catch (error) {
      console.error('Update branding error:', error);
      res.status(500).json({
        error: 'Failed to update branding',
        message: error.message
      });
    }
  }
);

// Domain management routes
router.get('/domains',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['admin', 'super_admin']),
  checkTenantFeature('customDomain'),
  (req, res) => {
    res.json({
      success: true,
      data: {
        domain: req.tenant.domain,
        subdomain: req.tenant.subdomain,
        slug: req.tenant.slug
      }
    });
  }
);

router.put('/domains',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['admin', 'super_admin']),
  checkTenantFeature('customDomain'),
  [
    body('domain').optional().isURL().withMessage('Invalid domain format'),
    body('subdomain').optional().matches(/^[a-z0-9-]+$/).withMessage('Invalid subdomain format')
  ],
  async (req, res) => {
    try {
      const { domain, subdomain } = req.body;
      
      await req.tenant.update({
        domain,
        subdomain
      });

      res.json({
        success: true,
        message: 'Domain settings updated successfully',
        data: {
          domain: req.tenant.domain,
          subdomain: req.tenant.subdomain
        }
      });
    } catch (error) {
      console.error('Update domains error:', error);
      res.status(500).json({
        error: 'Failed to update domain settings',
        message: error.message
      });
    }
  }
);

module.exports = router;
