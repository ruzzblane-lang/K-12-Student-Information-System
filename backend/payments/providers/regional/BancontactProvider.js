/**
 * Bancontact Payment Provider
 * 
 * Implementation of Bancontact payment system for Belgium
 * Supports Bancontact online banking and card payments
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class BancontactProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'bancontact';
    this.providerType = 'regional';
    
    // Bancontact supported countries
    this.supportedCountries = ['BE'];
    
    // Bancontact supported currencies
    this.supportedCurrencies = ['EUR'];
    
    // Bancontact supported payment methods
    this.supportedPaymentMethods = [
      'bancontact'
    ];
    
    // Bancontact API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.bancontact.com' : 
        'https://api.bancontact.com',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for Bancontact
    this.processingFees = {
      bancontact: { percentage: 0.4, fixed: 0.25 }
    };
    
    // Supported banks for Bancontact
    this.supportedBanks = [
      'KBC', 'BCE', 'AXA', 'ING', 'BNP_PARIBAS', 'BELFUS',
      'ARGENTA', 'VAN_BREDA', 'CBC', 'JPMORGAN_CHASE'
    ];
  }

  /**
   * Initialize the Bancontact provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('Bancontact provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('Bancontact provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Bancontact provider:', error.message);
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
      throw new Error(`Bancontact API connection failed: ${error.message}`);
    }
  }

  /**
   * Process Bancontact payment
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
      
      const result = await this.processBancontact(paymentData);
      
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
   * Process Bancontact payment
   */
  async processBancontact(paymentData) {
    const { amount, currency, customerInfo, bankId, reference } = paymentData;
    
    // Validate bank selection
    if (bankId && !this.supportedBanks.includes(bankId)) {
      throw new Error(`Unsupported bank: ${bankId}`);
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      bank_id: bankId, // Optional - if not provided, user can select bank
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via Bancontact',
      notification_url: `${this.config.webhookUrl}/bancontact/notification`,
      return_url: `${this.config.returnUrl}?method=bancontact`,
      cancel_url: `${this.config.cancelUrl}?method=bancontact`
    };
    
    const response = await this.makeApiRequest('/transaction/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Bancontact payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'bancontact',
        provider: this.providerName,
        reference: requestData.reference,
        bankId: response.bank_id,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Get available banks
   */
  async getAvailableBanks() {
    try {
      const response = await this.makeApiRequest('/banks', 'GET');
      
      return response.banks.map(bank => ({
        id: bank.id,
        name: bank.name,
        logo: bank.logo,
        country: bank.country,
        active: bank.active
      }));
    } catch (error) {
      throw new Error(`Failed to fetch banks: ${error.message}`);
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
        bankId: response.bank_id,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify Bancontact payment: ${error.message}`);
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
        status: this.mapBancontactStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('Bancontact webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map Bancontact status to internal status
   */
  mapBancontactStatus(bancontactStatus) {
    const statusMap = {
      'Open': 'pending',
      'Success': 'completed',
      'Cancelled': 'cancelled',
      'Expired': 'expired',
      'Failure': 'failed'
    };
    
    return statusMap[bancontactStatus] || 'unknown';
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
   * Make API request to Bancontact
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
        throw new Error(`Bancontact API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Bancontact API request failed - no response received');
      } else {
        throw new Error(`Bancontact API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `BC_${timestamp}_${random}`.toUpperCase();
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

module.exports = BancontactProvider;
