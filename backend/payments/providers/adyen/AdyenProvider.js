/**
 * Adyen Payment Provider
 * 
 * Implementation of the Adyen payment gateway for processing
 * global payments with advanced fraud detection and local payment methods.
 */

const { Client, Config } = require('@adyen/api-library');
const BasePaymentProvider = require('../base/BasePaymentProvider');

class AdyenProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    // Configure Adyen client
    const adyenConfig = new Config({
      apiKey: config.apiKey,
      environment: config.sandbox ? 'TEST' : 'LIVE',
      applicationName: 'School SIS Payment Gateway',
      applicationVersion: '1.0.0'
    });

    this.adyenClient = new Client({ config: adyenConfig });
    this.checkout = this.adyenClient.checkout;
    this.payments = this.adyenClient.payments;
    this.payouts = this.adyenClient.payouts;

    // Adyen supported currencies (extensive list)
    this.supportedCurrencies = [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
      'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'RUB', 'TRY', 'BRL', 'MXN',
      'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'VEF', 'INR', 'SGD', 'HKD', 'TWD',
      'MYR', 'THB', 'PHP', 'IDR', 'KRW', 'CNY', 'AED', 'SAR', 'QAR', 'KWD',
      'BHD', 'OMR', 'JOD', 'LBP', 'EGP', 'MAD', 'TND', 'ZAR', 'NGN', 'KES',
      'GHS', 'UGX', 'TZS', 'ETB', 'MWK', 'ZMW', 'BWP', 'SZL', 'LSL', 'NAD',
      'ILS', 'NZD', 'ISK', 'LKR', 'PKR', 'BDT', 'NPR', 'AFN', 'AMD', 'AZN',
      'GEL', 'KZT', 'KGS', 'TJS', 'TMT', 'UZS', 'MNT', 'LAK', 'KHR', 'MMK',
      'VND', 'BND', 'FJD', 'PGK', 'SBD', 'VUV', 'WST', 'TOP', 'XPF', 'NIO',
      'GTQ', 'HNL', 'SVC', 'BZD', 'JMD', 'TTD', 'BBD', 'XCD', 'AWG', 'ANG',
      'SRD', 'GYD', 'FKP', 'SHP', 'AOA', 'BIF', 'CDF', 'DJF', 'ERN', 'ETB',
      'KMF', 'LRD', 'LSL', 'MGA', 'MWK', 'MZN', 'RWF', 'SCR', 'SLL', 'SOS',
      'SSP', 'STN', 'SZL', 'TZS', 'UGX', 'ZMW', 'ZWL'
    ];

    // Adyen supported payment methods (extensive list)
    this.supportedPaymentMethods = [
      'card',
      'ideal',
      'sepa',
      'giropay',
      'eps',
      'bancontact',
      'sofort',
      'alipay',
      'wechatpay',
      'unionpay',
      'molpay',
      'dotpay',
      'paysafecard',
      'bcmc',
      'maestro',
      'visa',
      'mastercard',
      'amex',
      'discover',
      'diners',
      'jcb',
      'paypal',
      'applepay',
      'googlepay',
      'klarna',
      'afterpay',
      'clearpay',
      'affirm',
      'ratepay',
      'zip',
      'laybuy',
      'sezzle',
      'splitit',
      'quadpay',
      'vipps',
      'mobilepay',
      'swish',
      'trustly',
      'p24',
      'blik',
      'multibanco',
      'mbway',
      'satispay',
      'twint',
      'payconiq',
      'bancomat',
      'carte_bancaire',
      'cartes_bancaires',
      'elo',
      'hipercard',
      'oxxo',
      'boleto',
      'pix',
      'spei',
      'oxxo',
      'rapipago',
      'pagofacil',
      'cupon',
      'redlink',
      'cencosud',
      'loterica',
      'hiper',
      'khipu',
      'webpay',
      'servipag',
      'multicaja',
      'khipu',
      'webpay',
      'servipag',
      'multicaja',
      'khipu',
      'webpay',
      'servipag',
      'multicaja'
    ];
  }

  /**
   * Initialize the Adyen provider
   */
  async initialize() {
    try {
      // Test connection by making a simple API call
      const accountInfo = await this.checkout.getPaymentMethods({
        merchantAccount: this.config.merchantAccount
      });
      
      console.log(`Adyen provider initialized successfully`);
      console.log(`Environment: ${this.sandboxMode ? 'TEST' : 'LIVE'}`);
      console.log(`Merchant Account: ${this.config.merchantAccount}`);
      
      return {
        success: true,
        environment: this.sandboxMode ? 'TEST' : 'LIVE',
        merchantAccount: this.config.merchantAccount,
        paymentMethodsAvailable: accountInfo.paymentMethods?.length || 0
      };
    } catch (error) {
      throw new Error(`Adyen initialization failed: ${error.message}`);
    }
  }

  /**
   * Execute payment with Adyen
   * @param {Object} paymentData - Payment data
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Payment result
   */
  async executePayment(paymentData, transactionId) {
    try {
      // Prepare payment request
      const paymentRequest = {
        merchantAccount: this.config.merchantAccount,
        amount: {
          value: Math.round(paymentData.amount * 100), // Convert to cents
          currency: paymentData.currency
        },
        reference: transactionId,
        paymentMethod: this.buildPaymentMethod(paymentData),
        returnUrl: paymentData.returnUrl || `${process.env.BASE_URL}/payments/return`,
        additionalData: {
          'customField': paymentData.tenantId,
          'studentId': paymentData.metadata?.studentId || '',
          'feeType': paymentData.metadata?.feeType || 'general'
        },
        metadata: {
          tenantId: paymentData.tenantId,
          transactionId: transactionId
        }
      };

      // Add browser info for 3D Secure
      if (paymentData.browserInfo) {
        paymentRequest.browserInfo = paymentData.browserInfo;
      }

      // Add shopper info
      if (paymentData.shopperInfo) {
        paymentRequest.shopperInfo = paymentData.shopperInfo;
      }

      // Make payment request
      const paymentResponse = await this.checkout.payments(paymentRequest);

      return {
        status: this.mapAdyenStatus(paymentResponse.resultCode),
        providerTransactionId: paymentResponse.pspReference,
        paymentId: paymentResponse.pspReference,
        resultCode: paymentResponse.resultCode,
        action: paymentResponse.action,
        refusalReason: paymentResponse.refusalReason,
        refusalReasonCode: paymentResponse.refusalReasonCode
      };

    } catch (error) {
      if (error.response) {
        const errorDetails = error.response.body || error.response;
        throw new Error(`Adyen payment failed: ${errorDetails.message || errorDetails.errorCode}`);
      } else {
        throw new Error(`Adyen payment failed: ${error.message}`);
      }
    }
  }

  /**
   * Execute refund with Adyen
   * @param {Object} refundData - Refund data
   * @param {string} refundId - Refund ID
   * @returns {Object} Refund result
   */
  async executeRefund(refundData, refundId) {
    try {
      // Get the original transaction
      const originalTransaction = await this.getOriginalTransaction(refundData.originalTransactionId);
      if (!originalTransaction) {
        throw new Error('Original transaction not found');
      }

      const refundRequest = {
        merchantAccount: this.config.merchantAccount,
        originalReference: originalTransaction.providerTransactionId,
        amount: {
          value: Math.round(refundData.amount * 100), // Convert to cents
          currency: originalTransaction.currency
        },
        reference: refundId,
        additionalData: {
          'customField': refundData.tenantId,
          'refundReason': refundData.reason || 'Refund request'
        }
      };

      const refundResponse = await this.payouts.storeDetailAndSubmitThirdParty(refundRequest);

      return {
        status: refundResponse.resultCode === 'Success' ? 'succeeded' : 'failed',
        providerRefundId: refundResponse.pspReference,
        amount: refundData.amount,
        currency: originalTransaction.currency,
        resultCode: refundResponse.resultCode,
        refusalReason: refundResponse.refusalReason
      };

    } catch (error) {
      if (error.response) {
        const errorDetails = error.response.body || error.response;
        throw new Error(`Adyen refund failed: ${errorDetails.message || errorDetails.errorCode}`);
      } else {
        throw new Error(`Adyen refund failed: ${error.message}`);
      }
    }
  }

  /**
   * Fetch payment status from Adyen
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Payment status
   */
  async fetchPaymentStatus(transactionId) {
    try {
      const paymentResponse = await this.checkout.getPaymentDetails({
        merchantAccount: this.config.merchantAccount,
        pspReference: transactionId
      });

      return {
        id: paymentResponse.pspReference,
        status: this.mapAdyenStatus(paymentResponse.resultCode),
        amount: paymentResponse.amount ? paymentResponse.amount.value / 100 : 0,
        currency: paymentResponse.amount?.currency,
        resultCode: paymentResponse.resultCode,
        created: new Date(paymentResponse.creationDate),
        refusalReason: paymentResponse.refusalReason,
        refusalReasonCode: paymentResponse.refusalReasonCode
      };

    } catch (error) {
      if (error.response) {
        const errorDetails = error.response.body || error.response;
        throw new Error(`Failed to fetch Adyen payment status: ${errorDetails.message || errorDetails.errorCode}`);
      } else {
        throw new Error(`Failed to fetch Adyen payment status: ${error.message}`);
      }
    }
  }

  /**
   * Create payment method token with Adyen
   * @param {Object} paymentMethodData - Payment method data
   * @returns {Object} Tokenized payment method
   */
  async createPaymentMethodToken(paymentMethodData) {
    try {
      if (paymentMethodData.type === 'card') {
        // For Adyen, we use stored payment methods
        const storeDetailRequest = {
          merchantAccount: this.config.merchantAccount,
          reference: `store_${Date.now()}`,
          paymentMethod: this.buildPaymentMethod(paymentMethodData),
          shopperReference: paymentMethodData.shopperReference || paymentMethodData.tenantId
        };

        const storeResponse = await this.checkout.storeDetail(storeDetailRequest);

        return {
          tokenId: storeResponse.recurringDetailReference,
          type: 'card',
          last4: paymentMethodData.cardNumber.slice(-4),
          expiryMonth: paymentMethodData.expiryMonth,
          expiryYear: paymentMethodData.expiryYear,
          brand: this.detectCardBrand(paymentMethodData.cardNumber),
          recurringDetailReference: storeResponse.recurringDetailReference
        };
      } else {
        throw new Error(`Unsupported payment method type: ${paymentMethodData.type}`);
      }

    } catch (error) {
      throw new Error(`Adyen payment method tokenization failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature with Adyen
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Signature validity
   */
  async verifyWebhookSignature(payload, signature) {
    try {
      // Adyen webhook signature verification
      const hmac = require('crypto').createHmac('sha256', this.config.webhookSecret);
      hmac.update(payload, 'utf8');
      const calculatedSignature = hmac.digest('base64');

      return calculatedSignature === signature;

    } catch (error) {
      this.logError('Adyen webhook signature verification failed', error);
      return false;
    }
  }

  /**
   * Handle webhook event from Adyen
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleWebhookEvent(event) {
    try {
      switch (event.eventCode) {
        case 'AUTHORISATION':
          return await this.handleAuthorisation(event);
        
        case 'CAPTURE':
          return await this.handleCapture(event);
        
        case 'REFUND':
          return await this.handleRefund(event);
        
        case 'CANCELLATION':
          return await this.handleCancellation(event);
        
        case 'CHARGEBACK':
          return await this.handleChargeback(event);
        
        case 'REPORT_AVAILABLE':
          return await this.handleReportAvailable(event);
        
        default:
          console.log(`Unhandled Adyen webhook event type: ${event.eventCode}`);
          return { status: 'ignored', reason: 'unhandled_event_type' };
      }
    } catch (error) {
      throw new Error(`Adyen webhook event handling failed: ${error.message}`);
    }
  }

  /**
   * Handle authorisation event
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleAuthorisation(event) {
    try {
      const notification = event.notificationItems[0].NotificationRequestItem;
      
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = $1, provider_transaction_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $3
      `;
      
      await this.db.query(query, [
        this.mapAdyenStatus(notification.eventCode),
        notification.pspReference,
        notification.merchantReference
      ]);

      return {
        status: 'processed',
        action: 'authorisation',
        transactionId: notification.merchantReference,
        providerTransactionId: notification.pspReference
      };

    } catch (error) {
      throw new Error(`Failed to handle authorisation: ${error.message}`);
    }
  }

  /**
   * Handle capture event
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleCapture(event) {
    try {
      const notification = event.notificationItems[0].NotificationRequestItem;
      
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = 'captured', provider_transaction_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $2
      `;
      
      await this.db.query(query, [
        notification.pspReference,
        notification.merchantReference
      ]);

      return {
        status: 'processed',
        action: 'capture',
        transactionId: notification.merchantReference,
        captureId: notification.pspReference
      };

    } catch (error) {
      throw new Error(`Failed to handle capture: ${error.message}`);
    }
  }

  /**
   * Handle refund event
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleRefund(event) {
    try {
      const notification = event.notificationItems[0].NotificationRequestItem;
      
      // Log refund event
      const query = `
        INSERT INTO refund_events (
          id, provider, event_type, transaction_id, refund_id, 
          amount, currency, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        require('uuid').v4(),
        'adyen',
        'refund',
        notification.merchantReference,
        notification.pspReference,
        parseFloat(notification.amount.value) / 100,
        notification.amount.currency
      ]);

      return {
        status: 'processed',
        action: 'refund',
        transactionId: notification.merchantReference,
        refundId: notification.pspReference
      };

    } catch (error) {
      throw new Error(`Failed to handle refund: ${error.message}`);
    }
  }

  /**
   * Handle cancellation event
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleCancellation(event) {
    try {
      const notification = event.notificationItems[0].NotificationRequestItem;
      
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $1
      `;
      
      await this.db.query(query, [notification.merchantReference]);

      return {
        status: 'processed',
        action: 'cancellation',
        transactionId: notification.merchantReference,
        providerTransactionId: notification.pspReference
      };

    } catch (error) {
      throw new Error(`Failed to handle cancellation: ${error.message}`);
    }
  }

  /**
   * Handle chargeback event
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleChargeback(event) {
    try {
      const notification = event.notificationItems[0].NotificationRequestItem;
      
      // Log chargeback for investigation
      const query = `
        INSERT INTO payment_disputes (
          id, tenant_id, provider, dispute_id, charge_id, amount, 
          currency, reason, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        require('uuid').v4(),
        notification.additionalData?.customField || 'unknown',
        'adyen',
        notification.pspReference,
        notification.originalReference,
        parseFloat(notification.amount.value) / 100,
        notification.amount.currency,
        'chargeback',
        'open'
      ]);

      return {
        status: 'processed',
        action: 'chargeback',
        transactionId: notification.merchantReference,
        disputeId: notification.pspReference
      };

    } catch (error) {
      throw new Error(`Failed to handle chargeback: ${error.message}`);
    }
  }

  /**
   * Handle report available event
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleReportAvailable(event) {
    try {
      const notification = event.notificationItems[0].NotificationRequestItem;
      
      // Log report availability
      console.log(`Adyen report available: ${notification.pspReference}`);

      return {
        status: 'processed',
        action: 'report_available',
        reportId: notification.pspReference
      };

    } catch (error) {
      throw new Error(`Failed to handle report available: ${error.message}`);
    }
  }

  /**
   * Build payment method object for Adyen
   * @param {Object} paymentData - Payment data
   * @returns {Object} Payment method object
   */
  buildPaymentMethod(paymentData) {
    if (paymentData.paymentMethod === 'card') {
      return {
        type: 'scheme',
        number: paymentData.cardDetails?.number,
        expiryMonth: paymentData.cardDetails?.expiryMonth,
        expiryYear: paymentData.cardDetails?.expiryYear,
        cvc: paymentData.cardDetails?.cvv,
        holderName: paymentData.cardDetails?.holderName
      };
    } else if (paymentData.paymentMethod === 'ideal') {
      return {
        type: 'ideal',
        issuer: paymentData.issuer
      };
    } else if (paymentData.paymentMethod === 'sepa') {
      return {
        type: 'sepadirectdebit',
        iban: paymentData.iban,
        ownerName: paymentData.ownerName
      };
    } else if (paymentData.paymentMethod === 'paypal') {
      return {
        type: 'paypal'
      };
    } else if (paymentData.paymentMethod === 'applepay') {
      return {
        type: 'applepay',
        applePayToken: paymentData.applePayToken
      };
    } else if (paymentData.paymentMethod === 'googlepay') {
      return {
        type: 'googlepay',
        googlePayToken: paymentData.googlePayToken
      };
    } else {
      return {
        type: paymentData.paymentMethod
      };
    }
  }

  /**
   * Map Adyen result code to our status
   * @param {string} resultCode - Adyen result code
   * @returns {string} Mapped status
   */
  mapAdyenStatus(resultCode) {
    const statusMap = {
      'Authorised': 'succeeded',
      'Refused': 'failed',
      'Pending': 'pending',
      'Cancelled': 'cancelled',
      'Error': 'error',
      'RedirectShopper': 'pending',
      'IdentifyShopper': 'pending',
      'ChallengeShopper': 'pending',
      'PresentToShopper': 'pending',
      'Received': 'pending',
      'Success': 'succeeded'
    };

    return statusMap[resultCode] || 'unknown';
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
   * Get payment methods for a specific country
   * @param {string} countryCode - Country code
   * @returns {Array} Available payment methods
   */
  async getPaymentMethodsForCountry(countryCode) {
    try {
      const response = await this.checkout.getPaymentMethods({
        merchantAccount: this.config.merchantAccount,
        countryCode: countryCode
      });

      return response.paymentMethods || [];

    } catch (error) {
      throw new Error(`Failed to get payment methods for country: ${error.message}`);
    }
  }

  /**
   * Get provider capabilities
   * @returns {Object} Provider capabilities
   */
  getCapabilities() {
    return {
      provider: 'adyen',
      supportedCurrencies: this.supportedCurrencies,
      supportedPaymentMethods: this.supportedPaymentMethods,
      features: [
        'global_payments',
        'local_payment_methods',
        'fraud_detection',
        '3d_secure',
        'recurring_payments',
        'refunds',
        'webhooks',
        'multi_currency',
        'dispute_management',
        'risk_management'
      ],
      limits: {
        maxAmount: 1000000.00,
        minAmount: 0.01,
        maxRefundAmount: 1000000.00
      }
    };
  }
}

module.exports = AdyenProvider;
