/**
 * PhonePe Payment Provider
 * 
 * Implementation of PhonePe payment system for India
 * Supports PhonePe UPI, wallet, and QR code payments
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class PhonePeProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'phonepe';
    this.providerType = 'regional';
    
    // PhonePe supported countries
    this.supportedCountries = ['IN'];
    
    // PhonePe supported currencies
    this.supportedCurrencies = ['INR'];
    
    // PhonePe supported payment methods
    this.supportedPaymentMethods = [
      'phonepe_upi',
      'phonepe_wallet',
      'phonepe_qr'
    ];
    
    // PhonePe API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.phonepe.com' : 
        'https://api.phonepe.com',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      saltKey: config.saltKey,
      timeout: 30000
    };
    
    // Processing fees for PhonePe
    this.processingFees = {
      phonepe_upi: { percentage: 0.5, fixed: 0.00 },
      phonepe_wallet: { percentage: 2.0, fixed: 0.20 },
      phonepe_qr: { percentage: 1.5, fixed: 0.15 }
    };
  }

  /**
   * Initialize the PhonePe provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId || !this.config.saltKey) {
        throw new Error('PhonePe provider requires apiKey, merchantId, and saltKey');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('PhonePe provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize PhonePe provider:', error.message);
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
      throw new Error(`PhonePe API connection failed: ${error.message}`);
    }
  }

  /**
   * Process PhonePe payment
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
        case 'phonepe_upi':
          result = await this.processPhonePeUPI(paymentData);
          break;
        case 'phonepe_wallet':
          result = await this.processPhonePeWallet(paymentData);
          break;
        case 'phonepe_qr':
          result = await this.processPhonePeQR(paymentData);
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
   * Process PhonePe UPI payment
   */
  async processPhonePeUPI(paymentData) {
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
      description: paymentData.description || 'Payment via PhonePe UPI',
      notification_url: `${this.config.webhookUrl}/phonepe/upi`,
      return_url: `${this.config.returnUrl}?method=phonepe_upi`,
      cancel_url: `${this.config.cancelUrl}?method=phonepe_upi`
    };
    
    const response = await this.makeApiRequest('/upi/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'PhonePe UPI payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'phonepe_upi',
        provider: this.providerName,
        reference: requestData.reference,
        phonepeTransactionId: response.phonepe_transaction_id,
        upiTransactionId: response.upi_transaction_id,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process PhonePe wallet payment
   */
  async processPhonePeWallet(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        phonepe_user_id: customerInfo.phonepeUserId
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via PhonePe Wallet',
      notification_url: `${this.config.webhookUrl}/phonepe/wallet`,
      return_url: `${this.config.returnUrl}?method=phonepe_wallet`,
      cancel_url: `${this.config.cancelUrl}?method=phonepe_wallet`
    };
    
    const response = await this.makeApiRequest('/wallet/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'PhonePe wallet payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'phonepe_wallet',
        provider: this.providerName,
        reference: requestData.reference,
        phonepeTransactionId: response.phonepe_transaction_id,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process PhonePe QR payment
   */
  async processPhonePeQR(paymentData) {
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
      description: paymentData.description || 'Payment via PhonePe QR',
      notification_url: `${this.config.webhookUrl}/phonepe/qr`,
      return_url: `${this.config.returnUrl}?method=phonepe_qr`,
      qr_code: true
    };
    
    const response = await this.makeApiRequest('/qr/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'PhonePe QR payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      qrCode: response.qr_code,
      qrCodeUrl: response.qr_code_url,
      metadata: {
        method: 'phonepe_qr',
        provider: this.providerName,
        reference: requestData.reference,
        phonepeTransactionId: response.phonepe_transaction_id,
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
        amount: response.amount / 100, // Convert from paise
        currency: response.currency,
        processedAt: response.processed_at,
        phonepeTransactionId: response.phonepe_transaction_id,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify PhonePe payment: ${error.message}`);
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
        status: this.mapPhonePeStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('PhonePe webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map PhonePe status to internal status
   */
  mapPhonePeStatus(phonepeStatus) {
    const statusMap = {
      'SUCCESS': 'completed',
      'FAILED': 'failed',
      'PENDING': 'pending',
      'CANCELLED': 'cancelled'
    };
    
    return statusMap[phonepeStatus] || 'unknown';
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
   * Make API request to PhonePe
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
        'X-Salt-Key': this.apiConfig.saltKey,
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
        throw new Error(`PhonePe API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('PhonePe API request failed - no response received');
      } else {
        throw new Error(`PhonePe API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `PHONEPE_${timestamp}_${random}`.toUpperCase();
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

module.exports = PhonePeProvider;
