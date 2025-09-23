/**
 * PayID Payment Provider
 * 
 * Implementation of PayID payment system for Australia
 * Supports PayID instant payments and NPP (New Payments Platform)
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class PayIDProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'payid';
    this.providerType = 'regional';
    
    // PayID supported countries
    this.supportedCountries = ['AU'];
    
    // PayID supported currencies
    this.supportedCurrencies = ['AUD'];
    
    // PayID supported payment methods
    this.supportedPaymentMethods = [
      'payid',
      'npp_instant'
    ];
    
    // PayID API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.payid.com.au' : 
        'https://api.payid.com.au',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for PayID
    this.processingFees = {
      payid: { percentage: 0.2, fixed: 0.10 },
      npp_instant: { percentage: 0.3, fixed: 0.15 }
    };
    
    // PayID format examples
    this.payidFormats = {
      'email': /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'phone': /^\+61[0-9]{9}$/,
      'abn': /^[0-9]{11}$/
    };
  }

  /**
   * Initialize the PayID provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('PayID provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('PayID provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize PayID provider:', error.message);
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
      throw new Error(`PayID API connection failed: ${error.message}`);
    }
  }

  /**
   * Process PayID payment
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
        case 'payid':
          result = await this.processPayID(paymentData);
          break;
        case 'npp_instant':
          result = await this.processNPPInstant(paymentData);
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
   * Process PayID payment
   */
  async processPayID(paymentData) {
    const { amount, currency, payid, customerInfo, reference } = paymentData;
    
    // Validate PayID format
    if (!this.validatePayID(payid)) {
      throw new Error('Invalid PayID format');
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      payid: payid,
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via PayID',
      notification_url: `${this.config.webhookUrl}/payid/notification`,
      return_url: `${this.config.returnUrl}?method=payid`
    };
    
    const response = await this.makeApiRequest('/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'PayID payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'completed', // PayID payments are typically instant
      processedAt: new Date(),
      metadata: {
        method: 'payid',
        provider: this.providerName,
        reference: requestData.reference,
        payid: payid,
        instant: true
      }
    };
  }

  /**
   * Process NPP Instant payment
   */
  async processNPPInstant(paymentData) {
    const { amount, currency, bsb, accountNumber, customerInfo, reference } = paymentData;
    
    // Validate BSB format (6 digits)
    if (!/^[0-9]{6}$/.test(bsb)) {
      throw new Error('Invalid BSB format');
    }
    
    // Validate account number
    if (!/^[0-9]{4,9}$/.test(accountNumber)) {
      throw new Error('Invalid account number format');
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      bank_account: {
        bsb: bsb,
        account_number: accountNumber,
        account_name: customerInfo.name
      },
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via NPP Instant',
      notification_url: `${this.config.webhookUrl}/payid/npp_instant`,
      return_url: `${this.config.returnUrl}?method=npp_instant`
    };
    
    const response = await this.makeApiRequest('/npp-instant/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'NPP Instant payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'completed', // NPP Instant payments are instant
      processedAt: new Date(),
      metadata: {
        method: 'npp_instant',
        provider: this.providerName,
        reference: requestData.reference,
        bsb: bsb,
        instant: true
      }
    };
  }

  /**
   * Validate PayID format
   */
  validatePayID(payid) {
    if (!payid || typeof payid !== 'string') return false;
    
    // Check if it matches any of the supported formats
    return Object.values(this.payidFormats).some(regex => regex.test(payid));
  }

  /**
   * Resolve PayID to bank details
   */
  async resolvePayID(payid) {
    try {
      const response = await this.makeApiRequest(`/resolve/${encodeURIComponent(payid)}`, 'GET');
      
      return {
        payid: payid,
        bank: response.bank,
        accountName: response.account_name,
        bsb: response.bsb,
        accountNumber: response.account_number,
        verified: response.verified
      };
    } catch (error) {
      throw new Error(`Failed to resolve PayID: ${error.message}`);
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
        amount: response.amount / 100, // Convert from cents
        currency: response.currency,
        processedAt: response.processed_at,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify PayID payment: ${error.message}`);
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
        status: this.mapPayIDStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('PayID webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map PayID status to internal status
   */
  mapPayIDStatus(payidStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
      'Failed': 'failed',
      'Expired': 'expired'
    };
    
    return statusMap[payidStatus] || 'unknown';
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
   * Make API request to PayID
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
        throw new Error(`PayID API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('PayID API request failed - no response received');
      } else {
        throw new Error(`PayID API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `PAYID_${timestamp}_${random}`.toUpperCase();
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

module.exports = PayIDProvider;
