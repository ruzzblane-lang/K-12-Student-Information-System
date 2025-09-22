const express = require('express');
const { body, param } = require('express-validator');
const onboardingController = require('../controllers/onboardingController');
const { authenticate, requireRole } = require('../middleware/auth');
const { 
  tenantContext, 
  requireTenantContext, 
  validateUserTenant 
} = require('../middleware/tenantContext');

const router = express.Router();

// Validation middleware for onboarding
const validateOnboardingData = [
  // Tenant validation
  body('tenant.name').notEmpty().withMessage('Tenant name is required'),
  body('tenant.schoolName').notEmpty().withMessage('School name is required'),
  body('tenant.schoolType').isIn(['public', 'private', 'charter', 'international']).withMessage('Invalid school type'),
  body('tenant.schoolLevel').isIn(['elementary', 'middle', 'high', 'k12']).withMessage('Invalid school level'),
  body('tenant.email').optional().isEmail().withMessage('Invalid email format'),
  body('tenant.website').optional().isURL().withMessage('Invalid website URL'),
  body('tenant.subscriptionPlan').optional().isIn(['basic', 'professional', 'enterprise']).withMessage('Invalid subscription plan'),
  
  // Admin user validation
  body('admin.email').isEmail().withMessage('Admin email is required and must be valid'),
  body('admin.password').isLength({ min: 8 }).withMessage('Admin password must be at least 8 characters'),
  body('admin.firstName').notEmpty().withMessage('Admin first name is required'),
  body('admin.lastName').notEmpty().withMessage('Admin last name is required')
];

// Super Admin Routes (no tenant context required)
router.post('/start',
  authenticate,
  requireRole(['super_admin']),
  validateOnboardingData,
  onboardingController.startOnboarding
);

// Tenant-specific routes (require tenant context)
router.get('/progress',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['admin', 'super_admin']),
  onboardingController.getOnboardingProgress
);

router.get('/checklist',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['admin', 'super_admin']),
  onboardingController.getOnboardingChecklist
);

router.get('/resources',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  onboardingController.getOnboardingResources
);

router.post('/reminder',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['admin', 'super_admin']),
  onboardingController.sendOnboardingReminder
);

router.post('/complete/:step',
  authenticate,
  tenantContext,
  requireTenantContext,
  validateUserTenant,
  requireRole(['admin', 'super_admin']),
  [
    param('step').isIn(['email_verification', 'profile_setup', 'teacher_setup', 'student_setup', 'class_setup']).withMessage('Invalid onboarding step')
  ],
  onboardingController.completeOnboardingStep
);

// Public onboarding information (no authentication required)
router.get('/info',
  (req, res) => {
    res.json({
      success: true,
      data: {
        features: [
          'Student Management',
          'Teacher Management',
          'Grade Book',
          'Attendance Tracking',
          'Parent Portal',
          'Reporting & Analytics',
          'Mobile Access',
          'Data Security & Compliance'
        ],
        pricing: {
          basic: {
            name: 'Basic',
            price: '$2/student/year',
            features: [
              'Up to 500 students',
              'Basic gradebook',
              'Attendance tracking',
              'Parent portal',
              'Email support'
            ]
          },
          professional: {
            name: 'Professional',
            price: '$4/student/year',
            features: [
              'Up to 2,000 students',
              'Advanced reporting',
              'Custom branding',
              'API access',
              'Priority support'
            ]
          },
          enterprise: {
            name: 'Enterprise',
            price: '$6/student/year',
            features: [
              'Unlimited students',
              'White-label solution',
              'Custom domain',
              'SSO integration',
              'Dedicated support'
            ]
          }
        },
        benefits: [
          'FERPA, COPPA, and GDPR compliant',
          '99.9% uptime guarantee',
          'Mobile-first design',
          'Easy data migration',
          'Comprehensive training',
          '24/7 support'
        ],
        testimonials: [
          {
            school: 'Springfield Elementary',
            quote: 'The system has transformed how we manage student data and communicate with parents.',
            author: 'Principal Sarah Johnson'
          },
          {
            school: 'Metro High School',
            quote: 'Easy to use, secure, and exactly what we needed for our growing school.',
            author: 'IT Director Mike Chen'
          }
        ]
      }
    });
  }
);

// Onboarding status check (for public pages)
router.get('/status/:tenantSlug',
  async (req, res) => {
    try {
      const { tenantSlug } = req.params;
      
      // This would check if the tenant exists and is active
      // For now, we'll return a simple response
      res.json({
        success: true,
        data: {
          tenantExists: true,
          isActive: true,
          onboardingComplete: false
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to check onboarding status',
        message: error.message
      });
    }
  }
);

module.exports = router;
