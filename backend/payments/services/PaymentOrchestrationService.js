/**
 * Payment Orchestration Service
 * 
 * Central service that manages payment routing, retries, fallbacks,
 * fraud detection, and logging across multiple payment providers.
 */

const { v4: uuidv4 } = require('uuid');
const FraudDetectionService = require('./FraudDetectionService');
const CurrencyService = require('./CurrencyService');
const WhiteLabelPaymentService = require('./WhiteLabelPaymentService');

class PaymentOrchestrationService {
  constructor(db) {
    this.db = db;
    this.providers = new Map();
    this.fraudDetection = new FraudDetectionService(db);
    this.currencyService = new CurrencyService(db);
    this.whiteLabelService = new WhiteLabelPaymentService(db);
    
    // Provider priority order (can be configured per tenant)
    this.defaultProviderPriority = ['stripe', 'paypal', 'adyen'];
    
    // Regional provider mappings
    this.regionalProviders = new Map();
    this.initializeRegionalProviders();
    
    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      backoffMultiplier: 2
    };
  }

  /**
   * Initialize regional provider mappings
   */
  initializeRegionalProviders() {
    // US/Canada
    this.regionalProviders.set('US', ['ach_direct_debit']);
    this.regionalProviders.set('CA', ['interac']);
    
    // EU/UK
    this.regionalProviders.set('NL', ['ideal']);
    this.regionalProviders.set('DE', ['giropay']);
    this.regionalProviders.set('BE', ['bancontact']);
    this.regionalProviders.set('AT', ['giropay']);
    
    // Australia/NZ
    this.regionalProviders.set('AU', ['poli', 'payid', 'bpay']);
    this.regionalProviders.set('NZ', ['poli']);
    
    // Asia-Pacific
    this.regionalProviders.set('SG', ['grabpay']);
    this.regionalProviders.set('MY', ['grabpay']);
    this.regionalProviders.set('TH', ['grabpay']);
    this.regionalProviders.set('ID', ['grabpay', 'gopay', 'ovo', 'dana']);
    this.regionalProviders.set('PH', ['grabpay']);
    this.regionalProviders.set('VN', ['grabpay']);
    this.regionalProviders.set('KH', ['grabpay']);
    this.regionalProviders.set('MM', ['grabpay']);
    
    // India
    this.regionalProviders.set('IN', ['upi', 'paytm', 'phonepe']);
    
    // Latin America
    this.regionalProviders.set('BR', ['boleto_bancario', 'pix']);
    this.regionalProviders.set('MX', ['oxxo']);
    
    // Middle East
    this.regionalProviders.set('SA', ['mada', 'stc_pay']);
    this.regionalProviders.set('EG', ['fawry']);
  }

  /**
   * Register a payment provider
   * @param {string} name - Provider name
   * @param {BasePaymentProvider} provider - Provider instance
   */
  registerProvider(name, provider) {
    this.providers.set(name, provider);
    console.log(`Payment provider registered: ${name}`);
  }

  /**
   * Get regional providers for a country
   * @param {string} country - Country code
   * @returns {Array} Array of regional provider names
   */
  getRegionalProviders(country) {
    return this.regionalProviders.get(country) || [];
  }

  /**
   * Get provider priority list with regional providers
   * @param {string} country - Country code
   * @param {Array} tenantProviderPriority - Tenant-specific provider priority
   * @returns {Array} Provider priority list
   */
  getProviderPriority(country, tenantProviderPriority = null) {
    const basePriority = tenantProviderPriority || this.defaultProviderPriority;
    const regionalProviders = this.getRegionalProviders(country);
    
    // Combine regional providers with base providers, prioritizing regional ones
    return [...regionalProviders, ...basePriority.filter(p => !regionalProviders.includes(p))];
  }

  /**
   * Process payment with orchestration
   * @param {Object} paymentData - Payment data
   * @returns {Object} Payment result
   */
  async processPayment(paymentData) {
    const orchestrationId = uuidv4();
    const startTime = Date.now();

    try {
      // Validate payment data
      this.validatePaymentData(paymentData);

      // Get tenant configuration
      const tenantConfig = await this.getTenantPaymentConfig(paymentData.tenantId);

      // Apply white-label branding if enabled
      if (tenantConfig.whiteLabelEnabled) {
        paymentData = await this.whiteLabelService.applyBranding(paymentData, tenantConfig);
      }

      // Handle currency conversion if needed
      if (paymentData.targetCurrency && paymentData.targetCurrency !== paymentData.currency) {
        paymentData = await this.currencyService.convertCurrency(paymentData);
      }

      // Perform fraud detection
      const fraudAssessment = await this.fraudDetection.assessPayment(paymentData);
      if (fraudAssessment.riskLevel === 'high') {
        throw new Error(`Payment blocked due to high fraud risk: ${fraudAssessment.reason}`);
      }

      // Get provider priority for this tenant
      // Use regional provider priority if country is provided
      const providerPriority = this.getProviderPriority(
        paymentData.country,
        tenantConfig.providerPriority
      );

      // Try providers in priority order
      let lastError;
      for (const providerName of providerPriority) {
        const provider = this.providers.get(providerName);
        if (!provider) {
          console.warn(`Provider not found: ${providerName}`);
          continue;
        }

        // Check if provider supports the payment method and currency
        if (!this.isProviderSuitable(provider, paymentData)) {
          console.log(`Provider ${providerName} not suitable for this payment`);
          continue;
        }

        try {
          // Attempt payment with current provider
          const result = await this.attemptPaymentWithProvider(
            provider,
            paymentData,
            orchestrationId,
            fraudAssessment
          );

          // Log successful payment
          await this.logOrchestrationResult(orchestrationId, {
            success: true,
            provider: providerName,
            transactionId: result.transactionId,
            processingTime: Date.now() - startTime,
            fraudAssessment
          });

          return {
            success: true,
            orchestrationId,
            provider: providerName,
            transactionId: result.transactionId,
            amount: result.amount,
            currency: result.currency,
            processingTime: Date.now() - startTime,
            fraudAssessment,
            metadata: result.metadata
          };

        } catch (error) {
          lastError = error;
          console.error(`Payment failed with provider ${providerName}:`, error.message);

          // Log failed attempt
          await this.logProviderFailure(orchestrationId, providerName, error);

          // If this is a temporary error, continue to next provider
          if (this.isTemporaryError(error)) {
            continue;
          } else {
            // Permanent error, stop trying
            break;
          }
        }
      }

      // All providers failed
      throw new Error(`All payment providers failed. Last error: ${lastError?.message}`);

    } catch (error) {
      // Log orchestration failure
      await this.logOrchestrationResult(orchestrationId, {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Process refund with orchestration
   * @param {Object} refundData - Refund data
   * @returns {Object} Refund result
   */
  async processRefund(refundData) {
    const orchestrationId = uuidv4();
    const startTime = Date.now();

    try {
      // Validate refund data
      this.validateRefundData(refundData);

      // Get original transaction details
      const originalTransaction = await this.getOriginalTransaction(refundData.originalTransactionId);
      if (!originalTransaction) {
        throw new Error('Original transaction not found');
      }

      // Get the provider that processed the original payment
      const provider = this.providers.get(originalTransaction.provider);
      if (!provider) {
        throw new Error(`Provider not available: ${originalTransaction.provider}`);
      }

      // Prepare refund data
      const providerRefundData = {
        ...refundData,
        originalTransactionId: originalTransaction.providerTransactionId,
        tenantId: originalTransaction.tenantId
      };

      // Process refund
      const result = await provider.processRefund(providerRefundData);

      // Log successful refund
      await this.logOrchestrationResult(orchestrationId, {
        success: true,
        provider: originalTransaction.provider,
        refundId: result.refundId,
        processingTime: Date.now() - startTime,
        type: 'refund'
      });

      return {
        success: true,
        orchestrationId,
        provider: originalTransaction.provider,
        refundId: result.refundId,
        amount: result.amount,
        currency: result.currency,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      // Log refund failure
      await this.logOrchestrationResult(orchestrationId, {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        type: 'refund'
      });

      throw error;
    }
  }

  /**
   * Get payment status
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Payment status
   */
  async getPaymentStatus(transactionId) {
    try {
      // Get transaction from database
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get provider
      const provider = this.providers.get(transaction.provider);
      if (!provider) {
        throw new Error(`Provider not available: ${transaction.provider}`);
      }

      // Get status from provider
      const status = await provider.getPaymentStatus(transaction.providerTransactionId);

      return {
        success: true,
        transactionId,
        provider: transaction.provider,
        status: status.status,
        amount: status.amount,
        currency: status.currency,
        created: status.created,
        metadata: status.metadata
      };

    } catch (error) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * Attempt payment with a specific provider
   * @param {BasePaymentProvider} provider - Payment provider
   * @param {Object} paymentData - Payment data
   * @param {string} orchestrationId - Orchestration ID
   * @param {Object} fraudAssessment - Fraud assessment
   * @returns {Object} Payment result
   */
  async attemptPaymentWithProvider(provider, paymentData, orchestrationId, fraudAssessment) {
    let attempt = 0;
    let lastError;

    while (attempt < this.retryConfig.maxRetries) {
      try {
        // Add orchestration metadata
        const providerPaymentData = {
          ...paymentData,
          metadata: {
            ...paymentData.metadata,
            orchestrationId,
            fraudRiskScore: fraudAssessment.riskScore,
            attempt: attempt + 1
          }
        };

        // Process payment
        const result = await provider.processPayment(providerPaymentData);

        // Store transaction in database
        await this.storeTransaction({
          orchestrationId,
          provider: provider.providerName,
          transactionId: result.transactionId,
          providerTransactionId: result.result.providerTransactionId,
          tenantId: paymentData.tenantId,
          amount: result.result.amount,
          currency: result.result.currency,
          paymentMethod: paymentData.paymentMethod,
          status: result.result.status,
          fraudRiskScore: fraudAssessment.riskScore,
          processingTime: result.processingTime
        });

        return result;

      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt < this.retryConfig.maxRetries) {
          // Wait before retry
          const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if provider is suitable for payment
   * @param {BasePaymentProvider} provider - Payment provider
   * @param {Object} paymentData - Payment data
   * @returns {boolean} Suitability
   */
  isProviderSuitable(provider, paymentData) {
    // Check currency support
    if (!provider.isCurrencySupported(paymentData.currency)) {
      return false;
    }

    // Check payment method support
    if (!provider.isPaymentMethodSupported(paymentData.paymentMethod)) {
      return false;
    }

    // Check amount limits
    const capabilities = provider.getCapabilities?.();
    if (capabilities?.limits) {
      if (paymentData.amount < capabilities.limits.minAmount) {
        return false;
      }
      if (paymentData.amount > capabilities.limits.maxAmount) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if error is temporary
   * @param {Error} error - Error object
   * @returns {boolean} Is temporary
   */
  isTemporaryError(error) {
    const temporaryErrors = [
      'timeout',
      'network',
      'rate_limit',
      'temporary',
      'service_unavailable',
      'internal_server_error'
    ];

    const errorMessage = error.message.toLowerCase();
    return temporaryErrors.some(tempError => errorMessage.includes(tempError));
  }

  /**
   * Get tenant payment configuration
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Tenant configuration
   */
  async getTenantPaymentConfig(tenantId) {
    const query = `
      SELECT 
        payment_config,
        white_label_enabled,
        default_currency,
        allowed_payment_methods,
        fraud_detection_enabled
      FROM tenants 
      WHERE id = $1
    `;

    const result = await this.db.query(query, [tenantId]);
    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    const tenant = result.rows[0];
    const config = tenant.payment_config || {};

    return {
      providerPriority: config.providerPriority || this.defaultProviderPriority,
      whiteLabelEnabled: tenant.white_label_enabled || false,
      defaultCurrency: tenant.default_currency || 'USD',
      allowedPaymentMethods: tenant.allowed_payment_methods || ['card'],
      fraudDetectionEnabled: tenant.fraud_detection_enabled !== false,
      ...config
    };
  }

  /**
   * Store transaction in database
   * @param {Object} transactionData - Transaction data
   */
  async storeTransaction(transactionData) {
    const query = `
      INSERT INTO payment_transactions (
        id, orchestration_id, tenant_id, provider, transaction_id,
        provider_transaction_id, amount, currency, payment_method,
        status, fraud_risk_score, processing_time_ms, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      uuidv4(),
      transactionData.orchestrationId,
      transactionData.tenantId,
      transactionData.provider,
      transactionData.transactionId,
      transactionData.providerTransactionId,
      transactionData.amount,
      transactionData.currency,
      transactionData.paymentMethod,
      transactionData.status,
      transactionData.fraudRiskScore,
      transactionData.processingTime
    ]);
  }

  /**
   * Get transaction from database
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Transaction data
   */
  async getTransaction(transactionId) {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE transaction_id = $1 OR provider_transaction_id = $1
    `;

    const result = await this.db.query(query, [transactionId]);
    return result.rows[0] || null;
  }

  /**
   * Get original transaction for refund
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Original transaction
   */
  async getOriginalTransaction(transactionId) {
    return await this.getTransaction(transactionId);
  }

  /**
   * Log orchestration result
   * @param {string} orchestrationId - Orchestration ID
   * @param {Object} result - Result data
   */
  async logOrchestrationResult(orchestrationId, result) {
    const query = `
      INSERT INTO payment_orchestration_logs (
        id, orchestration_id, success, provider, transaction_id,
        refund_id, error_message, processing_time_ms, type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      uuidv4(),
      orchestrationId,
      result.success,
      result.provider || null,
      result.transactionId || null,
      result.refundId || null,
      result.error || null,
      result.processingTime,
      result.type || 'payment'
    ]);
  }

  /**
   * Log provider failure
   * @param {string} orchestrationId - Orchestration ID
   * @param {string} provider - Provider name
   * @param {Error} error - Error object
   */
  async logProviderFailure(orchestrationId, provider, error) {
    const query = `
      INSERT INTO payment_provider_failures (
        id, orchestration_id, provider, error_message, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      uuidv4(),
      orchestrationId,
      provider,
      error.message
    ]);
  }

  /**
   * Validate payment data
   * @param {Object} paymentData - Payment data
   */
  validatePaymentData(paymentData) {
    const required = ['amount', 'currency', 'paymentMethod', 'tenantId'];
    
    for (const field of required) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (paymentData.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (paymentData.amount > 1000000) {
      throw new Error('Payment amount exceeds maximum limit');
    }
  }

  /**
   * Validate refund data
   * @param {Object} refundData - Refund data
   */
  validateRefundData(refundData) {
    const required = ['originalTransactionId', 'amount', 'tenantId'];
    
    for (const field of required) {
      if (!refundData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (refundData.amount <= 0) {
      throw new Error('Refund amount must be greater than 0');
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get orchestration statistics
   * @param {string} tenantId - Tenant ID (optional)
   * @param {string} period - Time period (optional)
   * @returns {Object} Statistics
   */
  async getOrchestrationStats(tenantId, period = '30d') {
    const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
    const params = tenantId ? [tenantId] : [];

    const query = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_payments,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_payments,
        AVG(processing_time_ms) as avg_processing_time,
        COUNT(DISTINCT provider) as providers_used
      FROM payment_orchestration_logs 
      ${whereClause}
      AND created_at >= NOW() - INTERVAL '${period}'
    `;

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  /**
   * Get provider performance metrics
   * @param {string} tenantId - Tenant ID (optional)
   * @returns {Array} Provider metrics
   */
  async getProviderMetrics(tenantId) {
    const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
    const params = tenantId ? [tenantId] : [];

    const query = `
      SELECT 
        provider,
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_attempts,
        ROUND(
          COUNT(CASE WHEN success = true THEN 1 END) * 100.0 / COUNT(*), 2
        ) as success_rate,
        AVG(processing_time_ms) as avg_processing_time
      FROM payment_orchestration_logs 
      ${whereClause}
      AND created_at >= NOW() - INTERVAL '30d'
      GROUP BY provider
      ORDER BY success_rate DESC
    `;

    const result = await this.db.query(query, params);
    return result.rows;
  }
}

module.exports = PaymentOrchestrationService;
