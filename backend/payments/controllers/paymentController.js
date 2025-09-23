/**
 * Payment Controller
 * 
 * Handles HTTP requests for payment processing, status checks,
 * and payment management operations.
 */

const { v4: uuidv4 } = require('uuid');
const PaymentOrchestrationService = require('../services/PaymentOrchestrationService');
const FraudDetectionService = require('../services/FraudDetectionService');
const CurrencyService = require('../services/CurrencyService');
const WhiteLabelPaymentService = require('../services/WhiteLabelPaymentService');

class PaymentController {
  constructor(db) {
    this.db = db;
    this.orchestrationService = new PaymentOrchestrationService(db);
    this.fraudDetectionService = new FraudDetectionService(db);
    this.currencyService = new CurrencyService(db);
    this.whiteLabelService = new WhiteLabelPaymentService(db);
  }

  /**
   * Process a payment
   * POST /api/payments/process
   */
  async processPayment(req, res) {
    try {
      const {
        amount,
        currency,
        paymentMethod,
        paymentMethodId,
        description,
        metadata,
        returnUrl,
        cancelUrl,
        targetCurrency,
        browserInfo,
        shopperInfo
      } = req.body;

      const tenantId = req.tenant.id;
      const userId = req.user.id;

      // Validate required fields
      if (!amount || !currency || !paymentMethod) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: amount, currency, paymentMethod'
        });
      }

      // Prepare payment data
      const paymentData = {
        tenantId,
        userId,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        paymentMethod,
        paymentMethodId,
        description,
        metadata: metadata || {},
        returnUrl,
        cancelUrl,
        targetCurrency: targetCurrency?.toUpperCase(),
        browserInfo,
        shopperInfo,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        location: req.body.location
      };

      // Process payment
      const result = await this.orchestrationService.processPayment(paymentData);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Process a refund
   * POST /api/payments/refund
   */
  async processRefund(req, res) {
    try {
      const {
        originalTransactionId,
        amount,
        reason
      } = req.body;

      const tenantId = req.tenant.id;

      // Validate required fields
      if (!originalTransactionId || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: originalTransactionId, amount'
        });
      }

      // Prepare refund data
      const refundData = {
        tenantId,
        originalTransactionId,
        amount: parseFloat(amount),
        reason
      };

      // Process refund
      const result = await this.orchestrationService.processRefund(refundData);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Refund processing error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get payment status
   * GET /api/payments/status/:transactionId
   */
  async getPaymentStatus(req, res) {
    try {
      const { transactionId } = req.params;
      const tenantId = req.tenant.id;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID is required'
        });
      }

      // Get payment status
      const result = await this.orchestrationService.getPaymentStatus(transactionId);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Payment status error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create payment method token
   * POST /api/payments/tokenize
   */
  async tokenizePaymentMethod(req, res) {
    try {
      const {
        type,
        cardDetails,
        paypalDetails,
        billingAddress
      } = req.body;

      const tenantId = req.tenant.id;
      const userId = req.user.id;

      // Validate required fields
      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'Payment method type is required'
        });
      }

      // Prepare payment method data
      const paymentMethodData = {
        tenantId,
        userId,
        type,
        cardDetails,
        paypalDetails,
        billingAddress
      };

      // Get the appropriate provider
      const provider = this.orchestrationService.providers.get('stripe'); // Default to Stripe
      if (!provider) {
        return res.status(500).json({
          success: false,
          error: 'Payment provider not available'
        });
      }

      // Tokenize payment method
      const result = await provider.tokenizePaymentMethod(paymentMethodData);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Payment method tokenization error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create white-label payment flow
   * POST /api/payments/flows
   */
  async createPaymentFlow(req, res) {
    try {
      const {
        branding,
        paymentConfig,
        features,
        security
      } = req.body;

      const tenantId = req.tenant.id;

      // Validate required fields
      if (!paymentConfig || !paymentConfig.amount) {
        return res.status(400).json({
          success: false,
          error: 'Payment configuration with amount is required'
        });
      }

      // Prepare flow configuration
      const flowConfig = {
        tenantId,
        branding,
        paymentConfig: {
          ...paymentConfig,
          amount: parseFloat(paymentConfig.amount)
        },
        features,
        security
      };

      // Create payment flow
      const result = await this.whiteLabelService.createPaymentFlow(flowConfig);

      res.status(201).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Payment flow creation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get payment flow
   * GET /api/payments/flows/:flowId
   */
  async getPaymentFlow(req, res) {
    try {
      const { flowId } = req.params;

      if (!flowId) {
        return res.status(400).json({
          success: false,
          error: 'Flow ID is required'
        });
      }

      // Get payment flow
      const result = await this.whiteLabelService.getPaymentFlow(flowId);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Payment flow retrieval error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update payment flow
   * PUT /api/payments/flows/:flowId
   */
  async updatePaymentFlow(req, res) {
    try {
      const { flowId } = req.params;
      const updates = req.body;

      if (!flowId) {
        return res.status(400).json({
          success: false,
          error: 'Flow ID is required'
        });
      }

      // Update payment flow
      await this.whiteLabelService.updatePaymentFlow(flowId, updates);

      res.status(200).json({
        success: true,
        message: 'Payment flow updated successfully'
      });

    } catch (error) {
      console.error('Payment flow update error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete payment flow
   * DELETE /api/payments/flows/:flowId
   */
  async deletePaymentFlow(req, res) {
    try {
      const { flowId } = req.params;

      if (!flowId) {
        return res.status(400).json({
          success: false,
          error: 'Flow ID is required'
        });
      }

      // Delete payment flow
      await this.whiteLabelService.deletePaymentFlow(flowId);

      res.status(200).json({
        success: true,
        message: 'Payment flow deleted successfully'
      });

    } catch (error) {
      console.error('Payment flow deletion error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get tenant payment flows
   * GET /api/payments/flows
   */
  async getTenantPaymentFlows(req, res) {
    try {
      const tenantId = req.tenant.id;
      const limit = parseInt(req.query.limit) || 50;

      // Get payment flows
      const result = await this.whiteLabelService.getTenantPaymentFlows(tenantId, limit);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Payment flows retrieval error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Convert currency
   * POST /api/payments/convert-currency
   */
  async convertCurrency(req, res) {
    try {
      const {
        amount,
        fromCurrency,
        toCurrency
      } = req.body;

      // Validate required fields
      if (!amount || !fromCurrency || !toCurrency) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: amount, fromCurrency, toCurrency'
        });
      }

      // Convert currency
      const result = await this.currencyService.convertCurrency({
        amount: parseFloat(amount),
        currency: fromCurrency.toUpperCase(),
        targetCurrency: toCurrency.toUpperCase()
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Currency conversion error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get supported currencies
   * GET /api/payments/currencies
   */
  async getSupportedCurrencies(req, res) {
    try {
      const currencies = this.currencyService.getSupportedCurrencies();

      res.status(200).json({
        success: true,
        data: currencies
      });

    } catch (error) {
      console.error('Supported currencies error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get regional payment methods
   * GET /api/payments/methods/:currency
   */
  async getRegionalPaymentMethods(req, res) {
    try {
      const { currency } = req.params;

      if (!currency) {
        return res.status(400).json({
          success: false,
          error: 'Currency is required'
        });
      }

      const methods = this.currencyService.getRegionalPaymentMethods(currency.toUpperCase());

      res.status(200).json({
        success: true,
        data: methods
      });

    } catch (error) {
      console.error('Regional payment methods error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get payment statistics
   * GET /api/payments/stats
   */
  async getPaymentStats(req, res) {
    try {
      const tenantId = req.tenant.id;
      const period = req.query.period || '30d';

      // Get orchestration statistics
      const orchestrationStats = await this.orchestrationService.getOrchestrationStats(tenantId, period);

      // Get provider metrics
      const providerMetrics = await this.orchestrationService.getProviderMetrics(tenantId);

      // Get fraud statistics
      const fraudStats = await this.fraudDetectionService.getFraudStatistics(tenantId, 30);

      res.status(200).json({
        success: true,
        data: {
          orchestration: orchestrationStats,
          providers: providerMetrics,
          fraud: fraudStats
        }
      });

    } catch (error) {
      console.error('Payment statistics error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get fraud assessment
   * POST /api/payments/fraud-assessment
   */
  async getFraudAssessment(req, res) {
    try {
      const {
        amount,
        currency,
        paymentMethod,
        location,
        device
      } = req.body;

      const tenantId = req.tenant.id;
      const userId = req.user.id;

      // Validate required fields
      if (!amount || !currency || !paymentMethod) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: amount, currency, paymentMethod'
        });
      }

      // Prepare payment data for fraud assessment
      const paymentData = {
        tenantId,
        userId,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        paymentMethod,
        location,
        device,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      // Get fraud assessment
      const result = await this.fraudDetectionService.assessPayment(paymentData);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Fraud assessment error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get fraud assessment history
   * GET /api/payments/fraud-history
   */
  async getFraudHistory(req, res) {
    try {
      const tenantId = req.tenant.id;
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;

      // Get fraud assessment history
      const result = await this.fraudDetectionService.getAssessmentHistory(tenantId, userId, limit);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Fraud history error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update fraud detection rules
   * PUT /api/payments/fraud-rules
   */
  async updateFraudRules(req, res) {
    try {
      const rules = req.body;

      // Update fraud detection rules
      this.fraudDetectionService.updateRules(rules);

      res.status(200).json({
        success: true,
        message: 'Fraud detection rules updated successfully'
      });

    } catch (error) {
      console.error('Fraud rules update error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get fraud detection rules
   * GET /api/payments/fraud-rules
   */
  async getFraudRules(req, res) {
    try {
      const rules = this.fraudDetectionService.getRules();

      res.status(200).json({
        success: true,
        data: rules
      });

    } catch (error) {
      console.error('Fraud rules retrieval error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = PaymentController;
