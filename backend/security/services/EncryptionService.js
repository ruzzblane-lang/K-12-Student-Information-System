const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * EncryptionService - Provides end-to-end encryption using AES-256-GCM
 * Implements secure key management and data encryption/decryption
 */
class EncryptionService {
  constructor(config) {
    this.config = config;
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    
    // Initialize encryption keys
    this.masterKey = this.loadOrGenerateMasterKey();
    this.encryptionKeys = new Map();
    
    // Initialize key rotation schedule
    this.keyRotationInterval = config.keyRotationInterval || 90 * 24 * 60 * 60 * 1000; // 90 days
    this.lastKeyRotation = this.loadLastKeyRotation();
    
    console.log('EncryptionService initialized with AES-256-GCM');
  }

  /**
   * Load or generate master encryption key
   */
  loadOrGenerateMasterKey() {
    const keyPath = path.join(process.cwd(), 'config', 'encryption', 'master.key');
    
    try {
      // Try to load existing master key
      if (fs.existsSync(keyPath)) {
        const encryptedKey = fs.readFileSync(keyPath);
        const keyData = JSON.parse(encryptedKey.toString());
        
        // Decrypt master key using environment variable
        const envKey = process.env.MASTER_ENCRYPTION_KEY;
        if (!envKey) {
          throw new Error('MASTER_ENCRYPTION_KEY environment variable not set');
        }
        
        return this.decryptKey(keyData, envKey);
      }
    } catch (error) {
      console.warn('Could not load existing master key, generating new one:', error.message);
    }
    
    // Generate new master key
    const masterKey = crypto.randomBytes(this.keyLength);
    
    // Encrypt and store master key
    const envKey = process.env.MASTER_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    const encryptedKey = this.encryptKey(masterKey, envKey);
    
    // Ensure directory exists
    const keyDir = path.dirname(keyPath);
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true });
    }
    
    fs.writeFileSync(keyPath, JSON.stringify(encryptedKey));
    
    console.log('New master encryption key generated and stored');
    return masterKey;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data, keyId = 'default') {
    try {
      // Get or generate encryption key
      const encryptionKey = this.getEncryptionKey(keyId);
      
      // Generate random IV and salt
      const iv = crypto.randomBytes(this.ivLength);
      const salt = crypto.randomBytes(this.saltLength);
      
      // Derive key from master key and salt
      const derivedKey = crypto.pbkdf2Sync(encryptionKey, salt, 100000, this.keyLength, 'sha256');
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, derivedKey);
      cipher.setAAD(Buffer.from(keyId, 'utf8')); // Additional authenticated data
      
      // Encrypt data
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Create encrypted payload
      const encryptedPayload = {
        version: '1.0',
        algorithm: this.algorithm,
        keyId: keyId,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        tag: tag.toString('base64'),
        data: encrypted,
        timestamp: Date.now()
      };
      
      return {
        success: true,
        encryptedData: Buffer.from(JSON.stringify(encryptedPayload)).toString('base64'),
        keyId: keyId
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData, keyId = 'default') {
    try {
      // Parse encrypted payload
      const payload = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      
      // Validate payload
      if (payload.version !== '1.0' || payload.algorithm !== this.algorithm) {
        throw new Error('Invalid encryption payload version or algorithm');
      }
      
      // Get encryption key
      const encryptionKey = this.getEncryptionKey(payload.keyId || keyId);
      
      // Convert base64 strings back to buffers
      const iv = Buffer.from(payload.iv, 'base64');
      const salt = Buffer.from(payload.salt, 'base64');
      const tag = Buffer.from(payload.tag, 'base64');
      
      // Derive key from master key and salt
      const derivedKey = crypto.pbkdf2Sync(encryptionKey, salt, 100000, this.keyLength, 'sha256');
      
      // Create decipher
      const decipher = crypto.createDecipher(this.algorithm, derivedKey);
      decipher.setAAD(Buffer.from(payload.keyId || keyId, 'utf8')); // Additional authenticated data
      decipher.setAuthTag(tag);
      
      // Decrypt data
      let decrypted = decipher.update(payload.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return {
        success: true,
        data: JSON.parse(decrypted)
      };
    } catch (error) {
      console.error('Decryption failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get or generate encryption key for specific key ID
   */
  getEncryptionKey(keyId) {
    if (this.encryptionKeys.has(keyId)) {
      return this.encryptionKeys.get(keyId);
    }
    
    // Generate new key for this key ID
    const key = crypto.randomBytes(this.keyLength);
    this.encryptionKeys.set(keyId, key);
    
    return key;
  }

  /**
   * Encrypt a key using another key (for master key storage)
   */
  encryptKey(key, password) {
    const salt = crypto.randomBytes(this.saltLength);
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
    
    const cipher = crypto.createCipher('aes-256-gcm', derivedKey);
    let encrypted = cipher.update(key, null, 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      salt: salt.toString('base64'),
      tag: tag.toString('base64')
    };
  }

  /**
   * Decrypt a key using another key (for master key retrieval)
   */
  decryptKey(encryptedKeyData, password) {
    const salt = Buffer.from(encryptedKeyData.salt, 'base64');
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
    
    const decipher = crypto.createDecipher('aes-256-gcm', derivedKey);
    decipher.setAuthTag(Buffer.from(encryptedKeyData.tag, 'base64'));
    
    let decrypted = decipher.update(encryptedKeyData.encrypted, 'base64', null);
    decrypted += decipher.final();
    
    return decrypted;
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password, saltRounds = 12) {
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password, hash) {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hash);
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys() {
    try {
      console.log('Starting key rotation...');
      
      // Generate new master key
      const newMasterKey = crypto.randomBytes(this.keyLength);
      
      // Update all existing keys
      for (const [keyId, oldKey] of this.encryptionKeys) {
        const newKey = crypto.randomBytes(this.keyLength);
        this.encryptionKeys.set(keyId, newKey);
      }
      
      // Update master key
      this.masterKey = newMasterKey;
      
      // Save new master key
      const keyPath = path.join(process.cwd(), 'config', 'encryption', 'master.key');
      const envKey = process.env.MASTER_ENCRYPTION_KEY;
      const encryptedKey = this.encryptKey(newMasterKey, envKey);
      fs.writeFileSync(keyPath, JSON.stringify(encryptedKey));
      
      // Update rotation timestamp
      this.lastKeyRotation = Date.now();
      this.saveLastKeyRotation();
      
      console.log('Key rotation completed successfully');
      return { success: true };
    } catch (error) {
      console.error('Key rotation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load last key rotation timestamp
   */
  loadLastKeyRotation() {
    const rotationPath = path.join(process.cwd(), 'config', 'encryption', 'rotation.json');
    
    try {
      if (fs.existsSync(rotationPath)) {
        const data = fs.readFileSync(rotationPath, 'utf8');
        return JSON.parse(data).lastRotation;
      }
    } catch (error) {
      console.warn('Could not load key rotation data:', error.message);
    }
    
    return Date.now();
  }

  /**
   * Save last key rotation timestamp
   */
  saveLastKeyRotation() {
    const rotationPath = path.join(process.cwd(), 'config', 'encryption', 'rotation.json');
    const rotationDir = path.dirname(rotationPath);
    
    if (!fs.existsSync(rotationDir)) {
      fs.mkdirSync(rotationDir, { recursive: true });
    }
    
    fs.writeFileSync(rotationPath, JSON.stringify({
      lastRotation: this.lastKeyRotation,
      nextRotation: this.lastKeyRotation + this.keyRotationInterval
    }));
  }

  /**
   * Check if key rotation is needed
   */
  isKeyRotationNeeded() {
    return (Date.now() - this.lastKeyRotation) > this.keyRotationInterval;
  }

  /**
   * Get encryption status and statistics
   */
  getEncryptionStatus() {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      activeKeys: this.encryptionKeys.size,
      lastKeyRotation: this.lastKeyRotation,
      nextRotationDue: this.lastKeyRotation + this.keyRotationInterval,
      rotationNeeded: this.isKeyRotationNeeded()
    };
  }
}

module.exports = EncryptionService;
