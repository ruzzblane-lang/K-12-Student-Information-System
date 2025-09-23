/**
 * ACH Direct Debit Payment Provider
 * 
 * Implementation of ACH Direct Debit for US market
 * Supports both ACH credit and debit transactions
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class ACHDirectDebitProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'ach_direct_debit';
    this.providerType = 'regional';
    
    // ACH supported countries
    this.supportedCountries = ['US'];
    
    // ACH supported currencies
    this.supportedCurrencies = ['USD'];
    
    // ACH supported payment methods
    this.supportedPaymentMethods = [
      'ach_direct_debit',
      'ach_credit',
      'ach_web_debit'
    ];
    
    // ACH API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.achprocessor.com' : 
        'https://api.achprocessor.com',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      routingNumber: config.routingNumber,
      timeout: 30000
    };
    
    // Processing fees for ACH
    this.processingFees = {
      ach_direct_debit: { percentage: 0.8, fixed: 0.20 },
      ach_credit: { percentage: 0.5, fixed: 0.15 },
      ach_web_debit: { percentage: 0.9, fixed: 0.25 }
    };
  }

  /**
   * Initialize the ACH Direct Debit provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId || !this.config.routingNumber) {
        throw new Error('ACH provider requires apiKey, merchantId, and routingNumber');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('ACH Direct Debit provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize ACH Direct Debit provider:', error.message);
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
      throw new Error(`ACH API connection failed: ${error.message}`);
    }
  }

  /**
   * Process ACH payment
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
        case 'ach_direct_debit':
          result = await this.processDirectDebit(paymentData);
          break;
        case 'ach_credit':
          result = await this.processCredit(paymentData);
          break;
        case 'ach_web_debit':
          result = await this.processWebDebit(paymentData);
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
   * Process ACH Direct Debit
   */
  async processDirectDebit(paymentData) {
    const { amount, currency, bankAccount, customerInfo, reference } = paymentData;
    
    // Validate bank account information
    if (!bankAccount.accountNumber || !bankAccount.routingNumber) {
      throw new Error('Bank account number and routing number are required');
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      bank_account: {
        account_number: bankAccount.accountNumber,
        routing_number: bankAccount.routingNumber,
        account_type: bankAccount.accountType || 'checking',
        account_holder_name: bankAccount.accountHolderName
      },
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      reference: reference || this.generateReference(),
      notification_url: `${this.config.webhookUrl}/ach/direct_debit`,
      return_url: `${this.config.returnUrl}?method=ach_direct_debit`,
      effective_date: this.calculateEffectiveDate()
    };
    
    const response = await this.makeApiRequest('/direct-debit/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'ACH Direct Debit failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      processingDate: response.effective_date,
      metadata: {
        method: 'ach_direct_debit',
        provider: this.providerName,
        reference: requestData.reference,
        trackingNumber: response.tracking_number,
        settlementDate: response.settlement_date
      }
    };
  }

  /**
   * Process ACH Credit
   */
  async processCredit(paymentData) {
    const { amount, currency, bankAccount, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      bank_account: {
        account_number: bankAccount.accountNumber,
        routing_number: bankAccount.routingNumber,
        account_type: bankAccount.accountType || 'checking',
        account_holder_name: bankAccount.accountHolderName
      },
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      reference: reference || this.generateReference(),
      notification_url: `${this.config.webhookUrl}/ach/credit`,
      return_url: `${this.config.returnUrl}?method=ach_credit`,
      effective_date: this.calculateEffectiveDate()
    };
    
    const response = await this.makeApiRequest('/credit/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'ACH Credit failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      processingDate: response.effective_date,
      metadata: {
        method: 'ach_credit',
        provider: this.providerName,
        reference: requestData.reference,
        trackingNumber: response.tracking_number,
        settlementDate: response.settlement_date
      }
    };
  }

  /**
   * Process ACH Web Debit
   */
  async processWebDebit(paymentData) {
    const { amount, currency, bankAccount, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      bank_account: {
        account_number: bankAccount.accountNumber,
        routing_number: bankAccount.routingNumber,
        account_type: bankAccount.accountType || 'checking',
        account_holder_name: bankAccount.accountHolderName
      },
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      reference: reference || this.generateReference(),
      notification_url: `${this.config.webhookUrl}/ach/web_debit`,
      return_url: `${this.config.returnUrl}?method=ach_web_debit`,
      effective_date: this.calculateEffectiveDate()
    };
    
    const response = await this.makeApiRequest('/web-debit/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'ACH Web Debit failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'ach_web_debit',
        provider: this.providerName,
        reference: requestData.reference,
        sessionId: response.session_id,
        processingDate: response.effective_date
      }
    };
  }

  /**
   * Calculate effective date (next business day)
   */
  calculateEffectiveDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Skip weekends
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    return tomorrow.toISOString().split('T')[0];
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
        settlementDate: response.settlement_date,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify ACH payment: ${error.message}`);
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
        status: this.mapACHStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('ACH webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map ACH status to internal status
   */
  mapACHStatus(achStatus) {
    const statusMap = {
      'pending': 'pending',
      'processed': 'completed',
      'returned': 'failed',
      'cancelled': 'cancelled',
      'rejected': 'failed'
    };
    
    return statusMap[achStatus] || 'unknown';
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
   * Make API request to ACH processor
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
        'X-Routing-Number': this.apiConfig.routingNumber,
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
        throw new Error(`ACH API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('ACH API request failed - no response received');
      } else {
        throw new Error(`ACH API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `ACH_${timestamp}_${random}`.toUpperCase();
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

module.exports = ACHDirectDebitProvider;
