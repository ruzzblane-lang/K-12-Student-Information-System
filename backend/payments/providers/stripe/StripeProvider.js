/**
 * Stripe Payment Provider
 * 
 * Implementation of the Stripe payment gateway for processing
 * credit cards, digital wallets, and other payment methods.
 */

const Stripe = require('stripe');
const BasePaymentProvider = require('../base/BasePaymentProvider');

class StripeProvider extends BasePaymentProvider {
  constructor(config, db) {
    super(config, db);
    
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2023-10-16',
      maxNetworkRetries: 3,
      timeout: 30000
    });

    // Stripe supported currencies
    this.supportedCurrencies = [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
      'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'RUB', 'TRY', 'BRL', 'MXN',
      'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'VEF', 'INR', 'SGD', 'HKD', 'TWD',
      'MYR', 'THB', 'PHP', 'IDR', 'KRW', 'CNY', 'AED', 'SAR', 'QAR', 'KWD',
      'BHD', 'OMR', 'JOD', 'LBP', 'EGP', 'MAD', 'TND', 'ZAR', 'NGN', 'KES',
      'GHS', 'UGX', 'TZS', 'ETB', 'MWK', 'ZMW', 'BWP', 'SZL', 'LSL', 'NAD'
    ];

    // Stripe supported payment methods
    this.supportedPaymentMethods = [
      'card',
      'alipay',
      'bancontact',
      'eps',
      'giropay',
      'ideal',
      'p24',
      'sepa_debit',
      'sofort',
      'wechat_pay',
      'apple_pay',
      'google_pay',
      'link',
      'paypal',
      'klarna',
      'affirm',
      'afterpay_clearpay'
    ];
  }

  /**
   * Initialize the Stripe provider
   */
  async initialize() {
    try {
      // Test connection by retrieving account information
      const account = await this.stripe.accounts.retrieve();
      
      console.log(`Stripe provider initialized for account: ${account.id}`);
      console.log(`Account type: ${account.type}`);
      console.log(`Country: ${account.country}`);
      
      return {
        success: true,
        accountId: account.id,
        accountType: account.type,
        country: account.country,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled
      };
    } catch (error) {
      throw new Error(`Stripe initialization failed: ${error.message}`);
    }
  }

  /**
   * Execute payment with Stripe
   * @param {Object} paymentData - Payment data
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Payment result
   */
  async executePayment(paymentData, transactionId) {
    try {
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency.toLowerCase(),
        payment_method: paymentData.paymentMethodId,
        confirmation_method: 'automatic',
        confirm: true,
        metadata: {
          tenant_id: paymentData.tenantId,
          transaction_id: transactionId,
          student_id: paymentData.metadata?.studentId || '',
          fee_type: paymentData.metadata?.feeType || 'general'
        },
        description: paymentData.description || `Payment for ${paymentData.tenantId}`,
        receipt_email: paymentData.receiptEmail,
        statement_descriptor: paymentData.statementDescriptor || 'SCHOOL PAYMENT'
      });

      return {
        status: paymentIntent.status,
        providerTransactionId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency.toUpperCase(),
        paymentMethod: paymentIntent.payment_method,
        charges: paymentIntent.charges?.data || [],
        metadata: paymentIntent.metadata
      };

    } catch (error) {
      if (error.type === 'StripeCardError') {
        throw new Error(`Card declined: ${error.message}`);
      } else if (error.type === 'StripeRateLimitError') {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.type === 'StripeInvalidRequestError') {
        throw new Error(`Invalid request: ${error.message}`);
      } else if (error.type === 'StripeAPIError') {
        throw new Error('Stripe API error. Please try again later.');
      } else if (error.type === 'StripeConnectionError') {
        throw new Error('Network error. Please check your connection.');
      } else if (error.type === 'StripeAuthenticationError') {
        throw new Error('Authentication error. Please contact support.');
      } else {
        throw new Error(`Payment failed: ${error.message}`);
      }
    }
  }

  /**
   * Execute refund with Stripe
   * @param {Object} refundData - Refund data
   * @param {string} refundId - Refund ID
   * @returns {Object} Refund result
   */
  async executeRefund(refundData, refundId) {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: refundData.originalTransactionId,
        amount: Math.round(refundData.amount * 100), // Convert to cents
        reason: refundData.reason || 'requested_by_customer',
        metadata: {
          tenant_id: refundData.tenantId,
          refund_id: refundId,
          original_transaction_id: refundData.originalTransactionId
        }
      });

      return {
        status: refund.status,
        providerRefundId: refund.id,
        amount: refund.amount / 100, // Convert back to dollars
        currency: refund.currency.toUpperCase(),
        reason: refund.reason,
        metadata: refund.metadata
      };

    } catch (error) {
      throw new Error(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Fetch payment status from Stripe
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Payment status
   */
  async fetchPaymentStatus(transactionId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId);
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        created: new Date(paymentIntent.created * 1000),
        charges: paymentIntent.charges?.data || [],
        metadata: paymentIntent.metadata
      };

    } catch (error) {
      throw new Error(`Failed to fetch payment status: ${error.message}`);
    }
  }

  /**
   * Create payment method token with Stripe
   * @param {Object} paymentMethodData - Payment method data
   * @returns {Object} Tokenized payment method
   */
  async createPaymentMethodToken(paymentMethodData) {
    try {
      let paymentMethod;

      if (paymentMethodData.type === 'card') {
        // Create payment method for card
        paymentMethod = await this.stripe.paymentMethods.create({
          type: 'card',
          card: {
            number: paymentMethodData.cardNumber,
            exp_month: paymentMethodData.expiryMonth,
            exp_year: paymentMethodData.expiryYear,
            cvc: paymentMethodData.cvc
          },
          billing_details: {
            name: paymentMethodData.cardholderName,
            email: paymentMethodData.email,
            address: paymentMethodData.billingAddress
          }
        });
      } else if (paymentMethodData.type === 'sepa_debit') {
        // Create SEPA debit payment method
        paymentMethod = await this.stripe.paymentMethods.create({
          type: 'sepa_debit',
          sepa_debit: {
            iban: paymentMethodData.iban
          },
          billing_details: {
            name: paymentMethodData.accountHolderName,
            email: paymentMethodData.email
          }
        });
      } else {
        throw new Error(`Unsupported payment method type: ${paymentMethodData.type}`);
      }

      return {
        tokenId: paymentMethod.id,
        type: paymentMethod.type,
        last4: paymentMethod.card?.last4 || paymentMethod.sepa_debit?.last4,
        expiryMonth: paymentMethod.card?.exp_month,
        expiryYear: paymentMethod.card?.exp_year,
        brand: paymentMethod.card?.brand,
        country: paymentMethod.card?.country || paymentMethod.sepa_debit?.country
      };

    } catch (error) {
      throw new Error(`Payment method tokenization failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature with Stripe
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Signature validity
   */
  async verifyWebhookSignature(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
      
      return !!event;
    } catch (error) {
      console.error('Stripe webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Handle webhook event from Stripe
   * @param {Object} event - Webhook event
   * @returns {Object} Processing result
   */
  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentSucceeded(event.data.object);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailed(event.data.object);
        
        case 'payment_intent.canceled':
          return await this.handlePaymentCanceled(event.data.object);
        
        case 'charge.dispute.created':
          return await this.handleDisputeCreated(event.data.object);
        
        case 'invoice.payment_succeeded':
          return await this.handleInvoicePaymentSucceeded(event.data.object);
        
        case 'invoice.payment_failed':
          return await this.handleInvoicePaymentFailed(event.data.object);
        
        default:
          console.log(`Unhandled Stripe webhook event type: ${event.type}`);
          return { status: 'ignored', reason: 'unhandled_event_type' };
      }
    } catch (error) {
      throw new Error(`Webhook event handling failed: ${error.message}`);
    }
  }

  /**
   * Handle successful payment
   * @param {Object} paymentIntent - Payment intent object
   * @returns {Object} Processing result
   */
  async handlePaymentSucceeded(paymentIntent) {
    try {
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = 'succeeded', provider_transaction_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $2
      `;
      
      await this.db.query(query, [
        paymentIntent.id,
        paymentIntent.metadata.transaction_id
      ]);

      // Log successful payment
      console.log(`Payment succeeded: ${paymentIntent.id} for tenant: ${paymentIntent.metadata.tenant_id}`);

      return {
        status: 'processed',
        action: 'payment_succeeded',
        transactionId: paymentIntent.metadata.transaction_id,
        providerTransactionId: paymentIntent.id
      };

    } catch (error) {
      throw new Error(`Failed to handle payment success: ${error.message}`);
    }
  }

  /**
   * Handle failed payment
   * @param {Object} paymentIntent - Payment intent object
   * @returns {Object} Processing result
   */
  async handlePaymentFailed(paymentIntent) {
    try {
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = 'failed', error_message = $1, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $2
      `;
      
      await this.db.query(query, [
        paymentIntent.last_payment_error?.message || 'Payment failed',
        paymentIntent.metadata.transaction_id
      ]);

      // Log failed payment
      console.log(`Payment failed: ${paymentIntent.id} for tenant: ${paymentIntent.metadata.tenant_id}`);

      return {
        status: 'processed',
        action: 'payment_failed',
        transactionId: paymentIntent.metadata.transaction_id,
        providerTransactionId: paymentIntent.id,
        error: paymentIntent.last_payment_error?.message
      };

    } catch (error) {
      throw new Error(`Failed to handle payment failure: ${error.message}`);
    }
  }

  /**
   * Handle canceled payment
   * @param {Object} paymentIntent - Payment intent object
   * @returns {Object} Processing result
   */
  async handlePaymentCanceled(paymentIntent) {
    try {
      // Update payment status in database
      const query = `
        UPDATE payment_attempts 
        SET status = 'canceled', updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $1
      `;
      
      await this.db.query(query, [paymentIntent.metadata.transaction_id]);

      return {
        status: 'processed',
        action: 'payment_canceled',
        transactionId: paymentIntent.metadata.transaction_id,
        providerTransactionId: paymentIntent.id
      };

    } catch (error) {
      throw new Error(`Failed to handle payment cancellation: ${error.message}`);
    }
  }

  /**
   * Handle dispute created
   * @param {Object} dispute - Dispute object
   * @returns {Object} Processing result
   */
  async handleDisputeCreated(dispute) {
    try {
      // Log dispute for investigation
      const query = `
        INSERT INTO payment_disputes (
          id, tenant_id, provider, dispute_id, charge_id, amount, 
          currency, reason, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        require('uuid').v4(),
        dispute.metadata?.tenant_id || 'unknown',
        'stripe',
        dispute.id,
        dispute.charge,
        dispute.amount / 100,
        dispute.currency.toUpperCase(),
        dispute.reason,
        dispute.status
      ]);

      return {
        status: 'processed',
        action: 'dispute_created',
        disputeId: dispute.id,
        chargeId: dispute.charge
      };

    } catch (error) {
      throw new Error(`Failed to handle dispute: ${error.message}`);
    }
  }

  /**
   * Handle invoice payment succeeded
   * @param {Object} invoice - Invoice object
   * @returns {Object} Processing result
   */
  async handleInvoicePaymentSucceeded(invoice) {
    try {
      // Handle subscription or recurring payment success
      console.log(`Invoice payment succeeded: ${invoice.id}`);

      return {
        status: 'processed',
        action: 'invoice_payment_succeeded',
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription
      };

    } catch (error) {
      throw new Error(`Failed to handle invoice payment success: ${error.message}`);
    }
  }

  /**
   * Handle invoice payment failed
   * @param {Object} invoice - Invoice object
   * @returns {Object} Processing result
   */
  async handleInvoicePaymentFailed(invoice) {
    try {
      // Handle subscription or recurring payment failure
      console.log(`Invoice payment failed: ${invoice.id}`);

      return {
        status: 'processed',
        action: 'invoice_payment_failed',
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription
      };

    } catch (error) {
      throw new Error(`Failed to handle invoice payment failure: ${error.message}`);
    }
  }

  /**
   * Create customer in Stripe
   * @param {Object} customerData - Customer data
   * @returns {Object} Customer object
   */
  async createCustomer(customerData) {
    try {
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address,
        metadata: {
          tenant_id: customerData.tenantId,
          student_id: customerData.studentId || '',
          user_id: customerData.userId || ''
        }
      });

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: new Date(customer.created * 1000)
      };

    } catch (error) {
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  /**
   * Get customer from Stripe
   * @param {string} customerId - Customer ID
   * @returns {Object} Customer object
   */
  async getCustomer(customerId) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      throw new Error(`Failed to retrieve customer: ${error.message}`);
    }
  }

  /**
   * List customer payment methods
   * @param {string} customerId - Customer ID
   * @returns {Array} Payment methods
   */
  async listCustomerPaymentMethods(customerId) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year
        } : null,
        created: new Date(pm.created * 1000)
      }));

    } catch (error) {
      throw new Error(`Failed to list payment methods: ${error.message}`);
    }
  }

  /**
   * Detach payment method from customer
   * @param {string} paymentMethodId - Payment method ID
   * @returns {Object} Result
   */
  async detachPaymentMethod(paymentMethodId) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      return { success: true, paymentMethodId: paymentMethod.id };
    } catch (error) {
      throw new Error(`Failed to detach payment method: ${error.message}`);
    }
  }

  /**
   * Get provider capabilities
   * @returns {Object} Provider capabilities
   */
  getCapabilities() {
    return {
      provider: 'stripe',
      supportedCurrencies: this.supportedCurrencies,
      supportedPaymentMethods: this.supportedPaymentMethods,
      features: [
        'card_payments',
        'digital_wallets',
        'bank_transfers',
        'refunds',
        'disputes',
        'webhooks',
        'customer_management',
        'payment_method_storage',
        'recurring_payments',
        'multi_currency'
      ],
      limits: {
        maxAmount: 999999.99,
        minAmount: 0.50,
        maxRefundAmount: 999999.99
      }
    };
  }
}

module.exports = StripeProvider;
