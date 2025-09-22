/**
 * White-Labeling Controller
 * Handles tenant branding, customization, and white-label features
 */

const whiteLabelingService = require('../../services/whiteLabelingService');
const fileUploadService = require('../../services/fileUploadService');
const domainValidationService = require('../../services/domainValidationService');
const { validationResult } = require('express-validator');

/**
 * Get tenant branding configuration
 */
const getBranding = async (req, res) => {
    try {
        const { tenantId } = req.tenant;
        const userId = req.user.id;

        const branding = await whiteLabelingService.getTenantBranding(tenantId, userId);
        
        res.json({
            success: true,
            data: branding
        });
    } catch (error) {
        console.error('Error getting branding:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get branding configuration',
            error: error.message
        });
    }
};

/**
 * Update tenant branding configuration
 */
const updateBranding = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const userId = req.user.id;
        const brandingData = req.body;

        const updated = await whiteLabelingService.updateTenantBranding(
            tenantId, 
            brandingData, 
            userId
        );

        if (updated) {
            res.json({
                success: true,
                message: 'Branding configuration updated successfully',
                data: { updated: true }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to update branding configuration'
            });
        }
    } catch (error) {
        console.error('Error updating branding:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update branding configuration',
            error: error.message
        });
    }
};

/**
 * Get generated CSS for tenant branding
 */
const getGeneratedCSS = async (req, res) => {
    try {
        const { tenantId } = req.params;

        const css = await whiteLabelingService.generateTenantCSS(tenantId);
        
        res.set('Content-Type', 'text/css');
        res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.send(css);
    } catch (error) {
        console.error('Error generating CSS:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate CSS',
            error: error.message
        });
    }
};

/**
 * Upload branding asset
 */
const uploadAsset = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const userId = req.user.id;
        const { asset_type, file_data } = req.body;

        const uploadResult = await fileUploadService.uploadBrandingAsset(
            tenantId,
            asset_type,
            file_data,
            userId
        );

        res.json({
            success: true,
            message: 'Asset uploaded successfully',
            data: uploadResult
        });
    } catch (error) {
        console.error('Error uploading asset:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload asset',
            error: error.message
        });
    }
};

/**
 * Validate custom domain availability
 */
const validateDomain = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const { domain } = req.body;

        const validation = await domainValidationService.validateDomain(tenantId, domain);

        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        console.error('Error validating domain:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate domain',
            error: error.message
        });
    }
};

/**
 * Setup custom domain for tenant
 */
const setupCustomDomain = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const userId = req.user.id;
        const { domain, verification_code } = req.body;

        const setupResult = await domainValidationService.setupCustomDomain(
            tenantId,
            domain,
            verification_code,
            userId
        );

        res.json({
            success: true,
            message: 'Custom domain setup initiated',
            data: setupResult
        });
    } catch (error) {
        console.error('Error setting up custom domain:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to setup custom domain',
            error: error.message
        });
    }
};

/**
 * Get custom domain status and SSL certificate info
 */
const getDomainStatus = async (req, res) => {
    try {
        const { domain } = req.params;

        const status = await domainValidationService.getDomainStatus(domain);

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting domain status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get domain status',
            error: error.message
        });
    }
};

/**
 * Update custom email templates
 */
const updateEmailTemplates = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const userId = req.user.id;
        const { templates } = req.body;

        const updated = await whiteLabelingService.updateEmailTemplates(
            tenantId,
            templates,
            userId
        );

        res.json({
            success: true,
            message: 'Email templates updated successfully',
            data: { updated }
        });
    } catch (error) {
        console.error('Error updating email templates:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update email templates',
            error: error.message
        });
    }
};

/**
 * Update dashboard widget configuration
 */
const updateDashboardWidgets = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const userId = req.user.id;
        const widgetConfig = req.body;

        const updated = await whiteLabelingService.updateDashboardWidgets(
            tenantId,
            widgetConfig,
            userId
        );

        res.json({
            success: true,
            message: 'Dashboard widgets updated successfully',
            data: { updated }
        });
    } catch (error) {
        console.error('Error updating dashboard widgets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update dashboard widgets',
            error: error.message
        });
    }
};

/**
 * Update navigation menu configuration
 */
