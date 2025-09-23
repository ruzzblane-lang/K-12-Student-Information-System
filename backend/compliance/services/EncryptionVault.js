/**
 * Encryption Vault Service
 * Implements double-encryption vault for transaction metadata and sensitive data
 * Provides secure storage with tamper-proof integrity checks
 */

const crypto = require('crypto');
const { query } = require('../../config/database');

class EncryptionVault {
  constructor() {
    this.primaryKey = process.env.ENCRYPTION_KEY;
    this.secondaryKey = process.env.VAULT_ENCRYPTION_KEY;
    this.algorithm = 'aes-256-gcm';
    this.keyDerivationIterations = 100000;
    
    if (!this.primaryKey || !this.secondaryKey) {
      throw new Error('Both primary and secondary encryption keys must be configured');
    }
  }

  /**
   * Store data in encrypted vault
   * @param {string} key - Unique key for the data
   * @param {Object} data - Data to store
   * @param {string} tenantId - Tenant ID for isolation
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Storage result
   */
  async store(key, data, tenantId, metadata = {}) {
    try {
      if (!key || !data || !tenantId) {
        throw new Error('Key, data, and tenantId are required');
      }

      // Generate vault entry ID
      const vaultId = this.generateVaultId();
      
      // Encrypt the data
      const encryptedData = await this.encryptData(data);
      
      // Create integrity hash
      const integrityHash = this.createIntegrityHash(encryptedData);
      
      // Store in database
      await this.storeInDatabase(vaultId, key, encryptedData, integrityHash, tenantId, metadata);
      
      return {
        vaultId,
        key,
        tenantId,
        storedAt: new Date().toISOString(),
        status: 'stored'
      };
      
    } catch (error) {
      console.error('Vault storage error:', error);
      throw new Error(`Failed to store in vault: ${error.message}`);
    }
  }

