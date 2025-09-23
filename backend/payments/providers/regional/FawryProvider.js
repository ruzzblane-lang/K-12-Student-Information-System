/**
 * Fawry Payment Provider
 * 
 * Implementation of Fawry payment system for Egypt
 * Supports Fawry bill payments and digital wallet
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class FawryProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'fawry';
    this.providerType = 'regional';
    
    // Fawry supported countries
    this.supportedCountries = ['EG'];
    
    // Fawry supported currencies
    this.supportedCurrencies = ['EGP'];
    
    // Fawry supported payment methods
    this.supportedPaymentMethods = [
      'fawry',
      'fawry_wallet'
    ];
    
    // Fawry API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.fawry.com' : 
        'https://api.fawry.com',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for Fawry
    this.processingFees = {
      fawry: { percentage: 2.5, fixed: 2.00 },
      fawry_wallet: { percentage: 1.8, fixed: 1.50 }
    };
    
    // Fawry payment channels
    this.paymentChannels = [
      'ATM', 'WALLET', 'CARD', 'VALU', 'FAWRY_PLUS'
    ];
  }

  /**
   * Initialize the Fawry provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('Fawry provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('Fawry provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Fawry provider:', error.message);
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
      throw new Error(`Fawry API connection failed: ${error.message}`);
    }
  }

  /**
   * Process Fawry payment
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
        case 'fawry':
          result = await this.processFawry(paymentData);
          break;
        case 'fawry_wallet':
          result = await this.processFawryWallet(paymentData);
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
   * Process Fawry payment
   */
  async processFawry(paymentData) {
    const { amount, currency, customerInfo, reference, dueDate } = paymentData;
    
    // Calculate due date (default 3 days from now)
    const fawryDueDate = dueDate || this.calculateDueDate(3);
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to piastres
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        national_id: customerInfo.nationalId
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via Fawry',
      due_date: fawryDueDate,
      notification_url: `${this.config.webhookUrl}/fawry/notification`,
      return_url: `${this.config.returnUrl}?method=fawry`,
      payment_channels: paymentData.paymentChannels || this.paymentChannels
    };
    
    const response = await this.makeApiRequest('/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Fawry payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      paymentUrl: response.payment_url,
      paymentCode: response.payment_code,
      dueDate: fawryDueDate,
      metadata: {
        method: 'fawry',
        provider: this.providerName,
        reference: requestData.reference,
        paymentCode: response.payment_code,
        dueDate: fawryDueDate,
        paymentChannels: requestData.payment_channels
      }
    };
  }

  /**
   * Process Fawry wallet payment
   */
  async processFawryWallet(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to piastres
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        national_id: customerInfo.nationalId,
        fawry_wallet_id: customerInfo.fawryWalletId
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Payment via Fawry Wallet',
      notification_url: `${this.config.webhookUrl}/fawry/wallet`,
      return_url: `${this.config.returnUrl}?method=fawry_wallet`,
      wallet_payment: true
    };
    
    const response = await this.makeApiRequest('/wallet/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Fawry wallet payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      paymentUrl: response.payment_url,
      paymentCode: response.payment_code,
      metadata: {
        method: 'fawry_wallet',
        provider: this.providerName,
        reference: requestData.reference,
        paymentCode: response.payment_code,
        walletPayment: true
      }
    };
  }

  /**
   * Calculate due date
   */
  calculateDueDate(daysFromNow = 3) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Get nearby Fawry outlets
   */
  async getNearbyOutlets(latitude, longitude, radius = 5) {
    try {
      const response = await this.makeApiRequest(
        `/outlets/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`, 
        'GET'
      );
      
      return response.outlets.map(outlet => ({
        id: outlet.id,
        name: outlet.name,
        address: outlet.address,
        phone: outlet.phone,
        latitude: outlet.latitude,
        longitude: outlet.longitude,
        distance: outlet.distance,
        operatingHours: outlet.operating_hours
      }));
    } catch (error) {
      throw new Error(`Failed to fetch nearby outlets: ${error.message}`);
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
        amount: response.amount / 100, // Convert from piastres
        currency: response.currency,
        processedAt: response.processed_at,
        paymentCode: response.payment_code,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify Fawry payment: ${error.message}`);
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
        status: this.mapFawryStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('Fawry webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map Fawry status to internal status
   */
  mapFawryStatus(fawryStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Paid': 'completed',
      'Cancelled': 'cancelled',
      'Expired': 'expired',
      'Failed': 'failed'
    };
    
    return statusMap[fawryStatus] || 'unknown';
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
   * Make API request to Fawry
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
        throw new Error(`Fawry API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Fawry API request failed - no response received');
      } else {
        throw new Error(`Fawry API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `FAWRY_${timestamp}_${random}`.toUpperCase();
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

module.exports = FawryProvider;
