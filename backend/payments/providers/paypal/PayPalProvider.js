/**
 * PayPal Payment Provider
 * 
 * Implementation of the PayPal payment gateway for processing
 * PayPal payments, digital wallets, and alternative payment methods.
 */

const paypal = require('paypal-rest-sdk');
const BasePaymentProvider = require('../base/BasePaymentProvider');

class PayPalProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    // Configure PayPal SDK
    paypal.configure({
      mode: config.sandbox ? 'sandbox' : 'live',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      headers: {
        'custom': 'School SIS Payment Gateway'
      }
    });

    // PayPal supported currencies
    this.supportedCurrencies = [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
      'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'RUB', 'TRY', 'BRL', 'MXN',
      'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'VEF', 'INR', 'SGD', 'HKD', 'TWD',
      'MYR', 'THB', 'PHP', 'IDR', 'KRW', 'CNY', 'AED', 'SAR', 'QAR', 'KWD',
      'BHD', 'OMR', 'JOD', 'LBP', 'EGP', 'MAD', 'TND', 'ZAR', 'NGN', 'KES',
      'GHS', 'UGX', 'TZS', 'ETB', 'MWK', 'ZMW', 'BWP', 'SZL', 'LSL', 'NAD'
    ];

    // PayPal supported payment methods (Universal Coverage)
    this.supportedPaymentMethods = [
      // Credit Cards
      'visa', 'mastercard', 'amex', 'discover', 'jcb', 'unionpay',
      // Debit Cards
      'maestro',
      // Digital Wallets
      'paypal', 'apple_pay', 'google_pay',
      // E-Wallets
      'venmo',
      // Bank Transfers
      'ach',
      // Alternative Payment Methods
      'paypal_credit', 'paypal_plus', 'paypal_pay_later'
    ];
  }

  /**
   * Initialize the PayPal provider
   */
  async initialize() {
    try {
      // Test connection by making a simple API call
      const webhookList = await this.makePayPalRequest('GET', '/v1/notifications/webhooks');
      
      console.log(`PayPal provider initialized successfully`);
      console.log(`Mode: ${this.sandboxMode ? 'sandbox' : 'live'}`);
      
      return {
        success: true,
        mode: this.sandboxMode ? 'sandbox' : 'live',
        webhooksConfigured: webhookList.webhooks && webhookList.webhooks.length > 0
      };
    } catch (error) {
      throw new Error(`PayPal initialization failed: ${error.message}`);
    }
  }

  /**
   * Execute payment with PayPal
   * @param {Object} paymentData - Payment data
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Payment result
   */
  async executePayment(paymentData, transactionId) {
    try {
      // Create PayPal payment
      const payment = {
        intent: 'sale',
        payer: {
          payment_method: paymentData.paymentMethod === 'paypal' ? 'paypal' : 'credit_card'
        },
        transactions: [{
          amount: {
            total: paymentData.amount.toFixed(2),
            currency: paymentData.currency
          },
          description: paymentData.description || `Payment for ${paymentData.tenantId}`,
          custom: transactionId,
          invoice_number: transactionId,
          item_list: {
            items: [{
              name: paymentData.description || 'School Payment',
              sku: 'payment',
              price: paymentData.amount.toFixed(2),
              currency: paymentData.currency,
              quantity: 1
            }]
          }
        }],
        redirect_urls: {
          return_url: paymentData.returnUrl || `${process.env.BASE_URL}/payments/success`,
          cancel_url: paymentData.cancelUrl || `${process.env.BASE_URL}/payments/cancel`
        }
      };

      // Add credit card details if not PayPal
      if (paymentData.paymentMethod !== 'paypal' && paymentData.cardDetails) {
        payment.payer.funding_instruments = [{
          credit_card: {
            number: paymentData.cardDetails.number,
            type: paymentData.cardDetails.type,
            expire_month: paymentData.cardDetails.expiryMonth,
            expire_year: paymentData.cardDetails.expiryYear,
            cvv2: paymentData.cardDetails.cvv,
            first_name: paymentData.cardDetails.firstName,
            last_name: paymentData.cardDetails.lastName,
            billing_address: paymentData.cardDetails.billingAddress
          }
        }];
      }

      // Create payment
      const createPayment = await this.makePayPalRequest('POST', '/v1/payments/payment', payment);

      let result;
      if (paymentData.paymentMethod === 'paypal') {
        // For PayPal, we need to execute the payment after user approval
        result = {
          status: 'pending',
          providerTransactionId: createPayment.id,
          approvalUrl: createPayment.links.find(link => link.rel === 'approval_url')?.href,
          paymentId: createPayment.id,
          state: createPayment.state
        };
      } else {
        // For credit card, execute immediately
        const executePayment = await this.executePayPalPayment(createPayment.id, paymentData.payerId);
        result = {
          status: executePayment.state === 'approved' ? 'succeeded' : 'failed',
          providerTransactionId: executePayment.id,
          transactionId: executePayment.transactions[0].related_resources[0].sale?.id,
          state: executePayment.state
        };
      }

      return result;

    } catch (error) {
      if (error.response) {
        const errorDetails = error.response.error || error.response;
        throw new Error(`PayPal payment failed: ${errorDetails.message || errorDetails.name}`);
      } else {
        throw new Error(`PayPal payment failed: ${error.message}`);
      }
    }
  }

  /**
   * Execute PayPal payment after approval
   * @param {string} paymentId - PayPal payment ID
   * @param {string} payerId - PayPal payer ID
   * @returns {Object} Execution result
   */
  async executePayPalPayment(paymentId, payerId) {
    const execution = {
      payer_id: payerId
    };

    return await this.makePayPalRequest('POST', `/v1/payments/payment/${paymentId}/execute`, execution);
  }

  /**
   * Execute refund with PayPal
   * @param {Object} refundData - Refund data
   * @param {string} refundId - Refund ID
   * @returns {Object} Refund result
   */
  async executeRefund(refundData, refundId) {
    try {
      // Get the original sale transaction
      const originalTransaction = await this.getOriginalTransaction(refundData.originalTransactionId);
      if (!originalTransaction) {
        throw new Error('Original transaction not found');
      }

      const refund = {
        amount: {
          total: refundData.amount.toFixed(2),
          currency: originalTransaction.currency
        },
        description: refundData.reason || 'Refund request'
      };

      const refundResult = await this.makePayPalRequest(
        'POST', 
        `/v1/payments/sale/${originalTransaction.providerTransactionId}/refund`, 
        refund
      );

      return {
        status: refundResult.state === 'completed' ? 'succeeded' : 'failed',
        providerRefundId: refundResult.id,
        amount: parseFloat(refundResult.amount.total),
        currency: refundResult.amount.currency,
        state: refundResult.state
      };

    } catch (error) {
      if (error.response) {
        const errorDetails = error.response.error || error.response;
        throw new Error(`PayPal refund failed: ${errorDetails.message || errorDetails.name}`);
      } else {
        throw new Error(`PayPal refund failed: ${error.message}`);
      }
    }
  }

  /**
   * Fetch payment status from PayPal
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Payment status
   */
  async fetchPaymentStatus(transactionId) {
    try {
      const payment = await this.makePayPalRequest('GET', `/v1/payments/payment/${transactionId}`);
      
      const transaction = payment.transactions[0];
      const sale = transaction.related_resources[0]?.sale;

      return {
        id: payment.id,
        status: payment.state,
        amount: parseFloat(transaction.amount.total),
        currency: transaction.amount.currency,
        created: new Date(payment.create_time),
        transactions: payment.transactions,
        sale: sale
      };

    } catch (error) {
      if (error.response) {
        const errorDetails = error.response.error || error.response;
        throw new Error(`Failed to fetch PayPal payment status: ${errorDetails.message || errorDetails.name}`);
      } else {
        throw new Error(`Failed to fetch PayPal payment status: ${error.message}`);
      }
    }
  }

  /**
   * Create payment method token with PayPal
   * @param {Object} paymentMethodData - Payment method data
   * @returns {Object} Tokenized payment method
   */
  async createPaymentMethodToken(paymentMethodData) {
    try {
      if (paymentMethodData.type === 'card') {
        // For PayPal, we don't tokenize cards directly
        // Instead, we return a reference that can be used for future payments
        const tokenId = `paypal_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          tokenId,
          type: 'card',
          last4: paymentMethodData.cardNumber.slice(-4),
          expiryMonth: paymentMethodData.expiryMonth,
          expiryYear: paymentMethodData.expiryYear,
          brand: this.detectCardBrand(paymentMethodData.cardNumber)
        };
      } else if (paymentMethodData.type === 'paypal') {
        // For PayPal accounts, we can store the payer ID
        const tokenId = `paypal_account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          tokenId,
          type: 'paypal',
          payerId: paymentMethodData.payerId,
          email: paymentMethodData.email
        };
      } else {
        throw new Error(`Unsupported payment method type: ${paymentMethodData.type}`);
      }

    } catch (error) {
      throw new Error(`PayPal payment method tokenization failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature with PayPal
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Signature validity
   */
  async verifyWebhookSignature(payload, signature) {
    try {
      // PayPal webhook verification
      const verification = {
        auth_algo: signature,
        transmission_id: payload.headers['paypal-transmission-id'],
        cert_id: payload.headers['paypal-cert-id'],
        transmission_sig: payload.headers['paypal-transmission-sig'],
        transmission_time: payload.headers['paypal-transmission-time'],
        webhook_id: this.config.webhookId,
        webhook_event: payload
      };

      const result = await this.makePayPalRequest('POST', '/v1/notifications/verify-webhook-signature', verification);
      return result.verification_status === 'SUCCESS';

    } catch (error) {
      this.logError('PayPal webhook signature verification failed', error);
      return false;
    }
  }

  /**
   * Handle webhook event from PayPal
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleWebhookEvent(event) {
    try {
      switch (event.event_type) {
        case 'PAYMENT.SALE.COMPLETED':
          return await this.handlePaymentCompleted(event);
        
        case 'PAYMENT.SALE.DENIED':
          return await this.handlePaymentDenied(event);
        
        case 'PAYMENT.SALE.REFUNDED':
          return await this.handlePaymentRefunded(event);
        
        case 'PAYMENT.SALE.REVERSED':
          return await this.handlePaymentReversed(event);
        
        case 'PAYMENT.CAPTURE.COMPLETED':
          return await this.handleCaptureCompleted(event);
        
        case 'PAYMENT.CAPTURE.DENIED':
          return await this.handleCaptureDenied(event);
        
        case 'PAYMENT.CAPTURE.REFUNDED':
          return await this.handleCaptureRefunded(event);
        
        case 'PAYMENT.CAPTURE.REVERSED':
          return await this.handleCaptureReversed(event);
        
        default:
          console.log(`Unhandled PayPal webhook event type: ${event.event_type}`);
          return { status: 'ignored', reason: 'unhandled_event_type' };
      }
    } catch (error) {
      throw new Error(`PayPal webhook event handling failed: ${error.message}`);
    }
  }

  /**
   * Handle payment completed
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handlePaymentCompleted(event) {
    try {
      const resource = event.resource;
      
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = 'succeeded', provider_transaction_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $2
      `;
      
      await this.db.query(query, [
        resource.id,
        resource.custom || resource.invoice_number
      ]);

      return {
        status: 'processed',
        action: 'payment_completed',
        transactionId: resource.custom || resource.invoice_number,
        providerTransactionId: resource.id
      };

    } catch (error) {
      throw new Error(`Failed to handle payment completion: ${error.message}`);
    }
  }

  /**
   * Handle payment denied
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handlePaymentDenied(event) {
    try {
      const resource = event.resource;
      
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = 'failed', error_message = $1, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $2
      `;
      
      await this.db.query(query, [
        'Payment denied by PayPal',
        resource.custom || resource.invoice_number
      ]);

      return {
        status: 'processed',
        action: 'payment_denied',
        transactionId: resource.custom || resource.invoice_number,
        providerTransactionId: resource.id
      };

    } catch (error) {
      throw new Error(`Failed to handle payment denial: ${error.message}`);
    }
  }

  /**
   * Handle payment refunded
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handlePaymentRefunded(event) {
    try {
      const resource = event.resource;
      
      // Log refund event
      const query = `
        INSERT INTO refund_events (
          id, provider, event_type, transaction_id, refund_id, 
          amount, currency, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        require('uuid').v4(),
        'paypal',
        'refunded',
        resource.custom || resource.invoice_number,
        resource.id,
        parseFloat(resource.amount.total),
        resource.amount.currency
      ]);

      return {
        status: 'processed',
        action: 'payment_refunded',
        transactionId: resource.custom || resource.invoice_number,
        refundId: resource.id
      };

    } catch (error) {
      throw new Error(`Failed to handle payment refund: ${error.message}`);
    }
  }

  /**
   * Handle payment reversed
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handlePaymentReversed(event) {
    try {
      const resource = event.resource;
      
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = 'reversed', error_message = $1, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $2
      `;
      
      await this.db.query(query, [
        'Payment reversed by PayPal',
        resource.custom || resource.invoice_number
      ]);

      return {
        status: 'processed',
        action: 'payment_reversed',
        transactionId: resource.custom || resource.invoice_number,
        providerTransactionId: resource.id
      };

    } catch (error) {
      throw new Error(`Failed to handle payment reversal: ${error.message}`);
    }
  }

  /**
   * Handle capture completed
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleCaptureCompleted(event) {
    try {
      const resource = event.resource;
      
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = 'captured', provider_transaction_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $2
      `;
      
      await this.db.query(query, [
        resource.id,
        resource.custom || resource.invoice_number
      ]);

      return {
        status: 'processed',
        action: 'capture_completed',
        transactionId: resource.custom || resource.invoice_number,
        captureId: resource.id
      };

    } catch (error) {
      throw new Error(`Failed to handle capture completion: ${error.message}`);
    }
  }

  /**
   * Handle capture denied
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleCaptureDenied(event) {
    try {
      const resource = event.resource;
      
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = 'capture_denied', error_message = $1, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $2
      `;
      
      await this.db.query(query, [
        'Capture denied by PayPal',
        resource.custom || resource.invoice_number
      ]);

      return {
        status: 'processed',
        action: 'capture_denied',
        transactionId: resource.custom || resource.invoice_number,
        captureId: resource.id
      };

    } catch (error) {
      throw new Error(`Failed to handle capture denial: ${error.message}`);
    }
  }

  /**
   * Handle capture refunded
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleCaptureRefunded(event) {
    try {
      const resource = event.resource;
      
      // Log refund event
      const query = `
        INSERT INTO refund_events (
          id, provider, event_type, transaction_id, refund_id, 
          amount, currency, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        require('uuid').v4(),
        'paypal',
        'capture_refunded',
        resource.custom || resource.invoice_number,
        resource.id,
        parseFloat(resource.amount.total),
        resource.amount.currency
      ]);

      return {
        status: 'processed',
        action: 'capture_refunded',
        transactionId: resource.custom || resource.invoice_number,
        refundId: resource.id
      };

    } catch (error) {
      throw new Error(`Failed to handle capture refund: ${error.message}`);
    }
  }

  /**
   * Handle capture reversed
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleCaptureReversed(event) {
    try {
      const resource = event.resource;
      
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = 'capture_reversed', error_message = $1, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $2
      `;
      
      await this.db.query(query, [
        'Capture reversed by PayPal',
        resource.custom || resource.invoice_number
      ]);

      return {
        status: 'processed',
        action: 'capture_reversed',
        transactionId: resource.custom || resource.invoice_number,
        captureId: resource.id
      };

    } catch (error) {
      throw new Error(`Failed to handle capture reversal: ${error.message}`);
    }
  }

  /**
   * Make PayPal API request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Object} API response
   */
  async makePayPalRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
      const request = {
        method: method,
        uri: `https://api${this.sandboxMode ? '.sandbox' : ''}.paypal.com${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken || 'dummy_token'}` // This should be obtained via OAuth
        }
      };

      if (data) {
        request.body = data;
        request.json = true;
      }

      paypal.request(request, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Detect card brand from card number
   * @param {string} cardNumber - Card number
   * @returns {string} Card brand
   */
  detectCardBrand(cardNumber) {
    const number = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(number)) return 'visa';
    if (/^5[1-5]/.test(number)) return 'mastercard';
    if (/^3[47]/.test(number)) return 'amex';
    if (/^6/.test(number)) return 'discover';
    if (/^3[0689]/.test(number)) return 'diners';
    if (/^35/.test(number)) return 'jcb';
    
    return 'unknown';
  }

  /**
   * Get original transaction for refund
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Original transaction
   */
  async getOriginalTransaction(transactionId) {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE transaction_id = $1 OR provider_transaction_id = $1
    `;

    const result = await this.db.query(query, [transactionId]);
    return result.rows[0] || null;
  }

  /**
   * Check if currency is supported
   * @param {string} currency - Currency code
   * @returns {boolean} Is supported
   */
  isCurrencySupported(currency) {
    return this.supportedCurrencies.includes(currency);
  }

  /**
   * Check if payment method is supported
   * @param {string} paymentMethod - Payment method
   * @returns {boolean} Is supported
   */
  isPaymentMethodSupported(paymentMethod) {
    return this.supportedPaymentMethods.includes(paymentMethod);
  }

  /**
   * Get supported payment methods for a specific country
   * @param {string} country - Country code
   * @returns {Array} Supported payment methods
   */
  getSupportedPaymentMethodsForCountry(country) {
    const countrySpecificMethods = {
      'US': ['visa', 'mastercard', 'amex', 'discover', 'paypal', 'apple_pay', 'google_pay', 'venmo', 'ach'],
      'CA': ['visa', 'mastercard', 'amex', 'discover', 'paypal', 'apple_pay', 'google_pay'],
      'GB': ['visa', 'mastercard', 'amex', 'jcb', 'maestro', 'paypal', 'apple_pay', 'google_pay'],
      'AU': ['visa', 'mastercard', 'amex', 'jcb', 'paypal', 'apple_pay', 'google_pay'],
      'DE': ['visa', 'mastercard', 'amex', 'jcb', 'maestro', 'paypal', 'apple_pay', 'google_pay'],
      'FR': ['visa', 'mastercard', 'amex', 'jcb', 'maestro', 'paypal', 'apple_pay', 'google_pay'],
      'IT': ['visa', 'mastercard', 'amex', 'jcb', 'maestro', 'paypal', 'apple_pay', 'google_pay'],
      'ES': ['visa', 'mastercard', 'amex', 'jcb', 'maestro', 'paypal', 'apple_pay', 'google_pay'],
      'NL': ['visa', 'mastercard', 'amex', 'jcb', 'maestro', 'paypal', 'apple_pay', 'google_pay'],
      'JP': ['visa', 'mastercard', 'amex', 'jcb', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
      'CN': ['visa', 'mastercard', 'amex', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
      'KR': ['visa', 'mastercard', 'amex', 'jcb', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
      'SG': ['visa', 'mastercard', 'amex', 'jcb', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
      'HK': ['visa', 'mastercard', 'amex', 'jcb', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
      'TW': ['visa', 'mastercard', 'amex', 'jcb', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
      'MY': ['visa', 'mastercard', 'amex', 'jcb', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
      'TH': ['visa', 'mastercard', 'amex', 'jcb', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
      'ID': ['visa', 'mastercard', 'amex', 'jcb', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
      'PH': ['visa', 'mastercard', 'amex', 'jcb', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
      'IN': ['visa', 'mastercard', 'amex', 'jcb', 'paypal', 'apple_pay', 'google_pay'],
      'BR': ['visa', 'mastercard', 'amex', 'jcb', 'paypal', 'apple_pay', 'google_pay'],
      'MX': ['visa', 'mastercard', 'amex', 'jcb', 'paypal', 'apple_pay', 'google_pay']
    };

    return countrySpecificMethods[country] || this.supportedPaymentMethods;
  }

  /**
   * Get payment method configuration
   * @param {string} paymentMethod - Payment method
   * @returns {Object} Payment method configuration
   */
  getPaymentMethodConfig(paymentMethod) {
    const configs = {
      'visa': {
        type: 'credit_card',
        brand: 'visa',
        pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
        cvvLength: 3,
        fees: { percentage: 2.9, fixed: 0.30 }
      },
      'mastercard': {
        type: 'credit_card',
        brand: 'mastercard',
        pattern: /^5[1-5][0-9]{14}$/,
        cvvLength: 3,
        fees: { percentage: 2.9, fixed: 0.30 }
      },
      'amex': {
        type: 'credit_card',
        brand: 'amex',
        pattern: /^3[47][0-9]{13}$/,
        cvvLength: 4,
        fees: { percentage: 3.5, fixed: 0.30 }
      },
      'discover': {
        type: 'credit_card',
        brand: 'discover',
        pattern: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
        cvvLength: 3,
        fees: { percentage: 2.9, fixed: 0.30 }
      },
      'jcb': {
        type: 'credit_card',
        brand: 'jcb',
        pattern: /^(?:2131|1800|35\d{3})\d{11}$/,
        cvvLength: 3,
        fees: { percentage: 3.0, fixed: 0.30 }
      },
      'unionpay': {
        type: 'credit_card',
        brand: 'unionpay',
        pattern: /^62[0-9]{14,17}$/,
        cvvLength: 3,
        fees: { percentage: 2.8, fixed: 0.30 }
      },
      'maestro': {
        type: 'debit_card',
        brand: 'maestro',
        pattern: /^(5[0678]|6[0-9])[0-9]{10,17}$/,
        cvvLength: 3,
        fees: { percentage: 1.5, fixed: 0.20 }
      },
      'paypal': {
        type: 'digital_wallet',
        brand: 'paypal',
        fees: { percentage: 2.9, fixed: 0.30 },
        requiresRedirect: true
      },
      'apple_pay': {
        type: 'digital_wallet',
        brand: 'apple_pay',
        fees: { percentage: 2.9, fixed: 0.30 },
        requiresDevice: 'ios'
      },
      'google_pay': {
        type: 'digital_wallet',
        brand: 'google_pay',
        fees: { percentage: 2.9, fixed: 0.30 },
        requiresDevice: 'android'
      },
      'venmo': {
        type: 'e_wallet',
        brand: 'venmo',
        fees: { percentage: 1.9, fixed: 0.10 },
        requiresRedirect: true
      },
      'ach': {
        type: 'bank_transfer',
        brand: 'ach',
        fees: { percentage: 0.8, fixed: 0.20 },
        processingTime: '1-2 business days'
      }
    };

    return configs[paymentMethod] || null;
  }

  /**
   * Get provider capabilities
   * @returns {Object} Provider capabilities
   */
  getCapabilities() {
    return {
      provider: 'paypal',
      supportedCurrencies: this.supportedCurrencies,
      supportedPaymentMethods: this.supportedPaymentMethods,
      features: [
        'paypal_payments',
        'credit_card_payments',
        'debit_card_payments',
        'digital_wallet_payments',
        'e_wallet_payments',
        'bank_transfer_payments',
        'refunds',
        'webhooks',
        'recurring_payments',
        'multi_currency',
        'buyer_protection',
        'dispute_management',
        'fraud_protection',
        '3d_secure',
        'tokenization',
        'international_payments'
      ],
      limits: {
        maxAmount: 100000.00,
        minAmount: 0.01,
        maxRefundAmount: 100000.00
      },
      regions: {
        'NA': ['visa', 'mastercard', 'amex', 'discover', 'paypal', 'apple_pay', 'google_pay', 'venmo', 'ach'],
        'EU': ['visa', 'mastercard', 'amex', 'jcb', 'maestro', 'paypal', 'apple_pay', 'google_pay'],
        'APAC': ['visa', 'mastercard', 'amex', 'jcb', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
        'CN': ['visa', 'mastercard', 'amex', 'unionpay', 'paypal', 'apple_pay', 'google_pay'],
        'IN': ['visa', 'mastercard', 'amex', 'jcb', 'paypal', 'apple_pay', 'google_pay'],
        'LATAM': ['visa', 'mastercard', 'amex', 'jcb', 'paypal', 'apple_pay', 'google_pay'],
        'MEA': ['visa', 'mastercard', 'amex', 'jcb', 'paypal', 'apple_pay', 'google_pay']
      }
    };
  }
}

module.exports = PayPalProvider;
