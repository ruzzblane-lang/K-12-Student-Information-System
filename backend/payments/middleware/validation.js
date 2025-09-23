/**
 * Payment Validation Middleware
 * 
 * Validates payment data, refund data, and other payment-related
 * inputs to ensure data integrity and security.
 */

const { body, validationResult } = require('express-validator');

/**
 * Validate payment data
 */
const validatePaymentData = [
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between 0.01 and 1,000,000'),
  
  body('currency')
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('Currency must be a 3-letter uppercase code'),
  
  body('paymentMethod')
    .isLength({ min: 1, max: 50 })
    .withMessage('Payment method is required and must be less than 50 characters'),
  
  body('paymentMethodId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Payment method ID must be less than 100 characters'),
  
  body('description')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  
  body('returnUrl')
    .optional()
    .isURL()
    .withMessage('Return URL must be a valid URL'),
  
  body('cancelUrl')
    .optional()
    .isURL()
    .withMessage('Cancel URL must be a valid URL'),
  
  body('targetCurrency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('Target currency must be a 3-letter uppercase code'),
  
  body('browserInfo')
    .optional()
    .isObject()
    .withMessage('Browser info must be an object'),
  
  body('shopperInfo')
    .optional()
    .isObject()
    .withMessage('Shopper info must be an object'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  
  body('device')
    .optional()
    .isObject()
    .withMessage('Device must be an object'),

  // Custom validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate refund data
 */
const validateRefundData = [
  body('originalTransactionId')
    .isLength({ min: 1, max: 100 })
    .withMessage('Original transaction ID is required and must be less than 100 characters'),
  
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between 0.01 and 1,000,000'),
  
  body('reason')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be less than 500 characters'),

  // Custom validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate payment method tokenization data
 */
const validateTokenizationData = [
  body('type')
    .isIn(['card', 'paypal', 'sepa_debit', 'ideal', 'bancontact', 'eps', 'giropay', 'sofort'])
    .withMessage('Invalid payment method type'),
  
  body('cardDetails')
    .optional()
    .isObject()
    .withMessage('Card details must be an object'),
  
  body('cardDetails.number')
    .optional()
    .isCreditCard()
    .withMessage('Invalid card number'),
  
  body('cardDetails.expiryMonth')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Expiry month must be between 1 and 12'),
  
  body('cardDetails.expiryYear')
    .optional()
    .isInt({ min: new Date().getFullYear(), max: new Date().getFullYear() + 20 })
    .withMessage('Invalid expiry year'),
  
  body('cardDetails.cvv')
    .optional()
    .isLength({ min: 3, max: 4 })
    .isNumeric()
    .withMessage('CVV must be 3 or 4 digits'),
  
  body('cardDetails.holderName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Cardholder name must be less than 100 characters'),
  
  body('paypalDetails')
    .optional()
    .isObject()
    .withMessage('PayPal details must be an object'),
  
  body('billingAddress')
    .optional()
    .isObject()
    .withMessage('Billing address must be an object'),

  // Custom validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate payment flow data
 */
const validatePaymentFlowData = [
  body('paymentConfig')
    .isObject()
    .withMessage('Payment configuration is required'),
  
  body('paymentConfig.amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between 0.01 and 1,000,000'),
  
  body('paymentConfig.currency')
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('Currency must be a 3-letter uppercase code'),
  
  body('paymentConfig.allowedPaymentMethods')
    .optional()
    .isArray()
    .withMessage('Allowed payment methods must be an array'),
  
  body('paymentConfig.description')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('paymentConfig.successUrl')
    .optional()
    .isURL()
    .withMessage('Success URL must be a valid URL'),
  
  body('paymentConfig.cancelUrl')
    .optional()
    .isURL()
    .withMessage('Cancel URL must be a valid URL'),
  
  body('paymentConfig.webhookUrl')
    .optional()
    .isURL()
    .withMessage('Webhook URL must be a valid URL'),
  
  body('branding')
    .optional()
    .isObject()
    .withMessage('Branding must be an object'),
  
  body('branding.logo')
    .optional()
    .isURL()
    .withMessage('Logo must be a valid URL'),
  
  body('branding.primaryColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Primary color must be a valid hex color'),
  
  body('branding.secondaryColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Secondary color must be a valid hex color'),
  
  body('branding.fontFamily')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Font family must be less than 100 characters'),
  
  body('branding.customCss')
    .optional()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Custom CSS must be less than 10,000 characters'),
  
  body('features')
    .optional()
    .isObject()
    .withMessage('Features must be an object'),
  
  body('security')
    .optional()
    .isObject()
    .withMessage('Security must be an object'),

  // Custom validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate currency conversion data
 */
const validateCurrencyConversionData = [
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between 0.01 and 1,000,000'),
  
  body('fromCurrency')
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('From currency must be a 3-letter uppercase code'),
  
  body('toCurrency')
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('To currency must be a 3-letter uppercase code'),

  // Custom validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate fraud assessment data
 */
const validateFraudAssessmentData = [
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between 0.01 and 1,000,000'),
  
  body('currency')
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('Currency must be a 3-letter uppercase code'),
  
  body('paymentMethod')
    .isLength({ min: 1, max: 50 })
    .withMessage('Payment method is required and must be less than 50 characters'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  
  body('device')
    .optional()
    .isObject()
    .withMessage('Device must be an object'),

  // Custom validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate fraud rules data
 */
const validateFraudRulesData = [
  body('rules')
    .optional()
    .isObject()
    .withMessage('Rules must be an object'),
  
  body('riskWeights')
    .optional()
    .isObject()
    .withMessage('Risk weights must be an object'),

  // Custom validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate webhook test data
 */
const validateWebhookTestData = [
  body('provider')
    .isIn(['stripe', 'paypal', 'adyen'])
    .withMessage('Invalid provider'),
  
  body('eventType')
    .isLength({ min: 1, max: 100 })
    .withMessage('Event type is required and must be less than 100 characters'),
  
  body('payload')
    .isObject()
    .withMessage('Payload must be an object'),

  // Custom validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Sanitize input data
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/[<>]/g, '');
  };

  // Recursively sanitize object
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Validate transaction ID format
 */
const validateTransactionId = (req, res, next) => {
  const { transactionId } = req.params;
  
  if (!transactionId) {
    return res.status(400).json({
      success: false,
      error: 'Transaction ID is required'
    });
  }

  // Check if transaction ID is valid format
  if (typeof transactionId !== 'string' || transactionId.length < 1 || transactionId.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Invalid transaction ID format'
    });
  }

  next();
};

/**
 * Validate flow ID format
 */
const validateFlowId = (req, res, next) => {
  const { flowId } = req.params;
  
  if (!flowId) {
    return res.status(400).json({
      success: false,
      error: 'Flow ID is required'
    });
  }

  // Check if flow ID is valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(flowId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid flow ID format'
    });
  }

  next();
};

/**
 * Validate event ID format
 */
const validateEventId = (req, res, next) => {
  const { eventId } = req.params;
  
  if (!eventId) {
    return res.status(400).json({
      success: false,
      error: 'Event ID is required'
    });
  }

  // Check if event ID is valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(eventId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid event ID format'
    });
  }

  next();
};

/**
 * Validate currency code
 */
const validateCurrencyCode = (req, res, next) => {
  const { currency } = req.params;
  
  if (!currency) {
    return res.status(400).json({
      success: false,
      error: 'Currency is required'
    });
  }

  // Check if currency is valid 3-letter code
  if (typeof currency !== 'string' || currency.length !== 3 || !/^[A-Z]{3}$/.test(currency)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid currency code format'
    });
  }

  next();
};

/**
 * Validate provider name
 */
const validateProviderName = (req, res, next) => {
  const { provider } = req.params;
  
  if (!provider) {
    return res.status(400).json({
      success: false,
      error: 'Provider is required'
    });
  }

  // Check if provider is valid
  const validProviders = ['stripe', 'paypal', 'adyen'];
  if (!validProviders.includes(provider.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid provider name'
    });
  }

  next();
};

module.exports = {
  validatePaymentData,
  validateRefundData,
  validateTokenizationData,
  validatePaymentFlowData,
  validateCurrencyConversionData,
  validateFraudAssessmentData,
  validateFraudRulesData,
  validateWebhookTestData,
  sanitizeInput,
  validateTransactionId,
  validateFlowId,
  validateEventId,
  validateCurrencyCode,
  validateProviderName
};