const updateNavigationMenu = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const userId = req.user.id;
        const menuConfig = req.body;

        const updated = await whiteLabelingService.updateNavigationMenu(
            tenantId,
            menuConfig,
            userId
        );

        res.json({
            success: true,
            message: 'Navigation menu updated successfully',
            data: { updated }
        });
    } catch (error) {
        console.error('Error updating navigation menu:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update navigation menu',
            error: error.message
        });
    }
};

/**
 * Update support contact information
 */
const updateSupportContact = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const userId = req.user.id;
        const supportConfig = req.body;

        const updated = await whiteLabelingService.updateSupportContact(
            tenantId,
            supportConfig,
            userId
        );

        res.json({
            success: true,
            message: 'Support contact updated successfully',
            data: { updated }
        });
    } catch (error) {
        console.error('Error updating support contact:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update support contact',
            error: error.message
        });
    }
};

/**
 * Update social media links
 */
const updateSocialMedia = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const userId = req.user.id;
        const socialMediaConfig = req.body;

        const updated = await whiteLabelingService.updateSocialMedia(
            tenantId,
            socialMediaConfig,
            userId
        );

        res.json({
            success: true,
            message: 'Social media links updated successfully',
            data: { updated }
        });
    } catch (error) {
        console.error('Error updating social media:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update social media links',
            error: error.message
        });
    }
};

/**
 * Update analytics configuration
 */
const updateAnalytics = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const userId = req.user.id;
        const analyticsConfig = req.body;

        const updated = await whiteLabelingService.updateAnalytics(
            tenantId,
            analyticsConfig,
            userId
        );

        res.json({
            success: true,
            message: 'Analytics configuration updated successfully',
            data: { updated }
        });
    } catch (error) {
        console.error('Error updating analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update analytics configuration',
            error: error.message
        });
    }
};

/**
 * Update legal documents
 */
const updateLegalDocuments = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const userId = req.user.id;
        const { terms_of_service, privacy_policy } = req.body;

        const updated = await whiteLabelingService.updateLegalDocuments(
            tenantId,
            { terms_of_service, privacy_policy },
            userId
        );

        res.json({
            success: true,
            message: 'Legal documents updated successfully',
            data: { updated }
        });
    } catch (error) {
        console.error('Error updating legal documents:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update legal documents',
            error: error.message
        });
    }
};

/**
 * Get branding preview for tenant
 */
const getBrandingPreview = async (req, res) => {
    try {
        const { tenantId } = req.params;

        const preview = await whiteLabelingService.getBrandingPreview(tenantId);

        res.json({
            success: true,
            data: preview
        });
    } catch (error) {
        console.error('Error getting branding preview:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get branding preview',
            error: error.message
        });
    }
};

/**
 * Reset tenant branding to default values
 */
const resetToDefaults = async (req, res) => {
    try {
        const { tenantId } = req.tenant;
        const userId = req.user.id;

        const reset = await whiteLabelingService.resetToDefaults(tenantId, userId);

        res.json({
            success: true,
            message: 'Branding reset to defaults successfully',
            data: { reset }
        });
    } catch (error) {
        console.error('Error resetting branding:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset branding to defaults',
            error: error.message
        });
    }
};

/**
 * Export tenant branding configuration
 */
const exportConfig = async (req, res) => {
    try {
        const { tenantId } = req.tenant;

        const config = await whiteLabelingService.exportBrandingConfig(tenantId);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="branding-config-${tenantId}.json"`);
        res.json(config);
    } catch (error) {
        console.error('Error exporting config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export branding configuration',
            error: error.message
        });
    }
};

/**
 * Import tenant branding configuration
 */
const importConfig = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { tenantId } = req.tenant;
        const userId = req.user.id;
        const { config, overwrite_existing = false } = req.body;

        const imported = await whiteLabelingService.importBrandingConfig(
            tenantId,
            config,
            overwrite_existing,
            userId
        );

        res.json({
            success: true,
            message: 'Branding configuration imported successfully',
            data: { imported }
        });
    } catch (error) {
        console.error('Error importing config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to import branding configuration',
            error: error.message
        });
    }
};

module.exports = {
    getBranding,
    updateBranding,
    getGeneratedCSS,
    uploadAsset,
    validateDomain,
    setupCustomDomain,
    getDomainStatus,
    updateEmailTemplates,
    updateDashboardWidgets,
    updateNavigationMenu,
    updateSupportContact,
    updateSocialMedia,
    updateAnalytics,
    updateLegalDocuments,
    getBrandingPreview,
    resetToDefaults,
    exportConfig,
    importConfig
};
