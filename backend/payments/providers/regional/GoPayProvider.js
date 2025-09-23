/**
 * GoPay Payment Provider
 * 
 * Implementation of GoPay payment system for Indonesia
 * Supports GoPay digital wallet and QR code payments
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class GoPayProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'gopay';
    this.providerType = 'regional';
    
    // GoPay supported countries
    this.supportedCountries = ['ID'];
    
    // GoPay supported currencies
    this.supportedCurrencies = ['IDR'];
    
    // GoPay supported payment methods
    this.supportedPaymentMethods = [
      'gopay',
      'gopay_qr'
    ];
    
    // GoPay API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.gopay.com' : 
        'https://api.gopay.com',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for GoPay
    this.processingFees = {
      gopay: { percentage: 2.5, fixed: 0.25 },
      gopay_qr: { percentage: 2.0, fixed: 0.20 }
    };
  }

  /**
   * Initialize the GoPay provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('GoPay provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('GoPay provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize GoPay provider:', error.message);
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
      throw new Error(`GoPay API connection failed: ${error.message}`);
    }
  }

  /**
   * Process GoPay payment
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
        case 'gopay':
          result = await this.processGoPay(paymentData);
          break;
        case 'gopay_qr':
          result = await this.processGoPayQR(paymentData);
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
   * Process GoPay payment
   */
  async processGoPay(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        gopay_user_id: customerInfo.gopayUserId
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via GoPay',
      notification_url: `${this.config.webhookUrl}/gopay/notification`,
      return_url: `${this.config.returnUrl}?method=gopay`,
      cancel_url: `${this.config.cancelUrl}?method=gopay`
    };
    
    const response = await this.makeApiRequest('/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'GoPay payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'gopay',
        provider: this.providerName,
        reference: requestData.reference,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process GoPay QR payment
   */
  async processGoPayQR(paymentData) {
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
      description: paymentData.description || 'Payment via GoPay QR',
      notification_url: `${this.config.webhookUrl}/gopay/qr`,
      return_url: `${this.config.returnUrl}?method=gopay_qr`,
      qr_code: true
    };
    
    const response = await this.makeApiRequest('/qr/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'GoPay QR payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      qrCode: response.qr_code,
      qrCodeUrl: response.qr_code_url,
      metadata: {
        method: 'gopay_qr',
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
      throw new Error(`Failed to verify GoPay payment: ${error.message}`);
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
        status: this.mapGoPayStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('GoPay webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map GoPay status to internal status
   */
  mapGoPayStatus(gopayStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
      'Failed': 'failed',
      'Expired': 'expired'
    };
    
    return statusMap[gopayStatus] || 'unknown';
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
   * Make API request to GoPay
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
        throw new Error(`GoPay API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('GoPay API request failed - no response received');
      } else {
        throw new Error(`GoPay API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `GOPAY_${timestamp}_${random}`.toUpperCase();
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

module.exports = GoPayProvider;
