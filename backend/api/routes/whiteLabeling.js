/**
 * White-Labeling Routes
 * 
 * Enhanced routes with complete white-labeling functionality including:
 * - Asset upload and management
 * - Theme template management
 * - Custom domain setup
 * - Configuration import/export
 * - Real-time preview
 */

const express = require('express');
const router = express.Router();
const WhiteLabelingController = require('../controllers/whiteLabelingController');
const auth = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const rateLimiting = require('../../middleware/rateLimiting');
const { body, param } = require('express-validator');

// Initialize controller
const whiteLabelingController = new WhiteLabelingController();

// Apply middleware
router.use(auth.verifyToken);
router.use(auth.requireTenant);
router.use(rateLimiting.whitelabelLimiter);

/**
 * Branding Configuration Routes
 */

// Get branding configuration
router.get('/branding', 
  rbac.requireRole(['admin', 'teacher']),
  whiteLabelingController.getBranding.bind(whiteLabelingController)
);

// Update branding configuration
router.put('/branding',
  rbac.requireRole(['admin']),
  [
    body('colors.primary').optional().isHexColor().withMessage('Primary color must be a valid hex color'),
    body('colors.secondary').optional().isHexColor().withMessage('Secondary color must be a valid hex color'),
    body('colors.header_background').optional().isHexColor().withMessage('Header background must be a valid hex color'),
    body('colors.footer_background').optional().isHexColor().withMessage('Footer background must be a valid hex color'),
    body('colors.text').optional().isHexColor().withMessage('Text color must be a valid hex color'),
    body('colors.link').optional().isHexColor().withMessage('Link color must be a valid hex color'),
    body('colors.button').optional().isHexColor().withMessage('Button color must be a valid hex color'),
    body('colors.button_text').optional().isHexColor().withMessage('Button text color must be a valid hex color'),
    body('colors.accent').optional().isHexColor().withMessage('Accent color must be a valid hex color'),
    body('colors.border').optional().isHexColor().withMessage('Border color must be a valid hex color'),
    body('typography.font_family').optional().isString().withMessage('Font family must be a string'),
    body('typography.font_size_base').optional().matches(/^\d+(\.\d+)?(px|em|rem)$/).withMessage('Font size must be a valid CSS size'),
    body('white_label_config.level').optional().isIn(['basic', 'advanced', 'enterprise']).withMessage('Invalid white-label level')
  ],
  whiteLabelingController.updateBranding.bind(whiteLabelingController)
);

/**
 * CSS Generation Routes
 */

// Get generated CSS
router.get('/css',
  whiteLabelingController.generateCSS.bind(whiteLabelingController)
);

// Get CSS by tenant ID (public endpoint for external access)
router.get('/css/:tenantId',
  param('tenantId').isUUID().withMessage('Invalid tenant ID'),
  whiteLabelingController.generateCSS.bind(whiteLabelingController)
);

/**
 * Asset Management Routes
 */

// Upload branding asset
router.post('/upload-asset',
  rbac.requireRole(['admin']),
  whiteLabelingController.getUploadMiddleware(),
  [
    body('asset_type').isIn(['logo', 'favicon', 'apple_touch_icon', 'background_image']).withMessage('Invalid asset type')
  ],
  whiteLabelingController.uploadAsset.bind(whiteLabelingController)
);

/**
 * Theme Template Routes
 */

// Get available theme templates
router.get('/themes',
  rbac.requireRole(['admin', 'teacher']),
  whiteLabelingController.getThemeTemplates.bind(whiteLabelingController)
);

// Apply theme template
router.post('/themes/apply',
  rbac.requireRole(['admin']),
  [
    body('template_id').isString().withMessage('Template ID is required')
  ],
  whiteLabelingController.applyThemeTemplate.bind(whiteLabelingController)
);

/**
 * Preview Routes
 */

// Get branding preview
router.get('/preview',
  rbac.requireRole(['admin', 'teacher']),
  whiteLabelingController.getPreview.bind(whiteLabelingController)
);

/**
 * Custom Domain Routes
 */

// Validate custom domain
router.post('/validate-domain',
  rbac.requireRole(['admin']),
  [
    body('domain').isFQDN().withMessage('Domain must be a valid fully qualified domain name')
  ],
  whiteLabelingController.validateDomain.bind(whiteLabelingController)
);

// Setup custom domain
router.post('/setup-custom-domain',
  rbac.requireRole(['admin']),
  [
    body('domain').isFQDN().withMessage('Domain must be a valid fully qualified domain name'),
    body('verification_code').isLength({ min: 32, max: 32 }).withMessage('Verification code must be 32 characters')
  ],
  whiteLabelingController.setupCustomDomain.bind(whiteLabelingController)
);

// Get custom domain status
router.get('/domain-status',
  rbac.requireRole(['admin']),
  whiteLabelingController.getDomainStatus.bind(whiteLabelingController)
);

/**
 * Configuration Management Routes
 */

// Export branding configuration
router.get('/export-config',
  rbac.requireRole(['admin']),
  whiteLabelingController.exportConfig.bind(whiteLabelingController)
);

// Import branding configuration
router.post('/import-config',
  rbac.requireRole(['admin']),
  [
    body('config').isObject().withMessage('Configuration must be a valid object'),
    body('overwriteExisting').optional().isBoolean().withMessage('Overwrite existing must be a boolean')
  ],
  whiteLabelingController.importConfig.bind(whiteLabelingController)
);

