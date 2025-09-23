/**
 * Sofort Payment Provider
 * 
 * Implementation of Sofort payment system for Germany, Austria, and other EU countries
 * Supports Sofort online banking payments
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class SofortProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'sofort';
    this.providerType = 'regional';
    
    // Sofort supported countries
    this.supportedCountries = ['DE', 'AT', 'BE', 'NL', 'IT', 'ES', 'FR', 'PL', 'CH'];
    
    // Sofort supported currencies
    this.supportedCurrencies = ['EUR', 'CHF'];
    
    // Sofort supported payment methods
    this.supportedPaymentMethods = [
      'sofort'
    ];
    
    // Sofort API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.sofort.com' : 
        'https://api.sofort.com',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for Sofort
    this.processingFees = {
      sofort: { percentage: 0.9, fixed: 0.30 }
    };
    
    // Supported banks for Sofort (varies by country)
    this.supportedBanks = {
      'DE': ['SPARKASSE', 'VOLKSBANK', 'DEUTSCHE_BANK', 'COMMERZBANK', 'POSTBANK'],
      'AT': ['SPARKASSE', 'VOLKSBANK', 'ERSTE_BANK', 'RAIFFEISEN', 'UNICREDIT'],
      'BE': ['KBC', 'BCE', 'AXA', 'ING', 'BNP_PARIBAS'],
      'NL': ['ABN_AMRO', 'ING', 'RABOBANK', 'SNS_BANK', 'TRIODOS_BANK'],
      'IT': ['UNICREDIT', 'INTESA_SANPAOLO', 'MONTE_DEI_PASCHI', 'BANCA_POPOLARE'],
      'ES': ['SANTANDER', 'BBVA', 'CAIXABANK', 'SABADELL', 'BANKIA'],
      'FR': ['BNP_PARIBAS', 'CREDIT_AGRICOLE', 'SOCIETE_GENERALE', 'BPCE'],
      'PL': ['PKO_BP', 'SANTANDER', 'MILLENNIUM', 'ING', 'MBANK'],
      'CH': ['UBS', 'CREDIT_SUISSE', 'ZKB', 'RAIFFEISEN', 'POSTFINANCE']
    };
  }

  /**
   * Initialize the Sofort provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('Sofort provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('Sofort provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Sofort provider:', error.message);
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
      throw new Error(`Sofort API connection failed: ${error.message}`);
    }
  }

  /**
   * Process Sofort payment
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
      
      const result = await this.processSofort(paymentData);
      
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
   * Process Sofort payment
   */
  async processSofort(paymentData) {
    const { amount, currency, customerInfo, bankId, country, reference } = paymentData;
    
    // Validate country
    if (!this.supportedCountries.includes(country)) {
      throw new Error(`Unsupported country: ${country}`);
    }
    
    // Validate bank selection
    if (bankId && !this.supportedBanks[country]?.includes(bankId)) {
      throw new Error(`Unsupported bank for country ${country}: ${bankId}`);
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toUpperCase(),
      country: country.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      bank_id: bankId, // Optional - if not provided, user can select bank
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via Sofort',
      notification_url: `${this.config.webhookUrl}/sofort/notification`,
      return_url: `${this.config.returnUrl}?method=sofort`,
      cancel_url: `${this.config.cancelUrl}?method=sofort`
    };
    
    const response = await this.makeApiRequest('/transaction/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Sofort payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'sofort',
        provider: this.providerName,
        reference: requestData.reference,
        country: requestData.country,
        bankId: response.bank_id,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Get available banks for country
   */
  async getAvailableBanks(country) {
    try {
      if (!this.supportedCountries.includes(country)) {
        throw new Error(`Unsupported country: ${country}`);
      }
      
      const response = await this.makeApiRequest(`/banks/${country}`, 'GET');
      
      return response.banks.map(bank => ({
        id: bank.id,
        name: bank.name,
        logo: bank.logo,
        country: bank.country,
        active: bank.active
      }));
    } catch (error) {
      throw new Error(`Failed to fetch banks for ${country}: ${error.message}`);
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
        country: response.country,
        bankId: response.bank_id,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify Sofort payment: ${error.message}`);
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
        status: this.mapSofortStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('Sofort webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map Sofort status to internal status
   */
  mapSofortStatus(sofortStatus) {
    const statusMap = {
      'Open': 'pending',
      'Success': 'completed',
      'Cancelled': 'cancelled',
      'Expired': 'expired',
      'Failure': 'failed'
    };
    
    return statusMap[sofortStatus] || 'unknown';
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
   * Make API request to Sofort
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
        throw new Error(`Sofort API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Sofort API request failed - no response received');
      } else {
        throw new Error(`Sofort API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `SOFORT_${timestamp}_${random}`.toUpperCase();
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

module.exports = SofortProvider;
