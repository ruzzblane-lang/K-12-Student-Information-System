/**
 * Retention Policy Service
 * Implements comprehensive retention policies with auto-delete functionality
 * Ensures FERPA compliance for data lifecycle management
 */

const { query } = require('../../config/database');
const fs = require('fs').promises;
const path = require('path');

class RetentionPolicyService {
  constructor() {
    this.retentionTypes = {
      STUDENT_RECORDS: 'student_records',
      EDUCATIONAL_DOCUMENTS: 'educational_documents',
      PHOTOS: 'photos',
      AUDIO_VIDEO: 'audio_video',
      ASSESSMENTS: 'assessments',
      DISCIPLINARY_RECORDS: 'disciplinary_records',
      MEDICAL_RECORDS: 'medical_records',
      FINANCIAL_RECORDS: 'financial_records',
      AUDIT_LOGS: 'audit_logs',
      CONSENT_RECORDS: 'consent_records',
      DISCLOSURE_RECORDS: 'disclosure_records'
    };

    this.retentionActions = {
      DELETE: 'delete',
      ARCHIVE: 'archive',
      ANONYMIZE: 'anonymize',
      ENCRYPT: 'encrypt',
      NOTIFY: 'notify'
    };

    this.retentionStatuses = {
      ACTIVE: 'active',
      EXPIRED: 'expired',
      DELETED: 'deleted',
      ARCHIVED: 'archived',
      ANONYMIZED: 'anonymized',
      ENCRYPTED: 'encrypted',
      PENDING_DELETION: 'pending_deletion'
    };

    // Default retention periods (in years) based on FERPA and state requirements
    this.defaultRetentionPeriods = {
      [this.retentionTypes.STUDENT_RECORDS]: 7, // 7 years after graduation/withdrawal
      [this.retentionTypes.EDUCATIONAL_DOCUMENTS]: 7,
      [this.retentionTypes.PHOTOS]: 3, // 3 years after graduation/withdrawal
      [this.retentionTypes.AUDIO_VIDEO]: 3,
      [this.retentionTypes.ASSESSMENTS]: 5, // 5 years for assessment data
      [this.retentionTypes.DISCIPLINARY_RECORDS]: 7,
      [this.retentionTypes.MEDICAL_RECORDS]: 7,
      [this.retentionTypes.FINANCIAL_RECORDS]: 7,
      [this.retentionTypes.AUDIT_LOGS]: 7,
      [this.retentionTypes.CONSENT_RECORDS]: 7,
      [this.retentionTypes.DISCLOSURE_RECORDS]: 7
    };
  }

  /**
   * Create retention policy
   * @param {string} tenantId - Tenant ID
   * @param {string} retentionType - Type of data to retain
   * @param {Object} policy - Policy configuration
   * @returns {Object} Created policy
   */
  async createRetentionPolicy(tenantId, retentionType, policy) {
    try {
      // Validate retention type
      if (!Object.values(this.retentionTypes).includes(retentionType)) {
        throw new Error(`Invalid retention type: ${retentionType}`);
      }

      // Check for existing policy
      const existingPolicy = await this.getRetentionPolicy(tenantId, retentionType);
      if (existingPolicy) {
        throw new Error('Retention policy already exists for this type');
      }

      const queryText = `
        INSERT INTO retention_policies (
          tenant_id, retention_type, retention_period_years, action_on_expiry,
          legal_requirement, description, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        tenantId,
        retentionType,
        policy.retentionPeriodYears || this.defaultRetentionPeriods[retentionType],
        policy.actionOnExpiry || this.retentionActions.DELETE,
        policy.legalRequirement || 'FERPA',
        policy.description || `Retention policy for ${retentionType}`,
        policy.isActive !== false // Default to true
      ];

      const result = await query(queryText, values);

      // Log policy creation
      await this.logRetentionAction('policy_created', result.rows[0].id, {
        tenantId,
        retentionType,
        policy
      });

      return result.rows[0];

    } catch (error) {
      await this.logError('Create retention policy error', error, {
        tenantId,
        retentionType,
        policy
      });
      throw new Error(`Retention policy creation failed: ${error.message}`);
    }
  }

  /**
   * Get retention policy
   * @param {string} tenantId - Tenant ID
   * @param {string} retentionType - Retention type
   * @returns {Object|null} Retention policy
   */
  async getRetentionPolicy(tenantId, retentionType) {
    try {
      const queryText = `
        SELECT * FROM retention_policies
        WHERE tenant_id = $1 AND retention_type = $2 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await query(queryText, [tenantId, retentionType]);
      return result.rows[0] || null;

    } catch (error) {
      await this.logError('Get retention policy error', error, {
        tenantId,
        retentionType
      });
      throw new Error(`Retention policy retrieval failed: ${error.message}`);
    }
  }

