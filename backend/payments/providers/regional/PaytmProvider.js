/**
 * Paytm Payment Provider
 * 
 * Implementation of Paytm payment system for India
 * Supports Paytm wallet, UPI, and QR code payments
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class PaytmProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'paytm';
    this.providerType = 'regional';
    
    // Paytm supported countries
    this.supportedCountries = ['IN'];
    
    // Paytm supported currencies
    this.supportedCurrencies = ['INR'];
    
    // Paytm supported payment methods
    this.supportedPaymentMethods = [
      'paytm_wallet',
      'paytm_upi',
      'paytm_qr'
    ];
    
    // Paytm API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.paytm.com' : 
        'https://api.paytm.com',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      merchantKey: config.merchantKey,
      timeout: 30000
    };
    
    // Processing fees for Paytm
    this.processingFees = {
      paytm_wallet: { percentage: 2.0, fixed: 0.20 },
      paytm_upi: { percentage: 0.5, fixed: 0.00 },
      paytm_qr: { percentage: 1.5, fixed: 0.15 }
    };
  }

  /**
   * Initialize the Paytm provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId || !this.config.merchantKey) {
        throw new Error('Paytm provider requires apiKey, merchantId, and merchantKey');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('Paytm provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Paytm provider:', error.message);
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
      throw new Error(`Paytm API connection failed: ${error.message}`);
    }
  }

  /**
   * Process Paytm payment
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
        case 'paytm_wallet':
          result = await this.processPaytmWallet(paymentData);
          break;
        case 'paytm_upi':
          result = await this.processPaytmUPI(paymentData);
          break;
        case 'paytm_qr':
          result = await this.processPaytmQR(paymentData);
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
   * Process Paytm wallet payment
   */
  async processPaytmWallet(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        paytm_user_id: customerInfo.paytmUserId
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via Paytm Wallet',
      notification_url: `${this.config.webhookUrl}/paytm/wallet`,
      return_url: `${this.config.returnUrl}?method=paytm_wallet`,
      cancel_url: `${this.config.cancelUrl}?method=paytm_wallet`
    };
    
    const response = await this.makeApiRequest('/wallet/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Paytm wallet payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'paytm_wallet',
        provider: this.providerName,
        reference: requestData.reference,
        paytmOrderId: response.paytm_order_id,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process Paytm UPI payment
   */
  async processPaytmUPI(paymentData) {
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
      description: paymentData.description || 'Payment via Paytm UPI',
      notification_url: `${this.config.webhookUrl}/paytm/upi`,
      return_url: `${this.config.returnUrl}?method=paytm_upi`,
      cancel_url: `${this.config.cancelUrl}?method=paytm_upi`
    };
    
    const response = await this.makeApiRequest('/upi/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Paytm UPI payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'paytm_upi',
        provider: this.providerName,
        reference: requestData.reference,
        paytmOrderId: response.paytm_order_id,
        upiTransactionId: response.upi_transaction_id,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process Paytm QR payment
   */
  async processPaytmQR(paymentData) {
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
      description: paymentData.description || 'Payment via Paytm QR',
      notification_url: `${this.config.webhookUrl}/paytm/qr`,
      return_url: `${this.config.returnUrl}?method=paytm_qr`,
      qr_code: true
    };
    
    const response = await this.makeApiRequest('/qr/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Paytm QR payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      qrCode: response.qr_code,
      qrCodeUrl: response.qr_code_url,
      metadata: {
        method: 'paytm_qr',
        provider: this.providerName,
        reference: requestData.reference,
        paytmOrderId: response.paytm_order_id,
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
        paytmOrderId: response.paytm_order_id,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify Paytm payment: ${error.message}`);
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
        status: this.mapPaytmStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('Paytm webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map Paytm status to internal status
   */
  mapPaytmStatus(paytmStatus) {
    const statusMap = {
      'TXN_SUCCESS': 'completed',
      'TXN_FAILURE': 'failed',
      'PENDING': 'pending',
      'TXN_CANCEL': 'cancelled'
    };
    
    return statusMap[paytmStatus] || 'unknown';
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
   * Make API request to Paytm
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
        'X-Merchant-Key': this.apiConfig.merchantKey,
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
        throw new Error(`Paytm API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Paytm API request failed - no response received');
      } else {
        throw new Error(`Paytm API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `PAYTM_${timestamp}_${random}`.toUpperCase();
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

module.exports = PaytmProvider;
