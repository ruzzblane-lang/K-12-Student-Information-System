/**
 * Security Service for Third-Party Integrations
 * 
 * Provides security features including encryption, authentication,
 * rate limiting, and compliance monitoring for all integrations.
 */

const crypto = require('crypto');
const winston = require('winston');
const rateLimit = require('express-rate-limit');

class SecurityService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'integration-security' },
      transports: [
        new winston.transports.File({ filename: 'logs/integration-security.log' }),
        new winston.transports.Console()
      ]
    });

    this.encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY || this.generateEncryptionKey();
    this.rateLimiters = new Map();
    this.suspiciousActivities = new Map();
  }

  /**
   * Encrypt sensitive data for storage
   * @param {string} data - Data to encrypt
   * @param {string} tenantId - Tenant identifier for key derivation
   * @returns {string} Encrypted data
   */
  encryptData(data, tenantId) {
    try {
      const key = this.deriveKey(tenantId);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', key);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      this.logger.error('Failed to encrypt data', {
        tenantId,
        error: error.message
      });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} tenantId - Tenant identifier for key derivation
   * @returns {string} Decrypted data
   */
  decryptData(encryptedData, tenantId) {
    try {
      const key = this.deriveKey(tenantId);
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt data', {
        tenantId,
        error: error.message
      });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Validate API credentials
   * @param {string} provider - Integration provider
   * @param {Object} credentials - API credentials
   * @returns {Promise<boolean>} Whether credentials are valid
   */
  async validateCredentials(provider, credentials) {
    try {
      // Basic validation
      if (!credentials || typeof credentials !== 'object') {
        return false;
      }

      // Provider-specific validation
      switch (provider) {
        case 'google_workspace':
          return this.validateGoogleCredentials(credentials);
        case 'microsoft_365':
          return this.validateMicrosoftCredentials(credentials);
        case 'stripe':
          return this.validateStripeCredentials(credentials);
        case 'twilio':
          return this.validateTwilioCredentials(credentials);
        default:
          return this.validateGenericCredentials(credentials);
      }
    } catch (error) {
      this.logger.error('Credential validation failed', {
        provider,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Create rate limiter for integration
   * @param {string} provider - Integration provider
   * @param {Object} options - Rate limiting options
   * @returns {Object} Rate limiter instance
   */
  createRateLimiter(provider, options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      ...options
    };

    const limiter = rateLimit(defaultOptions);
    this.rateLimiters.set(provider, limiter);
    
    return limiter;
  }

  /**
   * Check rate limit for tenant/provider combination
   * @param {string} tenantId - Tenant identifier
   * @param {string} provider - Integration provider
   * @param {string} method - API method being called
   * @returns {Promise<boolean>} Whether request is within rate limit
   */
  async checkRateLimit(tenantId, provider, method) {
    const key = `${tenantId}:${provider}:${method}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = this.getRateLimitForMethod(provider, method);

    // Get or create rate limit tracking
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, {
        requests: [],
        windowStart: now
      });
    }

    const rateLimitData = this.rateLimiters.get(key);
    
    // Clean old requests outside the window
    rateLimitData.requests = rateLimitData.requests.filter(
      timestamp => now - timestamp < windowMs
    );

    // Check if within limit
    if (rateLimitData.requests.length >= maxRequests) {
      this.logSuspiciousActivity(tenantId, provider, 'rate_limit_exceeded', {
        method,
        requestCount: rateLimitData.requests.length,
        limit: maxRequests
      });
      return false;
    }

    // Add current request
    rateLimitData.requests.push(now);
    return true;
  }

  /**
   * Monitor for suspicious activities
   * @param {string} tenantId - Tenant identifier
   * @param {string} provider - Integration provider
   * @param {string} activity - Activity type
   * @param {Object} metadata - Additional metadata
   */
  logSuspiciousActivity(tenantId, provider, activity, metadata = {}) {
    const key = `${tenantId}:${provider}`;
    const now = Date.now();
    
    if (!this.suspiciousActivities.has(key)) {
      this.suspiciousActivities.set(key, []);
    }

    const activities = this.suspiciousActivities.get(key);
    activities.push({
      activity,
      metadata,
      timestamp: now
    });

    // Keep only last 100 activities
    if (activities.length > 100) {
      activities.splice(0, activities.length - 100);
    }

    this.logger.warn('Suspicious activity detected', {
      tenantId,
      provider,
      activity,
      metadata
    });

    // Check for patterns that might indicate abuse
    this.checkForAbusePatterns(tenantId, provider, activities);
  }

  /**
   * Check for abuse patterns in activities
   * @param {string} tenantId - Tenant identifier
   * @param {string} provider - Integration provider
   * @param {Array} activities - Recent activities
   * @private
   */
  checkForAbusePatterns(tenantId, provider, activities) {
    const now = Date.now();
    const recentActivities = activities.filter(
      activity => now - activity.timestamp < 60 * 60 * 1000 // Last hour
    );

    // Check for excessive failed attempts
    const failedAttempts = recentActivities.filter(
      activity => activity.activity === 'authentication_failed'
    );

    if (failedAttempts.length > 10) {
      this.logger.error('Potential brute force attack detected', {
        tenantId,
        provider,
        failedAttempts: failedAttempts.length
      });
      
      // Could implement automatic blocking here
      this.emit('security:abuse_detected', {
        tenantId,
        provider,
        type: 'brute_force',
        severity: 'high'
      });
    }

    // Check for unusual API usage patterns
    const rateLimitExceeded = recentActivities.filter(
      activity => activity.activity === 'rate_limit_exceeded'
    );

    if (rateLimitExceeded.length > 5) {
      this.logger.warn('Excessive rate limit violations', {
        tenantId,
        provider,
        violations: rateLimitExceeded.length
      });
    }
  }

  /**
   * Generate secure API key for integration
   * @param {string} provider - Integration provider
   * @param {string} tenantId - Tenant identifier
   * @returns {string} Generated API key
   */
  generateApiKey(provider, tenantId) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(32);
    const data = `${provider}:${tenantId}:${timestamp}:${randomBytes.toString('hex')}`;
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Validate webhook signature
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @param {string} secret - Webhook secret
   * @param {string} provider - Integration provider
   * @returns {boolean} Whether signature is valid
   */
  validateWebhookSignature(payload, signature, secret, provider) {
    try {
      switch (provider) {
        case 'stripe':
          return this.validateStripeWebhook(payload, signature, secret);
        case 'twilio':
          return this.validateTwilioWebhook(payload, signature, secret);
        case 'sendgrid':
          return this.validateSendGridWebhook(payload, signature, secret);
        default:
          return this.validateGenericWebhook(payload, signature, secret);
      }
    } catch (error) {
      this.logger.error('Webhook signature validation failed', {
        provider,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get rate limit for specific method
   * @param {string} provider - Integration provider
   * @param {string} method - API method
   * @returns {number} Rate limit
   * @private
   */
  getRateLimitForMethod(provider, method) {
    const limits = {
      google_workspace: {
        default: 100,
        'drive.files.create': 50,
        'calendar.events.insert': 200
      },
      microsoft_365: {
        default: 100,
        'graph.users.create': 30,
        'graph.teams.create': 10
      },
      stripe: {
        default: 100,
        'charges.create': 200,
        'customers.create': 100
      },
      twilio: {
        default: 100,
        'messages.create': 1000,
        'calls.create': 100
      }
    };

    return limits[provider]?.[method] || limits[provider]?.default || 100;
  }

  /**
   * Validate Google Workspace credentials
   * @param {Object} credentials - Google credentials
   * @returns {boolean} Whether credentials are valid
   * @private
   */
  validateGoogleCredentials(credentials) {
    return !!(credentials.client_id && credentials.client_secret && credentials.refresh_token);
  }

  /**
   * Validate Microsoft 365 credentials
   * @param {Object} credentials - Microsoft credentials
   * @returns {boolean} Whether credentials are valid
   * @private
   */
  validateMicrosoftCredentials(credentials) {
    return !!(credentials.client_id && credentials.client_secret && credentials.tenant_id);
  }

  /**
   * Validate Stripe credentials
   * @param {Object} credentials - Stripe credentials
   * @returns {boolean} Whether credentials are valid
   * @private
   */
  validateStripeCredentials(credentials) {
    return !!(credentials.secret_key && credentials.publishable_key);
  }

  /**
   * Validate Twilio credentials
   * @param {Object} credentials - Twilio credentials
   * @returns {boolean} Whether credentials are valid
   * @private
   */
  validateTwilioCredentials(credentials) {
    return !!(credentials.account_sid && credentials.auth_token);
  }

  /**
   * Validate generic credentials
   * @param {Object} credentials - Generic credentials
   * @returns {boolean} Whether credentials are valid
   * @private
   */
  validateGenericCredentials(credentials) {
    return !!(credentials.api_key || credentials.access_token);
  }

  /**
   * Derive encryption key for tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Buffer} Derived key
   * @private
   */
  deriveKey(tenantId) {
    return crypto.pbkdf2Sync(this.encryptionKey, tenantId, 100000, 32, 'sha256');
  }

  /**
   * Generate encryption key
   * @returns {string} Generated key
   * @private
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = SecurityService;
