/**
 * OVO Payment Provider
 * 
 * Implementation of OVO payment system for Indonesia
 * Supports OVO digital wallet and QR code payments
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class OVOProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'ovo';
    this.providerType = 'regional';
    
    // OVO supported countries
    this.supportedCountries = ['ID'];
    
    // OVO supported currencies
    this.supportedCurrencies = ['IDR'];
    
    // OVO supported payment methods
    this.supportedPaymentMethods = [
      'ovo',
      'ovo_qr'
    ];
    
    // OVO API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.ovo.id' : 
        'https://api.ovo.id',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for OVO
    this.processingFees = {
      ovo: { percentage: 2.5, fixed: 0.25 },
      ovo_qr: { percentage: 2.0, fixed: 0.20 }
    };
  }

  /**
   * Initialize the OVO provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('OVO provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('OVO provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize OVO provider:', error.message);
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
      throw new Error(`OVO API connection failed: ${error.message}`);
    }
  }

  /**
   * Process OVO payment
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
        case 'ovo':
          result = await this.processOVO(paymentData);
          break;
        case 'ovo_qr':
          result = await this.processOVOQR(paymentData);
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
   * Process OVO payment
   */
  async processOVO(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        ovo_user_id: customerInfo.ovoUserId
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via OVO',
      notification_url: `${this.config.webhookUrl}/ovo/notification`,
      return_url: `${this.config.returnUrl}?method=ovo`,
      cancel_url: `${this.config.cancelUrl}?method=ovo`
    };
    
    const response = await this.makeApiRequest('/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'OVO payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'ovo',
        provider: this.providerName,
        reference: requestData.reference,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process OVO QR payment
   */
  async processOVOQR(paymentData) {
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
      description: paymentData.description || 'Payment via OVO QR',
      notification_url: `${this.config.webhookUrl}/ovo/qr`,
      return_url: `${this.config.returnUrl}?method=ovo_qr`,
      qr_code: true
    };
    
    const response = await this.makeApiRequest('/qr/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'OVO QR payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      qrCode: response.qr_code,
      qrCodeUrl: response.qr_code_url,
      metadata: {
        method: 'ovo_qr',
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
      throw new Error(`Failed to verify OVO payment: ${error.message}`);
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
        status: this.mapOVOStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('OVO webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map OVO status to internal status
   */
  mapOVOStatus(ovoStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
      'Failed': 'failed',
      'Expired': 'expired'
    };
    
    return statusMap[ovoStatus] || 'unknown';
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
   * Make API request to OVO
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
        throw new Error(`OVO API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('OVO API request failed - no response received');
      } else {
        throw new Error(`OVO API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `OVO_${timestamp}_${random}`.toUpperCase();
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

module.exports = OVOProvider;