  /**
   * Apply retention policy to records
   * @param {string} tenantId - Tenant ID
   * @param {string} retentionType - Retention type
   * @param {Object} options - Processing options
   * @returns {Object} Processing result
   */
  async applyRetentionPolicy(tenantId, retentionType, options = {}) {
    try {
      const policy = await this.getRetentionPolicy(tenantId, retentionType);
      if (!policy) {
        throw new Error(`No active retention policy found for ${retentionType}`);
      }

      // Find records that have exceeded retention period
      const expiredRecords = await this.findExpiredRecords(tenantId, retentionType, policy);
      
      const processingResult = {
        policyId: policy.id,
        retentionType: retentionType,
        totalRecords: expiredRecords.length,
        processedRecords: 0,
        failedRecords: 0,
        actions: {
          deleted: 0,
          archived: 0,
          anonymized: 0,
          encrypted: 0,
          notified: 0
        },
        errors: []
      };

      // Process each expired record
      for (const record of expiredRecords) {
        try {
          await this.processExpiredRecord(record, policy, options);
          processingResult.processedRecords++;
          processingResult.actions[policy.action_on_expiry]++;
        } catch (error) {
          processingResult.failedRecords++;
          processingResult.errors.push({
            recordId: record.id,
            error: error.message
          });
        }
      }

      // Log retention processing
      await this.logRetentionAction('policy_applied', policy.id, {
        tenantId,
        retentionType,
        result: processingResult
      });

      return processingResult;

    } catch (error) {
      await this.logError('Apply retention policy error', error, {
        tenantId,
        retentionType,
        options
      });
      throw new Error(`Retention policy application failed: ${error.message}`);
    }
  }

