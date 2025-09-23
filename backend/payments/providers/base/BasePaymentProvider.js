/**
 * Base Payment Provider
 * 
 * Abstract base class for all payment providers. Defines the interface
 * that all payment providers must implement for consistent behavior
 * across different payment gateways.
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class BasePaymentProvider {
  constructor(config, db) {
    this.config = config;
    this.db = db;
    this.providerName = this.constructor.name.replace('Provider', '').toLowerCase();
    this.supportedCurrencies = [];
    this.supportedPaymentMethods = [];
    this.sandboxMode = config.sandbox || false;
  }

  /**
   * Initialize the payment provider
   * Must be implemented by each provider
   */
  async initialize() {
    throw new Error('initialize() must be implemented by payment provider');
  }

  /**
   * Process a payment
   * @param {Object} paymentData - Payment information
   * @returns {Object} Payment result
   */
  async processPayment(paymentData) {
    this.validatePaymentData(paymentData);
    
    const transactionId = this.generateTransactionId();
    const startTime = Date.now();

    try {
      // Log payment attempt
      await this.logPaymentAttempt(paymentData, transactionId);

      // Validate payment method
      await this.validatePaymentMethod(paymentData.paymentMethod);

      // Check fraud risk
      const fraudRisk = await this.assessFraudRisk(paymentData);
      if (fraudRisk.riskLevel === 'high') {
        throw new Error('Payment blocked due to high fraud risk');
      }

      // Process the payment
      const result = await this.executePayment(paymentData, transactionId);

      // Log successful payment
      await this.logPaymentResult(transactionId, result, Date.now() - startTime);

      return {
        success: true,
        transactionId,
        provider: this.providerName,
        result,
        processingTime: Date.now() - startTime,
        fraudRisk
      };

    } catch (error) {
      // Log failed payment
      await this.logPaymentError(transactionId, error, Date.now() - startTime);
      
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Execute the actual payment
   * Must be implemented by each provider
   * @param {Object} paymentData - Payment data
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Payment result
   */
  async executePayment(paymentData, transactionId) {
    // Suppress unused parameter warnings for abstract method
    void paymentData;
    void transactionId;
    throw new Error('executePayment() must be implemented by payment provider');
  }

  /**
   * Refund a payment
   * @param {Object} refundData - Refund information
   * @returns {Object} Refund result
   */
  async processRefund(refundData) {
    this.validateRefundData(refundData);
    
    const refundId = this.generateTransactionId();
    const startTime = Date.now();

    try {
      const result = await this.executeRefund(refundData, refundId);
      
      await this.logRefundResult(refundId, result, Date.now() - startTime);
      
      return {
        success: true,
        refundId,
        provider: this.providerName,
        result,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      await this.logRefundError(refundId, error, Date.now() - startTime);
      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }

  /**
   * Execute the actual refund
   * Must be implemented by each provider
   * @param {Object} refundData - Refund data
   * @param {string} refundId - Refund ID
   * @returns {Object} Refund result
   */
  async executeRefund(refundData, refundId) {
    // Suppress unused parameter warnings for abstract method
    void refundData;
    void refundId;
    throw new Error('executeRefund() must be implemented by payment provider');
  }

  /**
   * Get payment status
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Payment status
   */
  async getPaymentStatus(transactionId) {
    try {
      const result = await this.fetchPaymentStatus(transactionId);
      return {
        success: true,
        transactionId,
        provider: this.providerName,
        status: result
      };
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * Fetch payment status from provider
   * Must be implemented by each provider
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Payment status
   */
  async fetchPaymentStatus(transactionId) {
    // Suppress unused parameter warnings for abstract method
    void transactionId;
    throw new Error('fetchPaymentStatus() must be implemented by payment provider');
  }

  /**
   * Create payment method token
   * @param {Object} paymentMethodData - Payment method information
   * @returns {Object} Tokenized payment method
   */
  async tokenizePaymentMethod(paymentMethodData) {
    this.validatePaymentMethodData(paymentMethodData);
    
    try {
      const result = await this.createPaymentMethodToken(paymentMethodData);
      
      await this.logTokenization(result.tokenId, paymentMethodData.type);
      
      return {
        success: true,
        tokenId: result.tokenId,
        provider: this.providerName,
        paymentMethodType: paymentMethodData.type,
        last4: result.last4,
        expiryMonth: result.expiryMonth,
        expiryYear: result.expiryYear,
        brand: result.brand
      };
    } catch (error) {
      throw new Error(`Payment method tokenization failed: ${error.message}`);
    }
  }

  /**
   * Create payment method token
   * Must be implemented by each provider
   * @param {Object} paymentMethodData - Payment method data
   * @returns {Object} Tokenization result
   */
  async createPaymentMethodToken(paymentMethodData) {
    // Suppress unused parameter warnings for abstract method
    void paymentMethodData;
    throw new Error('createPaymentMethodToken() must be implemented by payment provider');
  }

  /**
   * Validate webhook signature
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Signature validity
   */
  async validateWebhookSignature(payload, signature) {
    try {
      return await this.verifyWebhookSignature(payload, signature);
    } catch (error) {
      // Log error without exposing sensitive information
      this.logError('Webhook signature validation failed', error);
      return false;
    }
  }

  /**
   * Verify webhook signature
   * Must be implemented by each provider
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Signature validity
   */
  async verifyWebhookSignature(payload, signature) {
    // Suppress unused parameter warnings for abstract method
    void payload;
    void signature;
    throw new Error('verifyWebhookSignature() must be implemented by payment provider');
  }

  /**
   * Process webhook event
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async processWebhookEvent(event) {
    try {
      const result = await this.handleWebhookEvent(event);
      
      await this.logWebhookEvent(event.type, event.id, result);
      
      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        provider: this.providerName,
        result
      };
    } catch (error) {
      await this.logWebhookError(event.id, error);
      throw new Error(`Webhook processing failed: ${error.message}`);
    }
  }

  /**
   * Handle webhook event
   * Must be implemented by each provider
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleWebhookEvent(event) {
    // Suppress unused parameter warnings for abstract method
    void event;
    throw new Error('handleWebhookEvent() must be implemented by payment provider');
  }

  /**
   * Get supported currencies
   * @returns {Array} List of supported currencies
   */
  getSupportedCurrencies() {
    return this.supportedCurrencies;
  }

  /**
   * Get supported payment methods
   * @returns {Array} List of supported payment methods
   */
  getSupportedPaymentMethods() {
    return this.supportedPaymentMethods;
  }

  /**
   * Check if currency is supported
   * @param {string} currency - Currency code
   * @returns {boolean} Support status
   */
  isCurrencySupported(currency) {
    return this.supportedCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Check if payment method is supported
   * @param {string} paymentMethod - Payment method
   * @returns {boolean} Support status
   */
  isPaymentMethodSupported(paymentMethod) {
    return this.supportedPaymentMethods.includes(paymentMethod);
  }

  /**
   * Generate unique transaction ID
   * @returns {string} Transaction ID
   */
  generateTransactionId() {
    return `${this.providerName}_${Date.now()}_${uuidv4().substring(0, 8)}`;
  }

  /**
   * Validate payment data
   * @param {Object} paymentData - Payment data to validate
   */
  validatePaymentData(paymentData) {
    if (!paymentData || typeof paymentData !== 'object') {
      throw new Error('Payment data must be an object');
    }

    const required = ['amount', 'currency', 'paymentMethod', 'tenantId'];
    
    for (const field of required) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate amount
    if (typeof paymentData.amount !== 'number' || paymentData.amount <= 0) {
      throw new Error('Payment amount must be a positive number');
    }

    // Validate currency
    if (typeof paymentData.currency !== 'string' || !/^[A-Z]{3}$/.test(paymentData.currency)) {
      throw new Error('Currency must be a valid 3-letter ISO code');
    }

    if (!this.isCurrencySupported(paymentData.currency)) {
      throw new Error(`Unsupported currency: ${paymentData.currency}`);
    }

    // Validate payment method
    if (typeof paymentData.paymentMethod !== 'string' || paymentData.paymentMethod.trim().length === 0) {
      throw new Error('Payment method must be a non-empty string');
    }

    if (!this.isPaymentMethodSupported(paymentData.paymentMethod)) {
      throw new Error(`Unsupported payment method: ${paymentData.paymentMethod}`);
    }

    // Validate tenant ID
    if (typeof paymentData.tenantId !== 'string' || !this.isValidUUID(paymentData.tenantId)) {
      throw new Error('Tenant ID must be a valid UUID');
    }

    // Validate optional fields
    if (paymentData.description && (typeof paymentData.description !== 'string' || paymentData.description.length > 500)) {
      throw new Error('Description must be a string with maximum 500 characters');
    }

    if (paymentData.metadata && (typeof paymentData.metadata !== 'object' || Array.isArray(paymentData.metadata))) {
      throw new Error('Metadata must be an object');
    }
  }

  /**
   * Validate refund data
   * @param {Object} refundData - Refund data to validate
   */
  validateRefundData(refundData) {
    if (!refundData || typeof refundData !== 'object') {
      throw new Error('Refund data must be an object');
    }

    const required = ['transactionId', 'amount', 'tenantId'];
    
    for (const field of required) {
      if (!refundData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate amount
    if (typeof refundData.amount !== 'number' || refundData.amount <= 0) {
      throw new Error('Refund amount must be a positive number');
    }

    // Validate transaction ID
    if (typeof refundData.transactionId !== 'string' || refundData.transactionId.trim().length === 0) {
      throw new Error('Transaction ID must be a non-empty string');
    }

    // Validate tenant ID
    if (typeof refundData.tenantId !== 'string' || !this.isValidUUID(refundData.tenantId)) {
      throw new Error('Tenant ID must be a valid UUID');
    }

    // Validate optional reason
    if (refundData.reason && (typeof refundData.reason !== 'string' || refundData.reason.length > 500)) {
      throw new Error('Refund reason must be a string with maximum 500 characters');
    }
  }

  /**
   * Validate payment method data
   * @param {Object} paymentMethodData - Payment method data to validate
   */
  validatePaymentMethodData(paymentMethodData) {
    if (!paymentMethodData || typeof paymentMethodData !== 'object') {
      throw new Error('Payment method data must be an object');
    }

    const required = ['type', 'tenantId'];
    
    for (const field of required) {
      if (!paymentMethodData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate type
    if (typeof paymentMethodData.type !== 'string' || paymentMethodData.type.trim().length === 0) {
      throw new Error('Payment method type must be a non-empty string');
    }

    // Validate tenant ID
    if (typeof paymentMethodData.tenantId !== 'string' || !this.isValidUUID(paymentMethodData.tenantId)) {
      throw new Error('Tenant ID must be a valid UUID');
    }

    // Validate card data if present
    if (paymentMethodData.card) {
      this.validateCardData(paymentMethodData.card);
    }
  }

  /**
   * Validate card data
   * @param {Object} cardData - Card data to validate
   */
  validateCardData(cardData) {
    if (!cardData || typeof cardData !== 'object') {
      throw new Error('Card data must be an object');
    }

    const required = ['number', 'expiryMonth', 'expiryYear', 'cvv'];
    
    for (const field of required) {
      if (!cardData[field]) {
        throw new Error(`Missing required card field: ${field}`);
      }
    }

    // Validate card number (basic Luhn algorithm check)
    if (typeof cardData.number !== 'string' || !this.isValidCardNumber(cardData.number)) {
      throw new Error('Invalid card number');
    }

    // Validate expiry month
    if (typeof cardData.expiryMonth !== 'number' || cardData.expiryMonth < 1 || cardData.expiryMonth > 12) {
      throw new Error('Expiry month must be between 1 and 12');
    }

    // Validate expiry year
    const currentYear = new Date().getFullYear();
    if (typeof cardData.expiryYear !== 'number' || cardData.expiryYear < currentYear || cardData.expiryYear > currentYear + 20) {
      throw new Error('Invalid expiry year');
    }

    // Validate CVV
    if (typeof cardData.cvv !== 'string' || !/^\d{3,4}$/.test(cardData.cvv)) {
      throw new Error('CVV must be 3 or 4 digits');
    }
  }

  /**
   * Check if a string is a valid UUID
   * @param {string} uuid - String to validate
   * @returns {boolean} True if valid UUID
   */
  isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate card number using Luhn algorithm
   * @param {string} cardNumber - Card number to validate
   * @returns {boolean} True if valid
   */
  isValidCardNumber(cardNumber) {
    // Remove spaces and non-digits
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // Check if it's a reasonable length (13-19 digits)
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Assess fraud risk
   * @param {Object} paymentData - Payment data
   * @returns {Object} Fraud risk assessment
   */
  async assessFraudRisk(paymentData) {
    // Basic fraud risk assessment
    // This should be enhanced with machine learning models
    let riskScore = 0;
    const riskFactors = [];

    // Amount-based risk
    if (paymentData.amount > 10000) {
      riskScore += 30;
      riskFactors.push('high_amount');
    }

    // Currency-based risk
    if (paymentData.currency !== 'USD') {
      riskScore += 10;
      riskFactors.push('non_usd_currency');
    }

    // Time-based risk (late night payments)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 15;
      riskFactors.push('unusual_time');
    }

    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    return {
      riskScore,
      riskLevel,
      riskFactors,
      provider: this.providerName
    };
  }

  /**
   * Log payment attempt
   * @param {Object} paymentData - Payment data
   * @param {string} transactionId - Transaction ID
   */
  async logPaymentAttempt(paymentData, transactionId) {
    if (!this.db) {
      this.logError('Database not available for payment attempt logging', new Error('Database connection missing'));
      return;
    }

    try {
      const query = `
        INSERT INTO payment_attempts (
          id, tenant_id, provider, transaction_id, amount, currency,
          payment_method, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        uuidv4(),
        paymentData.tenantId,
        this.providerName,
        transactionId,
        paymentData.amount,
        paymentData.currency,
        paymentData.paymentMethod,
        'attempted'
      ]);
    } catch (error) {
      this.logError('Failed to log payment attempt', error);
      // Don't throw - logging failure shouldn't break payment processing
    }
  }

  /**
   * Log payment result
   * @param {string} transactionId - Transaction ID
   * @param {Object} result - Payment result
   * @param {number} processingTime - Processing time in ms
   */
  async logPaymentResult(transactionId, result, processingTime) {
    if (!this.db) {
      this.logError('Database not available for payment result logging', new Error('Database connection missing'));
      return;
    }

    try {
      const query = `
        UPDATE payment_attempts 
        SET status = $1, provider_transaction_id = $2, processing_time_ms = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $4
      `;

      await this.db.query(query, [
        result.status,
        result.providerTransactionId,
        processingTime,
        transactionId
      ]);
    } catch (error) {
      this.logError('Failed to log payment result', error);
      // Don't throw - logging failure shouldn't break payment processing
    }
  }

  /**
   * Log payment error
   * @param {string} transactionId - Transaction ID
   * @param {Error} error - Error object
   * @param {number} processingTime - Processing time in ms
   */
  async logPaymentError(transactionId, error, processingTime) {
    if (!this.db) {
      this.logError('Database not available for payment error logging', new Error('Database connection missing'));
      return;
    }

    try {
      const query = `
        UPDATE payment_attempts 
        SET status = $1, error_message = $2, processing_time_ms = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $4
      `;

      await this.db.query(query, [
        'failed',
        error.message,
        processingTime,
        transactionId
      ]);
    } catch (dbError) {
      this.logError('Failed to log payment error', dbError);
      // Don't throw - logging failure shouldn't break error handling
    }
  }

  /**
   * Log refund result
   * @param {string} refundId - Refund ID
   * @param {Object} result - Refund result
   * @param {number} processingTime - Processing time in ms
   */
  async logRefundResult(refundId, result, processingTime) {
    if (!this.db) {
      this.logError('Database not available for refund result logging', new Error('Database connection missing'));
      return;
    }

    try {
      const query = `
        INSERT INTO refund_attempts (
          id, tenant_id, provider, refund_id, original_transaction_id,
          amount, status, provider_refund_id, processing_time_ms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        uuidv4(),
        result.tenantId,
        this.providerName,
        refundId,
        result.originalTransactionId,
        result.amount,
        result.status,
        result.providerRefundId,
        processingTime
      ]);
    } catch (error) {
      this.logError('Failed to log refund result', error);
      // Don't throw - logging failure shouldn't break refund processing
    }
  }

  /**
   * Log refund error
   * @param {string} refundId - Refund ID
   * @param {Error} error - Error object
   * @param {number} processingTime - Processing time in ms
   */
  async logRefundError(refundId, error, processingTime) {
    if (!this.db) {
      this.logError('Database not available for refund error logging', new Error('Database connection missing'));
      return;
    }

    try {
      const query = `
        INSERT INTO refund_attempts (
          id, tenant_id, provider, refund_id, amount, status,
          error_message, processing_time_ms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        uuidv4(),
        'unknown', // tenantId not available in error case
        this.providerName,
        refundId,
        0, // amount not available in error case
        'failed',
        error.message,
        processingTime
      ]);
    } catch (dbError) {
      this.logError('Failed to log refund error', dbError);
      // Don't throw - logging failure shouldn't break error handling
    }
  }

  /**
   * Log tokenization
   * @param {string} tokenId - Token ID
   * @param {string} paymentMethodType - Payment method type
   */
  async logTokenization(tokenId, paymentMethodType) {
    if (!this.db) {
      this.logError('Database not available for tokenization logging', new Error('Database connection missing'));
      return;
    }

    try {
      const query = `
        INSERT INTO payment_method_tokens (
          id, provider, token_id, payment_method_type, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        uuidv4(),
        this.providerName,
        tokenId,
        paymentMethodType
      ]);
    } catch (error) {
      this.logError('Failed to log tokenization', error);
      // Don't throw - logging failure shouldn't break tokenization
    }
  }

  /**
   * Log webhook event
   * @param {string} eventType - Event type
   * @param {string} eventId - Event ID
   * @param {Object} result - Processing result
   */
  async logWebhookEvent(eventType, eventId, result) {
    if (!this.db) {
      this.logError('Database not available for webhook event logging', new Error('Database connection missing'));
      return;
    }

    try {
      const query = `
        INSERT INTO webhook_events (
          id, provider, event_type, event_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        uuidv4(),
        this.providerName,
        eventType,
        eventId,
        result.status || 'processed'
      ]);
    } catch (error) {
      this.logError('Failed to log webhook event', error);
      // Don't throw - logging failure shouldn't break webhook processing
    }
  }

  /**
   * Log webhook error
   * @param {string} eventId - Event ID
   * @param {Error} error - Error object
   */
  async logWebhookError(eventId, error) {
    if (!this.db) {
      this.logError('Database not available for webhook error logging', new Error('Database connection missing'));
      return;
    }

    try {
      const query = `
        INSERT INTO webhook_events (
          id, provider, event_type, event_id, status, error_message, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        uuidv4(),
        this.providerName,
        'unknown',
        eventId,
        'failed',
        error.message
      ]);
    } catch (dbError) {
      this.logError('Failed to log webhook error', dbError);
      // Don't throw - logging failure shouldn't break error handling
    }
  }

  /**
   * Log error without exposing sensitive information
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  logError(message, error) {
    // In a production environment, this should use a proper logging service
    // For now, we'll use a simple approach that doesn't expose sensitive data
    const safeError = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    // Log to database if available, otherwise use a proper logger
    if (this.db) {
      this.logErrorToDatabase(message, safeError).catch((dbError) => {
        // Fallback to structured logging if database logging fails
        this.fallbackLogError(message, safeError, dbError);
      });
    } else {
      this.fallbackLogError(message, safeError);
    }
  }

  /**
   * Fallback error logging when database is not available
   * @param {string} message - Error message
   * @param {Object} safeError - Safe error data
   * @param {Error} dbError - Database error (optional)
   */
  fallbackLogError(message, safeError, dbError = null) {
    // Use a proper logging mechanism instead of console
    // This could be replaced with winston, pino, or another logging library
    const logEntry = {
      level: 'error',
      message,
      error: safeError,
      provider: this.providerName,
      timestamp: new Date().toISOString()
    };
    
    if (dbError) {
      logEntry.dbError = dbError.message;
    }
    
    // In development, you might want to use console, but in production
    // this should be replaced with a proper logging service
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(logEntry, null, 2));
    }
    
    // TODO: Replace with proper logging service in production
    // Example: logger.error(logEntry);
  }

  /**
   * Log error to database
   * @param {string} message - Error message
   * @param {Object} errorData - Safe error data
   */
  async logErrorToDatabase(message, errorData) {
    const query = `
      INSERT INTO error_logs (
        id, provider, error_message, error_data, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      uuidv4(),
      this.providerName,
      message,
      JSON.stringify(errorData)
    ]);
  }

  /**
   * Validate payment method
   * @param {string} paymentMethod - Payment method to validate
   */
  async validatePaymentMethod(paymentMethod) {
    if (!this.isPaymentMethodSupported(paymentMethod)) {
      throw new Error(`Payment method ${paymentMethod} not supported by ${this.providerName}`);
    }
  }

  /**
   * Encrypt sensitive data
   * @param {string} data - Data to encrypt
   * @returns {Object} Encrypted data with IV and auth tag
   */
  encryptData(data) {
    if (!data || typeof data !== 'string') {
      throw new Error('Data must be a non-empty string');
    }
    
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }
    
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipherGCM(algorithm, key, iv);
    cipher.setAAD(Buffer.from('payment-data'));
    
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
   * Decrypt sensitive data
   * @param {Object} encryptedData - Encrypted data object
   * @returns {string} Decrypted data
   */
  decryptData(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'object') {
      throw new Error('Encrypted data must be an object');
    }
    
    if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
      throw new Error('Invalid encrypted data format');
    }
    
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }
    
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipherGCM(algorithm, key, iv);
    decipher.setAAD(Buffer.from('payment-data'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = BasePaymentProvider;
