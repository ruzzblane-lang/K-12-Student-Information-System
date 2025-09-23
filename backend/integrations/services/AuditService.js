/**
 * Audit Service for Third-Party Integrations
 * 
 * Provides comprehensive audit logging and compliance monitoring
 * for all third-party API integrations.
 */

const winston = require('winston');
const { Pool } = require('pg');

class AuditService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'integration-audit' },
      transports: [
        new winston.transports.File({ filename: 'logs/integration-audit.log' }),
        new winston.transports.Console()
      ]
    });

    // Initialize database connection
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  /**
   * Log integration activity
   * @param {Object} activity - Activity details
   */
  async logActivity(activity) {
    try {
      const {
        tenantId,
        userId,
        provider,
        action,
        resource,
        success,
        metadata = {},
        ipAddress,
        userAgent
      } = activity;

      const query = `
        INSERT INTO integration_audit_logs (
          tenant_id, user_id, provider, action, resource, success,
          metadata, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `;

      await this.pool.query(query, [
        tenantId,
        userId,
        provider,
        action,
        resource,
        success,
        JSON.stringify(metadata),
        ipAddress,
        userAgent
      ]);

      this.logger.info('Integration activity logged', {
        tenantId,
        userId,
        provider,
        action,
        resource,
        success
      });
    } catch (error) {
      this.logger.error('Failed to log integration activity', {
        error: error.message,
        activity
      });
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Log data access for compliance
   * @param {Object} access - Data access details
   */
  async logDataAccess(access) {
    try {
      const {
        tenantId,
        userId,
        provider,
        dataType,
        action,
        recordId,
        fields,
        purpose,
        legalBasis
      } = access;

      const query = `
        INSERT INTO integration_data_access_logs (
          tenant_id, user_id, provider, data_type, action, record_id,
          fields, purpose, legal_basis, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `;

      await this.pool.query(query, [
        tenantId,
        userId,
        provider,
        dataType,
        action,
        recordId,
        JSON.stringify(fields),
        purpose,
        legalBasis
      ]);

      this.logger.info('Data access logged for compliance', {
        tenantId,
        userId,
        provider,
        dataType,
        action,
        recordId
      });
    } catch (error) {
      this.logger.error('Failed to log data access', {
        error: error.message,
        access
      });
    }
  }

  /**
   * Log configuration changes
   * @param {Object} change - Configuration change details
   */
  async logConfigurationChange(change) {
    try {
      const {
        tenantId,
        userId,
        provider,
        changeType,
        oldValue,
        newValue,
        reason
      } = change;

      const query = `
        INSERT INTO integration_config_changes (
          tenant_id, user_id, provider, change_type, old_value, new_value,
          reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;

      await this.pool.query(query, [
        tenantId,
        userId,
        provider,
        changeType,
        JSON.stringify(oldValue),
        JSON.stringify(newValue),
        reason
      ]);

      this.logger.info('Configuration change logged', {
        tenantId,
        userId,
        provider,
        changeType
      });
    } catch (error) {
      this.logger.error('Failed to log configuration change', {
        error: error.message,
        change
      });
    }
  }

  /**
   * Log security events
   * @param {Object} event - Security event details
   */
  async logSecurityEvent(event) {
    try {
      const {
        tenantId,
        userId,
        provider,
        eventType,
        severity,
        description,
        metadata = {},
        ipAddress
      } = event;

      const query = `
        INSERT INTO integration_security_events (
          tenant_id, user_id, provider, event_type, severity, description,
          metadata, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `;

      await this.pool.query(query, [
        tenantId,
        userId,
        provider,
        eventType,
        severity,
        description,
        JSON.stringify(metadata),
        ipAddress
      ]);

      this.logger.warn('Security event logged', {
        tenantId,
        userId,
        provider,
        eventType,
        severity
      });
    } catch (error) {
      this.logger.error('Failed to log security event', {
        error: error.message,
        event
      });
    }
  }

  /**
   * Get audit trail for tenant
   * @param {string} tenantId - Tenant identifier
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Audit trail entries
   */
  async getAuditTrail(tenantId, filters = {}) {
    try {
      const {
        provider,
        userId,
        action,
        startDate,
        endDate,
        limit = 100,
        offset = 0
      } = filters;

      let query = `
        SELECT * FROM integration_audit_logs
        WHERE tenant_id = $1
      `;
      
      const params = [tenantId];
      let paramIndex = 2;

      if (provider) {
        query += ` AND provider = $${paramIndex}`;
        params.push(provider);
        paramIndex++;
      }

      if (userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (action) {
        query += ` AND action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.pool.query(query, params);
      
      return result.rows.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}')
      }));
    } catch (error) {
      this.logger.error('Failed to get audit trail', {
        tenantId,
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get compliance report for tenant
   * @param {string} tenantId - Tenant identifier
   * @param {string} startDate - Report start date
   * @param {string} endDate - Report end date
   * @returns {Promise<Object>} Compliance report
   */
  async getComplianceReport(tenantId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          provider,
          COUNT(*) as total_activities,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_activities,
          SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_activities,
          COUNT(DISTINCT user_id) as unique_users,
          MIN(created_at) as first_activity,
          MAX(created_at) as last_activity
        FROM integration_audit_logs
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
        GROUP BY provider
        ORDER BY total_activities DESC
      `;

      const result = await this.pool.query(query, [tenantId, startDate, endDate]);
      
      // Get data access summary
      const dataAccessQuery = `
        SELECT 
          provider,
          data_type,
          action,
          COUNT(*) as access_count
        FROM integration_data_access_logs
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
        GROUP BY provider, data_type, action
        ORDER BY access_count DESC
      `;

      const dataAccessResult = await this.pool.query(dataAccessQuery, [tenantId, startDate, endDate]);
      
      // Get security events summary
      const securityQuery = `
        SELECT 
          provider,
          event_type,
          severity,
          COUNT(*) as event_count
        FROM integration_security_events
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
        GROUP BY provider, event_type, severity
        ORDER BY event_count DESC
      `;

      const securityResult = await this.pool.query(securityQuery, [tenantId, startDate, endDate]);

      return {
        summary: {
          totalProviders: result.rows.length,
          totalActivities: result.rows.reduce((sum, row) => sum + parseInt(row.total_activities), 0),
          totalUsers: new Set(result.rows.map(row => row.unique_users)).size,
          reportPeriod: { startDate, endDate }
        },
        providerActivity: result.rows,
        dataAccess: dataAccessResult.rows,
        securityEvents: securityResult.rows
      };
    } catch (error) {
      this.logger.error('Failed to generate compliance report', {
        tenantId,
        startDate,
        endDate,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get data retention compliance status
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Data retention status
   */
  async getDataRetentionStatus(tenantId) {
    try {
      const query = `
        SELECT 
          provider,
          COUNT(*) as total_records,
          MIN(created_at) as oldest_record,
          MAX(created_at) as newest_record,
          COUNT(CASE WHEN created_at < NOW() - INTERVAL '7 years' THEN 1 END) as expired_records
        FROM integration_audit_logs
        WHERE tenant_id = $1
        GROUP BY provider
      `;

      const result = await this.pool.query(query, [tenantId]);
      
      return result.rows.map(row => ({
        provider: row.provider,
        totalRecords: parseInt(row.total_records),
        oldestRecord: row.oldest_record,
        newestRecord: row.newest_record,
        expiredRecords: parseInt(row.expired_records),
        complianceStatus: parseInt(row.expired_records) > 0 ? 'non_compliant' : 'compliant'
      }));
    } catch (error) {
      this.logger.error('Failed to get data retention status', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clean up expired audit logs
   * @param {string} tenantId - Tenant identifier (optional)
   * @param {number} retentionDays - Retention period in days
   */
  async cleanupExpiredLogs(tenantId = null, retentionDays = 2555) { // 7 years default
    try {
      let query = `
        DELETE FROM integration_audit_logs
        WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
      `;
      
      const params = [];
      
      if (tenantId) {
        query += ' AND tenant_id = $1';
        params.push(tenantId);
      }

      const result = await this.pool.query(query, params);
      
      this.logger.info('Expired audit logs cleaned up', {
        tenantId,
        retentionDays,
        deletedRecords: result.rowCount
      });
    } catch (error) {
      this.logger.error('Failed to cleanup expired logs', {
        tenantId,
        retentionDays,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = AuditService;
