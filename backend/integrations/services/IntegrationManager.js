/**
 * Integration Manager Service
 * 
 * Central service for managing all third-party API integrations.
 * Provides unified interface for integration lifecycle management,
 * configuration, and execution.
 */

const EventEmitter = require('events');
const winston = require('winston');
const { INTEGRATION_CATEGORIES, INTEGRATION_PROVIDERS } = require('../index');

class IntegrationManager extends EventEmitter {
  constructor() {
    super();
    this.integrations = new Map();
    this.configurations = new Map();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'integration-manager' },
      transports: [
        new winston.transports.File({ filename: 'logs/integrations.log' }),
        new winston.transports.Console()
      ]
    });
  }

  /**
   * Register a new integration
   * @param {string} provider - Integration provider identifier
   * @param {Object} integration - Integration instance
   * @param {Object} config - Integration configuration
   */
  registerIntegration(provider, integration, config) {
    try {
      this.validateIntegration(integration);
      
      this.integrations.set(provider, {
        instance: integration,
        config: config,
        status: 'registered',
        lastHealthCheck: new Date(),
        metrics: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          averageResponseTime: 0
        }
      });

      this.logger.info(`Integration registered: ${provider}`, {
        provider,
        category: config.category,
        version: config.version
      });

      this.emit('integration:registered', { provider, config });
    } catch (error) {
      this.logger.error(`Failed to register integration: ${provider}`, {
        provider,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get integration instance for a specific provider
   * @param {string} provider - Integration provider identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {Object} Integration instance
   */
  getIntegration(provider, tenantId) {
    const integration = this.integrations.get(provider);
    if (!integration) {
      throw new Error(`Integration not found: ${provider}`);
    }

    // Check if integration is enabled for tenant
    if (!this.isEnabledForTenant(provider, tenantId)) {
      throw new Error(`Integration ${provider} is not enabled for tenant ${tenantId}`);
    }

    return integration.instance;
  }

  /**
   * Execute integration method with tenant context
   * @param {string} provider - Integration provider identifier
   * @param {string} method - Method name to execute
   * @param {string} tenantId - Tenant identifier
   * @param {Array} args - Method arguments
   * @returns {Promise} Method execution result
   */
  async executeIntegration(provider, method, tenantId, ...args) {
    const startTime = Date.now();
    const integration = this.integrations.get(provider);
    
    if (!integration) {
      throw new Error(`Integration not found: ${provider}`);
    }

    try {
      // Validate tenant access
      await this.validateTenantAccess(provider, tenantId);
      
      // Get tenant-specific configuration
      const tenantConfig = await this.getTenantConfig(provider, tenantId);
      
      // Execute method with tenant context
      const result = await integration.instance[method](tenantConfig, ...args);
      
      // Update metrics
      this.updateMetrics(provider, Date.now() - startTime, true);
      
      this.logger.info(`Integration method executed successfully`, {
        provider,
        method,
        tenantId,
        executionTime: Date.now() - startTime
      });

      return result;
    } catch (error) {
      this.updateMetrics(provider, Date.now() - startTime, false);
      
      this.logger.error(`Integration method execution failed`, {
        provider,
        method,
        tenantId,
        error: error.message,
        executionTime: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Check if integration is enabled for tenant
   * @param {string} provider - Integration provider identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {boolean} Whether integration is enabled
   */
  isEnabledForTenant(provider, tenantId) {
    const config = this.configurations.get(`${provider}:${tenantId}`);
    return config && config.enabled === true;
  }

  /**
   * Enable/disable integration for tenant
   * @param {string} provider - Integration provider identifier
   * @param {string} tenantId - Tenant identifier
   * @param {boolean} enabled - Whether to enable the integration
   * @param {Object} config - Tenant-specific configuration
   */
  async setTenantConfig(provider, tenantId, enabled, config = {}) {
    const configKey = `${provider}:${tenantId}`;
    
    this.configurations.set(configKey, {
      enabled,
      config,
      updatedAt: new Date(),
      updatedBy: config.updatedBy || 'system'
    });

    this.logger.info(`Tenant configuration updated`, {
      provider,
      tenantId,
      enabled,
      configKeys: Object.keys(config)
    });

    this.emit('tenant:config:updated', { provider, tenantId, enabled, config });
  }

  /**
   * Get tenant-specific configuration
   * @param {string} provider - Integration provider identifier
   * @param {string} tenantId - Tenant identifier
   * @returns {Object} Tenant configuration
   */
  async getTenantConfig(provider, tenantId) {
    const configKey = `${provider}:${tenantId}`;
    const tenantConfig = this.configurations.get(configKey);
    
    if (!tenantConfig) {
      throw new Error(`No configuration found for ${provider} and tenant ${tenantId}`);
    }

    return tenantConfig.config;
  }

  /**
   * Get all integrations for a tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Array} List of available integrations
   */
  getTenantIntegrations(tenantId) {
    const tenantIntegrations = [];
    
    for (const [provider, integration] of this.integrations) {
      const configKey = `${provider}:${tenantId}`;
      const tenantConfig = this.configurations.get(configKey);
      
      tenantIntegrations.push({
        provider,
        category: integration.config.category,
        enabled: tenantConfig ? tenantConfig.enabled : false,
        status: integration.status,
        lastHealthCheck: integration.lastHealthCheck,
        metrics: integration.metrics
      });
    }

    return tenantIntegrations;
  }

  /**
   * Perform health check on all integrations
   * @returns {Promise<Object>} Health check results
   */
  async performHealthCheck() {
    const results = {};
    
    for (const [provider, integration] of this.integrations) {
      try {
        if (integration.instance.healthCheck) {
          const health = await integration.instance.healthCheck();
          results[provider] = {
            status: 'healthy',
            details: health
          };
        } else {
          results[provider] = {
            status: 'unknown',
            details: 'No health check method available'
          };
        }
        
        integration.lastHealthCheck = new Date();
      } catch (error) {
        results[provider] = {
          status: 'unhealthy',
          details: error.message
        };
      }
    }

    this.logger.info('Health check completed', { results });
    return results;
  }

  /**
   * Validate integration instance
   * @param {Object} integration - Integration instance
   * @private
   */
  validateIntegration(integration) {
    if (!integration || typeof integration !== 'object') {
      throw new Error('Integration must be an object');
    }

    const requiredMethods = ['initialize', 'authenticate'];
    for (const method of requiredMethods) {
      if (typeof integration[method] !== 'function') {
        throw new Error(`Integration must implement ${method} method`);
      }
    }
  }

  /**
   * Validate tenant access to integration
   * @param {string} provider - Integration provider identifier
   * @param {string} tenantId - Tenant identifier
   * @private
   */
  async validateTenantAccess(provider, tenantId) {
    // Implementation would check tenant permissions, subscription status, etc.
    // For now, just check if configuration exists
    if (!this.isEnabledForTenant(provider, tenantId)) {
      throw new Error(`Access denied: Integration ${provider} not enabled for tenant ${tenantId}`);
    }
  }

  /**
   * Update integration metrics
   * @param {string} provider - Integration provider identifier
   * @param {number} responseTime - Response time in milliseconds
   * @param {boolean} success - Whether the call was successful
   * @private
   */
  updateMetrics(provider, responseTime, success) {
    const integration = this.integrations.get(provider);
    if (!integration) return;

    const metrics = integration.metrics;
    metrics.totalCalls++;
    
    if (success) {
      metrics.successfulCalls++;
    } else {
      metrics.failedCalls++;
    }

    // Update average response time
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * (metrics.totalCalls - 1) + responseTime) / metrics.totalCalls;
  }
}

module.exports = IntegrationManager;
