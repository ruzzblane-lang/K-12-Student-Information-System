/**
 * White-Labeling API Routes
 * Handles tenant branding, customization, and white-label features
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const whiteLabelingController = require('../controllers/whiteLabelingController');
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');
const tenantContextMiddleware = require('../middleware/tenantContext');

// Apply authentication and tenant context to all routes
router.use(authMiddleware);
router.use(tenantContextMiddleware);

/**
 * @route GET /api/white-labeling/branding
 * @desc Get tenant branding configuration
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/branding', 
    rbacMiddleware(['tenant_admin', 'super_admin']),
    whiteLabelingController.getBranding
);

/**
 * @route PUT /api/white-labeling/branding
 * @desc Update tenant branding configuration
 * @access Private (Tenant Admin, Super Admin)
 */
router.put('/branding',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('colors.primary').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Primary color must be a valid hex color'),
        body('colors.secondary').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Secondary color must be a valid hex color'),
        body('colors.header_background').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Header background color must be a valid hex color'),
        body('colors.footer_background').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Footer background color must be a valid hex color'),
        body('colors.text').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Text color must be a valid hex color'),
        body('colors.link').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Link color must be a valid hex color'),
        body('colors.button').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Button color must be a valid hex color'),
        body('colors.button_text').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Button text color must be a valid hex color'),
        body('colors.accent').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Accent color must be a valid hex color'),
        body('colors.border').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Border color must be a valid hex color'),
        body('logo_url').optional().isURL().withMessage('Logo URL must be a valid URL'),
        body('favicon_url').optional().isURL().withMessage('Favicon URL must be a valid URL'),
        body('background_image_url').optional().isURL().withMessage('Background image URL must be a valid URL'),
        body('white_label_level').optional().isIn(['basic', 'advanced', 'enterprise']).withMessage('White label level must be basic, advanced, or enterprise')
    ],
    whiteLabelingController.updateBranding
);

/**
 * @route GET /api/white-labeling/css
 * @desc Get generated CSS for tenant branding
 * @access Public (for frontend consumption)
 */
router.get('/css/:tenantId',
    param('tenantId').isUUID().withMessage('Tenant ID must be a valid UUID'),
    whiteLabelingController.getGeneratedCSS
);

/**
 * @route POST /api/white-labeling/upload-asset
 * @desc Upload branding asset (logo, favicon, etc.)
 * @access Private (Tenant Admin, Super Admin)
 */
router.post('/upload-asset',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('asset_type').isIn(['logo', 'favicon', 'background_image', 'apple_touch_icon', 'manifest']).withMessage('Invalid asset type'),
        body('file_data').notEmpty().withMessage('File data is required')
    ],
    whiteLabelingController.uploadAsset
);

/**
 * @route POST /api/white-labeling/validate-domain
 * @desc Validate custom domain availability
 * @access Private (Tenant Admin, Super Admin)
 */
router.post('/validate-domain',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('domain').isFQDN().withMessage('Domain must be a valid fully qualified domain name')
    ],
    whiteLabelingController.validateDomain
);

/**
 * @route POST /api/white-labeling/setup-custom-domain
 * @desc Setup custom domain for tenant
 * @access Private (Tenant Admin, Super Admin)
 */
router.post('/setup-custom-domain',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('domain').isFQDN().withMessage('Domain must be a valid fully qualified domain name'),
        body('verification_code').notEmpty().withMessage('Verification code is required')
    ],
    whiteLabelingController.setupCustomDomain
);

/**
 * @route GET /api/white-labeling/domain-status/:domain
 * @desc Get custom domain status and SSL certificate info
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/domain-status/:domain',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    param('domain').isFQDN().withMessage('Domain must be a valid fully qualified domain name'),
    whiteLabelingController.getDomainStatus
);

/**
 * @route PUT /api/white-labeling/email-templates
 * @desc Update custom email templates
 * @access Private (Tenant Admin, Super Admin)
 */
router.put('/email-templates',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('templates').isObject().withMessage('Templates must be an object'),
        body('templates.*.subject').optional().isString().withMessage('Email subject must be a string'),
        body('templates.*.template').optional().isString().withMessage('Email template must be a string'),
        body('templates.*.from_name').optional().isString().withMessage('From name must be a string')
    ],
    whiteLabelingController.updateEmailTemplates
);

/**
 * @route PUT /api/white-labeling/dashboard-widgets
 * @desc Update dashboard widget configuration
 * @access Private (Tenant Admin, Super Admin)
 */
