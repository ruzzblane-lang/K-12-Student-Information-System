/**
 * White-Labeling Controller
 * 
 * Enhanced controller with complete white-labeling functionality including:
 * - Asset upload and management
 * - Theme template management
 * - Custom domain setup
 * - Real-time preview
 * - Configuration import/export
 */

const WhiteLabelingService = require('../../services/whiteLabelingService');
const multer = require('multer');
const path = require('path');
const { validationResult } = require('express-validator');

class WhiteLabelingController {
  constructor(db) {
    this.db = db;
    this.whiteLabelingService = new WhiteLabelingService(db);
    
    // Configure multer for file uploads
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/svg+xml',
          'image/webp',
          'image/x-icon',
          'image/vnd.microsoft.icon'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only images are allowed.'), false);
        }
      }
    });
  }

  /**
   * Get tenant branding configuration
   */
  async getBranding(req, res) {
    try {
      const { tenantId } = req.tenant;
      const userId = req.user?.id;

      const branding = await this.whiteLabelingService.getTenantBranding(tenantId, userId);

      res.json({
        success: true,
        data: branding,
        meta: {
          tenant: { id: tenantId },
          generated_at: new Date().toISOString()
        }
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

      const { tenantId } = req.tenant;
      const brandingData = req.body;
      const userId = req.user?.id;

      await this.whiteLabelingService.updateTenantBranding(tenantId, brandingData, userId);

      res.json({
        success: true,
        message: 'Branding configuration updated successfully',
        meta: {
          tenant: { id: tenantId },
          updated_at: new Date().toISOString()
        }
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
      const { tenantId } = req.tenant;

      const css = await this.whiteLabelingService.generateTenantCSS(tenantId);

      res.set({
        'Content-Type': 'text/css',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'ETag': `"${tenantId}-${Date.now()}"`
      });
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
   * Upload branding asset
   */
  async uploadAsset(req, res) {
    try {
      const { tenantId } = req.tenant;
      const userId = req.user?.id;
      const { asset_type } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'No file uploaded'
          }
        });
      }

      if (!asset_type) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ASSET_TYPE_REQUIRED',
            message: 'Asset type is required'
          }
        });
      }

      const result = await this.whiteLabelingService.uploadAsset(
        tenantId,
        asset_type,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.json({
        success: true,
        data: result,
        message: 'Asset uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading asset:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_ASSET_ERROR',
          message: error.message || 'Failed to upload asset'
        }
      });
    }
  }

  /**
   * Get available theme templates
   */
  async getThemeTemplates(req, res) {
    try {
      const templates = await this.whiteLabelingService.getThemeTemplates();

      res.json({
        success: true,
        data: {
          templates,
          total: templates.length
        }
      });
    } catch (error) {
      console.error('Error getting theme templates:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_THEMES_ERROR',
          message: 'Failed to get theme templates'
        }
      });
    }
  }

  /**
   * Apply theme template
   */
  async applyThemeTemplate(req, res) {
    try {
      const { tenantId } = req.tenant;
      const userId = req.user?.id;
      const { template_id } = req.body;

      if (!template_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TEMPLATE_ID_REQUIRED',
            message: 'Template ID is required'
          }
        });
      }

      const result = await this.whiteLabelingService.applyThemeTemplate(tenantId, template_id, userId);

      res.json({
        success: true,
        data: result,
        message: 'Theme template applied successfully'
      });
    } catch (error) {
      console.error('Error applying theme template:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'APPLY_THEME_ERROR',
          message: error.message || 'Failed to apply theme template'
        }
      });
    }
  }

  /**
   * Get branding preview
   */
  async getPreview(req, res) {
    try {
      const { tenantId } = req.tenant;

      const preview = await this.whiteLabelingService.getBrandingPreview(tenantId);

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
      const { tenantId } = req.tenant;
      const userId = req.user?.id;

      await this.whiteLabelingService.resetToDefaults(tenantId, userId);

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
      const { tenantId } = req.tenant;

      const config = await this.whiteLabelingService.exportBrandingConfig(tenantId);

      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="branding-config-${tenantId}.json"`
      });
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

      const { tenantId } = req.tenant;
      const { config, overwriteExisting = false } = req.body;
      const userId = req.user?.id;

      const result = await this.whiteLabelingService.importBrandingConfig(
        tenantId, config, overwriteExisting, userId
      );

      res.json({
        success: true,
        data: result,
        message: 'Branding configuration imported successfully'
      });
    } catch (error) {
      console.error('Error importing config:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'IMPORT_CONFIG_ERROR',
          message: error.message || 'Failed to import branding configuration'
        }
      });
    }
  }

  /**
   * Validate custom domain
   */
  async validateDomain(req, res) {
    try {
      const { tenantId } = req.tenant;
      const { domain } = req.body;

      if (!domain) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DOMAIN_REQUIRED',
            message: 'Domain is required'
          }
        });
      }

      // Generate verification code
      const verificationCode = this.generateVerificationCode();

      // Store verification code (in real implementation, store in database)
      await this.storeVerificationCode(tenantId, domain, verificationCode);

      res.json({
        success: true,
        data: {
          domain,
          verification_code: verificationCode,
          instructions: [
            `Add a TXT record to your DNS: _sis-verify.${domain} = ${verificationCode}`,
            'Or add this meta tag to your website: <meta name="sis-verification" content="' + verificationCode + '">',
            'DNS changes may take up to 24 hours to propagate'
          ]
        }
      });
    } catch (error) {
      console.error('Error validating domain:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATE_DOMAIN_ERROR',
          message: 'Failed to validate domain'
        }
      });
    }
  }

  /**
   * Setup custom domain
   */
  async setupCustomDomain(req, res) {
    try {
      const { tenantId } = req.tenant;
      const { domain, verification_code } = req.body;
      const userId = req.user?.id;

      if (!domain || !verification_code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DOMAIN_AND_CODE_REQUIRED',
            message: 'Domain and verification code are required'
          }
        });
      }

      // Verify domain ownership (in real implementation, check DNS or meta tag)
      const isValid = await this.verifyDomainOwnership(domain, verification_code);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DOMAIN_VERIFICATION_FAILED',
            message: 'Domain verification failed. Please check your DNS records or meta tag.'
          }
        });
      }

      // Update tenant with custom domain
      const brandingData = {
        white_label_config: {
          custom_domain_verified: true,
          ssl_certificate_status: 'pending'
        }
      };

      await this.whiteLabelingService.updateTenantBranding(tenantId, brandingData, userId);

      res.json({
        success: true,
        data: {
          domain,
          verified: true,
          ssl_status: 'pending',
          next_steps: [
            'SSL certificate will be automatically generated',
            'Domain will be ready for use within 24 hours',
            'You will receive an email when setup is complete'
          ]
        },
        message: 'Custom domain setup completed successfully'
      });
    } catch (error) {
      console.error('Error setting up custom domain:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SETUP_DOMAIN_ERROR',
          message: 'Failed to setup custom domain'
        }
      });
    }
  }

  /**
   * Get custom domain status
   */
  async getDomainStatus(req, res) {
    try {
      const { tenantId } = req.tenant;

      const branding = await this.whiteLabelingService.getTenantBranding(tenantId);

      res.json({
        success: true,
        data: {
          domain: branding.domain,
          custom_domain_verified: branding.white_label_config.custom_domain_verified,
          ssl_certificate_status: branding.white_label_config.ssl_certificate_status,
          ssl_certificate_expires_at: branding.white_label_config.ssl_certificate_expires_at
        }
      });
    } catch (error) {
      console.error('Error getting domain status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_DOMAIN_STATUS_ERROR',
          message: 'Failed to get domain status'
        }
      });
    }
  }

  /**
   * Get branding audit log
   */
  async getAuditLog(req, res) {
    try {
      const { tenantId } = req.tenant;
      const { limit = 50, offset = 0 } = req.query;

      const query = `
        SELECT 
          bal.id,
          bal.action,
          bal.data,
          bal.created_at,
          u.email as user_email,
          u.first_name,
          u.last_name
        FROM branding_audit_log bal
        LEFT JOIN users u ON bal.user_id = u.id
        WHERE bal.tenant_id = $1
        ORDER BY bal.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.db.query(query, [tenantId, parseInt(limit), parseInt(offset)]);

      res.json({
        success: true,
        data: {
          audit_log: result.rows,
          total: result.rows.length
        }
      });
    } catch (error) {
      console.error('Error getting audit log:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_AUDIT_LOG_ERROR',
          message: 'Failed to get audit log'
        }
      });
    }
  }

  // Helper methods

  /**
   * Generate verification code for domain validation
   */
  generateVerificationCode() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Store verification code (mock implementation)
   */
  async storeVerificationCode(tenantId, domain, verificationCode) {
    // In real implementation, store in database with expiry
    console.log(`Storing verification code for tenant ${tenantId}, domain ${domain}: ${verificationCode}`);
  }

  /**
   * Verify domain ownership (mock implementation)
   */
  async verifyDomainOwnership(domain, verificationCode) {
    // In real implementation, check DNS TXT record or meta tag
    // For demo purposes, accept any code that's 32 characters long
    return verificationCode && verificationCode.length === 32;
  }

  /**
   * Get multer upload middleware
   */
  getUploadMiddleware() {
    return this.upload.single('asset');
  }
}

module.exports = WhiteLabelingController;