// Reset branding to defaults
router.post('/reset-defaults',
  rbac.requireRole(['admin']),
  whiteLabelingController.resetToDefaults.bind(whiteLabelingController)
);

/**
 * Audit and History Routes
 */

// Get branding audit log
router.get('/audit-log',
  rbac.requireRole(['admin']),
  [
    param('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    param('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer')
  ],
  whiteLabelingController.getAuditLog.bind(whiteLabelingController)
);

/**
 * Advanced Features Routes
 */

// Update email templates
router.put('/email-templates',
  rbac.requireRole(['admin']),
  [
    body('templates').isObject().withMessage('Templates must be a valid object')
  ],
  async (req, res) => {
    try {
      const { tenantId } = req.tenant;
      const userId = req.user?.id;
      const { templates } = req.body;

      await whiteLabelingService.updateEmailTemplates(tenantId, templates, userId);

      res.json({
        success: true,
        message: 'Email templates updated successfully'
      });
    } catch (error) {
      console.error('Error updating email templates:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_EMAIL_TEMPLATES_ERROR',
          message: 'Failed to update email templates'
        }
      });
    }
  }
);

// Update dashboard widgets
router.put('/dashboard-widgets',
  rbac.requireRole(['admin']),
  [
    body('widgetConfig').isObject().withMessage('Widget configuration must be a valid object')
  ],
  async (req, res) => {
    try {
      const { tenantId } = req.tenant;
      const userId = req.user?.id;
      const { widgetConfig } = req.body;

      await whiteLabelingService.updateDashboardWidgets(tenantId, widgetConfig, userId);

      res.json({
        success: true,
        message: 'Dashboard widgets updated successfully'
      });
    } catch (error) {
      console.error('Error updating dashboard widgets:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_DASHBOARD_WIDGETS_ERROR',
          message: 'Failed to update dashboard widgets'
        }
      });
    }
  }
);

// Update navigation menu
router.put('/navigation-menu',
  rbac.requireRole(['admin']),
  [
    body('menuConfig').isObject().withMessage('Menu configuration must be a valid object')
  ],
  async (req, res) => {
    try {
      const { tenantId } = req.tenant;
      const userId = req.user?.id;
      const { menuConfig } = req.body;

      await whiteLabelingService.updateNavigationMenu(tenantId, menuConfig, userId);

      res.json({
        success: true,
        message: 'Navigation menu updated successfully'
      });
    } catch (error) {
      console.error('Error updating navigation menu:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_NAVIGATION_MENU_ERROR',
          message: 'Failed to update navigation menu'
        }
      });
    }
  }
);

// Update support contact
router.put('/support-contact',
  rbac.requireRole(['admin']),
  [
    body('supportConfig').isObject().withMessage('Support configuration must be a valid object')
  ],
  async (req, res) => {
    try {
      const { tenantId } = req.tenant;
      const userId = req.user?.id;
      const { supportConfig } = req.body;

      await whiteLabelingService.updateSupportContact(tenantId, supportConfig, userId);

      res.json({
        success: true,
        message: 'Support contact updated successfully'
      });
    } catch (error) {
      console.error('Error updating support contact:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_SUPPORT_CONTACT_ERROR',
          message: 'Failed to update support contact'
        }
      });
    }
  }
);

// Update social media
router.put('/social-media',
  rbac.requireRole(['admin']),
  [
    body('socialMediaConfig').isObject().withMessage('Social media configuration must be a valid object')
  ],
  async (req, res) => {
    try {
      const { tenantId } = req.tenant;
      const userId = req.user?.id;
      const { socialMediaConfig } = req.body;

      await whiteLabelingService.updateSocialMedia(tenantId, socialMediaConfig, userId);

      res.json({
        success: true,
        message: 'Social media configuration updated successfully'
      });
    } catch (error) {
      console.error('Error updating social media:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_SOCIAL_MEDIA_ERROR',
          message: 'Failed to update social media configuration'
        }
      });
    }
  }
);

// Update analytics configuration
router.put('/analytics-config',
  rbac.requireRole(['admin']),
  [
    body('analyticsConfig').isObject().withMessage('Analytics configuration must be a valid object')
  ],
  async (req, res) => {
    try {
      const { tenantId } = req.tenant;
      const userId = req.user?.id;
      const { analyticsConfig } = req.body;

      await whiteLabelingService.updateAnalytics(tenantId, analyticsConfig, userId);

      res.json({
        success: true,
        message: 'Analytics configuration updated successfully'
      });
    } catch (error) {
      console.error('Error updating analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ANALYTICS_ERROR',
          message: 'Failed to update analytics configuration'
        }
      });
    }
  }
);

// Update legal documents
router.put('/legal-documents',
  rbac.requireRole(['admin']),
  [
    body('legalDocs').isObject().withMessage('Legal documents must be a valid object'),
    body('legalDocs.terms_of_service').optional().isString().withMessage('Terms of service must be a string'),
    body('legalDocs.privacy_policy').optional().isString().withMessage('Privacy policy must be a string')
  ],
  async (req, res) => {
    try {
      const { tenantId } = req.tenant;
      const userId = req.user?.id;
      const { legalDocs } = req.body;

      await whiteLabelingService.updateLegalDocuments(tenantId, legalDocs, userId);

      res.json({
        success: true,
        message: 'Legal documents updated successfully'
      });
    } catch (error) {
      console.error('Error updating legal documents:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_LEGAL_DOCUMENTS_ERROR',
          message: 'Failed to update legal documents'
        }
      });
    }
  }
);

module.exports = router;