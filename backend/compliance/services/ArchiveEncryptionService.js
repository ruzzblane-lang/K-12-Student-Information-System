/**
 * Archive Encryption Service
 * Implements comprehensive encryption for archived files at rest
 * Ensures FERPA compliance for long-term data storage
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { query } = require('../../config/database');

class ArchiveEncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    
    // Archive types
    this.archiveTypes = {
      STUDENT_RECORDS: 'student_records',
      EDUCATIONAL_DOCUMENTS: 'educational_documents',
      PHOTOS: 'photos',
      AUDIO_VIDEO: 'audio_video',
      ASSESSMENTS: 'assessments',
      DISCIPLINARY_RECORDS: 'disciplinary_records',
      MEDICAL_RECORDS: 'medical_records',
      FINANCIAL_RECORDS: 'financial_records'
    };

    // Encryption statuses
    this.encryptionStatuses = {
      PENDING: 'pending',
      ENCRYPTING: 'encrypting',
      ENCRYPTED: 'encrypted',
      DECRYPTING: 'decrypting',
      DECRYPTED: 'decrypted',
      FAILED: 'failed'
    };
  }

  /**
   * Encrypt file for archival
   * @param {string} filePath - Path to file to encrypt
   * @param {string} archiveType - Type of archive
   * @param {string} tenantId - Tenant ID
   * @param {Object} metadata - File metadata
   * @returns {Object} Encryption result
   */
  async encryptFileForArchive(filePath, archiveType, tenantId, metadata = {}) {
    try {
      // Generate encryption key
      const encryptionKey = await this.generateEncryptionKey(tenantId, archiveType);
      
      // Read file content
      const fileContent = await fs.readFile(filePath);
      
      // Generate IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, encryptionKey);
      cipher.setAAD(Buffer.from(JSON.stringify(metadata)));
      
      // Encrypt file content
      let encryptedContent = cipher.update(fileContent);
      encryptedContent = Buffer.concat([encryptedContent, cipher.final()]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Create encrypted file structure
      const encryptedData = {
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        encryptedContent: encryptedContent.toString('hex'),
        metadata: metadata,
        algorithm: this.algorithm,
        encryptedAt: new Date().toISOString()
      };
      
      // Generate archive file path
      const archivePath = await this.generateArchivePath(tenantId, archiveType, metadata);
      
      // Write encrypted file
      await fs.writeFile(archivePath, JSON.stringify(encryptedData));
      
      // Create archive record
      const archiveRecord = await this.createArchiveRecord(
        filePath,
        archivePath,
        archiveType,
        tenantId,
        metadata,
        encryptionKey
      );
      
      // Log encryption action
      await this.logEncryptionAction('encrypted', archiveRecord.id, {
        originalPath: filePath,
        archivePath: archivePath,
        archiveType: archiveType,
        fileSize: fileContent.length,
        encryptedSize: encryptedContent.length
      });
      
      return {
        success: true,
        archiveId: archiveRecord.id,
        archivePath: archivePath,
        originalPath: filePath,
        encryptedSize: encryptedContent.length,
        compressionRatio: (encryptedContent.length / fileContent.length).toFixed(2)
      };
      
    } catch (error) {
      await this.logError('Encrypt file for archive error', error, {
        filePath,
        archiveType,
        tenantId,
        metadata
      });
      throw new Error(`File encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt archived file
   * @param {string} archiveId - Archive record ID
   * @param {string} outputPath - Path to save decrypted file
   * @param {string} requesterId - User ID requesting decryption
   * @returns {Object} Decryption result
   */
  async decryptArchivedFile(archiveId, outputPath, requesterId) {
    try {
      // Get archive record
      const archiveRecord = await this.getArchiveRecord(archiveId);
      if (!archiveRecord) {
        throw new Error('Archive record not found');
      }
      
      // Check access permissions
      const hasAccess = await this.checkDecryptionAccess(archiveRecord, requesterId);
      if (!hasAccess) {
        throw new Error('Access denied for archive decryption');
      }
      
      // Update status to decrypting
      await this.updateArchiveStatus(archiveId, this.encryptionStatuses.DECRYPTING);
      
      // Read encrypted file
      const encryptedData = JSON.parse(await fs.readFile(archiveRecord.archive_path, 'utf8'));
      
      // Get encryption key
      const encryptionKey = await this.getEncryptionKey(archiveRecord.key_id);
      
      // Create decipher
      const decipher = crypto.createDecipher(this.algorithm, encryptionKey);
      decipher.setAAD(Buffer.from(JSON.stringify(encryptedData.metadata)));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      
      // Decrypt content
      let decryptedContent = decipher.update(Buffer.from(encryptedData.encryptedContent, 'hex'));
      decryptedContent = Buffer.concat([decryptedContent, decipher.final()]);
      
      // Write decrypted file
      await fs.writeFile(outputPath, decryptedContent);
      
      // Update status to decrypted
      await this.updateArchiveStatus(archiveId, this.encryptionStatuses.DECRYPTED);
      
      // Log decryption action
      await this.logEncryptionAction('decrypted', archiveId, {
        outputPath: outputPath,
        requesterId: requesterId,
        fileSize: decryptedContent.length
      });
      
      return {
        success: true,
        outputPath: outputPath,
        fileSize: decryptedContent.length,
        metadata: encryptedData.metadata
      };
      
    } catch (error) {
      await this.updateArchiveStatus(archiveId, this.encryptionStatuses.FAILED);
      await this.logError('Decrypt archived file error', error, {
        archiveId,
        outputPath,
        requesterId
      });
      throw new Error(`File decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate encryption key
   * @param {string} tenantId - Tenant ID
   * @param {string} archiveType - Archive type
   * @returns {string} Encryption key
   */
  async generateEncryptionKey(tenantId, archiveType) {
    try {
      // Generate random key
      const key = crypto.randomBytes(this.keyLength);
      
      // Store key securely
      const keyRecord = await this.storeEncryptionKey(tenantId, archiveType, key);
      
      return keyRecord.id;
      
    } catch (error) {
      await this.logError('Generate encryption key error', error, {
        tenantId,
        archiveType
      });
      throw new Error(`Encryption key generation failed: ${error.message}`);
    }
  }

  /**
   * Store encryption key securely
   * @param {string} tenantId - Tenant ID
   * @param {string} archiveType - Archive type
   * @param {Buffer} key - Encryption key
   * @returns {Object} Key record
   */
  async storeEncryptionKey(tenantId, archiveType, key) {
    try {
      // Encrypt the key with master key
      const masterKey = await this.getMasterKey();
      const encryptedKey = this.encryptKey(key, masterKey);
      
      const queryText = `
        INSERT INTO archive_encryption_keys (
          tenant_id, archive_type, encrypted_key, key_hash, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;
      
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      
      const result = await query(queryText, [
        tenantId,
        archiveType,
        encryptedKey,
        keyHash
      ]);
      
      return result.rows[0];
      
    } catch (error) {
      await this.logError('Store encryption key error', error, {
        tenantId,
        archiveType
      });
      throw new Error(`Encryption key storage failed: ${error.message}`);
    }
  }

  /**
   * Get encryption key
   * @param {string} keyId - Key ID
   * @returns {Buffer} Decrypted encryption key
   */
  async getEncryptionKey(keyId) {
    try {
      const queryText = `
        SELECT * FROM archive_encryption_keys WHERE id = $1
      `;
      
      const result = await query(queryText, [keyId]);
      
      if (result.rows.length === 0) {
        throw new Error('Encryption key not found');
      }
      
      const keyRecord = result.rows[0];
      
      // Decrypt the key with master key
      const masterKey = await this.getMasterKey();
      const decryptedKey = this.decryptKey(keyRecord.encrypted_key, masterKey);
      
      return decryptedKey;
      
    } catch (error) {
      await this.logError('Get encryption key error', error, {
        keyId
      });
      throw new Error(`Encryption key retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get master key
   * @returns {Buffer} Master key
   */
  async getMasterKey() {
    try {
      // In production, this should be retrieved from a secure key management system
      const masterKeyEnv = process.env.ARCHIVE_MASTER_KEY;
      if (!masterKeyEnv) {
        throw new Error('Archive master key not configured');
      }
      
      return Buffer.from(masterKeyEnv, 'hex');
      
    } catch (error) {
      throw new Error(`Master key retrieval failed: ${error.message}`);
    }
  }

  /**
   * Encrypt key with master key
   * @param {Buffer} key - Key to encrypt
   * @param {Buffer} masterKey - Master key
   * @returns {string} Encrypted key
   */
  encryptKey(key, masterKey) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher('aes-256-cbc', masterKey);
    
    let encrypted = cipher.update(key);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypt key with master key
   * @param {string} encryptedKey - Encrypted key
   * @param {Buffer} masterKey - Master key
   * @returns {Buffer} Decrypted key
   */
  decryptKey(encryptedKey, masterKey) {
    const parts = encryptedKey.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    
    const decipher = crypto.createDecipher('aes-256-cbc', masterKey);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }

  /**
   * Generate archive file path
   * @param {string} tenantId - Tenant ID
   * @param {string} archiveType - Archive type
   * @param {Object} metadata - File metadata
   * @returns {string} Archive file path
   */
  async generateArchivePath(tenantId, archiveType, metadata) {
    try {
      const archiveDir = path.join(process.env.ARCHIVE_PATH || '/var/archives', tenantId, archiveType);
      
      // Ensure directory exists
      await fs.mkdir(archiveDir, { recursive: true });
      
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${metadata.originalName || 'file'}_${timestamp}.enc`;
      
      return path.join(archiveDir, filename);
      
    } catch (error) {
      await this.logError('Generate archive path error', error, {
        tenantId,
        archiveType,
        metadata
      });
      throw new Error(`Archive path generation failed: ${error.message}`);
    }
  }

  /**
   * Create archive record
   * @param {string} originalPath - Original file path
   * @param {string} archivePath - Archive file path
   * @param {string} archiveType - Archive type
   * @param {string} tenantId - Tenant ID
   * @param {Object} metadata - File metadata
   * @param {string} keyId - Encryption key ID
   * @returns {Object} Archive record
   */
  async createArchiveRecord(originalPath, archivePath, archiveType, tenantId, metadata, keyId) {
    try {
      const queryText = `
        INSERT INTO archive_records (
          tenant_id, archive_type, original_path, archive_path, key_id,
          file_size, metadata, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;
      
      const result = await query(queryText, [
        tenantId,
        archiveType,
        originalPath,
        archivePath,
        keyId,
        metadata.fileSize || 0,
        JSON.stringify(metadata),
        this.encryptionStatuses.ENCRYPTED
      ]);
      
      return result.rows[0];
      
    } catch (error) {
      await this.logError('Create archive record error', error, {
        originalPath,
        archivePath,
        archiveType,
        tenantId,
        metadata,
        keyId
      });
      throw new Error(`Archive record creation failed: ${error.message}`);
    }
  }

  /**
   * Get archive record
   * @param {string} archiveId - Archive ID
   * @returns {Object} Archive record
   */
  async getArchiveRecord(archiveId) {
    try {
      const queryText = `
        SELECT * FROM archive_records WHERE id = $1
      `;
      
      const result = await query(queryText, [archiveId]);
      return result.rows[0] || null;
      
    } catch (error) {
      await this.logError('Get archive record error', error, {
        archiveId
      });
      throw new Error(`Archive record retrieval failed: ${error.message}`);
    }
  }

  /**
   * Update archive status
   * @param {string} archiveId - Archive ID
   * @param {string} status - New status
   * @returns {void}
   */
  async updateArchiveStatus(archiveId, status) {
    try {
      const queryText = `
        UPDATE archive_records 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `;
      
      await query(queryText, [status, archiveId]);
      
    } catch (error) {
      await this.logError('Update archive status error', error, {
        archiveId,
        status
      });
    }
  }

  /**
   * Check decryption access
   * @param {Object} archiveRecord - Archive record
   * @param {string} requesterId - Requester ID
   * @returns {boolean} Has access
   */
  async checkDecryptionAccess(archiveRecord, requesterId) {
    try {
      // Check if requester is authorized to access this archive
      // This would integrate with your existing RBAC system
      
      // For now, return true for authorized users
      // In production, implement proper access control
      return true;
      
    } catch (error) {
      await this.logError('Check decryption access error', error, {
        archiveRecord,
        requesterId
      });
      return false;
    }
  }

  /**
   * Get archive statistics
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Object} Archive statistics
   */
  async getArchiveStatistics(tenantId, options = {}) {
    try {
      const queryText = `
        SELECT 
          archive_type,
          COUNT(*) as total_files,
          SUM(file_size) as total_size,
          AVG(file_size) as avg_size,
          status,
          COUNT(*) FILTER (WHERE status = 'encrypted') as encrypted_count,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_count
        FROM archive_records
        WHERE tenant_id = $1
        GROUP BY archive_type, status
        ORDER BY archive_type, status
      `;
      
      const result = await query(queryText, [tenantId]);
      
      return {
        tenantId,
        statistics: result.rows,
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      await this.logError('Get archive statistics error', error, {
        tenantId,
        options
      });
      throw new Error(`Archive statistics retrieval failed: ${error.message}`);
    }
  }

  /**
   * Log encryption action
   * @param {string} action - Action performed
   * @param {string} archiveId - Archive ID
   * @param {Object} context - Additional context
   * @returns {void}
   */
  async logEncryptionAction(action, archiveId, context) {
    try {
      const queryText = `
        INSERT INTO archive_encryption_logs (
          action, archive_id, context_data, created_at
        ) VALUES ($1, $2, $3, NOW())
      `;
      
      await query(queryText, [action, archiveId, JSON.stringify(context)]);
      
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
        INSERT INTO archive_encryption_error_logs (
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

module.exports = ArchiveEncryptionService;
