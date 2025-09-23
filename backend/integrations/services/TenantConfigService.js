/**
 * Tenant Configuration Service
 * 
 * Manages tenant-specific configurations for third-party integrations.
 * Provides database persistence and caching for integration settings.
 */

const winston = require('winston');
const { Pool } = require('pg');

class TenantConfigService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'tenant-config' },
      transports: [
        new winston.transports.File({ filename: 'logs/tenant-config.log' }),
        new winston.transports.Console()
      ]
    });

    // Initialize database connection
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get tenant integration configuration
   * @param {string} tenantId - Tenant identifier
   * @param {string} provider - Integration provider
   * @returns {Promise<Object>} Tenant configuration
   */
  async getTenantConfig(tenantId, provider) {
    const cacheKey = `${tenantId}:${provider}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.config;
      }
    }

    try {
      const query = `
        SELECT config_data, enabled, created_at, updated_at, updated_by
        FROM tenant_integration_configs
        WHERE tenant_id = $1 AND provider = $2
      `;
      
      const result = await this.pool.query(query, [tenantId, provider]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const config = {
        ...result.rows[0].config_data,
        enabled: result.rows[0].enabled,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        updatedBy: result.rows[0].updated_by
      };

      // Cache the result
      this.cache.set(cacheKey, {
        config,
        timestamp: Date.now()
      });

      return config;
    } catch (error) {
      this.logger.error('Failed to get tenant config', {
        tenantId,
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Set tenant integration configuration
   * @param {string} tenantId - Tenant identifier
   * @param {string} provider - Integration provider
   * @param {Object} config - Configuration data
   * @param {boolean} enabled - Whether integration is enabled
   * @param {string} updatedBy - User who updated the configuration
   * @returns {Promise<Object>} Updated configuration
   */
  async setTenantConfig(tenantId, provider, config, enabled = true, updatedBy = 'system') {
    try {
      const query = `
        INSERT INTO tenant_integration_configs (tenant_id, provider, config_data, enabled, updated_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenant_id, provider)
        DO UPDATE SET
          config_data = EXCLUDED.config_data,
          enabled = EXCLUDED.enabled,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = EXCLUDED.updated_by
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        tenantId,
        provider,
        JSON.stringify(config),
        enabled,
        updatedBy
      ]);

      const updatedConfig = {
        ...result.rows[0].config_data,
        enabled: result.rows[0].enabled,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        updatedBy: result.rows[0].updated_by
      };

      // Update cache
      const cacheKey = `${tenantId}:${provider}`;
      this.cache.set(cacheKey, {
        config: updatedConfig,
        timestamp: Date.now()
      });

      this.logger.info('Tenant config updated', {
        tenantId,
        provider,
        enabled,
        updatedBy
      });

      return updatedConfig;
    } catch (error) {
      this.logger.error('Failed to set tenant config', {
        tenantId,
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all enabled integrations for a tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Array>} List of enabled integrations
   */
  async getEnabledIntegrations(tenantId) {
    try {
      const query = `
        SELECT provider, config_data, enabled, updated_at
        FROM tenant_integration_configs
        WHERE tenant_id = $1 AND enabled = true
        ORDER BY updated_at DESC
      `;

      const result = await this.pool.query(query, [tenantId]);
      
      return result.rows.map(row => ({
        provider: row.provider,
        config: row.config_data,
        enabled: row.enabled,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      this.logger.error('Failed to get enabled integrations', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get integration usage statistics for a tenant
   * @param {string} tenantId - Tenant identifier
   * @param {string} provider - Integration provider (optional)
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats(tenantId, provider = null) {
    try {
      let query = `
        SELECT 
          provider,
          COUNT(*) as total_calls,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_calls,
          SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_calls,
          AVG(response_time) as avg_response_time,
          MAX(created_at) as last_used
        FROM integration_usage_logs
        WHERE tenant_id = $1
      `;
      
      const params = [tenantId];
      
      if (provider) {
        query += ' AND provider = $2';
        params.push(provider);
      }
      
      query += ' GROUP BY provider ORDER BY last_used DESC';

      const result = await this.pool.query(query, params);
      
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get usage stats', {
        tenantId,
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Log integration usage
   * @param {string} tenantId - Tenant identifier
   * @param {string} provider - Integration provider
   * @param {string} method - Method called
   * @param {boolean} success - Whether call was successful
   * @param {number} responseTime - Response time in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  async logUsage(tenantId, provider, method, success, responseTime, metadata = {}) {
    try {
      const query = `
        INSERT INTO integration_usage_logs 
        (tenant_id, provider, method, success, response_time, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;

      await this.pool.query(query, [
        tenantId,
        provider,
        method,
        success,
        responseTime,
        JSON.stringify(metadata)
      ]);
    } catch (error) {
      this.logger.error('Failed to log usage', {
        tenantId,
        provider,
        method,
        error: error.message
      });
      // Don't throw error for logging failures
    }
  }

  /**
   * Get tenant integration permissions
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @param {string} provider - Integration provider
   * @returns {Promise<Array>} User permissions for integration
   */
  async getUserPermissions(tenantId, userId, provider) {
    try {
      const query = `
        SELECT p.permission_name, p.allowed
        FROM integration_permissions p
        JOIN user_roles ur ON p.role_id = ur.role_id
        WHERE ur.tenant_id = $1 AND ur.user_id = $2 AND p.provider = $3
        UNION
        SELECT p.permission_name, p.allowed
        FROM integration_permissions p
        WHERE p.tenant_id = $1 AND p.user_id = $2 AND p.provider = $3
      `;

      const result = await this.pool.query(query, [tenantId, userId, provider]);
      
      return result.rows.map(row => ({
        permission: row.permission_name,
        allowed: row.allowed
      }));
    } catch (error) {
      this.logger.error('Failed to get user permissions', {
        tenantId,
        userId,
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Set user integration permissions
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @param {string} provider - Integration provider
   * @param {Array} permissions - Array of permission objects
   * @param {string} updatedBy - User who updated permissions
   */
  async setUserPermissions(tenantId, userId, provider, permissions, updatedBy = 'system') {
    try {
      // Start transaction
      await this.pool.query('BEGIN');

      // Delete existing permissions
      await this.pool.query(
        'DELETE FROM integration_permissions WHERE tenant_id = $1 AND user_id = $2 AND provider = $3',
        [tenantId, userId, provider]
      );

      // Insert new permissions
      for (const permission of permissions) {
        await this.pool.query(`
          INSERT INTO integration_permissions 
          (tenant_id, user_id, provider, permission_name, allowed, updated_by, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `, [tenantId, userId, provider, permission.name, permission.allowed, updatedBy]);
      }

      await this.pool.query('COMMIT');

      this.logger.info('User permissions updated', {
        tenantId,
        userId,
        provider,
        permissions: permissions.length,
        updatedBy
      });
    } catch (error) {
      await this.pool.query('ROLLBACK');
      this.logger.error('Failed to set user permissions', {
        tenantId,
        userId,
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clear cache for a specific tenant/provider combination
   * @param {string} tenantId - Tenant identifier
   * @param {string} provider - Integration provider
   */
  clearCache(tenantId, provider) {
    const cacheKey = `${tenantId}:${provider}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
  }
}

module.exports = TenantConfigService;
