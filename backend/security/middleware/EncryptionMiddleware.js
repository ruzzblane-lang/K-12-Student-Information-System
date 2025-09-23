const EncryptionService = require('../services/EncryptionService');

/**
 * EncryptionMiddleware - Middleware for encrypting/decrypting sensitive data
 * Provides automatic encryption of payment and personal data
 */
class EncryptionMiddleware {
  constructor(config) {
    this.config = config;
    this.encryptionService = new EncryptionService(config);
    
    // Define fields that should be encrypted
    this.encryptedFields = new Set([
      // Payment data
      'cardNumber', 'cvv', 'expiryDate', 'bankAccountNumber', 'routingNumber',
      'iban', 'bic', 'upiId', 'phoneNumber', 'email',
      
      // Personal data
      'ssn', 'taxId', 'passportNumber', 'driversLicense',
      'address', 'phone', 'personalEmail',
      
      // Financial data
      'accountBalance', 'transactionAmount', 'feeAmount',
      'refundAmount', 'settlementAmount',
      
      // Authentication data
      'password', 'pin', 'otp', 'token', 'apiKey'
    ]);
    
    // Define fields that should be hashed (one-way)
    this.hashedFields = new Set([
      'password', 'pin', 'otp'
    ]);
    
    console.log('EncryptionMiddleware initialized');
  }

  /**
   * Middleware to encrypt sensitive data before saving to database
   */
  encryptSensitiveData() {
    return (req, res, next) => {
      try {
        // Encrypt sensitive fields in request body
        if (req.body) {
          req.body = this.encryptObject(req.body);
        }
        
        // Encrypt sensitive fields in request query
        if (req.query) {
          req.query = this.encryptObject(req.query);
        }
        
        // Encrypt sensitive fields in request params
        if (req.params) {
          req.params = this.encryptObject(req.params);
        }
        
        next();
      } catch (error) {
        console.error('Encryption middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Data encryption failed'
        });
      }
    };
  }

  /**
   * Middleware to decrypt sensitive data after retrieving from database
   */
  decryptSensitiveData() {
    return (req, res, next) => {
      try {
        // Decrypt sensitive fields in response data
        if (res.locals.data) {
          res.locals.data = this.decryptObject(res.locals.data);
        }
        
        next();
      } catch (error) {
        console.error('Decryption middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Data decryption failed'
        });
      }
    };
  }

  /**
   * Middleware to hash sensitive data (one-way encryption)
   */
  hashSensitiveData() {
    return async (req, res, next) => {
      try {
        if (req.body) {
          req.body = await this.hashObject(req.body);
        }
        
        next();
      } catch (error) {
        console.error('Hashing middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Data hashing failed'
        });
      }
    };
  }

  /**
   * Encrypt object recursively
   */
  encryptObject(obj, keyId = 'default') {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.encryptObject(item, keyId));
    }
    
    const encryptedObj = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.encryptedFields.has(key)) {
        // Encrypt sensitive field
        const encryptionResult = this.encryptionService.encrypt(value, keyId);
        if (encryptionResult.success) {
          encryptedObj[key] = encryptionResult.encryptedData;
          encryptedObj[`${key}_encrypted`] = true;
          encryptedObj[`${key}_keyId`] = encryptionResult.keyId;
        } else {
          console.error(`Failed to encrypt field ${key}:`, encryptionResult.error);
          encryptedObj[key] = value; // Keep original value if encryption fails
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively encrypt nested objects
        encryptedObj[key] = this.encryptObject(value, keyId);
      } else {
        // Keep non-sensitive fields as-is
        encryptedObj[key] = value;
      }
    }
    
    return encryptedObj;
  }

  /**
   * Decrypt object recursively
   */
  decryptObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.decryptObject(item));
    }
    
    const decryptedObj = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (obj[`${key}_encrypted`] && typeof value === 'string') {
        // Decrypt encrypted field
        const keyId = obj[`${key}_keyId`] || 'default';
        const decryptionResult = this.encryptionService.decrypt(value, keyId);
        if (decryptionResult.success) {
          decryptedObj[key] = decryptionResult.data;
        } else {
          console.error(`Failed to decrypt field ${key}:`, decryptionResult.error);
          decryptedObj[key] = value; // Keep encrypted value if decryption fails
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively decrypt nested objects
        decryptedObj[key] = this.decryptObject(value);
      } else {
        // Keep non-encrypted fields as-is
        decryptedObj[key] = value;
      }
    }
    
    return decryptedObj;
  }

  /**
   * Hash object recursively
   */
  async hashObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      const hashedArray = [];
      for (const item of obj) {
        hashedArray.push(await this.hashObject(item));
      }
      return hashedArray;
    }
    
    const hashedObj = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.hashedFields.has(key) && typeof value === 'string') {
        // Hash sensitive field
        try {
          hashedObj[key] = await this.encryptionService.hashPassword(value);
          hashedObj[`${key}_hashed`] = true;
        } catch (error) {
          console.error(`Failed to hash field ${key}:`, error);
          hashedObj[key] = value; // Keep original value if hashing fails
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively hash nested objects
        hashedObj[key] = await this.hashObject(value);
      } else {
        // Keep non-hashable fields as-is
        hashedObj[key] = value;
      }
    }
    
    return hashedObj;
  }

  /**
   * Verify hashed data
   */
  async verifyHashedData(plainText, hashedValue) {
    try {
      return await this.encryptionService.verifyPassword(plainText, hashedValue);
    } catch (error) {
      console.error('Hash verification failed:', error);
      return false;
    }
  }

  /**
   * Generate secure token for sensitive operations
   */
  generateSecureToken(length = 32) {
    return this.encryptionService.generateSecureToken(length);
  }

  /**
   * Encrypt specific field
   */
  encryptField(value, keyId = 'default') {
    if (!value) return value;
    
    const encryptionResult = this.encryptionService.encrypt(value, keyId);
    if (encryptionResult.success) {
      return {
        encrypted: encryptionResult.encryptedData,
        keyId: encryptionResult.keyId
      };
    }
    
    throw new Error(`Encryption failed: ${encryptionResult.error}`);
  }

  /**
   * Decrypt specific field
   */
  decryptField(encryptedValue, keyId = 'default') {
    if (!encryptedValue) return encryptedValue;
    
    const decryptionResult = this.encryptionService.decrypt(encryptedValue, keyId);
    if (decryptionResult.success) {
      return decryptionResult.data;
    }
    
    throw new Error(`Decryption failed: ${decryptionResult.error}`);
  }

  /**
   * Get encryption status
   */
  getEncryptionStatus() {
    return {
      encryptedFields: Array.from(this.encryptedFields),
      hashedFields: Array.from(this.hashedFields),
      encryptionService: this.encryptionService.getEncryptionStatus()
    };
  }

  /**
   * Add custom encrypted field
   */
  addEncryptedField(fieldName) {
    this.encryptedFields.add(fieldName);
  }

  /**
   * Add custom hashed field
   */
  addHashedField(fieldName) {
    this.hashedFields.add(fieldName);
  }

  /**
   * Remove encrypted field
   */
  removeEncryptedField(fieldName) {
    this.encryptedFields.delete(fieldName);
  }

  /**
   * Remove hashed field
   */
  removeHashedField(fieldName) {
    this.hashedFields.delete(fieldName);
  }
}

module.exports = EncryptionMiddleware;
