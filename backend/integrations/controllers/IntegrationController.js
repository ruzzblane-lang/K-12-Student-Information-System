/**
 * Integration Controller
 * 
 * Handles HTTP requests for third-party API integrations.
 * Provides endpoints for managing integrations, configurations,
 * and executing integration methods.
 */

const { IntegrationManager, TenantConfigService, SecurityService, AuditService } = require('../services');
const { INTEGRATION_PROVIDERS, INTEGRATION_CATEGORIES } = require('../index');

class IntegrationController {
  constructor() {
    this.integrationManager = new IntegrationManager();
    this.tenantConfigService = new TenantConfigService();
    this.securityService = new SecurityService();
    this.auditService = new AuditService();
  }

  /**
   * Get all available integrations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAvailableIntegrations(req, res) {
    try {
      const { tenantId } = req.params;
      const { category, enabled } = req.query;

      let integrations = this.integrationManager.getTenantIntegrations(tenantId);

      // Filter by category if specified
      if (category) {
        integrations = integrations.filter(integration => 
          integration.category === category
        );
      }

      // Filter by enabled status if specified
      if (enabled !== undefined) {
        const isEnabled = enabled === 'true';
        integrations = integrations.filter(integration => 
          integration.enabled === isEnabled
        );
      }

      res.json({
        success: true,
        integrations,
        count: integrations.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get integration configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getIntegrationConfig(req, res) {
    try {
      const { tenantId, provider } = req.params;

      const config = await this.tenantConfigService.getTenantConfig(tenantId, provider);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Integration configuration not found'
        });
      }

      res.json({
        success: true,
        config
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Set integration configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setIntegrationConfig(req, res) {
    try {
      const { tenantId, provider } = req.params;
      const { enabled, config, updatedBy } = req.body;

      // Validate credentials if provided
      if (config.credentials) {
        const isValid = await this.securityService.validateCredentials(provider, config.credentials);
        if (!isValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid credentials provided'
          });
        }
      }

      // Encrypt sensitive data
      if (config.credentials) {
        config.credentials = this.securityService.encryptData(
          JSON.stringify(config.credentials),
          tenantId
        );
      }

      const updatedConfig = await this.tenantConfigService.setTenantConfig(
        tenantId,
        provider,
        config,
        enabled,
        updatedBy || req.user?.id || 'system'
      );

      // Log configuration change
      await this.auditService.logConfigurationChange({
        tenantId,
        userId: req.user?.id,
        provider,
        changeType: 'updated',
        oldValue: null, // Could fetch previous config if needed
        newValue: config,
        reason: 'Configuration updated via API'
      });

      res.json({
        success: true,
        config: updatedConfig
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Execute integration method
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async executeIntegration(req, res) {
    try {
      const { tenantId, provider, method } = req.params;
      const args = req.body.args || [];

      // Check rate limit
      const rateLimitOk = await this.securityService.checkRateLimit(
        tenantId,
        provider,
        method
      );

      if (!rateLimitOk) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded'
        });
      }

      // Execute integration method
      const result = await this.integrationManager.executeIntegration(
        provider,
        method,
        tenantId,
        ...args
      );

      // Log activity
      await this.auditService.logActivity({
        tenantId,
        userId: req.user?.id,
        provider,
        action: method,
        resource: `${provider}:${method}`,
        success: true,
        metadata: { args },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        result
      });
    } catch (error) {
      // Log failed activity
      await this.auditService.logActivity({
        tenantId: req.params.tenantId,
        userId: req.user?.id,
        provider: req.params.provider,
        action: req.params.method,
        resource: `${req.params.provider}:${req.params.method}`,
        success: false,
        metadata: { error: error.message },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get integration health status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getIntegrationHealth(req, res) {
    try {
      const { tenantId, provider } = req.params;

      const health = await this.integrationManager.performHealthCheck();
      const providerHealth = health[provider];

      if (!providerHealth) {
        return res.status(404).json({
          success: false,
          error: 'Integration not found'
        });
      }

      res.json({
        success: true,
        provider,
        health: providerHealth
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get all integration health statuses
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllIntegrationHealth(req, res) {
    try {
      const health = await this.integrationManager.performHealthCheck();

      res.json({
        success: true,
        health
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get integration usage statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUsageStats(req, res) {
    try {
      const { tenantId } = req.params;
      const { provider, startDate, endDate } = req.query;

      const stats = await this.tenantConfigService.getUsageStats(
        tenantId,
        provider,
        { startDate, endDate }
      );

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get audit trail
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAuditTrail(req, res) {
    try {
      const { tenantId } = req.params;
      const {
        provider,
        userId,
        action,
        startDate,
        endDate,
        limit = 100,
        offset = 0
      } = req.query;

      const auditTrail = await this.auditService.getAuditTrail(tenantId, {
        provider,
        userId,
        action,
        startDate,
        endDate,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        auditTrail,
        count: auditTrail.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get compliance report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getComplianceReport(req, res) {
    try {
      const { tenantId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
      }

      const report = await this.auditService.getComplianceReport(
        tenantId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Set user permissions for integration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setUserPermissions(req, res) {
    try {
      const { tenantId, userId, provider } = req.params;
      const { permissions, updatedBy } = req.body;

      await this.tenantConfigService.setUserPermissions(
        tenantId,
        userId,
        provider,
        permissions,
        updatedBy || req.user?.id || 'system'
      );

      res.json({
        success: true,
        message: 'User permissions updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user permissions for integration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserPermissions(req, res) {
    try {
      const { tenantId, userId, provider } = req.params;

      const permissions = await this.tenantConfigService.getUserPermissions(
        tenantId,
        userId,
        provider
      );

      res.json({
        success: true,
        permissions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle webhook from third-party service
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleWebhook(req, res) {
    try {
      const { provider } = req.params;
      const { tenantId } = req.query;
      const signature = req.get('X-Signature') || req.get('X-Hub-Signature');
      const payload = req.body;

      // Validate webhook signature
      const isValidSignature = this.securityService.validateWebhookSignature(
        JSON.stringify(payload),
        signature,
        req.webhookSecret || 'default-secret',
        provider
      );

      if (!isValidSignature) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature'
        });
      }

      // Process webhook based on provider
      const result = await this.processWebhook(provider, tenantId, payload);

      res.json({
        success: true,
        result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Process webhook based on provider
   * @param {string} provider - Integration provider
   * @param {string} tenantId - Tenant identifier
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async processWebhook(provider, tenantId, payload) {
    // This would contain provider-specific webhook processing logic
    // For now, just log the webhook
    await this.auditService.logActivity({
      tenantId,
      userId: null,
      provider,
      action: 'webhook_received',
      resource: 'webhook',
      success: true,
      metadata: { payload },
      ipAddress: null,
      userAgent: null
    });

    return { processed: true, provider, tenantId };
  }
}

module.exports = IntegrationController;
