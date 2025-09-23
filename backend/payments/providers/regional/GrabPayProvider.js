/**
 * GrabPay Payment Provider
 * 
 * Implementation of GrabPay payment system for Southeast Asia
 * Supports GrabPay digital wallet and QR code payments
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class GrabPayProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'grabpay';
    this.providerType = 'regional';
    
    // GrabPay supported countries
    this.supportedCountries = ['SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'KH', 'MM'];
    
    // GrabPay supported currencies
    this.supportedCurrencies = ['SGD', 'MYR', 'THB', 'IDR', 'PHP', 'VND', 'KHR', 'MMK'];
    
    // GrabPay supported payment methods
    this.supportedPaymentMethods = [
      'grabpay',
      'grabpay_qr'
    ];
    
    // GrabPay API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.grab.com' : 
        'https://api.grab.com',
      apiKey: config.apiKey,
      partnerId: config.partnerId,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for GrabPay
    this.processingFees = {
      grabpay: { percentage: 2.5, fixed: 0.20 },
      grabpay_qr: { percentage: 2.0, fixed: 0.15 }
    };
    
    // Currency mappings
    this.currencyMappings = {
      'SG': 'SGD',
      'MY': 'MYR',
      'TH': 'THB',
      'ID': 'IDR',
      'PH': 'PHP',
      'VN': 'VND',
      'KH': 'KHR',
      'MM': 'MMK'
    };
  }

  /**
   * Initialize the GrabPay provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.partnerId || !this.config.merchantId) {
        throw new Error('GrabPay provider requires apiKey, partnerId, and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('GrabPay provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize GrabPay provider:', error.message);
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
      throw new Error(`GrabPay API connection failed: ${error.message}`);
    }
  }

  /**
   * Process GrabPay payment
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
        case 'grabpay':
          result = await this.processGrabPay(paymentData);
          break;
        case 'grabpay_qr':
          result = await this.processGrabPayQR(paymentData);
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
   * Process GrabPay payment
   */
  async processGrabPay(paymentData) {
    const { amount, currency, customerInfo, reference, country } = paymentData;
    
    // Validate country
    if (!this.supportedCountries.includes(country)) {
      throw new Error(`Unsupported country: ${country}`);
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      country: country.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        grab_user_id: customerInfo.grabUserId
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via GrabPay',
      notification_url: `${this.config.webhookUrl}/grabpay/notification`,
      return_url: `${this.config.returnUrl}?method=grabpay`,
      cancel_url: `${this.config.cancelUrl}?method=grabpay`
    };
    
    const response = await this.makeApiRequest('/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'GrabPay payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'grabpay',
        provider: this.providerName,
        reference: requestData.reference,
        country: requestData.country,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process GrabPay QR payment
   */
  async processGrabPayQR(paymentData) {
    const { amount, currency, customerInfo, reference, country } = paymentData;
    
    // Validate country
    if (!this.supportedCountries.includes(country)) {
      throw new Error(`Unsupported country: ${country}`);
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      country: country.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via GrabPay QR',
      notification_url: `${this.config.webhookUrl}/grabpay/qr`,
      return_url: `${this.config.returnUrl}?method=grabpay_qr`,
      qr_code: true
    };
    
    const response = await this.makeApiRequest('/qr/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'GrabPay QR payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      qrCode: response.qr_code,
      qrCodeUrl: response.qr_code_url,
      metadata: {
        method: 'grabpay_qr',
        provider: this.providerName,
        reference: requestData.reference,
        country: requestData.country,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Get currency for country
   */
  getCurrencyForCountry(country) {
    return this.currencyMappings[country.toUpperCase()];
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
        country: response.country,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify GrabPay payment: ${error.message}`);
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
        status: this.mapGrabPayStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('GrabPay webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map GrabPay status to internal status
   */
  mapGrabPayStatus(grabpayStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
      'Failed': 'failed',
      'Expired': 'expired'
    };
    
    return statusMap[grabpayStatus] || 'unknown';
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
   * Make API request to GrabPay
   */
  async makeApiRequest(endpoint, method = 'GET', data = null) {
    const axios = require('axios');
    
    const config = {
      method,
      url: `${this.apiConfig.baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.apiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'X-Partner-ID': this.apiConfig.partnerId,
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
        throw new Error(`GrabPay API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('GrabPay API request failed - no response received');
      } else {
        throw new Error(`GrabPay API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `GRAB_${timestamp}_${random}`.toUpperCase();
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

module.exports = GrabPayProvider;