router.put('/dashboard-widgets',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('enabled_widgets').optional().isArray().withMessage('Enabled widgets must be an array'),
        body('layout').optional().isIn(['grid', 'list', 'custom']).withMessage('Layout must be grid, list, or custom'),
        body('widget_order').optional().isArray().withMessage('Widget order must be an array'),
        body('custom_widgets').optional().isArray().withMessage('Custom widgets must be an array')
    ],
    whiteLabelingController.updateDashboardWidgets
);

/**
 * @route PUT /api/white-labeling/navigation-menu
 * @desc Update navigation menu configuration
 * @access Private (Tenant Admin, Super Admin)
 */
router.put('/navigation-menu',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('main_menu').optional().isArray().withMessage('Main menu must be an array'),
        body('footer_menu').optional().isArray().withMessage('Footer menu must be an array'),
        body('main_menu.*.label').optional().isString().withMessage('Menu label must be a string'),
        body('main_menu.*.url').optional().isString().withMessage('Menu URL must be a string'),
        body('main_menu.*.icon').optional().isString().withMessage('Menu icon must be a string')
    ],
    whiteLabelingController.updateNavigationMenu
);

/**
 * @route PUT /api/white-labeling/support-contact
 * @desc Update support contact information
 * @access Private (Tenant Admin, Super Admin)
 */
router.put('/support-contact',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('email').optional().isEmail().withMessage('Support email must be a valid email'),
        body('phone').optional().isString().withMessage('Support phone must be a string'),
        body('hours').optional().isString().withMessage('Support hours must be a string'),
        body('chat_enabled').optional().isBoolean().withMessage('Chat enabled must be a boolean'),
        body('ticket_system').optional().isString().withMessage('Ticket system must be a string'),
        body('knowledge_base_url').optional().isURL().withMessage('Knowledge base URL must be a valid URL')
    ],
    whiteLabelingController.updateSupportContact
);

/**
 * @route PUT /api/white-labeling/social-media
 * @desc Update social media links
 * @access Private (Tenant Admin, Super Admin)
 */
router.put('/social-media',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('facebook').optional().isURL().withMessage('Facebook URL must be a valid URL'),
        body('twitter').optional().isURL().withMessage('Twitter URL must be a valid URL'),
        body('instagram').optional().isURL().withMessage('Instagram URL must be a valid URL'),
        body('linkedin').optional().isURL().withMessage('LinkedIn URL must be a valid URL'),
        body('youtube').optional().isURL().withMessage('YouTube URL must be a valid URL')
    ],
    whiteLabelingController.updateSocialMedia
);

/**
 * @route PUT /api/white-labeling/analytics
 * @desc Update analytics configuration
 * @access Private (Tenant Admin, Super Admin)
 */
router.put('/analytics',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('google_analytics_id').optional().isString().withMessage('Google Analytics ID must be a string'),
        body('google_tag_manager_id').optional().isString().withMessage('Google Tag Manager ID must be a string'),
        body('facebook_pixel_id').optional().isString().withMessage('Facebook Pixel ID must be a string'),
        body('custom_events').optional().isArray().withMessage('Custom events must be an array')
    ],
    whiteLabelingController.updateAnalytics
);

/**
 * @route PUT /api/white-labeling/legal-documents
 * @desc Update legal documents (Terms of Service, Privacy Policy)
 * @access Private (Tenant Admin, Super Admin)
 */
router.put('/legal-documents',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('terms_of_service').optional().isString().withMessage('Terms of Service must be a string'),
        body('privacy_policy').optional().isString().withMessage('Privacy Policy must be a string')
    ],
    whiteLabelingController.updateLegalDocuments
);

/**
 * @route GET /api/white-labeling/preview/:tenantId
 * @desc Get branding preview for tenant
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/preview/:tenantId',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    param('tenantId').isUUID().withMessage('Tenant ID must be a valid UUID'),
    whiteLabelingController.getBrandingPreview
);

/**
 * @route POST /api/white-labeling/reset-to-defaults
 * @desc Reset tenant branding to default values
 * @access Private (Tenant Admin, Super Admin)
 */
router.post('/reset-to-defaults',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    whiteLabelingController.resetToDefaults
);

/**
 * @route GET /api/white-labeling/export-config
 * @desc Export tenant branding configuration
 * @access Private (Tenant Admin, Super Admin)
 */
router.get('/export-config',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    whiteLabelingController.exportConfig
);

/**
 * @route POST /api/white-labeling/import-config
 * @desc Import tenant branding configuration
 * @access Private (Tenant Admin, Super Admin)
 */
router.post('/import-config',
    rbacMiddleware(['tenant_admin', 'super_admin']),
    [
        body('config').isObject().withMessage('Configuration must be an object'),
        body('overwrite_existing').optional().isBoolean().withMessage('Overwrite existing must be a boolean')
    ],
    whiteLabelingController.importConfig
);

module.exports = router;
