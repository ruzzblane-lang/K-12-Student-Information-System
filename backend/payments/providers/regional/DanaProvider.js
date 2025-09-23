/**
 * DANA Payment Provider
 * 
 * Implementation of DANA payment system for Indonesia
 * Supports DANA digital wallet and QR code payments
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class DanaProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'dana';
    this.providerType = 'regional';
    
    // DANA supported countries
    this.supportedCountries = ['ID'];
    
    // DANA supported currencies
    this.supportedCurrencies = ['IDR'];
    
    // DANA supported payment methods
    this.supportedPaymentMethods = [
      'dana',
      'dana_qr'
    ];
    
    // DANA API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.dana.id' : 
        'https://api.dana.id',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for DANA
    this.processingFees = {
      dana: { percentage: 2.5, fixed: 0.25 },
      dana_qr: { percentage: 2.0, fixed: 0.20 }
    };
  }

  /**
   * Initialize the DANA provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('DANA provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('DANA provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize DANA provider:', error.message);
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
      throw new Error(`DANA API connection failed: ${error.message}`);
    }
  }

  /**
   * Process DANA payment
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
        case 'dana':
          result = await this.processDANA(paymentData);
          break;
        case 'dana_qr':
          result = await this.processDANAQR(paymentData);
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
   * Process DANA payment
   */
  async processDANA(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        dana_user_id: customerInfo.danaUserId
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via DANA',
      notification_url: `${this.config.webhookUrl}/dana/notification`,
      return_url: `${this.config.returnUrl}?method=dana`,
      cancel_url: `${this.config.cancelUrl}?method=dana`
    };
    
    const response = await this.makeApiRequest('/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'DANA payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'dana',
        provider: this.providerName,
        reference: requestData.reference,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process DANA QR payment
   */
  async processDANAQR(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via DANA QR',
      notification_url: `${this.config.webhookUrl}/dana/qr`,
      return_url: `${this.config.returnUrl}?method=dana_qr`,
      qr_code: true
    };
    
    const response = await this.makeApiRequest('/qr/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'DANA QR payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      qrCode: response.qr_code,
      qrCodeUrl: response.qr_code_url,
      metadata: {
        method: 'dana_qr',
        provider: this.providerName,
        reference: requestData.reference,
        expiresAt: response.expires_at
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
      throw new Error(`Failed to verify DANA payment: ${error.message}`);
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
        status: this.mapDANAStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('DANA webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map DANA status to internal status
   */
  mapDANAStatus(danaStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
      'Failed': 'failed',
      'Expired': 'expired'
    };
    
    return statusMap[danaStatus] || 'unknown';
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
   * Make API request to DANA
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
        throw new Error(`DANA API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('DANA API request failed - no response received');
      } else {
        throw new Error(`DANA API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `DANA_${timestamp}_${random}`.toUpperCase();
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

module.exports = DanaProvider;
