const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const EncryptionService = require('./EncryptionService');

/**
 * KeyManagementService - Secure key management and rotation system
 * Provides centralized key management with automatic rotation and secure storage
 */
class KeyManagementService {
  constructor(config) {
    this.config = config;
    this.encryptionService = new EncryptionService(config);
    this.keysPath = path.join(process.cwd(), 'config', 'keys');
    this.keyRotationInterval = config.keyRotationInterval || 90 * 24 * 60 * 60 * 1000; // 90 days
    this.keyRetentionPeriod = config.keyRetentionPeriod || 365 * 24 * 60 * 60 * 1000; // 1 year
    
    // Initialize key storage
    this.initializeKeyStorage();
    
    // Load existing keys
    this.keys = this.loadKeys();
    
    console.log('KeyManagementService initialized');
  }

  /**
   * Initialize key storage directory
   */
  initializeKeyStorage() {
    if (!fs.existsSync(this.keysPath)) {
      fs.mkdirSync(this.keysPath, { recursive: true });
      
      // Set restrictive permissions
      fs.chmodSync(this.keysPath, 0o700);
    }
  }

  /**
   * Generate new encryption key
   */
  generateKey(keyId, keyType = 'encryption', keySize = 256) {
    try {
      const keyData = {
        id: keyId,
        type: keyType,
        size: keySize,
        algorithm: 'AES-256-GCM',
        createdAt: Date.now(),
        expiresAt: Date.now() + this.keyRotationInterval,
        status: 'active',
        version: '1.0'
      };
      
      // Generate key material
      const keyMaterial = crypto.randomBytes(keySize / 8);
      
      // Encrypt key material
      const encryptedKey = this.encryptionService.encrypt(keyMaterial, 'master');
      
      if (!encryptedKey.success) {
        throw new Error(`Failed to encrypt key: ${encryptedKey.error}`);
      }
      
      // Store key
      const keyPath = path.join(this.keysPath, `${keyId}.key`);
      const keyFile = {
        metadata: keyData,
        encryptedKey: encryptedKey.encryptedData,
        keyId: encryptedKey.keyId
      };
      
      fs.writeFileSync(keyPath, JSON.stringify(keyFile, null, 2));
      
      // Set restrictive permissions
      fs.chmodSync(keyPath, 0o600);
      
      // Update in-memory keys
      this.keys.set(keyId, {
        ...keyData,
        keyMaterial: keyMaterial
      });
      
      console.log(`Generated new key: ${keyId}`);
      return {
        success: true,
        keyId: keyId,
        metadata: keyData
      };
    } catch (error) {
      console.error(`Key generation failed for ${keyId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load key from storage
   */
  loadKey(keyId) {
    try {
      const keyPath = path.join(this.keysPath, `${keyId}.key`);
      
      if (!fs.existsSync(keyPath)) {
        return null;
      }
      
      const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      
      // Decrypt key material
      const decryptionResult = this.encryptionService.decrypt(
        keyFile.encryptedKey,
        keyFile.keyId
      );
      
      if (!decryptionResult.success) {
        throw new Error(`Failed to decrypt key: ${decryptionResult.error}`);
      }
      
      return {
        ...keyFile.metadata,
        keyMaterial: decryptionResult.data
      };
    } catch (error) {
      console.error(`Failed to load key ${keyId}:`, error);
      return null;
    }
  }

  /**
   * Load all keys from storage
   */
  loadKeys() {
    const keys = new Map();
    
    try {
      const keyFiles = fs.readdirSync(this.keysPath);
      
      for (const keyFile of keyFiles) {
        if (keyFile.endsWith('.key')) {
          const keyId = keyFile.replace('.key', '');
          const key = this.loadKey(keyId);
          
          if (key) {
            keys.set(keyId, key);
          }
        }
      }
      
      console.log(`Loaded ${keys.size} keys from storage`);
    } catch (error) {
      console.error('Failed to load keys:', error);
    }
    
    return keys;
  }

  /**
   * Get key by ID
   */
  getKey(keyId) {
    if (this.keys.has(keyId)) {
      const key = this.keys.get(keyId);
      
      // Check if key is expired
      if (key.expiresAt < Date.now()) {
        console.warn(`Key ${keyId} has expired`);
        return null;
      }
      
      return key;
    }
    
    return null;
  }

  /**
   * Get key material
   */
  getKeyMaterial(keyId) {
    const key = this.getKey(keyId);
    return key ? key.keyMaterial : null;
  }

  /**
   * Rotate key
   */
  rotateKey(keyId) {
    try {
      const oldKey = this.getKey(keyId);
      if (!oldKey) {
        throw new Error(`Key ${keyId} not found`);
      }
      
      // Generate new key
      const newKeyId = `${keyId}_${Date.now()}`;
      const keyResult = this.generateKey(newKeyId, oldKey.type, oldKey.size);
      
      if (!keyResult.success) {
        throw new Error(`Failed to generate new key: ${keyResult.error}`);
      }
      
      // Mark old key as rotated
      this.updateKeyStatus(keyId, 'rotated');
      
      console.log(`Key rotated: ${keyId} -> ${newKeyId}`);
      return {
        success: true,
        oldKeyId: keyId,
        newKeyId: newKeyId,
        metadata: keyResult.metadata
      };
    } catch (error) {
      console.error(`Key rotation failed for ${keyId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update key status
   */
  updateKeyStatus(keyId, status) {
    try {
      const keyPath = path.join(this.keysPath, `${keyId}.key`);
      
      if (!fs.existsSync(keyPath)) {
        throw new Error(`Key file not found: ${keyId}`);
      }
      
      const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      keyFile.metadata.status = status;
      keyFile.metadata.updatedAt = Date.now();
      
      fs.writeFileSync(keyPath, JSON.stringify(keyFile, null, 2));
      
      // Update in-memory key
      if (this.keys.has(keyId)) {
        this.keys.get(keyId).status = status;
        this.keys.get(keyId).updatedAt = Date.now();
      }
      
      console.log(`Key status updated: ${keyId} -> ${status}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to update key status for ${keyId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete key
   */
  deleteKey(keyId) {
    try {
      const keyPath = path.join(this.keysPath, `${keyId}.key`);
      
      if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
      }
      
      // Remove from in-memory keys
      this.keys.delete(keyId);
      
      console.log(`Key deleted: ${keyId}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete key ${keyId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up expired keys
   */
  cleanupExpiredKeys() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [keyId, key] of this.keys) {
      if (key.expiresAt < now) {
        expiredKeys.push(keyId);
      }
    }
    
    for (const keyId of expiredKeys) {
      this.deleteKey(keyId);
    }
    
    console.log(`Cleaned up ${expiredKeys.length} expired keys`);
    return expiredKeys;
  }

  /**
   * Clean up old rotated keys
   */
  cleanupOldKeys() {
    const now = Date.now();
    const oldKeys = [];
    
    for (const [keyId, key] of this.keys) {
      if (key.status === 'rotated' && 
          key.updatedAt && 
          (now - key.updatedAt) > this.keyRetentionPeriod) {
        oldKeys.push(keyId);
      }
    }
    
    for (const keyId of oldKeys) {
      this.deleteKey(keyId);
    }
    
    console.log(`Cleaned up ${oldKeys.length} old keys`);
    return oldKeys;
  }

  /**
   * Get keys that need rotation
   */
  getKeysNeedingRotation() {
    const now = Date.now();
    const keysNeedingRotation = [];
    
    for (const [keyId, key] of this.keys) {
      if (key.status === 'active' && 
          key.expiresAt < (now + 7 * 24 * 60 * 60 * 1000)) { // 7 days before expiry
        keysNeedingRotation.push({
          keyId: keyId,
          expiresAt: key.expiresAt,
          daysUntilExpiry: Math.ceil((key.expiresAt - now) / (24 * 60 * 60 * 1000))
        });
      }
    }
    
    return keysNeedingRotation;
  }

  /**
   * Perform automatic key rotation
   */
  async performAutomaticRotation() {
    try {
      const keysNeedingRotation = this.getKeysNeedingRotation();
      const rotationResults = [];
      
      for (const keyInfo of keysNeedingRotation) {
        const result = this.rotateKey(keyInfo.keyId);
        rotationResults.push({
          keyId: keyInfo.keyId,
          ...result
        });
      }
      
      // Clean up old keys
      this.cleanupOldKeys();
      
      console.log(`Automatic key rotation completed: ${rotationResults.length} keys rotated`);
      return {
        success: true,
        rotatedKeys: rotationResults
      };
    } catch (error) {
      console.error('Automatic key rotation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get key statistics
   */
  getKeyStatistics() {
    const stats = {
      totalKeys: this.keys.size,
      activeKeys: 0,
      expiredKeys: 0,
      rotatedKeys: 0,
      keysNeedingRotation: 0
    };
    
    const now = Date.now();
    
    for (const [keyId, key] of this.keys) {
      switch (key.status) {
        case 'active':
          stats.activeKeys++;
          if (key.expiresAt < (now + 7 * 24 * 60 * 60 * 1000)) {
            stats.keysNeedingRotation++;
          }
          break;
        case 'expired':
          stats.expiredKeys++;
          break;
        case 'rotated':
          stats.rotatedKeys++;
          break;
      }
    }
    
    return stats;
  }

  /**
   * Export key for backup
   */
  exportKey(keyId, password) {
    try {
      const key = this.getKey(keyId);
      if (!key) {
        throw new Error(`Key ${keyId} not found`);
      }
      
      // Create export package
      const exportData = {
        keyId: keyId,
        metadata: {
          type: key.type,
          size: key.size,
          algorithm: key.algorithm,
          createdAt: key.createdAt,
          version: key.version
        },
        encryptedKey: this.encryptionService.encrypt(key.keyMaterial, password).encryptedData,
        exportDate: Date.now(),
        exportVersion: '1.0'
      };
      
      return {
        success: true,
        exportData: exportData
      };
    } catch (error) {
      console.error(`Key export failed for ${keyId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Import key from backup
   */
  importKey(exportData, password) {
    try {
      const keyId = exportData.keyId;
      
      // Decrypt key material
      const decryptionResult = this.encryptionService.decrypt(
        exportData.encryptedKey,
        password
      );
      
      if (!decryptionResult.success) {
        throw new Error(`Failed to decrypt imported key: ${decryptionResult.error}`);
      }
      
      // Create key data
      const keyData = {
        ...exportData.metadata,
        id: keyId,
        createdAt: exportData.metadata.createdAt || Date.now(),
        expiresAt: Date.now() + this.keyRotationInterval,
        status: 'active',
        keyMaterial: decryptionResult.data
      };
      
      // Store key
      const keyPath = path.join(this.keysPath, `${keyId}.key`);
      const keyFile = {
        metadata: keyData,
        encryptedKey: this.encryptionService.encrypt(decryptionResult.data, 'master').encryptedData,
        keyId: 'master'
      };
      
      fs.writeFileSync(keyPath, JSON.stringify(keyFile, null, 2));
      fs.chmodSync(keyPath, 0o600);
      
      // Update in-memory keys
      this.keys.set(keyId, keyData);
      
      console.log(`Key imported: ${keyId}`);
      return {
        success: true,
        keyId: keyId
      };
    } catch (error) {
      console.error(`Key import failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = KeyManagementService;
