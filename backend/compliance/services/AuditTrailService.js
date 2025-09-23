/**
 * Audit Trail Service
 * Implements tamper-proof audit trail logging with cryptographic integrity
 * SOC 2 Type II compliant with immutable audit logs
 */

const crypto = require('crypto');
const { query } = require('../../config/database');

class AuditTrailService {
  constructor() {
    this.chainKey = process.env.AUDIT_CHAIN_KEY || process.env.ENCRYPTION_KEY;
    this.algorithm = 'sha256';
    this.retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS) || 2555; // 7 years default
    
    if (!this.chainKey) {
      throw new Error('Audit chain key must be configured');
    }
  }

  /**
   * Log an audit event with tamper-proof integrity
   * @param {Object} eventData - Event data to log
   * @returns {Object} Audit log result
   */
  async logEvent(eventData) {
    try {
      const {
        tenantId,
        userId,
        userEmail,
        userRole,
        action,
        resourceType,
        resourceId,
        oldValues,
        newValues,
        changedFields,
        ipAddress,
        userAgent,
        requestId,
        sessionId,
        success = true,
        errorMessage = null,
        responseStatus = null,
        executionTimeMs = null,
        metadata = {}
      } = eventData;

      // Validate required fields
      if (!tenantId || !action || !resourceType) {
        throw new Error('tenantId, action, and resourceType are required');
      }

      // Generate audit log ID
      const auditId = this.generateAuditId();
      
      // Create audit entry
      const auditEntry = {
        id: auditId,
        tenant_id: tenantId,
        user_id: userId,
        user_email: userEmail,
        user_role: userRole,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues,
        new_values: newValues,
        changed_fields: changedFields,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId,
        session_id: sessionId,
        success,
        error_message: errorMessage,
        response_status: responseStatus,
        execution_time_ms: executionTimeMs,
        metadata,
        created_at: new Date().toISOString()
      };

      // Calculate integrity hash
      const integrityHash = this.calculateIntegrityHash(auditEntry);
      
      // Get previous hash for chain integrity
      const previousHash = await this.getPreviousHash(tenantId);
      
      // Calculate chain hash
      const chainHash = this.calculateChainHash(auditEntry, previousHash);
      
      // Store audit log
      await this.storeAuditLog(auditEntry, integrityHash, chainHash);
      
      return {
        auditId,
        integrityHash,
        chainHash,
        timestamp: auditEntry.created_at,
        status: 'logged'
      };
      
    } catch (error) {
      console.error('Audit logging error:', error);
      throw new Error(`Failed to log audit event: ${error.message}`);
    }
  }

  /**
   * Verify audit trail integrity
   * @param {string} tenantId - Tenant ID
   * @param {string} startDate - Start date for verification
   * @param {string} endDate - End date for verification
   * @returns {Object} Integrity verification result
   */
  async verifyIntegrity(tenantId, startDate = null, endDate = null) {
    try {
      const queryText = `
        SELECT id, integrity_hash, chain_hash, created_at, action, resource_type
        FROM audit_logs
        WHERE tenant_id = $1
        ${startDate ? 'AND created_at >= $2' : ''}
        ${endDate ? `AND created_at <= $${startDate ? '3' : '2'}` : ''}
        ORDER BY created_at ASC
      `;
      
      const params = [tenantId];
      if (startDate) params.push(startDate);
      if (endDate) params.push(endDate);
      
      const result = await query(queryText, params);
      const logs = result.rows;
      
      if (logs.length === 0) {
        return {
          valid: true,
          message: 'No audit logs found for the specified period',
          totalLogs: 0
        };
      }

      let previousHash = null;
      let validCount = 0;
      let invalidLogs = [];

      for (const log of logs) {
        // Verify individual integrity hash
        const expectedIntegrityHash = await this.calculateIntegrityHashForStoredLog(log);
        const integrityValid = crypto.timingSafeEqual(
          Buffer.from(log.integrity_hash, 'hex'),
          Buffer.from(expectedIntegrityHash, 'hex')
        );

        // Verify chain integrity
        const expectedChainHash = this.calculateChainHashForStoredLog(log, previousHash);
        const chainValid = crypto.timingSafeEqual(
          Buffer.from(log.chain_hash, 'hex'),
          Buffer.from(expectedChainHash, 'hex')
        );

        if (integrityValid && chainValid) {
          validCount++;
        } else {
          invalidLogs.push({
            id: log.id,
            created_at: log.created_at,
            action: log.action,
            resource_type: log.resource_type,
            integrityValid,
            chainValid
          });
        }

        previousHash = log.chain_hash;
      }

      return {
        valid: invalidLogs.length === 0,
        totalLogs: logs.length,
        validLogs: validCount,
        invalidLogs,
        message: invalidLogs.length === 0 
          ? 'All audit logs are valid and untampered'
          : `${invalidLogs.length} audit logs failed integrity verification`
      };
      
    } catch (error) {
      console.error('Integrity verification error:', error);
      throw new Error(`Failed to verify audit integrity: ${error.message}`);
    }
  }

  /**
   * Get audit trail for a specific resource
   * @param {string} tenantId - Tenant ID
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {Object} options - Query options
   * @returns {Array} Audit trail entries
   */
  async getResourceAuditTrail(tenantId, resourceType, resourceId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        limit = 100,
        offset = 0,
        includeMetadata = false
      } = options;

      let queryText = `
        SELECT 
          id, user_id, user_email, user_role, action, 
          old_values, new_values, changed_fields,
          ip_address, user_agent, request_id, session_id,
          success, error_message, response_status, execution_time_ms,
          created_at
          ${includeMetadata ? ', metadata' : ''}
        FROM audit_logs
        WHERE tenant_id = $1 AND resource_type = $2 AND resource_id = $3
      `;
      
      const params = [tenantId, resourceType, resourceId];
      let paramIndex = 3;

      if (startDate) {
        paramIndex++;
        queryText += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
      }

      if (endDate) {
        paramIndex++;
        queryText += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
      params.push(limit, offset);

      const result = await query(queryText, params);
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        userRole: row.user_role,
        action: row.action,
        oldValues: row.old_values,
        newValues: row.new_values,
        changedFields: row.changed_fields,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        requestId: row.request_id,
        sessionId: row.session_id,
        success: row.success,
        errorMessage: row.error_message,
        responseStatus: row.response_status,
        executionTimeMs: row.execution_time_ms,
        createdAt: row.created_at,
        ...(includeMetadata && { metadata: row.metadata })
      }));
      
    } catch (error) {
      console.error('Get resource audit trail error:', error);
      throw new Error(`Failed to get resource audit trail: ${error.message}`);
    }
  }

  /**
   * Get user activity audit trail
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} User activity entries
   */
  async getUserActivityTrail(tenantId, userId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        limit = 100,
        offset = 0,
        actions = null
      } = options;

      let queryText = `
        SELECT 
          id, action, resource_type, resource_id,
          old_values, new_values, changed_fields,
          ip_address, user_agent, request_id, session_id,
          success, error_message, response_status, execution_time_ms,
          created_at
        FROM audit_logs
        WHERE tenant_id = $1 AND user_id = $2
      `;
      
      const params = [tenantId, userId];
      let paramIndex = 2;

      if (startDate) {
        paramIndex++;
        queryText += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
      }

      if (endDate) {
        paramIndex++;
        queryText += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
      }

      if (actions && Array.isArray(actions)) {
        paramIndex++;
        queryText += ` AND action = ANY($${paramIndex})`;
        params.push(actions);
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
      params.push(limit, offset);

      const result = await query(queryText, params);
      
      return result.rows.map(row => ({
        id: row.id,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        oldValues: row.old_values,
        newValues: row.new_values,
        changedFields: row.changed_fields,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        requestId: row.request_id,
        sessionId: row.session_id,
        success: row.success,
        errorMessage: row.error_message,
        responseStatus: row.response_status,
        executionTimeMs: row.execution_time_ms,
        createdAt: row.created_at
      }));
      
    } catch (error) {
      console.error('Get user activity trail error:', error);
      throw new Error(`Failed to get user activity trail: ${error.message}`);
    }
  }

  /**
   * Generate audit statistics
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Object} Audit statistics
   */
  async getAuditStatistics(tenantId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        groupBy = 'day'
      } = options;

      let dateFilter = '';
      const params = [tenantId];
      let paramIndex = 1;

      if (startDate) {
        paramIndex++;
        dateFilter += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
      }

      if (endDate) {
        paramIndex++;
        dateFilter += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
      }

      // Get total counts
      const totalQuery = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_events,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT resource_type) as unique_resource_types
        FROM audit_logs
        WHERE tenant_id = $1 ${dateFilter}
      `;

      const totalResult = await query(totalQuery, params);
      const totals = totalResult.rows[0];

      // Get action breakdown
      const actionQuery = `
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE tenant_id = $1 ${dateFilter}
        GROUP BY action
        ORDER BY count DESC
      `;

      const actionResult = await query(actionQuery, params);

      // Get resource type breakdown
      const resourceQuery = `
        SELECT resource_type, COUNT(*) as count
        FROM audit_logs
        WHERE tenant_id = $1 ${dateFilter}
        GROUP BY resource_type
        ORDER BY count DESC
      `;

      const resourceResult = await query(resourceQuery, params);

      // Get time-based statistics
      let timeQuery = '';
      switch (groupBy) {
        case 'hour':
          timeQuery = `DATE_TRUNC('hour', created_at)`;
          break;
        case 'day':
          timeQuery = `DATE_TRUNC('day', created_at)`;
          break;
        case 'week':
          timeQuery = `DATE_TRUNC('week', created_at)`;
          break;
        case 'month':
          timeQuery = `DATE_TRUNC('month', created_at)`;
          break;
        default:
          timeQuery = `DATE_TRUNC('day', created_at)`;
      }

      const timeBasedQuery = `
        SELECT 
          ${timeQuery} as period,
          COUNT(*) as event_count,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_count,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_count
        FROM audit_logs
        WHERE tenant_id = $1 ${dateFilter}
        GROUP BY ${timeQuery}
        ORDER BY period DESC
      `;

      const timeResult = await query(timeBasedQuery, params);

      return {
        tenantId,
        period: {
          startDate,
          endDate,
          groupBy
        },
        totals: {
          totalEvents: parseInt(totals.total_events),
          successfulEvents: parseInt(totals.successful_events),
          failedEvents: parseInt(totals.failed_events),
          uniqueUsers: parseInt(totals.unique_users),
          uniqueResourceTypes: parseInt(totals.unique_resource_types)
        },
        actionBreakdown: actionResult.rows.map(row => ({
          action: row.action,
          count: parseInt(row.count)
        })),
        resourceBreakdown: resourceResult.rows.map(row => ({
          resourceType: row.resource_type,
          count: parseInt(row.count)
        })),
        timeBasedStats: timeResult.rows.map(row => ({
          period: row.period,
          eventCount: parseInt(row.event_count),
          successfulCount: parseInt(row.successful_count),
          failedCount: parseInt(row.failed_count)
        }))
      };
      
    } catch (error) {
      console.error('Get audit statistics error:', error);
      throw new Error(`Failed to get audit statistics: ${error.message}`);
    }
  }

  /**
   * Calculate integrity hash for audit entry
   * @param {Object} auditEntry - Audit entry data
   * @returns {string} Integrity hash
   */
  calculateIntegrityHash(auditEntry) {
    const hashData = {
      id: auditEntry.id,
      tenant_id: auditEntry.tenant_id,
      user_id: auditEntry.user_id,
      action: auditEntry.action,
      resource_type: auditEntry.resource_type,
      resource_id: auditEntry.resource_id,
      old_values: auditEntry.old_values,
      new_values: auditEntry.new_values,
      created_at: auditEntry.created_at
    };
    
    const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
    return crypto.createHash(this.algorithm).update(dataString).digest('hex');
  }

  /**
   * Calculate chain hash for audit entry
   * @param {Object} auditEntry - Audit entry data
   * @param {string} previousHash - Previous chain hash
   * @returns {string} Chain hash
   */
  calculateChainHash(auditEntry, previousHash) {
    const chainData = {
      integrity_hash: this.calculateIntegrityHash(auditEntry),
      previous_hash: previousHash || 'genesis',
      timestamp: auditEntry.created_at
    };
    
    const dataString = JSON.stringify(chainData);
    return crypto.createHash(this.algorithm).update(dataString).digest('hex');
  }

  /**
   * Get previous chain hash for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {string} Previous chain hash
   */
  async getPreviousHash(tenantId) {
    const queryText = `
      SELECT chain_hash
      FROM audit_logs
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await query(queryText, [tenantId]);
    return result.rows.length > 0 ? result.rows[0].chain_hash : null;
  }

  /**
   * Store audit log in database
   * @param {Object} auditEntry - Audit entry
   * @param {string} integrityHash - Integrity hash
   * @param {string} chainHash - Chain hash
   */
  async storeAuditLog(auditEntry, integrityHash, chainHash) {
    const queryText = `
      INSERT INTO audit_logs (
        id, tenant_id, user_id, user_email, user_role, session_id,
        action, resource_type, resource_id, request_id,
        ip_address, user_agent, request_method, request_url, request_headers,
        old_values, new_values, changed_fields,
        success, error_message, response_status, execution_time_ms,
        created_at, updated_at, created_by, integrity_hash, chain_hash
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
    `;
    
    await query(queryText, [
      auditEntry.id,
      auditEntry.tenant_id,
      auditEntry.user_id,
      auditEntry.user_email,
      auditEntry.user_role,
      auditEntry.session_id,
      auditEntry.action,
      auditEntry.resource_type,
      auditEntry.resource_id,
      auditEntry.request_id,
      auditEntry.ip_address,
      auditEntry.user_agent,
      auditEntry.request_method || null,
      auditEntry.request_url || null,
      JSON.stringify(auditEntry.request_headers || {}),
      JSON.stringify(auditEntry.old_values || {}),
      JSON.stringify(auditEntry.new_values || {}),
      auditEntry.changed_fields || [],
      auditEntry.success,
      auditEntry.error_message,
      auditEntry.response_status,
      auditEntry.execution_time_ms,
      auditEntry.created_at,
      auditEntry.created_at,
      auditEntry.user_id,
      integrityHash,
      chainHash
    ]);
  }

  /**
   * Generate unique audit ID
   * @returns {string} Unique audit ID
   */
  generateAuditId() {
    const randomBytes = crypto.randomBytes(16);
    const timestamp = Date.now().toString(36);
    return `audit_${timestamp}_${randomBytes.toString('hex')}`;
  }

  /**
   * Clean up old audit logs based on retention policy
   * @param {number} retentionDays - Days to retain logs
   * @returns {number} Number of logs cleaned up
   */
  async cleanupOldLogs(retentionDays = null) {
    const days = retentionDays || this.retentionDays;
    
    const queryText = `
      DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '${days} days'
    `;
    
    const result = await query(queryText);
    return result.rowCount;
  }
}

module.exports = AuditTrailService;
