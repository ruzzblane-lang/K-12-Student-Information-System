/**
 * UPI Payment Provider
 * 
 * Implementation of UPI (Unified Payments Interface) for India
 * Supports UPI payments, QR codes, and virtual payment addresses
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class UPIProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'upi';
    this.providerType = 'regional';
    
    // UPI supported countries
    this.supportedCountries = ['IN'];
    
    // UPI supported currencies
    this.supportedCurrencies = ['INR'];
    
    // UPI supported payment methods
    this.supportedPaymentMethods = [
      'upi',
      'upi_qr',
      'upi_vpa'
    ];
    
    // UPI API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.upi.com' : 
        'https://api.upi.com',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for UPI
    this.processingFees = {
      upi: { percentage: 0.5, fixed: 0.00 },
      upi_qr: { percentage: 0.4, fixed: 0.00 },
      upi_vpa: { percentage: 0.3, fixed: 0.00 }
    };
    
    // UPI VPA pattern validation
    this.vpaPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
  }

  /**
   * Initialize the UPI provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('UPI provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('UPI provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize UPI provider:', error.message);
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
      throw new Error(`UPI API connection failed: ${error.message}`);
    }
  }

  /**
   * Process UPI payment
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
        case 'upi':
          result = await this.processUPI(paymentData);
          break;
        case 'upi_qr':
          result = await this.processUPIQR(paymentData);
          break;
        case 'upi_vpa':
          result = await this.processUPIVPA(paymentData);
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
   * Process UPI payment
   */
  async processUPI(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        vpa: customerInfo.vpa
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via UPI',
      notification_url: `${this.config.webhookUrl}/upi/notification`,
      return_url: `${this.config.returnUrl}?method=upi`,
      cancel_url: `${this.config.cancelUrl}?method=upi`
    };
    
    const response = await this.makeApiRequest('/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'UPI payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'upi',
        provider: this.providerName,
        reference: requestData.reference,
        upiTransactionId: response.upi_transaction_id,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process UPI QR payment
   */
  async processUPIQR(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via UPI QR',
      notification_url: `${this.config.webhookUrl}/upi/qr`,
      return_url: `${this.config.returnUrl}?method=upi_qr`,
      qr_code: true
    };
    
    const response = await this.makeApiRequest('/qr/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'UPI QR payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      qrCode: response.qr_code,
      qrCodeUrl: response.qr_code_url,
      metadata: {
        method: 'upi_qr',
        provider: this.providerName,
        reference: requestData.reference,
        upiTransactionId: response.upi_transaction_id,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process UPI VPA payment
   */
  async processUPIVPA(paymentData) {
    const { amount, currency, customerInfo, reference, vpa } = paymentData;
    
    // Validate VPA format
    if (!this.validateVPA(vpa)) {
      throw new Error('Invalid VPA format');
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        vpa: vpa
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via UPI VPA',
      notification_url: `${this.config.webhookUrl}/upi/vpa`,
      return_url: `${this.config.returnUrl}?method=upi_vpa`,
      vpa: vpa
    };
    
    const response = await this.makeApiRequest('/vpa/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'UPI VPA payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'completed', // VPA payments are typically instant
      processedAt: new Date(),
      metadata: {
        method: 'upi_vpa',
        provider: this.providerName,
        reference: requestData.reference,
        upiTransactionId: response.upi_transaction_id,
        vpa: vpa,
        instant: true
      }
    };
  }

  /**
   * Validate VPA (Virtual Payment Address) format
   */
  validateVPA(vpa) {
    if (!vpa || typeof vpa !== 'string') return false;
    
    // VPA format: username@bank or username@upi
    return this.vpaPattern.test(vpa);
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
        amount: response.amount / 100, // Convert from paise
        currency: response.currency,
        processedAt: response.processed_at,
        upiTransactionId: response.upi_transaction_id,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify UPI payment: ${error.message}`);
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
        status: this.mapUPIStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('UPI webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map UPI status to internal status
   */
  mapUPIStatus(upiStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Success': 'completed',
      'Cancelled': 'cancelled',
      'Failed': 'failed',
      'Expired': 'expired'
    };
    
    return statusMap[upiStatus] || 'unknown';
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
   * Make API request to UPI
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
        throw new Error(`UPI API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('UPI API request failed - no response received');
      } else {
        throw new Error(`UPI API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `UPI_${timestamp}_${random}`.toUpperCase();
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

module.exports = UPIProvider;
