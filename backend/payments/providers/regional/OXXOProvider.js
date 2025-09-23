/**
 * OXXO Payment Provider
 * 
 * Implementation of OXXO payment system for Mexico
 * Supports OXXO convenience store payments
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class OXXOProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'oxxo';
    this.providerType = 'regional';
    
    // OXXO supported countries
    this.supportedCountries = ['MX'];
    
    // OXXO supported currencies
    this.supportedCurrencies = ['MXN'];
    
    // OXXO supported payment methods
    this.supportedPaymentMethods = [
      'oxxo',
      'oxxo_pay'
    ];
    
    // OXXO API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.oxxo.com' : 
        'https://api.oxxo.com',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for OXXO
    this.processingFees = {
      oxxo: { percentage: 3.5, fixed: 5.00 },
      oxxo_pay: { percentage: 2.9, fixed: 3.00 }
    };
  }

  /**
   * Initialize the OXXO provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('OXXO provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('OXXO provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize OXXO provider:', error.message);
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
      throw new Error(`OXXO API connection failed: ${error.message}`);
    }
  }

  /**
   * Process OXXO payment
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
        case 'oxxo':
          result = await this.processOXXO(paymentData);
          break;
        case 'oxxo_pay':
          result = await this.processOXXOPay(paymentData);
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
   * Process OXXO payment
   */
  async processOXXO(paymentData) {
    const { amount, currency, customerInfo, reference, dueDate } = paymentData;
    
    // Calculate due date (default 7 days from now)
    const oxxoDueDate = dueDate || this.calculateDueDate(7);
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to centavos
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Pago via OXXO',
      due_date: oxxoDueDate,
      notification_url: `${this.config.webhookUrl}/oxxo/notification`,
      return_url: `${this.config.returnUrl}?method=oxxo`,
      instructions: paymentData.instructions || 'Pagar en cualquier tienda OXXO'
    };
    
    const response = await this.makeApiRequest('/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'OXXO payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      paymentUrl: response.payment_url,
      paymentCode: response.payment_code,
      dueDate: oxxoDueDate,
      metadata: {
        method: 'oxxo',
        provider: this.providerName,
        reference: requestData.reference,
        paymentCode: response.payment_code,
        dueDate: oxxoDueDate
      }
    };
  }

  /**
   * Process OXXO Pay payment
   */
  async processOXXOPay(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to centavos
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Pago via OXXO Pay',
      notification_url: `${this.config.webhookUrl}/oxxo/pay`,
      return_url: `${this.config.returnUrl}?method=oxxo_pay`,
      oxxo_pay: true
    };
    
    const response = await this.makeApiRequest('/oxxo-pay/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'OXXO Pay payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      paymentUrl: response.payment_url,
      paymentCode: response.payment_code,
      metadata: {
        method: 'oxxo_pay',
        provider: this.providerName,
        reference: requestData.reference,
        paymentCode: response.payment_code,
        oxxoPay: true
      }
    };
  }

  /**
   * Calculate due date
   */
  calculateDueDate(daysFromNow = 7) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Get nearby OXXO stores
   */
  async getNearbyStores(latitude, longitude, radius = 5) {
    try {
      const response = await this.makeApiRequest(
        `/stores/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`, 
        'GET'
      );
      
      return response.stores.map(store => ({
        id: store.id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        latitude: store.latitude,
        longitude: store.longitude,
        distance: store.distance,
        open24h: store.open24h
      }));
    } catch (error) {
      throw new Error(`Failed to fetch nearby stores: ${error.message}`);
    }
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
        amount: response.amount / 100, // Convert from centavos
        currency: response.currency,
        processedAt: response.processed_at,
        paymentCode: response.payment_code,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify OXXO payment: ${error.message}`);
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
        status: this.mapOXXOStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('OXXO webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map OXXO status to internal status
   */
  mapOXXOStatus(oxxoStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Paid': 'completed',
      'Cancelled': 'cancelled',
      'Expired': 'expired',
      'Failed': 'failed'
    };
    
    return statusMap[oxxoStatus] || 'unknown';
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
   * Make API request to OXXO
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
        throw new Error(`OXXO API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('OXXO API request failed - no response received');
      } else {
        throw new Error(`OXXO API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `OXXO_${timestamp}_${random}`.toUpperCase();
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

module.exports = OXXOProvider;
