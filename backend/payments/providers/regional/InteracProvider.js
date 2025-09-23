/**
 * Interac Payment Provider
 * 
 * Implementation of Interac payment system for Canada
 * Supports Interac e-Transfer and Interac Online payments
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class InteracProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'interac';
    this.providerType = 'regional';
    
    // Interac supported countries
    this.supportedCountries = ['CA'];
    
    // Interac supported currencies
    this.supportedCurrencies = ['CAD'];
    
    // Interac supported payment methods
    this.supportedPaymentMethods = [
      'interac_e_transfer',
      'interac_online'
    ];
    
    // Interac API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.interac.ca' : 
        'https://api.interac.ca',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for Interac
    this.processingFees = {
      interac_e_transfer: { percentage: 0.5, fixed: 0.15 },
      interac_online: { percentage: 0.3, fixed: 0.10 }
    };
  }

  /**
   * Initialize the Interac provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('Interac provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('Interac provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Interac provider:', error.message);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await this.makeApiRequest('/health', 'GET');
      return response.status === 'healthy';
    } catch (error) {
      throw new Error(`Interac API connection failed: ${error.message}`);
    }
  }

  /**
   * Process Interac payment
   */
  async processPayment(paymentData) {
    try {
      const { method, amount, currency, metadata } = paymentData;
      
      // Validate payment method
      if (!this.supportedPaymentMethods.includes(method)) {
        throw new Error(`Unsupported payment method: ${method}`);
      }
      
      // Validate currency
      if (!this.supportedCurrencies.includes(currency)) {
        throw new Error(`Unsupported currency: ${currency}`);
      }
      
      let result;
      
      switch (method) {
        case 'interac_e_transfer':
          result = await this.processETransfer(paymentData);
          break;
        case 'interac_online':
          result = await this.processOnline(paymentData);
          break;
        default:
          throw new Error(`Unknown payment method: ${method}`);
      }
      
      // Log transaction
      await this.logTransaction({
        provider: this.providerName,
        method,
        amount,
        currency,
        status: 'success',
        transactionId: result.transactionId,
        metadata: result.metadata
      });
      
      return result;
      
    } catch (error) {
      // Log failed transaction
      await this.logTransaction({
        provider: this.providerName,
        method: paymentData.method,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'failed',
        error: error.message,
        metadata: paymentData.metadata
      });
      
      throw error;
    }
  }

  /**
   * Process Interac e-Transfer
   */
  async processETransfer(paymentData) {
    const { amount, currency, customerEmail, customerName, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      recipient: {
        email: customerEmail,
        name: customerName
      },
      reference: reference || this.generateReference(),
      notification_url: `${this.config.webhookUrl}/interac/etransfer`,
      return_url: `${this.config.returnUrl}?method=interac_e_transfer`
    };
    
    const response = await this.makeApiRequest('/etransfer/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Interac e-Transfer failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'interac_e_transfer',
        provider: this.providerName,
        reference: requestData.reference,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process Interac Online
   */
  async processOnline(paymentData) {
    const { amount, currency, customerInfo, billingAddress, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone
      },
      billing_address: billingAddress,
      reference: reference || this.generateReference(),
      notification_url: `${this.config.webhookUrl}/interac/online`,
      return_url: `${this.config.returnUrl}?method=interac_online`
    };
    
    const response = await this.makeApiRequest('/online/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Interac Online failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'interac_online',
        provider: this.providerName,
        reference: requestData.reference,
        sessionId: response.session_id
      }
    };
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionId) {
    try {
      const response = await this.makeApiRequest(`/transaction/${transactionId}`, 'GET');
      
      return {
        transactionId,
        status: response.status,
        amount: response.amount / 100, // Convert from cents
        currency: response.currency,
        processedAt: response.processed_at,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify Interac payment: ${error.message}`);
    }
  }

  /**
   * Handle webhook notification
   */
  async handleWebhook(payload, signature) {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }
      
      const { event_type, transaction_id, status, amount, currency } = payload;
      
      // Update transaction status in database
      await this.updateTransactionStatus(transaction_id, {
        status: this.mapInteracStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('Interac webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map Interac status to internal status
   */
  mapInteracStatus(interacStatus) {
    const statusMap = {
      'pending': 'pending',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'expired': 'expired'
    };
    
    return statusMap[interacStatus] || 'unknown';
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    // Implement HMAC signature verification
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Make API request to Interac
   */
  async makeApiRequest(endpoint, method = 'GET', data = null) {
    const axios = require('axios');
    
    const config = {
      method,
      url: `${this.apiConfig.baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.apiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'X-Merchant-ID': this.apiConfig.merchantId,
        'User-Agent': 'School-SIS-PaymentGateway/1.0'
      },
      timeout: this.apiConfig.timeout
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Interac API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Interac API request failed - no response received');
      } else {
        throw new Error(`Interac API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `INT_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods() {
    return this.supportedPaymentMethods;
  }

  /**
   * Get supported countries
   */
  getSupportedCountries() {
    return this.supportedCountries;
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies() {
    return this.supportedCurrencies;
  }

  /**
   * Check if provider supports payment method
   */
  supportsPaymentMethod(method) {
    return this.supportedPaymentMethods.includes(method);
  }

  /**
   * Check if provider supports country
   */
  supportsCountry(country) {
    return this.supportedCountries.includes(country);
  }

  /**
   * Check if provider supports currency
   */
  supportsCurrency(currency) {
    return this.supportedCurrencies.includes(currency);
  }
}

module.exports = InteracProvider;
