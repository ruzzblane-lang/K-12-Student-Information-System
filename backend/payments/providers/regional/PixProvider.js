/**
 * PIX Payment Provider
 * 
 * Implementation of PIX payment system for Brazil
 * Supports PIX instant payments and QR codes
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class PixProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'pix';
    this.providerType = 'regional';
    
    // PIX supported countries
    this.supportedCountries = ['BR'];
    
    // PIX supported currencies
    this.supportedCurrencies = ['BRL'];
    
    // PIX supported payment methods
    this.supportedPaymentMethods = [
      'pix',
      'pix_qr',
      'pix_copy_paste'
    ];
    
    // PIX API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.pix.com.br' : 
        'https://api.pix.com.br',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for PIX
    this.processingFees = {
      pix: { percentage: 0.5, fixed: 0.00 },
      pix_qr: { percentage: 0.4, fixed: 0.00 },
      pix_copy_paste: { percentage: 0.3, fixed: 0.00 }
    };
  }

  /**
   * Initialize the PIX provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('PIX provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('PIX provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize PIX provider:', error.message);
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
      throw new Error(`PIX API connection failed: ${error.message}`);
    }
  }

  /**
   * Process PIX payment
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
        case 'pix':
          result = await this.processPIX(paymentData);
          break;
        case 'pix_qr':
          result = await this.processPIXQR(paymentData);
          break;
        case 'pix_copy_paste':
          result = await this.processPIXCopyPaste(paymentData);
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
   * Process PIX payment
   */
  async processPIX(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to centavos
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        document: customerInfo.cpf || customerInfo.cnpj,
        pix_key: customerInfo.pixKey
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Pagamento via PIX',
      notification_url: `${this.config.webhookUrl}/pix/notification`,
      return_url: `${this.config.returnUrl}?method=pix`,
      instant: true
    };
    
    const response = await this.makeApiRequest('/payment/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'PIX payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'completed', // PIX payments are instant
      processedAt: new Date(),
      metadata: {
        method: 'pix',
        provider: this.providerName,
        reference: requestData.reference,
        pixTransactionId: response.pix_transaction_id,
        endToEndId: response.end_to_end_id,
        instant: true
      }
    };
  }

  /**
   * Process PIX QR payment
   */
  async processPIXQR(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to centavos
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        document: customerInfo.cpf || customerInfo.cnpj
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Pagamento via PIX QR',
      notification_url: `${this.config.webhookUrl}/pix/qr`,
      return_url: `${this.config.returnUrl}?method=pix_qr`,
      qr_code: true,
      instant: true
    };
    
    const response = await this.makeApiRequest('/qr/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'PIX QR payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      qrCode: response.qr_code,
      qrCodeUrl: response.qr_code_url,
      pixCopyPasteCode: response.pix_copy_paste_code,
      metadata: {
        method: 'pix_qr',
        provider: this.providerName,
        reference: requestData.reference,
        pixTransactionId: response.pix_transaction_id,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Process PIX Copy & Paste payment
   */
  async processPIXCopyPaste(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to centavos
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        document: customerInfo.cpf || customerInfo.cnpj
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Pagamento via PIX Copia e Cola',
      notification_url: `${this.config.webhookUrl}/pix/copy_paste`,
      return_url: `${this.config.returnUrl}?method=pix_copy_paste`,
      copy_paste: true,
      instant: true
    };
    
    const response = await this.makeApiRequest('/copy-paste/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'PIX Copy & Paste payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      pixCopyPasteCode: response.pix_copy_paste_code,
      metadata: {
        method: 'pix_copy_paste',
        provider: this.providerName,
        reference: requestData.reference,
        pixTransactionId: response.pix_transaction_id,
        expiresAt: response.expires_at
      }
    };
  }

  /**
   * Validate PIX key format
   */
  validatePixKey(pixKey) {
    if (!pixKey || typeof pixKey !== 'string') return false;
    
    // PIX key can be CPF, CNPJ, email, phone, or random key
    const patterns = {
      cpf: /^[0-9]{11}$/,
      cnpj: /^[0-9]{14}$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\+55[0-9]{10,11}$/,
      random: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    };
    
    return Object.values(patterns).some(pattern => pattern.test(pixKey));
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
        pixTransactionId: response.pix_transaction_id,
        endToEndId: response.end_to_end_id,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify PIX payment: ${error.message}`);
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
        status: this.mapPIXStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('PIX webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map PIX status to internal status
   */
  mapPIXStatus(pixStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
      'Failed': 'failed',
      'Expired': 'expired'
    };
    
    return statusMap[pixStatus] || 'unknown';
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
   * Make API request to PIX
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
        throw new Error(`PIX API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('PIX API request failed - no response received');
      } else {
        throw new Error(`PIX API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `PIX_${timestamp}_${random}`.toUpperCase();
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

module.exports = PixProvider;