  /**
   * Retrieve data from encrypted vault
   * @param {string} key - Key to retrieve
   * @param {string} tenantId - Tenant ID for access control
   * @param {string} userId - User ID for audit logging
   * @returns {Object} Retrieved data
   */
  async retrieve(key, tenantId, userId = null) {
    try {
      if (!key || !tenantId) {
        throw new Error('Key and tenantId are required');
      }

      // Retrieve from database
      const vaultEntry = await this.retrieveFromDatabase(key, tenantId);
      
      if (!vaultEntry) {
        throw new Error('Data not found or access denied');
      }

      // Verify integrity
      const isValid = this.verifyIntegrity(vaultEntry.encrypted_data, vaultEntry.integrity_hash);
      
      if (!isValid) {
        throw new Error('Data integrity check failed - possible tampering detected');
      }

      // Decrypt the data
      const decryptedData = await this.decryptData(vaultEntry.encrypted_data);
      
      // Log access
      await this.logAccess(vaultEntry.vault_id, key, tenantId, userId, 'retrieve');
      
      return {
        data: decryptedData,
        metadata: vaultEntry.metadata,
        storedAt: vaultEntry.created_at,
        lastAccessed: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Vault retrieval error:', error);
      throw new Error(`Failed to retrieve from vault: ${error.message}`);
    }
  }

  /**
   * Update data in vault
   * @param {string} key - Key to update
   * @param {Object} data - New data
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID for audit logging
   * @returns {Object} Update result
   */
  async update(key, data, tenantId, userId = null) {
    try {
      if (!key || !data || !tenantId) {
        throw new Error('Key, data, and tenantId are required');
      }

      // Check if entry exists
      const existingEntry = await this.retrieveFromDatabase(key, tenantId);
      
      if (!existingEntry) {
        throw new Error('Entry not found');
      }

      // Encrypt new data
      const encryptedData = await this.encryptData(data);
      
      // Create new integrity hash
      const integrityHash = this.createIntegrityHash(encryptedData);
      
      // Update in database
      await this.updateInDatabase(key, encryptedData, integrityHash, tenantId);
      
      // Log update
      await this.logAccess(existingEntry.vault_id, key, tenantId, userId, 'update');
      
      return {
        key,
        tenantId,
        updatedAt: new Date().toISOString(),
        status: 'updated'
      };
      
    } catch (error) {
      console.error('Vault update error:', error);
      throw new Error(`Failed to update vault: ${error.message}`);
    }
  }

  /**
   * Delete data from vault
   * @param {string} key - Key to delete
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID for audit logging
   * @returns {Object} Deletion result
   */
  async delete(key, tenantId, userId = null) {
    try {
      if (!key || !tenantId) {
        throw new Error('Key and tenantId are required');
      }

      // Get entry for logging
      const existingEntry = await this.retrieveFromDatabase(key, tenantId);
      
      if (!existingEntry) {
        throw new Error('Entry not found');
      }

      // Soft delete from database
      await this.deleteFromDatabase(key, tenantId);
      
      // Log deletion
      await this.logAccess(existingEntry.vault_id, key, tenantId, userId, 'delete');
      
      return {
        key,
        tenantId,
        deletedAt: new Date().toISOString(),
        status: 'deleted'
      };
      
    } catch (error) {
      console.error('Vault deletion error:', error);
      throw new Error(`Failed to delete from vault: ${error.message}`);
    }
  }

  /**
   * Encrypt data using double encryption
   * @param {Object} data - Data to encrypt
   * @returns {Object} Encrypted data
   */
  async encryptData(data) {
    const dataString = JSON.stringify(data);
    
    // First encryption layer with primary key
    const firstEncrypted = this.encrypt(dataString, this.primaryKey);
    
    // Second encryption layer with secondary key
    const secondEncrypted = this.encrypt(JSON.stringify(firstEncrypted), this.secondaryKey);
    
    return secondEncrypted;
  }

  /**
   * Decrypt data using double decryption
   * @param {Object} encryptedData - Encrypted data
   * @returns {Object} Decrypted data
   */
  async decryptData(encryptedData) {
    // First decryption layer with secondary key
    const firstDecrypted = this.decrypt(encryptedData, this.secondaryKey);
    const firstLayer = JSON.parse(firstDecrypted);
    
    // Second decryption layer with primary key
    const secondDecrypted = this.decrypt(firstLayer, this.primaryKey);
    
    return JSON.parse(secondDecrypted);
  }

  /**
   * Encrypt data with AES-256-GCM
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key
   * @returns {Object} Encrypted data with IV and auth tag
   */
  encrypt(data, key) {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipherGCM(this.algorithm, keyBuffer, iv);
    cipher.setAAD(Buffer.from('encryption-vault'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt data with AES-256-GCM
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} key - Decryption key
   * @returns {string} Decrypted data
   */
  decrypt(encryptedData, key) {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipherGCM(this.algorithm, keyBuffer, iv);
    decipher.setAAD(Buffer.from('encryption-vault'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Create integrity hash for data
   * @param {Object} data - Data to hash
   * @returns {string} Integrity hash
   */
  createIntegrityHash(data) {
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Verify data integrity
   * @param {Object} data - Data to verify
   * @param {string} expectedHash - Expected hash
   * @returns {boolean} Whether data is valid
   */
  verifyIntegrity(data, expectedHash) {
    const actualHash = this.createIntegrityHash(data);
    return crypto.timingSafeEqual(
      Buffer.from(actualHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  }

  /**
   * Generate unique vault ID
   * @returns {string} Unique vault ID
   */
  generateVaultId() {
    const randomBytes = crypto.randomBytes(16);
    const timestamp = Date.now().toString(36);
    return `vault_${timestamp}_${randomBytes.toString('hex')}`;
  }

  /**
   * Store data in database
   * @param {string} vaultId - Vault ID
   * @param {string} key - Data key
   * @param {Object} encryptedData - Encrypted data
   * @param {string} integrityHash - Integrity hash
   * @param {string} tenantId - Tenant ID
   * @param {Object} metadata - Metadata
   */
  async storeInDatabase(vaultId, key, encryptedData, integrityHash, tenantId, metadata) {
    const queryText = `
      INSERT INTO encryption_vault (
        vault_id,
        data_key,
        encrypted_data,
        integrity_hash,
        tenant_id,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (data_key, tenant_id) DO UPDATE SET
        encrypted_data = EXCLUDED.encrypted_data,
        integrity_hash = EXCLUDED.integrity_hash,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `;
    
    await query(queryText, [
      vaultId,
      key,
      JSON.stringify(encryptedData),
      integrityHash,
      tenantId,
      JSON.stringify(metadata)
    ]);
  }

  /**
   * Retrieve data from database
   * @param {string} key - Data key
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Vault entry
   */
  async retrieveFromDatabase(key, tenantId) {
    const queryText = `
      SELECT vault_id, encrypted_data, integrity_hash, metadata, created_at, updated_at
      FROM encryption_vault
      WHERE data_key = $1 AND tenant_id = $2 AND deleted_at IS NULL
    `;
    
    const result = await query(queryText, [key, tenantId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      vault_id: row.vault_id,
      encrypted_data: JSON.parse(row.encrypted_data),
      integrity_hash: row.integrity_hash,
      metadata: JSON.parse(row.metadata || '{}'),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Update data in database
   * @param {string} key - Data key
   * @param {Object} encryptedData - Encrypted data
   * @param {string} integrityHash - Integrity hash
   * @param {string} tenantId - Tenant ID
   */
  async updateInDatabase(key, encryptedData, integrityHash, tenantId) {
    const queryText = `
      UPDATE encryption_vault
      SET encrypted_data = $1, integrity_hash = $2, updated_at = NOW()
      WHERE data_key = $3 AND tenant_id = $4 AND deleted_at IS NULL
    `;
    
    await query(queryText, [
      JSON.stringify(encryptedData),
      integrityHash,
      key,
      tenantId
    ]);
  }

  /**
   * Delete data from database (soft delete)
   * @param {string} key - Data key
   * @param {string} tenantId - Tenant ID
   */
  async deleteFromDatabase(key, tenantId) {
    const queryText = `
      UPDATE encryption_vault
      SET deleted_at = NOW()
      WHERE data_key = $1 AND tenant_id = $2
    `;
    
    await query(queryText, [key, tenantId]);
  }

  /**
   * Log vault access for audit trail
   * @param {string} vaultId - Vault ID
   * @param {string} key - Data key
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   */
  async logAccess(vaultId, key, tenantId, userId, action) {
    const queryText = `
      INSERT INTO vault_access_logs (
        vault_id,
        data_key,
        tenant_id,
        user_id,
        action,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await query(queryText, [vaultId, key, tenantId, userId, action]);
  }

  /**
   * Get vault statistics for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Vault statistics
   */
  async getVaultStats(tenantId) {
    const queryText = `
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_entries,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted_entries,
        MIN(created_at) as first_entry,
        MAX(created_at) as last_entry
      FROM encryption_vault
      WHERE tenant_id = $1
    `;
    
    const result = await query(queryText, [tenantId]);
    
    return {
      tenantId,
      ...result.rows[0]
    };
  }

  /**
   * Clean up old deleted entries
   * @param {number} retentionDays - Days to retain deleted entries
   * @returns {number} Number of entries cleaned up
   */
  async cleanupDeletedEntries(retentionDays = 30) {
    const queryText = `
      DELETE FROM encryption_vault
      WHERE deleted_at IS NOT NULL 
      AND deleted_at < NOW() - INTERVAL '${retentionDays} days'
    `;
    
    const result = await query(queryText);
    return result.rowCount;
  }
}

module.exports = EncryptionVault;
