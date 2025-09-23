/**
 * Stripe API Integration
 * 
 * Provides integration with Stripe payment services including:
 * - Payment processing
 * - Subscription management
 * - Invoice generation
 * - Webhook handling
 * - Refund processing
 */

const stripe = require('stripe');
const winston = require('winston');

class StripeIntegration {
  constructor() {
    this.name = 'Stripe Payment';
    this.provider = 'stripe';
    this.version = '1.0.0';
    this.category = 'payment';
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'stripe-integration' },
      transports: [
        new winston.transports.File({ filename: 'logs/stripe.log' }),
        new winston.transports.Console()
      ]
    });

    this.stripeClient = null;
  }

  /**
   * Initialize the integration with tenant configuration
   * @param {Object} config - Tenant configuration
   */
  async initialize(config) {
    try {
      const {
        secret_key,
        publishable_key,
        webhook_secret,
        currency = 'USD'
      } = config;

      this.stripeClient = stripe(secret_key);

      this.logger.info('Stripe integration initialized', {
        publishableKey: publishable_key,
        currency,
        services: ['payments', 'subscriptions', 'invoices', 'webhooks']
      });

      return { success: true, message: 'Stripe integration initialized successfully' };
    } catch (error) {
      this.logger.error('Failed to initialize Stripe integration', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Authenticate with Stripe
   * @param {Object} config - Authentication configuration
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(config) {
    try {
      if (!this.stripeClient) {
        throw new Error('Integration not initialized');
      }

      // Test authentication by getting account info
      const account = await this.stripeClient.accounts.retrieve();

      this.logger.info('Stripe authentication successful', {
        accountId: account.id,
        country: account.country,
        type: account.type
      });

      return {
        success: true,
        authenticated: true,
        account: {
          id: account.id,
          country: account.country,
          type: account.type,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled
        }
      };
    } catch (error) {
      this.logger.error('Stripe authentication failed', {
        error: error.message
      });
      return {
        success: false,
        authenticated: false,
        error: error.message
      };
    }
  }

  /**
   * Create payment intent
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Payment options
   * @returns {Promise<Object>} Payment intent result
   */
  async createPaymentIntent(config, options) {
    try {
      const {
        amount,
        currency = config.currency || 'USD',
        customerId = null,
        description = '',
        metadata = {},
        paymentMethodTypes = ['card'],
        captureMethod = 'automatic'
      } = options;

      const paymentIntentData = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        description: description,
        metadata: metadata,
        payment_method_types: paymentMethodTypes,
        capture_method: captureMethod
      };

      if (customerId) {
        paymentIntentData.customer = customerId;
      }

      const paymentIntent = await this.stripeClient.paymentIntents.create(paymentIntentData);

      this.logger.info('Stripe payment intent created successfully', {
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency,
        status: paymentIntent.status
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        currency,
        status: paymentIntent.status
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe payment intent', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Process payment
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Payment options
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(config, options) {
    try {
      const {
        amount,
        currency = config.currency || 'USD',
        paymentMethodId,
        customerId = null,
        description = '',
        metadata = {},
        confirm = true
      } = options;

      const paymentIntentData = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        description: description,
        metadata: metadata,
        confirm: confirm
      };

      if (customerId) {
        paymentIntentData.customer = customerId;
      }

      const paymentIntent = await this.stripeClient.paymentIntents.create(paymentIntentData);

      this.logger.info('Stripe payment processed successfully', {
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency,
        status: paymentIntent.status
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency,
        status: paymentIntent.status,
        charges: paymentIntent.charges?.data || []
      };
    } catch (error) {
      this.logger.error('Failed to process Stripe payment', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create customer
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Customer options
   * @returns {Promise<Object>} Customer result
   */
  async createCustomer(config, options) {
    try {
      const {
        email,
        name = '',
        phone = '',
        address = {},
        metadata = {}
      } = options;

      const customerData = {
        email: email,
        name: name,
        phone: phone,
        metadata: metadata
      };

      if (address.street && address.city && address.state && address.postal_code) {
        customerData.address = {
          line1: address.street,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: address.country || 'US'
        };
      }

      const customer = await this.stripeClient.customers.create(customerData);

      this.logger.info('Stripe customer created successfully', {
        customerId: customer.id,
        email,
        name
      });

      return {
        success: true,
        customerId: customer.id,
        email: customer.email,
        name: customer.name
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe customer', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create subscription
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Subscription options
   * @returns {Promise<Object>} Subscription result
   */
  async createSubscription(config, options) {
    try {
      const {
        customerId,
        priceId,
        quantity = 1,
        trialPeriodDays = null,
        metadata = {}
      } = options;

      const subscriptionData = {
        customer: customerId,
        items: [{
          price: priceId,
          quantity: quantity
        }],
        metadata: metadata,
        expand: ['latest_invoice.payment_intent']
      };

      if (trialPeriodDays) {
        subscriptionData.trial_period_days = trialPeriodDays;
      }

      const subscription = await this.stripeClient.subscriptions.create(subscriptionData);

      this.logger.info('Stripe subscription created successfully', {
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe subscription', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create invoice
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Invoice options
   * @returns {Promise<Object>} Invoice result
   */
  async createInvoice(config, options) {
    try {
      const {
        customerId,
        items = [],
        description = '',
        dueDate = null,
        metadata = {}
      } = options;

      const invoiceData = {
        customer: customerId,
        description: description,
        metadata: metadata,
        collection_method: 'send_invoice',
        days_until_due: dueDate ? Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 30
      };

      const invoice = await this.stripeClient.invoices.create(invoiceData);

      // Add line items
      for (const item of items) {
        await this.stripeClient.invoiceItems.create({
          customer: customerId,
          invoice: invoice.id,
          amount: Math.round(item.amount * 100), // Convert to cents
          currency: item.currency || config.currency || 'USD',
          description: item.description
        });
      }

      // Finalize the invoice
      const finalizedInvoice = await this.stripeClient.invoices.finalizeInvoice(invoice.id);

      this.logger.info('Stripe invoice created successfully', {
        invoiceId: finalizedInvoice.id,
        customerId,
        amount: finalizedInvoice.amount_due / 100,
        status: finalizedInvoice.status
      });

      return {
        success: true,
        invoiceId: finalizedInvoice.id,
        customerId,
        amount: finalizedInvoice.amount_due / 100,
        status: finalizedInvoice.status,
        hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe invoice', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Process refund
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Refund options
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(config, options) {
    try {
      const {
        paymentIntentId,
        amount = null,
        reason = 'requested_by_customer',
        metadata = {}
      } = options;

      const refundData = {
        payment_intent: paymentIntentId,
        reason: reason,
        metadata: metadata
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripeClient.refunds.create(refundData);

      this.logger.info('Stripe refund processed successfully', {
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount / 100,
        status: refund.status
      });

      return {
        success: true,
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount / 100,
        status: refund.status
      };
    } catch (error) {
      this.logger.error('Failed to process Stripe refund', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get payment status
   * @param {Object} config - Tenant configuration
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(config, paymentIntentId) {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.retrieve(paymentIntentId);

      this.logger.info('Stripe payment status retrieved', {
        paymentIntentId,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        charges: paymentIntent.charges?.data || []
      };
    } catch (error) {
      this.logger.error('Failed to get Stripe payment status', {
        error: error.message,
        paymentIntentId
      });
      throw error;
    }
  }

  /**
   * Health check for the integration
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      if (!this.stripeClient) {
        return {
          status: 'unhealthy',
          message: 'Integration not initialized'
        };
      }

      // Test API connectivity
      await this.stripeClient.accounts.retrieve();

      return {
        status: 'healthy',
        message: 'Stripe integration is working properly',
        services: {
          payments: 'available',
          subscriptions: 'available',
          invoices: 'available',
          webhooks: 'available'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        services: {
          payments: 'unavailable',
          subscriptions: 'unavailable',
          invoices: 'unavailable',
          webhooks: 'unavailable'
        }
      };
    }
  }
}

module.exports = StripeIntegration;
