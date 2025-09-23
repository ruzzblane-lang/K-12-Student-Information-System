/**
 * Payment Routes
 * 
 * Defines all payment-related API endpoints with proper
 * authentication, validation, and error handling.
 */

const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../../middleware/auth');
const { requireTenant } = require('../../middleware/tenantContext');
const { validatePaymentData, validateRefundData } = require('../middleware/validation');

// Initialize payment controller
let paymentController;

// Initialize controller with database connection
const initializeController = (db) => {
  if (!paymentController) {
    paymentController = new PaymentController(db);
  }
  return paymentController;
};

// Middleware to ensure controller is initialized
const ensureController = (req, res, next) => {
  if (!paymentController) {
    return res.status(500).json({
      success: false,
      error: 'Payment service not initialized'
    });
  }
  next();
};

/**
 * @route   POST /api/payments/process
 * @desc    Process a payment
 * @access  Private (Authenticated users)
 * @body    { amount, currency, paymentMethod, paymentMethodId, description, metadata, returnUrl, cancelUrl, targetCurrency, browserInfo, shopperInfo }
 */
router.post('/process', 
  authenticateToken,
  requireTenant,
  ensureController,
  validatePaymentData,
  async (req, res) => {
    await paymentController.processPayment(req, res);
  }
);

/**
 * @route   POST /api/payments/refund
 * @desc    Process a refund
 * @access  Private (Authenticated users)
 * @body    { originalTransactionId, amount, reason }
 */
router.post('/refund',
  authenticateToken,
  requireTenant,
  ensureController,
  validateRefundData,
  async (req, res) => {
    await paymentController.processRefund(req, res);
  }
);

/**
 * @route   GET /api/payments/status/:transactionId
 * @desc    Get payment status
 * @access  Private (Authenticated users)
 * @params  { transactionId }
 */
router.get('/status/:transactionId',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getPaymentStatus(req, res);
  }
);

/**
 * @route   POST /api/payments/tokenize
 * @desc    Create payment method token
 * @access  Private (Authenticated users)
 * @body    { type, cardDetails, paypalDetails, billingAddress }
 */
router.post('/tokenize',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.tokenizePaymentMethod(req, res);
  }
);

/**
 * @route   POST /api/payments/flows
 * @desc    Create white-label payment flow
 * @access  Private (Authenticated users)
 * @body    { branding, paymentConfig, features, security }
 */
router.post('/flows',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.createPaymentFlow(req, res);
  }
);

/**
 * @route   GET /api/payments/flows
 * @desc    Get tenant payment flows
 * @access  Private (Authenticated users)
 * @query   { limit, offset }
 */
router.get('/flows',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getTenantPaymentFlows(req, res);
  }
);

/**
 * @route   GET /api/payments/flows/:flowId
 * @desc    Get payment flow details
 * @access  Private (Authenticated users)
 * @params  { flowId }
 */
router.get('/flows/:flowId',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getPaymentFlow(req, res);
  }
);

/**
 * @route   PUT /api/payments/flows/:flowId
 * @desc    Update payment flow
 * @access  Private (Authenticated users)
 * @params  { flowId }
 * @body    { branding, paymentConfig, features, security }
 */
router.put('/flows/:flowId',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.updatePaymentFlow(req, res);
  }
);

/**
 * @route   DELETE /api/payments/flows/:flowId
 * @desc    Delete payment flow
 * @access  Private (Authenticated users)
 * @params  { flowId }
 */
router.delete('/flows/:flowId',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.deletePaymentFlow(req, res);
  }
);

/**
 * @route   POST /api/payments/convert-currency
 * @desc    Convert currency amount
 * @access  Private (Authenticated users)
 * @body    { amount, fromCurrency, toCurrency }
 */
router.post('/convert-currency',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.convertCurrency(req, res);
  }
);

/**
 * @route   GET /api/payments/currencies
 * @desc    Get supported currencies
 * @access  Private (Authenticated users)
 */
router.get('/currencies',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getSupportedCurrencies(req, res);
  }
);

/**
 * @route   GET /api/payments/methods/:currency
 * @desc    Get regional payment methods for currency
 * @access  Private (Authenticated users)
 * @params  { currency }
 */
