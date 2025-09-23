/**
 * SEPA Payment Provider
 * 
 * Implementation of SEPA (Single Euro Payments Area) for EU/UK
 * Supports SEPA Direct Debit and SEPA Credit Transfer
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class SEPAProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'sepa';
    this.providerType = 'regional';
    
    // SEPA supported countries (EU + UK + EEA)
    this.supportedCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI',
      'NO', 'CH', 'MC', 'SM', 'VA'
    ];
    
    // SEPA supported currencies
    this.supportedCurrencies = ['EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK'];
    
    // SEPA supported payment methods
    this.supportedPaymentMethods = [
      'sepa_direct_debit',
      'sepa_credit_transfer',
      'sepa_instant_credit'
    ];
    
    // SEPA API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.sepaprocessor.eu' : 
        'https://api.sepaprocessor.eu',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for SEPA
    this.processingFees = {
      sepa_direct_debit: { percentage: 0.4, fixed: 0.15 },
      sepa_credit_transfer: { percentage: 0.3, fixed: 0.10 },
      sepa_instant_credit: { percentage: 0.5, fixed: 0.20 }
    };
  }

  /**
   * Initialize the SEPA provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('SEPA provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('SEPA provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize SEPA provider:', error.message);
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
      throw new Error(`SEPA API connection failed: ${error.message}`);
    }
  }

  /**
   * Process SEPA payment
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
        case 'sepa_direct_debit':
          result = await this.processDirectDebit(paymentData);
          break;
        case 'sepa_credit_transfer':
          result = await this.processCreditTransfer(paymentData);
          break;
        case 'sepa_instant_credit':
          result = await this.processInstantCredit(paymentData);
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
   * Process SEPA Direct Debit
   */
  async processDirectDebit(paymentData) {
    const { amount, currency, bankAccount, customerInfo, reference } = paymentData;
    
    // Validate IBAN
    if (!this.validateIBAN(bankAccount.iban)) {
      throw new Error('Invalid IBAN format');
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      bank_account: {
        iban: bankAccount.iban,
        bic: bankAccount.bic,
        account_holder_name: bankAccount.accountHolderName,
        mandate_reference: bankAccount.mandateReference,
        mandate_date: bankAccount.mandateDate
      },
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address,
        country: customerInfo.country
      },
      reference: reference || this.generateReference(),
      notification_url: `${this.config.webhookUrl}/sepa/direct_debit`,
      return_url: `${this.config.returnUrl}?method=sepa_direct_debit`,
      execution_date: this.calculateExecutionDate(),
      mandate_type: 'recurring' // or 'one_off'
    };
    
    const response = await this.makeApiRequest('/direct-debit/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'SEPA Direct Debit failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      executionDate: response.execution_date,
      metadata: {
        method: 'sepa_direct_debit',
        provider: this.providerName,
        reference: requestData.reference,
        mandateId: response.mandate_id,
        endToEndId: response.end_to_end_id,
        settlementDate: response.settlement_date
      }
    };
  }

  /**
   * Process SEPA Credit Transfer
   */
  async processCreditTransfer(paymentData) {
    const { amount, currency, bankAccount, customerInfo, reference } = paymentData;
    
    // Validate IBAN
    if (!this.validateIBAN(bankAccount.iban)) {
      throw new Error('Invalid IBAN format');
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      bank_account: {
        iban: bankAccount.iban,
        bic: bankAccount.bic,
        account_holder_name: bankAccount.accountHolderName
      },
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address,
        country: customerInfo.country
      },
      reference: reference || this.generateReference(),
      notification_url: `${this.config.webhookUrl}/sepa/credit_transfer`,
      return_url: `${this.config.returnUrl}?method=sepa_credit_transfer`,
      execution_date: this.calculateExecutionDate()
    };
    
    const response = await this.makeApiRequest('/credit-transfer/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'SEPA Credit Transfer failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      executionDate: response.execution_date,
      metadata: {
        method: 'sepa_credit_transfer',
        provider: this.providerName,
        reference: requestData.reference,
        endToEndId: response.end_to_end_id,
        settlementDate: response.settlement_date
      }
    };
  }

  /**
   * Process SEPA Instant Credit
   */
  async processInstantCredit(paymentData) {
    const { amount, currency, bankAccount, customerInfo, reference } = paymentData;
    
    // Validate IBAN
    if (!this.validateIBAN(bankAccount.iban)) {
      throw new Error('Invalid IBAN format');
    }
    
    // Check if instant credit is supported for the currency
    if (!this.isInstantCreditSupported(currency)) {
      throw new Error(`SEPA Instant Credit not supported for currency: ${currency}`);
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      bank_account: {
        iban: bankAccount.iban,
        bic: bankAccount.bic,
        account_holder_name: bankAccount.accountHolderName
      },
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address,
        country: customerInfo.country
      },
      reference: reference || this.generateReference(),
      notification_url: `${this.config.webhookUrl}/sepa/instant_credit`,
      return_url: `${this.config.returnUrl}?method=sepa_instant_credit`,
      instant: true
    };
    
    const response = await this.makeApiRequest('/instant-credit/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'SEPA Instant Credit failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'completed', // Instant credit is typically completed immediately
      processedAt: new Date(),
      metadata: {
        method: 'sepa_instant_credit',
        provider: this.providerName,
        reference: requestData.reference,
        endToEndId: response.end_to_end_id,
        instant: true
      }
    };
  }

  /**
   * Validate IBAN format
   */
  validateIBAN(iban) {
    if (!iban || typeof iban !== 'string') return false;
    
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Check length (IBAN length varies by country)
    if (cleanIban.length < 15 || cleanIban.length > 34) return false;
    
    // Check format: 2 letters + 2 digits + up to 30 alphanumeric characters
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
    if (!ibanRegex.test(cleanIban)) return false;
    
    // Basic checksum validation (mod 97)
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, char => char.charCodeAt(0) - 55);
    
    try {
      const remainder = BigInt(numeric) % 97n;
      return remainder === 1n;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if instant credit is supported for currency
   */
  isInstantCreditSupported(currency) {
    // SEPA Instant Credit is currently supported for EUR only
    return currency.toUpperCase() === 'EUR';
  }

  /**
   * Calculate execution date (next business day)
   */
  calculateExecutionDate() {
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
      throw new Error(`Failed to verify SEPA payment: ${error.message}`);
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
        status: this.mapSEPAStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('SEPA webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map SEPA status to internal status
   */
  mapSEPAStatus(sepaStatus) {
    const statusMap = {
      'pending': 'pending',
      'processed': 'completed',
      'returned': 'failed',
      'cancelled': 'cancelled',
      'rejected': 'failed',
      'failed': 'failed'
    };
    
    return statusMap[sepaStatus] || 'unknown';
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
   * Make API request to SEPA processor
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
        throw new Error(`SEPA API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('SEPA API request failed - no response received');
      } else {
        throw new Error(`SEPA API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `SEPA_${timestamp}_${random}`.toUpperCase();
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

module.exports = SEPAProvider;
