/**
 * Mada Payment Provider
 * 
 * Implementation of Mada payment system for Saudi Arabia
 * Supports Mada card payments and digital wallet
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class MadaProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'mada';
    this.providerType = 'regional';
    
    // Mada supported countries
    this.supportedCountries = ['SA'];
    
    // Mada supported currencies
    this.supportedCurrencies = ['SAR'];
    
    // Mada supported payment methods
    this.supportedPaymentMethods = [
      'mada',
      'mada_digital'
    ];
    
    // Mada API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.mada.com.sa' : 
        'https://api.mada.com.sa',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for Mada
    this.processingFees = {
      mada: { percentage: 1.5, fixed: 0.50 },
      mada_digital: { percentage: 2.0, fixed: 0.75 }
    };
    
    // Mada card number pattern (starts with 5)
    this.madaCardPattern = /^5[0-9]{15}$/;
  }

  /**
   * Initialize the Mada provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('Mada provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('Mada provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Mada provider:', error.message);
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
      throw new Error(`Mada API connection failed: ${error.message}`);
    }
  }

  /**
   * Process Mada payment
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
        case 'mada':
          result = await this.processMada(paymentData);
          break;
        case 'mada_digital':
          result = await this.processMadaDigital(paymentData);
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
   * Process Mada payment
   */
  async processMada(paymentData) {
    const { amount, currency, customerInfo, cardInfo, reference } = paymentData;
    
    // Validate Mada card
    if (cardInfo && !this.validateMadaCard(cardInfo.cardNumber)) {
      throw new Error('Invalid Mada card number');
    }
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to halalas
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address,
        national_id: customerInfo.nationalId
      },
      card: cardInfo ? {
        number: cardInfo.cardNumber,
        expiry_month: cardInfo.expiryMonth,
        expiry_year: cardInfo.expiryYear,
        cvv: cardInfo.cvv,
        holder_name: cardInfo.holderName
      } : null,
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via Mada',
      notification_url: `${this.config.webhookUrl}/mada/notification`,
      return_url: `${this.config.returnUrl}?method=mada`,
      cancel_url: `${this.config.cancelUrl}?method=mada`
    };
    
    const response = await this.makeApiRequest('/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Mada payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'mada',
        provider: this.providerName,
        reference: requestData.reference,
        madaTransactionId: response.mada_transaction_id,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process Mada Digital payment
   */
  async processMadaDigital(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to halalas
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        national_id: customerInfo.nationalId,
        mada_digital_id: customerInfo.madaDigitalId
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via Mada Digital',
      notification_url: `${this.config.webhookUrl}/mada/digital`,
      return_url: `${this.config.returnUrl}?method=mada_digital`,
      cancel_url: `${this.config.cancelUrl}?method=mada_digital`,
      digital_wallet: true
    };
    
    const response = await this.makeApiRequest('/digital/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Mada Digital payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      redirectUrl: response.redirect_url,
      metadata: {
        method: 'mada_digital',
        provider: this.providerName,
        reference: requestData.reference,
        madaTransactionId: response.mada_transaction_id,
        digitalWallet: true,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Validate Mada card number
   */
  validateMadaCard(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') return false;
    
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    return this.madaCardPattern.test(cleanCardNumber);
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
        amount: response.amount / 100, // Convert from halalas
        currency: response.currency,
        processedAt: response.processed_at,
        madaTransactionId: response.mada_transaction_id,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify Mada payment: ${error.message}`);
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
        status: this.mapMadaStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('Mada webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map Mada status to internal status
   */
  mapMadaStatus(madaStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Approved': 'completed',
      'Declined': 'failed',
      'Cancelled': 'cancelled',
      'Expired': 'expired'
    };
    
    return statusMap[madaStatus] || 'unknown';
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
   * Make API request to Mada
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
        throw new Error(`Mada API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Mada API request failed - no response received');
      } else {
        throw new Error(`Mada API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `MADA_${timestamp}_${random}`.toUpperCase();
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

module.exports = MadaProvider;
