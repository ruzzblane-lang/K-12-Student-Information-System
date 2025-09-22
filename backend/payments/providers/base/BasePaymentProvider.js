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
   */
  async executePayment(paymentData, transactionId) {
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
   */
  async executeRefund(refundData, refundId) {
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
   */
  async fetchPaymentStatus(transactionId) {
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
   */
  async createPaymentMethodToken(paymentMethodData) {
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
      console.error('Webhook signature validation failed:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature
   * Must be implemented by each provider
   */
  async verifyWebhookSignature(payload, signature) {
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
   */
  async handleWebhookEvent(event) {
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
    const required = ['amount', 'currency', 'paymentMethod', 'tenantId'];
    
    for (const field of required) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (paymentData.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (!this.isCurrencySupported(paymentData.currency)) {
      throw new Error(`Unsupported currency: ${paymentData.currency}`);
    }

    if (!this.isPaymentMethodSupported(paymentData.paymentMethod)) {
      throw new Error(`Unsupported payment method: ${paymentData.paymentMethod}`);
    }
  }

  /**
   * Validate refund data
   * @param {Object} refundData - Refund data to validate
   */
  validateRefundData(refundData) {
    const required = ['transactionId', 'amount', 'tenantId'];
    
    for (const field of required) {
      if (!refundData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (refundData.amount <= 0) {
      throw new Error('Refund amount must be greater than 0');
    }
  }

  /**
   * Validate payment method data
   * @param {Object} paymentMethodData - Payment method data to validate
   */
  validatePaymentMethodData(paymentMethodData) {
    const required = ['type', 'tenantId'];
    
    for (const field of required) {
      if (!paymentMethodData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
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
  }

  /**
   * Log payment result
   * @param {string} transactionId - Transaction ID
   * @param {Object} result - Payment result
   * @param {number} processingTime - Processing time in ms
   */
  async logPaymentResult(transactionId, result, processingTime) {
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
  }

  /**
   * Log payment error
   * @param {string} transactionId - Transaction ID
   * @param {Error} error - Error object
   * @param {number} processingTime - Processing time in ms
   */
  async logPaymentError(transactionId, error, processingTime) {
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
  }

  /**
   * Log refund result
   * @param {string} refundId - Refund ID
   * @param {Object} result - Refund result
   * @param {number} processingTime - Processing time in ms
   */
  async logRefundResult(refundId, result, processingTime) {
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
  }

  /**
   * Log refund error
   * @param {string} refundId - Refund ID
   * @param {Error} error - Error object
   * @param {number} processingTime - Processing time in ms
   */
  async logRefundError(refundId, error, processingTime) {
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
  }

  /**
   * Log tokenization
   * @param {string} tokenId - Token ID
   * @param {string} paymentMethodType - Payment method type
   */
  async logTokenization(tokenId, paymentMethodType) {
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
  }

  /**
   * Log webhook event
   * @param {string} eventType - Event type
   * @param {string} eventId - Event ID
   * @param {Object} result - Processing result
   */
  async logWebhookEvent(eventType, eventId, result) {
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
  }

  /**
   * Log webhook error
   * @param {string} eventId - Event ID
   * @param {Error} error - Error object
   */
  async logWebhookError(eventId, error) {
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
   * @returns {string} Encrypted data
   */
  encryptData(data) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
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
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('payment-data'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = BasePaymentProvider;
