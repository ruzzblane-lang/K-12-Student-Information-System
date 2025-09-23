/**
 * Boleto Bancário Payment Provider
 * 
 * Implementation of Boleto Bancário payment system for Brazil
 * Supports Boleto Bancário bill payments and bank transfers
 */

const BasePaymentProvider = require('../base/BasePaymentProvider');

class BoletoBancarioProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.providerName = 'boleto_bancario';
    this.providerType = 'regional';
    
    // Boleto Bancário supported countries
    this.supportedCountries = ['BR'];
    
    // Boleto Bancário supported currencies
    this.supportedCurrencies = ['BRL'];
    
    // Boleto Bancário supported payment methods
    this.supportedPaymentMethods = [
      'boleto_bancario',
      'boleto_express'
    ];
    
    // Boleto Bancário API configuration
    this.apiConfig = {
      baseUrl: config.sandbox ? 
        'https://api-sandbox.boleto.com.br' : 
        'https://api.boleto.com.br',
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      timeout: 30000
    };
    
    // Processing fees for Boleto Bancário
    this.processingFees = {
      boleto_bancario: { percentage: 1.5, fixed: 2.00 },
      boleto_express: { percentage: 2.0, fixed: 3.00 }
    };
    
    // Brazilian bank codes
    this.bankCodes = {
      '001': 'Banco do Brasil',
      '033': 'Santander',
      '104': 'Caixa Econômica Federal',
      '237': 'Bradesco',
      '341': 'Itaú',
      '356': 'Banco Real',
      '422': 'Banco Safra'
    };
  }

  /**
   * Initialize the Boleto Bancário provider
   */
  async initialize() {
    try {
      // Validate configuration
      if (!this.config.apiKey || !this.config.merchantId) {
        throw new Error('Boleto Bancário provider requires apiKey and merchantId');
      }
      
      // Test API connectivity
      await this.testConnection();
      
      console.log('Boleto Bancário provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Boleto Bancário provider:', error.message);
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
      throw new Error(`Boleto Bancário API connection failed: ${error.message}`);
    }
  }

  /**
   * Process Boleto Bancário payment
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
        case 'boleto_bancario':
          result = await this.processBoletoBancario(paymentData);
          break;
        case 'boleto_express':
          result = await this.processBoletoExpress(paymentData);
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
   * Process Boleto Bancário payment
   */
  async processBoletoBancario(paymentData) {
    const { amount, currency, customerInfo, reference, dueDate } = paymentData;
    
    // Calculate due date (default 3 days from now)
    const boletoDueDate = dueDate || this.calculateDueDate(3);
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to centavos
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        document: customerInfo.cpf || customerInfo.cnpj,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Pagamento via Boleto Bancário',
      due_date: boletoDueDate,
      notification_url: `${this.config.webhookUrl}/boleto/notification`,
      return_url: `${this.config.returnUrl}?method=boleto_bancario`,
      instructions: paymentData.instructions || 'Não receber após o vencimento'
    };
    
    const response = await this.makeApiRequest('/boleto/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Boleto Bancário payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      boletoUrl: response.boleto_url,
      boletoBarcode: response.boleto_barcode,
      dueDate: boletoDueDate,
      metadata: {
        method: 'boleto_bancario',
        provider: this.providerName,
        reference: requestData.reference,
        boletoNumber: response.boleto_number,
        dueDate: boletoDueDate,
        bankCode: response.bank_code
      }
    };
  }

  /**
   * Process Boleto Express payment
   */
  async processBoletoExpress(paymentData) {
    const { amount, currency, customerInfo, reference } = paymentData;
    
    const requestData = {
      amount: Math.round(amount * 100), // Convert to centavos
      currency: currency.toUpperCase(),
      customer: {
        name: customerInfo.name,
        document: customerInfo.cpf || customerInfo.cnpj,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address
      },
      reference: reference || this.generateReference(),
      description: paymentData.description || 'Pagamento via Boleto Express',
      notification_url: `${this.config.webhookUrl}/boleto/express`,
      return_url: `${this.config.returnUrl}?method=boleto_express`,
      express: true
    };
    
    const response = await this.makeApiRequest('/boleto/express/create', 'POST', requestData);
    
    if (!response.success) {
      throw new Error(response.error || 'Boleto Express payment failed');
    }
    
    return {
      transactionId: response.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'pending',
      boletoUrl: response.boleto_url,
      boletoBarcode: response.boleto_barcode,
      metadata: {
        method: 'boleto_express',
        provider: this.providerName,
        reference: requestData.reference,
        boletoNumber: response.boleto_number,
        express: true
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
   * Validate CPF/CNPJ format
   */
  validateDocument(document) {
    if (!document || typeof document !== 'string') return false;
    
    const cleanDoc = document.replace(/\D/g, '');
    
    // CPF (11 digits) or CNPJ (14 digits)
    return cleanDoc.length === 11 || cleanDoc.length === 14;
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
        boletoNumber: response.boleto_number,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Failed to verify Boleto Bancário payment: ${error.message}`);
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
        status: this.mapBoletoStatus(status),
        processedAt: new Date(),
        webhookReceived: true
      });
      
      return {
        success: true,
        eventType: event_type,
        transactionId: transaction_id
      };
      
    } catch (error) {
      console.error('Boleto Bancário webhook handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Map Boleto status to internal status
   */
  mapBoletoStatus(boletoStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Paid': 'completed',
      'Cancelled': 'cancelled',
      'Expired': 'expired',
      'Failed': 'failed'
    };
    
    return statusMap[boletoStatus] || 'unknown';
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
   * Make API request to Boleto Bancário
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
        throw new Error(`Boleto Bancário API error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Boleto Bancário API request failed - no response received');
      } else {
        throw new Error(`Boleto Bancário API request failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate unique reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `BOLETO_${timestamp}_${random}`.toUpperCase();
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

module.exports = BoletoBancarioProvider;
