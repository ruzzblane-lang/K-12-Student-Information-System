/**
 * BPAY Payment Provider
 * 
 * Implementation of BPAY payment system for Australia
 * Supports BPAY bill payments and recurring payments
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class BPAYProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'bpay';
    this.providerType = 'regional';
    
    // BPAY supported countries
    this.supportedCountries = ['AU'];
    
    // BPAY supported currencies
    this.supportedCurrencies = ['AUD'];
    
    // BPAY supported payment methods
    this.supportedPaymentMethods = [
      'bpay',
      'bpay_recurring'
    ];
    
    // BPAY API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.bpay.com.au' : 
        'https://api.bpay.com.au',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      billerCode: config.billerCode,
      timeout: 30000
    };
    
    // Processing fees for BPAY
    this.processingFees = {
      bpay: { percentage: 0.4, fixed: 0.25 },
      bpay_recurring: { percentage: 0.3, fixed: 0.20 }
    };
    
    // BPAY biller code format (5-10 digits)
    this.billerCodePattern = /^[0-9]{5,10}$/;
  }

  /**
   * Initialize the BPAY provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId || !this.config.billerCode) {
        throw new Error('BPAY provider requires apiKey, merchantId, and billerCode');
      }
      
      // Validate biller code format
      if (!this.billerCodePattern.test(this.config.billerCode)) {
        throw new Error('Invalid biller code format');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('BPAY provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize BPAY provider:', error.message);
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
      throw new Error(`BPAY API connection failed: ${error.message}`);
    }
  }

  /**
   * Process BPAY payment
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
        case 'bpay':
          result = await this.processBPAY(paymentData);
          break;
        case 'bpay_recurring':
          result = await this.processBPAYRecurring(paymentData);
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
   * Process BPAY payment
   */
  async processBPAY(paymentData) {
    const { amount, currency, customerInfo, reference, customerReference } = paymentData;
    
    // Generate customer reference if not provided
    const crn = customerReference || this.generateCustomerReference();
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      biller_code: this.apiConfig.billerCode,
      customer_reference: crn,
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via BPAY',
      notification_url: `${this.config.webhookUrl}/bpay/notification`,
      return_url: `${this.config.returnUrl}?method=bpay`,
      due_date: paymentData.dueDate || this.calculateDueDate()
    };
    
    const response = await this.makeApiRequest('/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'BPAY payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      customerReference: crn,
      billerCode: this.apiConfig.billerCode,
      metadata: {
        method: 'bpay',
        provider: this.providerName,
        reference: requestData.reference,
        billerCode: this.apiConfig.billerCode,
        customerReference: crn,
        dueDate: requestData.due_date
      }
    };
  }

  /**
   * Process BPAY recurring payment
   */
  async processBPAYRecurring(paymentData) {
    const { amount, currency, customerInfo, reference, customerReference, frequency } = paymentData;
    
    // Validate frequency
    const validFrequencies = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'annually'];
    if (!validFrequencies.includes(frequency)) {
      throw new Error(`Invalid frequency: ${frequency}`);
    }
    
    // Generate customer reference if not provided
    const crn = customerReference || this.generateCustomerReference();
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      biller_code: this.apiConfig.billerCode,
      customer_reference: crn,
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Recurring Payment via BPAY',
      notification_url: `${this.config.webhookUrl}/bpay/recurring`,
      return_url: `${this.config.returnUrl}?method=bpay_recurring`,
      frequency: frequency,
      start_date: paymentData.startDate || this.calculateStartDate(),
      end_date: paymentData.endDate || null
    };
    
    const response = await this.makeApiRequest('/recurring/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'BPAY recurring payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      customerReference: crn,
      billerCode: this.apiConfig.billerCode,
      metadata: {
        method: 'bpay_recurring',
        provider: this.providerName,
        reference: requestData.reference,
        billerCode: this.apiConfig.billerCode,
        customerReference: crn,
        frequency: frequency,
        startDate: requestData.start_date,
        endDate: requestData.end_date
      }
    };
  }

  /**
   * Generate customer reference number (CRN)
   */
  generateCustomerReference() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${random}`;
  }

  /**
   * Calculate due date (30 days from now)
   */
  calculateDueDate() {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Calculate start date for recurring payments (next business day)
   */
  calculateStartDate() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    
    // Skip weekends
    while (startDate.getDay() === 0 || startDate.getDay() === 6) {
      startDate.setDate(startDate.getDate() + 1);
    }
    
    return startDate.toISOString().split('T')[0];
  }

  /**
   * Get bill details
   */
  async getBillDetails(customerReference) {
    try {
      const response = await this.makeApiRequest(
        `/bill/${this.apiConfig.billerCode}/${customerReference}`, 
        'GET'
      );
      
      return {
        billerCode: response.biller_code,
        customerReference: response.customer_reference,
        amount: response.amount / 100, // Convert from cents
        dueDate: response.due_date,
        description: response.description,
        status: response.status
      };
    } catch (error) {
      throw new Error(`Failed to get bill details: ${error.message}`);
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
        billerCode: response.biller_code,
        customerReference: response.customer_reference,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify BPAY payment: ${error.message}`);
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
        status: this.mapBPAYStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('BPAY webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map BPAY status to internal status
   */
  mapBPAYStatus(bpayStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Processed': 'completed',
      'Cancelled': 'cancelled',
      'Failed': 'failed',
      'Expired': 'expired'
    };
    
    return statusMap[bpayStatus] || 'unknown';
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
   * Make API request to BPAY
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
        'X-Biller-Code': this.apiConfig.billerCode,
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
        throw new Error(`BPAY API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('BPAY API request failed - no response received');
      } else {
        throw new Error(`BPAY API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `BPAY_${timestamp}_${random}`.toUpperCase();
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

module.exports = BPAYProvider;
