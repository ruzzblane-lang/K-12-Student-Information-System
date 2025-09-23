/**
 * Payment Gateway Module Entry Point
 * 
 * Initializes and exports the payment gateway system with all
 * providers, services, and controllers.
 */

const express = require('express');
const PaymentOrchestrationService = require('./services/PaymentOrchestrationService');
const FraudDetectionService = require('./services/FraudDetectionService');
const CurrencyService = require('./services/CurrencyService');
const WhiteLabelPaymentService = require('./services/WhiteLabelPaymentService');

// Provider imports
const StripeProvider = require('./providers/stripe/StripeProvider');
const PayPalProvider = require('./providers/paypal/PayPalProvider');
const AdyenProvider = require('./providers/adyen/AdyenProvider');

// Route imports
const { router: paymentRoutes, initializeController: initializePaymentController } = require('./routes/payments');
const { router: webhookRoutes, initializeController: initializeWebhookController } = require('./routes/webhooks');

class PaymentGateway {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;
    this.router = express.Router();
    
    // Initialize services
    this.orchestrationService = new PaymentOrchestrationService(db);
    this.fraudDetectionService = new FraudDetectionService(db);
    this.currencyService = new CurrencyService(db);
    this.whiteLabelService = new WhiteLabelPaymentService(db);
    
    // Initialize providers
    this.providers = new Map();
    
    // Initialize controllers
    this.paymentController = null;
    this.webhookController = null;
    