  /**
   * Find expired records
   * @param {string} tenantId - Tenant ID
   * @param {string} retentionType - Retention type
   * @param {Object} policy - Retention policy
   * @returns {Array} Expired records
   */
  async findExpiredRecords(tenantId, retentionType, policy) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - policy.retention_period_years);

      // Map retention types to database tables
      const tableMap = {
        [this.retentionTypes.STUDENT_RECORDS]: 'students',
        [this.retentionTypes.EDUCATIONAL_DOCUMENTS]: 'educational_records',
        [this.retentionTypes.PHOTOS]: 'student_photos',
        [this.retentionTypes.AUDIO_VIDEO]: 'student_media',
        [this.retentionTypes.ASSESSMENTS]: 'assessments',
        [this.retentionTypes.DISCIPLINARY_RECORDS]: 'disciplinary_records',
        [this.retentionTypes.MEDICAL_RECORDS]: 'medical_records',
        [this.retentionTypes.FINANCIAL_RECORDS]: 'financial_records',
        [this.retentionTypes.AUDIT_LOGS]: 'audit_logs',
        [this.retentionTypes.CONSENT_RECORDS]: 'ferpa_consents',
        [this.retentionTypes.DISCLOSURE_RECORDS]: 'ferpa_disclosures'
      };

      const tableName = tableMap[retentionType];
      if (!tableName) {
        throw new Error(`No table mapping found for retention type: ${retentionType}`);
      }

      // Build query based on table structure
      let queryText;
      if (tableName === 'students') {
        // For students, check graduation/withdrawal date
        queryText = `
          SELECT * FROM ${tableName}
          WHERE tenant_id = $1 AND status IN ('graduated', 'withdrawn', 'transferred')
          AND (graduation_date < $2 OR withdrawal_date < $2 OR transfer_date < $2)
          AND retention_status != 'deleted'
        `;
      } else {
        // For other records, check creation date
        queryText = `
          SELECT * FROM ${tableName}
          WHERE tenant_id = $1 AND created_at < $2
          AND retention_status != 'deleted'
        `;
      }

      const result = await query(queryText, [tenantId, cutoffDate]);
      return result.rows;

    } catch (error) {
      await this.logError('Find expired records error', error, {
        tenantId,
        retentionType,
        policy
      });
      throw new Error(`Expired records search failed: ${error.message}`);
    }
  }

  /**
   * Process expired record
   * @param {Object} record - Record to process
   * @param {Object} policy - Retention policy
   * @param {Object} options - Processing options
   * @returns {void}
   */
  async processExpiredRecord(record, policy, options) {
    try {
      switch (policy.action_on_expiry) {
        case this.retentionActions.DELETE:
          await this.deleteRecord(record, policy);
          break;
        case this.retentionActions.ARCHIVE:
          await this.archiveRecord(record, policy);
          break;
        case this.retentionActions.ANONYMIZE:
          await this.anonymizeRecord(record, policy);
          break;
        case this.retentionActions.ENCRYPT:
          await this.encryptRecord(record, policy);
          break;
        case this.retentionActions.NOTIFY:
          await this.notifyRecordExpiry(record, policy);
          break;
        default:
          throw new Error(`Unknown retention action: ${policy.action_on_expiry}`);
      }

      // Update record status
      await this.updateRecordRetentionStatus(record, policy.action_on_expiry);

      // Log record processing
      await this.logRetentionAction('record_processed', record.id, {
        recordType: policy.retention_type,
        action: policy.action_on_expiry,
        policyId: policy.id
      });

    } catch (error) {
      await this.logError('Process expired record error', error, {
        record,
        policy,
        options
      });
      throw error;
    }
  }

  /**
   * Delete record
   * @param {Object} record - Record to delete
   * @param {Object} policy - Retention policy
   * @returns {void}
   */
  async deleteRecord(record, policy) {
    try {
      // Soft delete by updating status
      const tableName = this.getTableNameForRetentionType(policy.retention_type);
      
      await query(
        `UPDATE ${tableName} SET retention_status = $1, deleted_at = NOW() WHERE id = $2`,
        [this.retentionStatuses.DELETED, record.id]
      );

      // If it's a file record, delete the actual file
      if (record.file_path) {
        try {
          await fs.unlink(record.file_path);
        } catch (fileError) {
          // Log file deletion error but don't fail the record deletion
          await this.logError('File deletion error', fileError, {
            recordId: record.id,
            filePath: record.file_path
          });
        }
      }

    } catch (error) {
      throw new Error(`Record deletion failed: ${error.message}`);
    }
  }

  /**
   * Archive record
   * @param {Object} record - Record to archive
   * @param {Object} policy - Retention policy
   * @returns {void}
   */
  async archiveRecord(record, policy) {
    try {
      const tableName = this.getTableNameForRetentionType(policy.retention_type);
      
      // Update status to archived
      await query(
        `UPDATE ${tableName} SET retention_status = $1, archived_at = NOW() WHERE id = $2`,
        [this.retentionStatuses.ARCHIVED, record.id]
      );

      // Move file to archive location if applicable
      if (record.file_path) {
        const archivePath = await this.moveToArchive(record.file_path, policy.retention_type);
        
        // Update record with archive path
        await query(
          `UPDATE ${tableName} SET archive_path = $1 WHERE id = $2`,
          [archivePath, record.id]
        );
      }

    } catch (error) {
      throw new Error(`Record archiving failed: ${error.message}`);
    }
  }

  /**
   * Anonymize record
   * @param {Object} record - Record to anonymize
   * @param {Object} policy - Retention policy
   * @returns {void}
   */
  async anonymizeRecord(record, policy) {
    try {
      const tableName = this.getTableNameForRetentionType(policy.retention_type);
      
      // Define fields to anonymize based on record type
      const anonymizationFields = this.getAnonymizationFields(policy.retention_type);
      
      // Build anonymization query
      const setClause = anonymizationFields.map((field, index) => 
        `${field} = $${index + 2}`
      ).join(', ');
      
      const values = [this.retentionStatuses.ANONYMIZED, record.id];
      const anonymizedValues = anonymizationFields.map(field => 
        this.anonymizeValue(record[field], field)
      );
      values.push(...anonymizedValues);
      
      await query(
        `UPDATE ${tableName} SET retention_status = $1, ${setClause}, anonymized_at = NOW() WHERE id = $2`,
        values
      );

    } catch (error) {
      throw new Error(`Record anonymization failed: ${error.message}`);
    }
  }

  /**
   * Encrypt record
   * @param {Object} record - Record to encrypt
   * @param {Object} policy - Retention policy
   * @returns {void}
   */
  async encryptRecord(record, policy) {
    try {
      const tableName = this.getTableNameForRetentionType(policy.retention_type);
      
      // Update status to encrypted
      await query(
        `UPDATE ${tableName} SET retention_status = $1, encrypted_at = NOW() WHERE id = $2`,
        [this.retentionStatuses.ENCRYPTED, record.id]
      );

      // In a real implementation, you would encrypt the record data
      // This would integrate with the ArchiveEncryptionService

    } catch (error) {
      throw new Error(`Record encryption failed: ${error.message}`);
    }
  }

  /**
   * Notify record expiry
   * @param {Object} record - Record that expired
   * @param {Object} policy - Retention policy
   * @returns {void}
   */
  async notifyRecordExpiry(record, policy) {
    try {
      // Create notification record
      await query(
        `INSERT INTO retention_notifications (
          record_id, record_type, policy_id, notification_type, 
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [record.id, policy.retention_type, policy.id, 'expiry_notification']
      );

      // In a real implementation, you would send actual notifications
      // to administrators or data owners

    } catch (error) {
      throw new Error(`Record expiry notification failed: ${error.message}`);
    }
  }

  /**
   * Update record retention status
   * @param {Object} record - Record to update
   * @param {string} action - Retention action taken
   * @returns {void}
   */
  async updateRecordRetentionStatus(record, action) {
    try {
      const statusMap = {
        [this.retentionActions.DELETE]: this.retentionStatuses.DELETED,
        [this.retentionActions.ARCHIVE]: this.retentionStatuses.ARCHIVED,
        [this.retentionActions.ANONYMIZE]: this.retentionStatuses.ANONYMIZED,
        [this.retentionActions.ENCRYPT]: this.retentionStatuses.ENCRYPTED,
        [this.retentionActions.NOTIFY]: this.retentionStatuses.PENDING_DELETION
      };

      const status = statusMap[action];
      if (status) {
        // This would update the appropriate table based on record type
        // Implementation depends on your specific table structure
      }

    } catch (error) {
      await this.logError('Update record retention status error', error, {
        record,
        action
      });
    }
  }

  /**
   * Get table name for retention type
   * @param {string} retentionType - Retention type
   * @returns {string} Table name
   */
  getTableNameForRetentionType(retentionType) {
    const tableMap = {
      [this.retentionTypes.STUDENT_RECORDS]: 'students',
      [this.retentionTypes.EDUCATIONAL_DOCUMENTS]: 'educational_records',
      [this.retentionTypes.PHOTOS]: 'student_photos',
      [this.retentionTypes.AUDIO_VIDEO]: 'student_media',
      [this.retentionTypes.ASSESSMENTS]: 'assessments',
      [this.retentionTypes.DISCIPLINARY_RECORDS]: 'disciplinary_records',
      [this.retentionTypes.MEDICAL_RECORDS]: 'medical_records',
      [this.retentionTypes.FINANCIAL_RECORDS]: 'financial_records',
      [this.retentionTypes.AUDIT_LOGS]: 'audit_logs',
      [this.retentionTypes.CONSENT_RECORDS]: 'ferpa_consents',
      [this.retentionTypes.DISCLOSURE_RECORDS]: 'ferpa_disclosures'
    };

    return tableMap[retentionType] || 'unknown';
  }

  /**
   * Get anonymization fields for retention type
   * @param {string} retentionType - Retention type
   * @returns {Array} Fields to anonymize
   */
  getAnonymizationFields(retentionType) {
    const fieldMap = {
      [this.retentionTypes.STUDENT_RECORDS]: ['first_name', 'last_name', 'email', 'phone', 'address'],
      [this.retentionTypes.EDUCATIONAL_DOCUMENTS]: ['student_name', 'content'],
      [this.retentionTypes.PHOTOS]: ['file_path', 'metadata'],
      [this.retentionTypes.AUDIO_VIDEO]: ['file_path', 'transcript'],
      [this.retentionTypes.ASSESSMENTS]: ['student_name', 'responses'],
      [this.retentionTypes.DISCIPLINARY_RECORDS]: ['student_name', 'description'],
      [this.retentionTypes.MEDICAL_RECORDS]: ['student_name', 'medical_info'],
      [this.retentionTypes.FINANCIAL_RECORDS]: ['student_name', 'amount', 'description']
    };

    return fieldMap[retentionType] || [];
  }

  /**
   * Anonymize value
   * @param {any} value - Value to anonymize
   * @param {string} field - Field name
   * @returns {string} Anonymized value
   */
  anonymizeValue(value, field) {
    if (!value) return value;

    // Different anonymization strategies based on field type
    if (field.includes('name')) {
      return 'ANONYMIZED';
    } else if (field.includes('email')) {
      return 'anonymized@example.com';
    } else if (field.includes('phone')) {
      return '000-000-0000';
    } else if (field.includes('address')) {
      return 'ANONYMIZED ADDRESS';
    } else {
      return '[ANONYMIZED]';
    }
  }

  /**
   * Move file to archive
   * @param {string} filePath - Original file path
   * @param {string} retentionType - Retention type
   * @returns {string} Archive path
   */
  async moveToArchive(filePath, retentionType) {
    try {
      const archiveDir = path.join(process.env.ARCHIVE_PATH || '/var/archives', retentionType);
      await fs.mkdir(archiveDir, { recursive: true });

      const fileName = path.basename(filePath);
      const archivePath = path.join(archiveDir, fileName);

      await fs.rename(filePath, archivePath);
      return archivePath;

    } catch (error) {
      throw new Error(`File archiving failed: ${error.message}`);
    }
  }

  /**
   * Run retention policy cleanup
   * @param {string} tenantId - Tenant ID (optional, runs for all if not provided)
   * @returns {Object} Cleanup result
   */
  async runRetentionCleanup(tenantId = null) {
    try {
      const cleanupResult = {
        tenantId: tenantId,
        startTime: new Date().toISOString(),
        policiesProcessed: 0,
        totalRecordsProcessed: 0,
        totalRecordsDeleted: 0,
        totalRecordsArchived: 0,
        totalRecordsAnonymized: 0,
        errors: []
      };

      // Get all active retention policies
      let queryText = `
        SELECT * FROM retention_policies 
        WHERE is_active = true
      `;
      const values = [];

      if (tenantId) {
        queryText += ` AND tenant_id = $1`;
        values.push(tenantId);
      }

      const policies = await query(queryText, values);

      // Process each policy
      for (const policy of policies.rows) {
        try {
          const result = await this.applyRetentionPolicy(
            policy.tenant_id,
            policy.retention_type,
            { batchSize: 100 }
          );

          cleanupResult.policiesProcessed++;
          cleanupResult.totalRecordsProcessed += result.totalRecords;
          cleanupResult.totalRecordsDeleted += result.actions.deleted;
          cleanupResult.totalRecordsArchived += result.actions.archived;
          cleanupResult.totalRecordsAnonymized += result.actions.anonymized;

        } catch (error) {
          cleanupResult.errors.push({
            policyId: policy.id,
            retentionType: policy.retention_type,
            error: error.message
          });
        }
      }

      cleanupResult.endTime = new Date().toISOString();
      cleanupResult.duration = new Date(cleanupResult.endTime) - new Date(cleanupResult.startTime);

      // Log cleanup completion
      await this.logRetentionAction('cleanup_completed', null, cleanupResult);

      return cleanupResult;

    } catch (error) {
      await this.logError('Run retention cleanup error', error, {
        tenantId
      });
      throw new Error(`Retention cleanup failed: ${error.message}`);
    }
  }

  /**
   * Log retention action
   * @param {string} action - Action performed
   * @param {string} recordId - Record ID
   * @param {Object} context - Additional context
   * @returns {void}
   */
  async logRetentionAction(action, recordId, context) {
    try {
      const queryText = `
        INSERT INTO retention_action_logs (
          action, record_id, context_data, created_at
        ) VALUES ($1, $2, $3, NOW())
      `;

      await query(queryText, [action, recordId, JSON.stringify(context)]);

    } catch (error) {
      // Silently fail to avoid infinite logging loop
    }
  }

  /**
   * Log error with context
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   * @returns {void}
   */
  async logError(message, error, context = {}) {
    try {
      const queryText = `
        INSERT INTO retention_error_logs (
          error_message, error_stack, context_data, created_at
        ) VALUES ($1, $2, $3, NOW())
      `;

      await query(queryText, [
        message,
        error.stack || error.message,
        JSON.stringify(context)
      ]);

    } catch (logError) {
      // If logging fails, we can't use console.error, so we silently fail
    }
  }
}

module.exports = RetentionPolicyService;
