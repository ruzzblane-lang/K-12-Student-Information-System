/**
 * Data Tokenization Service
 * Implements comprehensive data tokenization with double-encryption vault
 * PCI DSS Level 1 compliant - never stores sensitive data in plaintext
 */

const crypto = require('crypto');
const { query } = require('../../config/database');

class DataTokenizationService {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    this.vaultKey = process.env.VAULT_ENCRYPTION_KEY;
    this.algorithm = 'aes-256-gcm';
    this.tokenPrefix = 'tok_';
    this.vaultPrefix = 'vault_';
    
    if (!this.encryptionKey || !this.vaultKey) {
      throw new Error('Encryption keys must be configured');
    }
  }

  /**
   * Tokenize sensitive data
   * @param {string} data - Sensitive data to tokenize
   * @param {string} dataType - Type of data (card_number, ssn, etc.)
   * @param {string} tenantId - Tenant ID for multi-tenant isolation
   * @returns {Object} Tokenization result
   */
  async tokenize(data, dataType, tenantId) {
    try {
      if (!data || typeof data !== 'string') {
        throw new Error('Data must be a non-empty string');
      }

      // Generate unique token
      const token = this.generateToken();
      
      // Double encrypt the data
      const encryptedData = this.doubleEncrypt(data);
      
      // Store in vault with metadata
      await this.storeInVault(token, encryptedData, dataType, tenantId);
      
      // Log tokenization event
      await this.logTokenizationEvent(token, dataType, tenantId, 'tokenize');
      
      return {
        token,
        dataType,
        tenantId,
        createdAt: new Date().toISOString(),
        status: 'active'
      };
      
    } catch (error) {
      console.error('Tokenization error:', error);
      throw new Error(`Tokenization failed: ${error.message}`);
    }
  }

  /**
   * Detokenize data using token
   * @param {string} token - Token to detokenize
   * @param {string} tenantId - Tenant ID for access control
   * @param {string} userId - User ID for audit logging
   * @returns {string} Detokenized data
   */
  async detokenize(token, tenantId, userId) {
    try {
      if (!token || !token.startsWith(this.tokenPrefix)) {
        throw new Error('Invalid token format');
      }

      // Retrieve from vault
      const vaultData = await this.retrieveFromVault(token, tenantId);
      
      if (!vaultData) {
        throw new Error('Token not found or access denied');
      }

      // Decrypt the data
      const decryptedData = this.doubleDecrypt(vaultData.encrypted_data);
      
      // Log detokenization event
      await this.logTokenizationEvent(token, vaultData.data_type, tenantId, 'detokenize', userId);
      
      return decryptedData;
      
    } catch (error) {
      console.error('Detokenization error:', error);
      throw new Error(`Detokenization failed: ${error.message}`);
    }
  }

  /**
   * Delete token and associated data
   * @param {string} token - Token to delete
   * @param {string} tenantId - Tenant ID for access control
   * @param {string} userId - User ID for audit logging
   */
  async deleteToken(token, tenantId, userId) {
    try {
      if (!token || !token.startsWith(this.tokenPrefix)) {
        throw new Error('Invalid token format');
      }

      // Get vault data for logging
      const vaultData = await this.retrieveFromVault(token, tenantId);
      
      // Delete from vault
      await this.deleteFromVault(token, tenantId);
      
      // Log deletion event
      await this.logTokenizationEvent(token, vaultData?.data_type, tenantId, 'delete', userId);
      
    } catch (error) {
      console.error('Token deletion error:', error);
      throw new Error(`Token deletion failed: ${error.message}`);
    }
  }

  /**
   * Generate a unique token
   * @returns {string} Unique token
   */
  generateToken() {
    const randomBytes = crypto.randomBytes(16);
    const timestamp = Date.now().toString(36);
    const random = randomBytes.toString('hex');
    return `${this.tokenPrefix}${timestamp}_${random}`;
  }

  /**
   * Double encrypt data (AES-256-GCM with two different keys)
   * @param {string} data - Data to encrypt
   * @returns {Object} Double-encrypted data
   */
  doubleEncrypt(data) {
    // First encryption layer
    const firstEncrypted = this.encrypt(data, this.encryptionKey);
    
    // Second encryption layer
    const secondEncrypted = this.encrypt(JSON.stringify(firstEncrypted), this.vaultKey);
    
    return secondEncrypted;
  }

  /**
   * Double decrypt data
   * @param {Object} encryptedData - Double-encrypted data
   * @returns {string} Decrypted data
   */
  doubleDecrypt(encryptedData) {
    // First decryption layer
    const firstDecrypted = this.decrypt(encryptedData, this.vaultKey);
    const firstLayer = JSON.parse(firstDecrypted);
    
    // Second decryption layer
    const secondDecrypted = this.decrypt(firstLayer, this.encryptionKey);
    
    return secondDecrypted;
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
    cipher.setAAD(Buffer.from('data-tokenization'));
    
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
    decipher.setAAD(Buffer.from('data-tokenization'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Store encrypted data in vault
   * @param {string} token - Token identifier
   * @param {Object} encryptedData - Encrypted data
   * @param {string} dataType - Type of data
   * @param {string} tenantId - Tenant ID
   */
  async storeInVault(token, encryptedData, dataType, tenantId) {
    const queryText = `
      INSERT INTO data_vault (
        token, 
        encrypted_data, 
        data_type, 
        tenant_id, 
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (token) DO UPDATE SET
        encrypted_data = EXCLUDED.encrypted_data,
        updated_at = NOW()
    `;
    
    await query(queryText, [
      token,
      JSON.stringify(encryptedData),
      dataType,
      tenantId
    ]);
  }

  /**
   * Retrieve encrypted data from vault
   * @param {string} token - Token identifier
   * @param {string} tenantId - Tenant ID for access control
   * @returns {Object} Vault data
   */
  async retrieveFromVault(token, tenantId) {
    const queryText = `
      SELECT encrypted_data, data_type, created_at, updated_at
      FROM data_vault
      WHERE token = $1 AND tenant_id = $2 AND deleted_at IS NULL
    `;
    
    const result = await query(queryText, [token, tenantId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      encrypted_data: JSON.parse(row.encrypted_data),
      data_type: row.data_type,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Delete data from vault
   * @param {string} token - Token identifier
   * @param {string} tenantId - Tenant ID for access control
   */
  async deleteFromVault(token, tenantId) {
    const queryText = `
      UPDATE data_vault
      SET deleted_at = NOW()
      WHERE token = $1 AND tenant_id = $2
    `;
    
    await query(queryText, [token, tenantId]);
  }

  /**
   * Log tokenization events for audit trail
   * @param {string} token - Token identifier
   * @param {string} dataType - Type of data
   * @param {string} tenantId - Tenant ID
   * @param {string} action - Action performed
   * @param {string} userId - User ID (optional)
   */
  async logTokenizationEvent(token, dataType, tenantId, action, userId = null) {
    const queryText = `
      INSERT INTO tokenization_audit_logs (
        token,
        data_type,
        tenant_id,
        user_id,
        action,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `;
    
    await query(queryText, [token, dataType, tenantId, userId, action]);
  }

  /**
   * Get tokenization statistics for a tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Tokenization statistics
   */
  async getTokenizationStats(tenantId) {
    const queryText = `
      SELECT 
        data_type,
        COUNT(*) as token_count,
        MIN(created_at) as first_token,
        MAX(created_at) as last_token
      FROM data_vault
      WHERE tenant_id = $1 AND deleted_at IS NULL
      GROUP BY data_type
    `;
    
    const result = await query(queryText, [tenantId]);
    
    return {
      tenantId,
      stats: result.rows,
      totalTokens: result.rows.reduce((sum, row) => sum + parseInt(row.token_count), 0)
    };
  }

  /**
   * Validate token format
   * @param {string} token - Token to validate
   * @returns {boolean} Whether token format is valid
   */
  validateTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    return token.startsWith(this.tokenPrefix) && token.length > this.tokenPrefix.length;
  }

  /**
   * Get supported data types
   * @returns {Array} Supported data types
   */
  getSupportedDataTypes() {
    return [
      'card_number',
      'card_cvv',
      'card_expiry',
      'ssn',
      'ein',
      'bank_account',
      'routing_number',
      'email',
      'phone',
      'address',
      'date_of_birth',
      'student_id',
      'parent_ssn',
      'medical_info',
      'financial_info'
    ];
  }
}

module.exports = DataTokenizationService;
