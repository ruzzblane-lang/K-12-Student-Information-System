const fs = require('fs');
const path = require('path');
const EncryptionService = require('./EncryptionService');

/**
 * SecurityAuditService - Comprehensive security audit logging
 * Provides detailed logging of security events, encryption operations, and access patterns
 */
class SecurityAuditService {
  constructor(config, db) {
    this.config = config;
    this.db = db;
    this.encryptionService = new EncryptionService(config);
    this.logPath = path.join(process.cwd(), 'logs', 'security');
    this.auditLevels = ['info', 'warning', 'error', 'critical'];
    
    // Initialize audit logging
    this.initializeAuditLogging();
    
    console.log('SecurityAuditService initialized');
  }

  /**
   * Initialize audit logging directories and files
   */
  initializeAuditLogging() {
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
    
    // Create daily log files
    this.createDailyLogFile();
  }

  /**
   * Create daily log file
   */
  createDailyLogFile() {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logPath, `security-audit-${today}.log`);
    
    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '');
      fs.chmodSync(logFile, 0o600); // Restrictive permissions
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(eventData) {
    try {
      const auditEntry = {
        id: this.generateAuditId(),
        timestamp: new Date().toISOString(),
        eventType: eventData.eventType,
        eventCategory: eventData.eventCategory || 'general',
        severity: eventData.severity || 'info',
        userId: eventData.userId,
        sessionId: eventData.sessionId,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        resourceType: eventData.resourceType,
        resourceId: eventData.resourceId,
        action: eventData.action,
        details: eventData.details,
        encryptedData: eventData.encryptedData,
        keyId: eventData.keyId,
        metadata: {
          version: '1.0',
          source: 'security-audit-service'
        }
      };
      
      // Log to file
      this.writeToLogFile(auditEntry);
      
      // Log to database if available
      if (this.db) {
        await this.writeToDatabase(auditEntry);
      }
      
      // Log to console for critical events
      if (eventData.severity === 'critical' || eventData.severity === 'error') {
        console.error('SECURITY EVENT:', auditEntry);
      }
      
      return { success: true, auditId: auditEntry.id };
    } catch (error) {
      console.error('Failed to log security event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log encryption operation
   */
  async logEncryptionOperation(operation, data) {
    const eventData = {
      eventType: 'encryption_operation',
      eventCategory: 'encryption',
      severity: 'info',
      action: operation,
      details: {
        operation: operation,
        dataType: typeof data,
        dataSize: JSON.stringify(data).length,
        timestamp: Date.now()
      },
      encryptedData: operation === 'encrypt' ? 'data_encrypted' : 'data_decrypted',
      keyId: data.keyId || 'default'
    };
    
    return await this.logSecurityEvent(eventData);
  }

  /**
   * Log authentication event
   */
  async logAuthenticationEvent(eventType, userId, details) {
    const eventData = {
      eventType: eventType,
      eventCategory: 'authentication',
      severity: eventType === 'login_failed' ? 'warning' : 'info',
      userId: userId,
      details: details
    };
    
    return await this.logSecurityEvent(eventData);
  }

  /**
   * Log authorization event
   */
  async logAuthorizationEvent(eventType, userId, resourceType, resourceId, details) {
    const eventData = {
      eventType: eventType,
      eventCategory: 'authorization',
      severity: eventType === 'access_denied' ? 'warning' : 'info',
      userId: userId,
      resourceType: resourceType,
      resourceId: resourceId,
      details: details
    };
    
    return await this.logSecurityEvent(eventData);
  }

  /**
   * Log data access event
   */
  async logDataAccessEvent(eventType, userId, resourceType, resourceId, details) {
    const eventData = {
      eventType: eventType,
      eventCategory: 'data_access',
      severity: 'info',
      userId: userId,
      resourceType: resourceType,
      resourceId: resourceId,
      details: details
    };
    
    return await this.logSecurityEvent(eventData);
  }

  /**
   * Log payment security event
   */
  async logPaymentSecurityEvent(eventType, userId, transactionId, details) {
    const eventData = {
      eventType: eventType,
      eventCategory: 'payment_security',
      severity: eventType === 'fraud_detected' ? 'critical' : 'warning',
      userId: userId,
      resourceType: 'transaction',
      resourceId: transactionId,
      details: details
    };
    
    return await this.logSecurityEvent(eventData);
  }

  /**
   * Log key management event
   */
  async logKeyManagementEvent(eventType, keyId, details) {
    const eventData = {
      eventType: eventType,
      eventCategory: 'key_management',
      severity: eventType === 'key_compromise' ? 'critical' : 'info',
      details: {
        keyId: keyId,
        ...details
      }
    };
    
    return await this.logSecurityEvent(eventData);
  }

  /**
   * Log TLS/SSL event
   */
  async logTLSEvent(eventType, details) {
    const eventData = {
      eventType: eventType,
      eventCategory: 'tls_ssl',
      severity: eventType === 'tls_error' ? 'error' : 'info',
      details: details
    };
    
    return await this.logSecurityEvent(eventData);
  }

  /**
   * Log system security event
   */
  async logSystemSecurityEvent(eventType, details) {
    const eventData = {
      eventType: eventType,
      eventCategory: 'system_security',
      severity: eventType === 'system_compromise' ? 'critical' : 'warning',
      details: details
    };
    
    return await this.logSecurityEvent(eventData);
  }

  /**
   * Write audit entry to log file
   */
  writeToLogFile(auditEntry) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logPath, `security-audit-${today}.log`);
      
      const logLine = JSON.stringify(auditEntry) + '\n';
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Write audit entry to database
   */
  async writeToDatabase(auditEntry) {
    try {
      const query = `
        INSERT INTO security_audit_log (
          event_type, event_category, severity, user_id, session_id,
          ip_address, user_agent, resource_type, resource_id, action,
          details, encrypted_data, key_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;
      
      const values = [
        auditEntry.eventType,
        auditEntry.eventCategory,
        auditEntry.severity,
        auditEntry.userId,
        auditEntry.sessionId,
        auditEntry.ipAddress,
        auditEntry.userAgent,
        auditEntry.resourceType,
        auditEntry.resourceId,
        auditEntry.action,
        JSON.stringify(auditEntry.details),
        auditEntry.encryptedData,
        auditEntry.keyId,
        auditEntry.timestamp
      ];
      
      await this.db.query(query, values);
    } catch (error) {
      console.error('Failed to write to database:', error);
    }
  }

  /**
   * Generate unique audit ID
   */
  generateAuditId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `audit_${timestamp}_${random}`;
  }

  /**
   * Get security audit logs
   */
  async getSecurityAuditLogs(filters = {}) {
    try {
      let query = 'SELECT * FROM security_audit_log WHERE 1=1';
      const values = [];
      let paramCount = 0;
      
      if (filters.eventType) {
        paramCount++;
        query += ` AND event_type = $${paramCount}`;
        values.push(filters.eventType);
      }
      
      if (filters.eventCategory) {
        paramCount++;
        query += ` AND event_category = $${paramCount}`;
        values.push(filters.eventCategory);
      }
      
      if (filters.severity) {
        paramCount++;
        query += ` AND severity = $${paramCount}`;
        values.push(filters.severity);
      }
      
      if (filters.userId) {
        paramCount++;
        query += ` AND user_id = $${paramCount}`;
        values.push(filters.userId);
      }
      
      if (filters.startDate) {
        paramCount++;
        query += ` AND created_at >= $${paramCount}`;
        values.push(filters.startDate);
      }
      
      if (filters.endDate) {
        paramCount++;
        query += ` AND created_at <= $${paramCount}`;
        values.push(filters.endDate);
      }
      
      query += ' ORDER BY created_at DESC';
      
      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        values.push(filters.limit);
      }
      
      const result = await this.db.query(query, values);
      return { success: true, logs: result.rows };
    } catch (error) {
      console.error('Failed to get security audit logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStatistics(startDate, endDate) {
    try {
      const query = `
        SELECT 
          event_category,
          severity,
          COUNT(*) as count
        FROM security_audit_log
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY event_category, severity
        ORDER BY event_category, severity
      `;
      
      const result = await this.db.query(query, [startDate, endDate]);
      
      const statistics = {
        totalEvents: 0,
        byCategory: {},
        bySeverity: {},
        byCategoryAndSeverity: {}
      };
      
      for (const row of result.rows) {
        statistics.totalEvents += parseInt(row.count);
        
        // By category
        if (!statistics.byCategory[row.event_category]) {
          statistics.byCategory[row.event_category] = 0;
        }
        statistics.byCategory[row.event_category] += parseInt(row.count);
        
        // By severity
        if (!statistics.bySeverity[row.severity]) {
          statistics.bySeverity[row.severity] = 0;
        }
        statistics.bySeverity[row.severity] += parseInt(row.count);
        
        // By category and severity
        const key = `${row.event_category}_${row.severity}`;
        if (!statistics.byCategoryAndSeverity[key]) {
          statistics.byCategoryAndSeverity[key] = 0;
        }
        statistics.byCategoryAndSeverity[key] += parseInt(row.count);
      }
      
      return { success: true, statistics };
    } catch (error) {
      console.error('Failed to get security statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldAuditLogs(retentionDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      // Clean up database logs
      const dbQuery = 'DELETE FROM security_audit_log WHERE created_at < $1';
      const dbResult = await this.db.query(dbQuery, [cutoffDate.toISOString()]);
      
      // Clean up file logs
      const logFiles = fs.readdirSync(this.logPath);
      let filesDeleted = 0;
      
      for (const file of logFiles) {
        if (file.startsWith('security-audit-') && file.endsWith('.log')) {
          const filePath = path.join(this.logPath, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            filesDeleted++;
          }
        }
      }
      
      console.log(`Cleaned up ${dbResult.rowCount} database logs and ${filesDeleted} file logs`);
      return {
        success: true,
        databaseLogsDeleted: dbResult.rowCount,
        fileLogsDeleted: filesDeleted
      };
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export security audit logs
   */
  async exportSecurityAuditLogs(filters = {}, format = 'json') {
    try {
      const logsResult = await this.getSecurityAuditLogs(filters);
      
      if (!logsResult.success) {
        throw new Error(logsResult.error);
      }
      
      const exportData = {
        exportDate: new Date().toISOString(),
        filters: filters,
        totalRecords: logsResult.logs.length,
        logs: logsResult.logs
      };
      
      if (format === 'csv') {
        return this.convertToCSV(exportData);
      }
      
      return { success: true, data: exportData };
    } catch (error) {
      console.error('Failed to export security audit logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  convertToCSV(exportData) {
    try {
      const headers = [
        'id', 'timestamp', 'event_type', 'event_category', 'severity',
        'user_id', 'session_id', 'ip_address', 'user_agent',
        'resource_type', 'resource_id', 'action', 'details', 'key_id'
      ];
      
      let csv = headers.join(',') + '\n';
      
      for (const log of exportData.logs) {
        const row = headers.map(header => {
          const value = log[header] || '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csv += row.join(',') + '\n';
      }
      
      return { success: true, data: csv };
    } catch (error) {
      console.error('Failed to convert to CSV:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SecurityAuditService;