    // Initialize the system
    this.initialize();
  }

  /**
   * Initialize the payment gateway system
   */
  async initialize() {
    try {
      console.log('Initializing Payment Gateway (Fort Knox Edition)...');
      
      // Initialize providers
      await this.initializeProviders();
      
      // Register providers with orchestration service
      this.registerProviders();
      
      // Initialize controllers
      this.initializeControllers();
      
      // Setup routes
      this.setupRoutes();
      
      console.log('Payment Gateway initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Payment Gateway:', error);
      throw error;
    }
  }

  /**
   * Initialize payment providers
   */
  async initializeProviders() {
    const providerConfigs = this.config.providers || {};
    
    // Initialize Stripe provider
    if (providerConfigs.stripe) {
      try {
        const stripeProvider = new StripeProvider(providerConfigs.stripe, this.db);
        await stripeProvider.initialize();
        this.providers.set('stripe', stripeProvider);
        console.log('Stripe provider initialized');
      } catch (error) {
        console.error('Failed to initialize Stripe provider:', error.message);
      }
    }
    
    // Initialize PayPal provider
    if (providerConfigs.paypal) {
      try {
        const paypalProvider = new PayPalProvider(providerConfigs.paypal, this.db);
        await paypalProvider.initialize();
        this.providers.set('paypal', paypalProvider);
        console.log('PayPal provider initialized');
      } catch (error) {
        console.error('Failed to initialize PayPal provider:', error.message);
      }
    }
    
    // Initialize Adyen provider
    if (providerConfigs.adyen) {
      try {
        const adyenProvider = new AdyenProvider(providerConfigs.adyen, this.db);
        await adyenProvider.initialize();
        this.providers.set('adyen', adyenProvider);
        console.log('Adyen provider initialized');
      } catch (error) {
        console.error('Failed to initialize Adyen provider:', error.message);
      }
    }
    
    if (this.providers.size === 0) {
      throw new Error('No payment providers could be initialized');
    }
  }

  /**
   * Register providers with orchestration service
   */
  registerProviders() {
    for (const [name, provider] of this.providers) {
      this.orchestrationService.registerProvider(name, provider);
    }
  }

  /**
   * Initialize controllers
   */
  initializeControllers() {
    // Initialize payment controller
    this.paymentController = initializePaymentController(this.db);
    
    // Initialize webhook controller
    this.webhookController = initializeWebhookController(this.db);
    
    // Register providers with webhook controller
    for (const [name, provider] of this.providers) {
      this.webhookController.registerProvider(name, provider);
    }
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // Mount payment routes
    this.router.use('/payments', paymentRoutes);
    
    // Mount webhook routes
    this.router.use('/webhooks', webhookRoutes);
    
    // Health check endpoint
    this.router.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Payment Gateway is healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        providers: Array.from(this.providers.keys()),
        features: [
          'multi_currency',
          'fraud_detection',
          'white_labeling',
          'webhooks',
          'refunds',
          'recurring_payments',
          'local_payment_methods',
          '3d_secure',
          'dispute_management'
        ]
      });
    });
  }

  /**
   * Get payment orchestration service
   * @returns {PaymentOrchestrationService}
   */
  getOrchestrationService() {
    return this.orchestrationService;
  }

  /**
   * Get fraud detection service
   * @returns {FraudDetectionService}
   */
  getFraudDetectionService() {
    return this.fraudDetectionService;
  }

  /**
   * Get currency service
   * @returns {CurrencyService}
   */
  getCurrencyService() {
    return this.currencyService;
  }

  /**
   * Get white-label service
   * @returns {WhiteLabelPaymentService}
   */
  getWhiteLabelService() {
    return this.whiteLabelService;
  }

  /**
   * Get payment provider
   * @param {string} name - Provider name
   * @returns {BasePaymentProvider|null}
   */
  getProvider(name) {
    return this.providers.get(name) || null;
  }

  /**
   * Get all providers
   * @returns {Map}
   */
  getProviders() {
    return this.providers;
  }

  /**
   * Get router
   * @returns {express.Router}
   */
  getRouter() {
    return this.router;
  }

  /**
   * Get system capabilities
   * @returns {Object}
   */
  getCapabilities() {
    const capabilities = {
      providers: [],
      features: [
        'multi_currency',
        'fraud_detection',
        'white_labeling',
        'webhooks',
        'refunds',
        'recurring_payments',
        'local_payment_methods',
        '3d_secure',
        'dispute_management'
      ],
      supportedCurrencies: this.currencyService.getSupportedCurrencies(),
      regionalPaymentMethods: {}
    };

    // Get provider capabilities
    for (const [name, provider] of this.providers) {
      capabilities.providers.push({
        name,
        ...provider.getCapabilities()
      });
    }

    // Get regional payment methods for major currencies
    const majorCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
    for (const currency of majorCurrencies) {
      capabilities.regionalPaymentMethods[currency] = 
        this.currencyService.getRegionalPaymentMethods(currency);
    }

    return capabilities;
  }

  /**
   * Get system statistics
   * @returns {Object}
   */
  async getStatistics() {
    try {
      const stats = {
        providers: this.providers.size,
        features: 9,
        supportedCurrencies: Object.keys(this.currencyService.getSupportedCurrencies()).length,
        regionalPaymentMethods: 0,
        systemHealth: 'healthy',
        lastUpdated: new Date().toISOString()
      };

      // Calculate total regional payment methods
      for (const currency of Object.keys(this.currencyService.getSupportedCurrencies())) {
        stats.regionalPaymentMethods += this.currencyService.getRegionalPaymentMethods(currency).length;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get system statistics:', error);
      return {
        providers: 0,
        features: 0,
        supportedCurrencies: 0,
        regionalPaymentMethods: 0,
        systemHealth: 'error',
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Shutdown the payment gateway
   */
  async shutdown() {
    try {
      console.log('Shutting down Payment Gateway...');
      
      // Clear providers
      this.providers.clear();
      
      // Clear services
      this.orchestrationService = null;
      this.fraudDetectionService = null;
      this.currencyService = null;
      this.whiteLabelService = null;
      
      // Clear controllers
      this.paymentController = null;
      this.webhookController = null;
      
      console.log('Payment Gateway shutdown complete');
      
    } catch (error) {
      console.error('Error during Payment Gateway shutdown:', error);
    }
  }
}

// Export the PaymentGateway class and individual components
module.exports = {
  PaymentGateway,
  PaymentOrchestrationService,
  FraudDetectionService,
  CurrencyService,
  WhiteLabelPaymentService,
  StripeProvider,
  PayPalProvider,
  AdyenProvider
};