router.get('/methods/:currency',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getRegionalPaymentMethods(req, res);
  }
);

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics
 * @access  Private (Authenticated users)
 * @query   { period }
 */
router.get('/stats',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getPaymentStats(req, res);
  }
);

/**
 * @route   POST /api/payments/fraud-assessment
 * @desc    Get fraud assessment for payment
 * @access  Private (Authenticated users)
 * @body    { amount, currency, paymentMethod, location, device }
 */
router.post('/fraud-assessment',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getFraudAssessment(req, res);
  }
);

/**
 * @route   GET /api/payments/fraud-history
 * @desc    Get fraud assessment history
 * @access  Private (Authenticated users)
 * @query   { limit, offset }
 */
router.get('/fraud-history',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getFraudHistory(req, res);
  }
);

/**
 * @route   PUT /api/payments/fraud-rules
 * @desc    Update fraud detection rules
 * @access  Private (Admin users)
 * @body    { rules, riskWeights }
 */
router.put('/fraud-rules',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.updateFraudRules(req, res);
  }
);

/**
 * @route   GET /api/payments/fraud-rules
 * @desc    Get fraud detection rules
 * @access  Private (Authenticated users)
 */
router.get('/fraud-rules',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getFraudRules(req, res);
  }
);

/**
 * @route   GET /api/payments/health
 * @desc    Health check for payment service
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment service is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * @route   GET /api/payments/providers
 * @desc    Get available payment providers
 * @access  Private (Authenticated users)
 */
router.get('/providers',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    try {
      const providers = [];
      
      // Get provider information from orchestration service
      for (const [name, provider] of paymentController.orchestrationService.providers) {
        providers.push({
          name,
          capabilities: provider.getCapabilities(),
          supportedCurrencies: provider.getSupportedCurrencies(),
          supportedPaymentMethods: provider.getSupportedPaymentMethods()
        });
      }

      res.status(200).json({
        success: true,
        data: providers
      });
    } catch (error) {
      console.error('Provider information error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/payments/capabilities
 * @desc    Get payment system capabilities
 * @access  Private (Authenticated users)
 */
router.get('/capabilities',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    try {
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
        supportedCurrencies: paymentController.currencyService.getSupportedCurrencies(),
        regionalPaymentMethods: {}
      };

      // Get provider capabilities
      for (const [name, provider] of paymentController.orchestrationService.providers) {
        capabilities.providers.push({
          name,
          ...provider.getCapabilities()
        });
      }

      // Get regional payment methods for major currencies
      const majorCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
      for (const currency of majorCurrencies) {
        capabilities.regionalPaymentMethods[currency] = 
          paymentController.currencyService.getRegionalPaymentMethods(currency);
      }

      res.status(200).json({
        success: true,
        data: capabilities
      });
    } catch (error) {
      console.error('Capabilities error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/payments/methods
 * @desc    Get available payment methods with filtering
 * @access  Private (Authenticated users)
 * @query   { country, currency, amount, tenantId }
 */
router.get('/methods',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getAvailablePaymentMethods(req, res);
  }
);

/**
 * @route   GET /api/payments/methods/:paymentMethodId
 * @desc    Get payment method details
 * @access  Private (Authenticated users)
 * @params  { paymentMethodId }
 * @query   { amount }
 */
router.get('/methods/:paymentMethodId',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getPaymentMethodDetails(req, res);
  }
);

/**
 * @route   POST /api/payments/methods/:paymentMethodId/validate
 * @desc    Validate payment method data
 * @access  Private (Authenticated users)
 * @params  { paymentMethodId }
 * @body    { data, options }
 */
router.post('/methods/:paymentMethodId/validate',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.validatePaymentMethod(req, res);
  }
);

/**
 * @route   GET /api/payments/countries
 * @desc    Get supported countries
 * @access  Private (Authenticated users)
 */
router.get('/countries',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getSupportedCountries(req, res);
  }
);

/**
 * @route   GET /api/payments/methods/stats
 * @desc    Get payment method statistics
 * @access  Private (Authenticated users)
 */
router.get('/methods/stats',
  authenticateToken,
  requireTenant,
  ensureController,
  async (req, res) => {
    await paymentController.getPaymentMethodStats(req, res);
  }
);

// Export router and initialization function
module.exports = {
  router,
  initializeController
};
