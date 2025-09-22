/**
 * White-Labeling Controller
 * Handles white-labeling related API endpoints
 */

const whiteLabelingService = require('../../services/whiteLabelingService');
const { validationResult } = require('express-validator');

class WhiteLabelingController {
  /**
   * Get tenant branding configuration
   */
  async getBranding(req, res) {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.id;

      const branding = await whiteLabelingService.getTenantBranding(tenantId, userId);

      res.json({
        success: true,
        data: branding
      });
    } catch (error) {
      console.error('Error getting branding:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_BRANDING_ERROR',
          message: 'Failed to get branding configuration'
        }
      });
    }
  }

  /**
   * Update tenant branding configuration
   */
  async updateBranding(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { tenantId } = req.params;
      const brandingData = req.body;
      const userId = req.user?.id;

      await whiteLabelingService.updateTenantBranding(tenantId, brandingData, userId);

      res.json({
        success: true,
        message: 'Branding configuration updated successfully'
      });
    } catch (error) {
      console.error('Error updating branding:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_BRANDING_ERROR',
          message: 'Failed to update branding configuration'
        }
      });
    }
  }

  /**
   * Generate CSS for tenant branding
   */
  async generateCSS(req, res) {
    try {
      const { tenantId } = req.params;

      const css = await whiteLabelingService.generateTenantCSS(tenantId);

      res.set('Content-Type', 'text/css');
      res.send(css);
    } catch (error) {
      console.error('Error generating CSS:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GENERATE_CSS_ERROR',
          message: 'Failed to generate CSS'
        }
      });
    }
  }

  /**
   * Get branding preview
   */
  async getPreview(req, res) {
    try {
      const { tenantId } = req.params;

      const preview = await whiteLabelingService.getBrandingPreview(tenantId);

      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      console.error('Error getting preview:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PREVIEW_ERROR',
          message: 'Failed to get branding preview'
        }
      });
    }
  }

  /**
   * Reset branding to defaults
   */
  async resetToDefaults(req, res) {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.id;

      await whiteLabelingService.resetToDefaults(tenantId, userId);

      res.json({
        success: true,
        message: 'Branding reset to defaults successfully'
      });
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RESET_DEFAULTS_ERROR',
          message: 'Failed to reset branding to defaults'
        }
      });
    }
  }

  /**
   * Export branding configuration
   */
  async exportConfig(req, res) {
    try {
      const { tenantId } = req.params;

      const config = await whiteLabelingService.exportBrandingConfig(tenantId);

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error exporting config:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_CONFIG_ERROR',
          message: 'Failed to export branding configuration'
        }
      });
    }
  }

  /**
   * Import branding configuration
   */
  async importConfig(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { tenantId } = req.params;
      const { config, overwriteExisting = false } = req.body;
      const userId = req.user?.id;

      await whiteLabelingService.importBrandingConfig(tenantId, config, overwriteExisting, userId);

      res.json({
        success: true,
        message: 'Branding configuration imported successfully'
      });
    } catch (error) {
      console.error('Error importing config:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'IMPORT_CONFIG_ERROR',
          message: 'Failed to import branding configuration'
        }
      });
    }
  }
}

module.exports = new WhiteLabelingController();