/**
 * Payment Method Registry
 * 
 * Comprehensive registry of all supported payment methods with their
 * properties, validation rules, and provider mappings for global coverage.
 */

class PaymentMethodRegistry {
  constructor() {
    this.paymentMethods = new Map();
    this.providerMappings = new Map();
    this.regionalMappings = new Map();
    
    this.initializePaymentMethods();
    this.initializeProviderMappings();
    this.initializeRegionalMappings();
  }

  /**
   * Initialize all supported payment methods
   */
  initializePaymentMethods() {
    // Credit Cards
    this.registerPaymentMethod('visa', {
      type: 'credit_card',
      category: 'card',
      name: 'Visa',
      description: 'Visa credit and debit cards',
      icon: 'visa',
      supportedCountries: ['GLOBAL'],
      cardNumberPattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
      cvvLength: 3,
      supportedCurrencies: ['GLOBAL'],
      processingFees: { percentage: 2.9, fixed: 0.30 },
      features: ['3d_secure', 'fraud_protection', 'chargeback_protection'],
      providers: ['stripe', 'paypal', 'adyen', 'square', 'authorize_net']
    });

    this.registerPaymentMethod('mastercard', {
      type: 'credit_card',
      category: 'card',
      name: 'Mastercard',
      description: 'Mastercard credit and debit cards',
      icon: 'mastercard',
      supportedCountries: ['GLOBAL'],
      cardNumberPattern: /^5[1-5][0-9]{14}$/,
      cvvLength: 3,
      supportedCurrencies: ['GLOBAL'],
      processingFees: { percentage: 2.9, fixed: 0.30 },
      features: ['3d_secure', 'fraud_protection', 'chargeback_protection'],
      providers: ['stripe', 'paypal', 'adyen', 'square', 'authorize_net']
    });

    this.registerPaymentMethod('amex', {
      type: 'credit_card',
      category: 'card',
      name: 'American Express',
      description: 'American Express credit cards',
      icon: 'amex',
      supportedCountries: ['GLOBAL'],
      cardNumberPattern: /^3[47][0-9]{13}$/,
      cvvLength: 4,
      supportedCurrencies: ['GLOBAL'],
      processingFees: { percentage: 3.5, fixed: 0.30 },
      features: ['fraud_protection', 'chargeback_protection'],
      providers: ['stripe', 'paypal', 'adyen', 'square', 'authorize_net']
    });

    this.registerPaymentMethod('discover', {
      type: 'credit_card',
      category: 'card',
      name: 'Discover',
      description: 'Discover credit and debit cards',
      icon: 'discover',
      supportedCountries: ['US', 'CA'],
      cardNumberPattern: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
      cvvLength: 3,
      supportedCurrencies: ['USD', 'CAD'],
      processingFees: { percentage: 2.9, fixed: 0.30 },
      features: ['fraud_protection', 'chargeback_protection'],
      providers: ['stripe', 'paypal', 'adyen', 'square', 'authorize_net']
    });

    this.registerPaymentMethod('jcb', {
      type: 'credit_card',
      category: 'card',
      name: 'JCB',
      description: 'Japan Credit Bureau cards',
      icon: 'jcb',
      supportedCountries: ['JP', 'KR', 'TH', 'SG', 'MY', 'ID', 'PH', 'TW', 'HK'],
      cardNumberPattern: /^(?:2131|1800|35\d{3})\d{11}$/,
      cvvLength: 3,
      supportedCurrencies: ['JPY', 'USD', 'EUR', 'GBP'],
      processingFees: { percentage: 3.0, fixed: 0.30 },
      features: ['fraud_protection', 'chargeback_protection'],
      providers: ['stripe', 'adyen', 'square']
    });

    this.registerPaymentMethod('unionpay', {
      type: 'credit_card',
      category: 'card',
      name: 'UnionPay',
      description: 'China UnionPay cards',
      icon: 'unionpay',
      supportedCountries: ['CN', 'HK', 'MO', 'TW', 'SG', 'TH', 'MY', 'ID', 'PH', 'KR', 'JP'],
      cardNumberPattern: /^62[0-9]{14,17}$/,
      cvvLength: 3,
      supportedCurrencies: ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'KRW'],
      processingFees: { percentage: 2.8, fixed: 0.30 },
      features: ['fraud_protection', 'chargeback_protection'],
      providers: ['stripe', 'adyen']
    });

    // Debit Cards
    this.registerPaymentMethod('maestro', {
      type: 'debit_card',
      category: 'card',
      name: 'Maestro',
      description: 'Maestro debit cards',
      icon: 'maestro',
      supportedCountries: ['EU', 'GB', 'AU', 'NZ', 'IN', 'BR', 'MX'],
      cardNumberPattern: /^(5[0678]|6[0-9])[0-9]{10,17}$/,
      cvvLength: 3,
      supportedCurrencies: ['EUR', 'GBP', 'AUD', 'NZD', 'INR', 'BRL', 'MXN'],
      processingFees: { percentage: 1.5, fixed: 0.20 },
      features: ['fraud_protection'],
      providers: ['stripe', 'adyen']
    });

    // Digital Wallets
    this.registerPaymentMethod('paypal', {
      type: 'digital_wallet',
      category: 'wallet',
      name: 'PayPal',
      description: 'PayPal digital wallet',
      icon: 'paypal',
      supportedCountries: ['GLOBAL'],
      supportedCurrencies: ['GLOBAL'],
      processingFees: { percentage: 2.9, fixed: 0.30 },
      features: ['buyer_protection', 'dispute_resolution', 'instant_transfer'],
      providers: ['paypal', 'stripe', 'adyen'],
      requiresRedirect: true
    });

    this.registerPaymentMethod('apple_pay', {
      type: 'digital_wallet',
      category: 'wallet',
      name: 'Apple Pay',
      description: 'Apple Pay mobile payment',
      icon: 'apple_pay',
      supportedCountries: ['US', 'CA', 'GB', 'AU', 'FR', 'DE', 'IT', 'ES', 'NL', 'CH', 'AT', 'BE', 'DK', 'FI', 'IE', 'LU', 'NO', 'PL', 'PT', 'SE', 'SG', 'HK', 'TW', 'JP', 'CN', 'BR', 'MX', 'RU', 'UA', 'NZ', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'EG', 'MA', 'TN', 'ZA', 'NG', 'KE', 'GH', 'UG', 'TZ', 'ET', 'MW', 'ZM', 'BW', 'SZ', 'LS', 'NA'],
      supportedCurrencies: ['USD', 'CAD', 'GBP', 'AUD', 'EUR', 'CHF', 'CNY', 'HKD', 'JPY', 'SGD', 'TWD', 'BRL', 'MXN', 'RUB', 'UAH', 'NZD', 'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'LBP', 'EGP', 'MAD', 'TND', 'ZAR', 'NGN', 'KES', 'GHS', 'UGX', 'TZS', 'ETB', 'MWK', 'ZMW', 'BWP', 'SZL', 'LSL', 'NAD'],
      processingFees: { percentage: 2.9, fixed: 0.30 },
      features: ['biometric_auth', 'tokenization', 'fraud_protection'],
      providers: ['stripe', 'adyen', 'square'],
      requiresDevice: 'ios'
    });

    this.registerPaymentMethod('google_pay', {
      type: 'digital_wallet',
      category: 'wallet',
      name: 'Google Pay',
      description: 'Google Pay mobile payment',
      icon: 'google_pay',
      supportedCountries: ['US', 'CA', 'GB', 'AU', 'FR', 'DE', 'IT', 'ES', 'NL', 'CH', 'AT', 'BE', 'DK', 'FI', 'IE', 'LU', 'NO', 'PL', 'PT', 'SE', 'SG', 'HK', 'TW', 'JP', 'IN', 'BR', 'MX', 'RU', 'UA', 'NZ', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'EG', 'MA', 'TN', 'ZA', 'NG', 'KE', 'GH', 'UG', 'TZ', 'ET', 'MW', 'ZM', 'BW', 'SZ', 'LS', 'NA'],
      supportedCurrencies: ['USD', 'CAD', 'GBP', 'AUD', 'EUR', 'CHF', 'CNY', 'HKD', 'JPY', 'SGD', 'TWD', 'INR', 'BRL', 'MXN', 'RUB', 'UAH', 'NZD', 'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'LBP', 'EGP', 'MAD', 'TND', 'ZAR', 'NGN', 'KES', 'GHS', 'UGX', 'TZS', 'ETB', 'MWK', 'ZMW', 'BWP', 'SZL', 'LSL', 'NAD'],
      processingFees: { percentage: 2.9, fixed: 0.30 },
      features: ['biometric_auth', 'tokenization', 'fraud_protection'],
      providers: ['stripe', 'adyen', 'square'],
      requiresDevice: 'android'
    });

    // Bank Transfers
    this.registerPaymentMethod('swift', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'SWIFT',
      description: 'International bank transfer via SWIFT network',
      icon: 'swift',
      supportedCountries: ['GLOBAL'],
      supportedCurrencies: ['GLOBAL'],
      processingFees: { percentage: 0.1, fixed: 15.00 },
      features: ['international', 'high_amount', 'secure'],
      providers: ['adyen', 'wise', 'revolut'],
      processingTime: '1-3 business days',
      minAmount: 100.00,
      maxAmount: 1000000.00
    });

    this.registerPaymentMethod('ach', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'ACH',
      description: 'Automated Clearing House bank transfer',
      icon: 'ach',
      supportedCountries: ['US'],
      supportedCurrencies: ['USD'],
      processingFees: { percentage: 0.8, fixed: 0.20 },
      features: ['domestic', 'low_cost', 'recurring'],
      providers: ['stripe', 'square', 'authorize_net'],
      processingTime: '1-2 business days',
      minAmount: 1.00,
      maxAmount: 25000.00
    });

    // E-Wallets
    this.registerPaymentMethod('alipay', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'Alipay',
      description: 'Alipay mobile payment',
      icon: 'alipay',
      supportedCountries: ['CN', 'HK', 'MO', 'TW', 'SG', 'MY', 'TH', 'ID', 'PH', 'KR', 'JP', 'US', 'CA', 'GB', 'AU', 'FR', 'DE', 'IT', 'ES', 'NL'],
      supportedCurrencies: ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'MYR', 'THB', 'IDR', 'PHP', 'HKD', 'TWD', 'CAD', 'AUD'],
      processingFees: { percentage: 2.9, fixed: 0.30 },
      features: ['mobile_payment', 'qr_code', 'instant_transfer'],
      providers: ['stripe', 'adyen', 'paypal'],
      requiresRedirect: true
    });

    this.registerPaymentMethod('wechat_pay', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'WeChat Pay',
      description: 'WeChat Pay mobile payment',
      icon: 'wechat_pay',
      supportedCountries: ['CN', 'HK', 'MO', 'TW', 'SG', 'MY', 'TH', 'ID', 'PH', 'KR', 'JP', 'US', 'CA', 'GB', 'AU', 'FR', 'DE', 'IT', 'ES', 'NL'],
      supportedCurrencies: ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'MYR', 'THB', 'IDR', 'PHP', 'HKD', 'TWD', 'CAD', 'AUD'],
      processingFees: { percentage: 2.9, fixed: 0.30 },
      features: ['mobile_payment', 'qr_code', 'instant_transfer'],
      providers: ['stripe', 'adyen'],
      requiresRedirect: true
    });

    this.registerPaymentMethod('venmo', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'Venmo',
      description: 'Venmo mobile payment',
      icon: 'venmo',
      supportedCountries: ['US'],
      supportedCurrencies: ['USD'],
      processingFees: { percentage: 1.9, fixed: 0.10 },
      features: ['social_payment', 'instant_transfer', 'mobile_app'],
      providers: ['paypal'],
      requiresRedirect: true
    });

    this.registerPaymentMethod('cash_app', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'Cash App',
      description: 'Cash App mobile payment',
      icon: 'cash_app',
      supportedCountries: ['US', 'GB'],
      supportedCurrencies: ['USD', 'GBP'],
      processingFees: { percentage: 1.5, fixed: 0.00 },
      features: ['instant_transfer', 'mobile_app', 'bitcoin_support'],
      providers: ['square'],
      requiresRedirect: true
    });

    this.registerPaymentMethod('payoneer', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'Payoneer',
      description: 'Payoneer global payment platform',
      icon: 'payoneer',
      supportedCountries: ['GLOBAL'],
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'RUB', 'TRY', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'VEF', 'INR', 'SGD', 'HKD', 'TWD', 'MYR', 'THB', 'PHP', 'IDR', 'KRW', 'CNY', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'LBP', 'EGP', 'MAD', 'TND', 'ZAR', 'NGN', 'KES', 'GHS', 'UGX', 'TZS', 'ETB', 'MWK', 'ZMW', 'BWP', 'SZL', 'LSL', 'NAD'],
      processingFees: { percentage: 1.0, fixed: 0.00 },
      features: ['global_transfer', 'multi_currency', 'business_accounts'],
      providers: ['payoneer'],
      processingTime: '1-2 business days',
      minAmount: 50.00,
      maxAmount: 100000.00
    });
  }

  /**
   * Register a payment method
   * @param {string} id - Payment method ID
   * @param {Object} config - Payment method configuration
   */
  registerPaymentMethod(id, config) {
    this.paymentMethods.set(id, {
      id,
      ...config,
      createdAt: new Date()
    });
  }

  /**
   * Initialize provider mappings
   */
  initializeProviderMappings() {
    // Stripe supported methods
    this.providerMappings.set('stripe', [
      'visa', 'mastercard', 'amex', 'discover', 'jcb', 'unionpay',
      'paypal', 'apple_pay', 'google_pay', 'ach', 'alipay', 'wechat_pay'
    ]);

    // PayPal supported methods
    this.providerMappings.set('paypal', [
      'visa', 'mastercard', 'amex', 'discover', 'jcb',
      'paypal', 'venmo'
    ]);

    // Adyen supported methods
    this.providerMappings.set('adyen', [
      'visa', 'mastercard', 'amex', 'discover', 'jcb', 'unionpay', 'maestro',
      'paypal', 'apple_pay', 'google_pay', 'swift', 'alipay', 'wechat_pay'
    ]);

    // Square supported methods
    this.providerMappings.set('square', [
      'visa', 'mastercard', 'amex', 'discover', 'jcb',
      'apple_pay', 'google_pay', 'ach', 'cash_app'
    ]);

    // Authorize.Net supported methods
    this.providerMappings.set('authorize_net', [
      'visa', 'mastercard', 'amex', 'discover', 'jcb',
      'ach'
    ]);
  }

  /**
   * Initialize regional mappings
   */
  initializeRegionalMappings() {
    // North America
    this.regionalMappings.set('NA', [
      'visa', 'mastercard', 'amex', 'discover', 'ach',
      'paypal', 'apple_pay', 'google_pay', 'venmo', 'cash_app'
    ]);

    // Europe
    this.regionalMappings.set('EU', [
      'visa', 'mastercard', 'amex', 'jcb', 'maestro',
      'paypal', 'apple_pay', 'google_pay', 'swift'
    ]);

    // Asia Pacific
    this.regionalMappings.set('APAC', [
      'visa', 'mastercard', 'amex', 'jcb', 'unionpay',
      'paypal', 'apple_pay', 'google_pay', 'alipay', 'wechat_pay', 'swift'
    ]);

    // China
    this.regionalMappings.set('CN', [
      'visa', 'mastercard', 'amex', 'unionpay',
      'alipay', 'wechat_pay', 'swift'
    ]);

    // India
    this.regionalMappings.set('IN', [
      'visa', 'mastercard', 'amex', 'jcb',
      'paypal', 'apple_pay', 'google_pay', 'swift'
    ]);

    // Latin America
    this.regionalMappings.set('LATAM', [
      'visa', 'mastercard', 'amex', 'jcb',
      'paypal', 'apple_pay', 'google_pay', 'swift'
    ]);

    // Middle East & Africa
    this.regionalMappings.set('MEA', [
      'visa', 'mastercard', 'amex', 'jcb',
      'paypal', 'apple_pay', 'google_pay', 'swift'
    ]);
  }

  /**
   * Get payment method by ID
   * @param {string} id - Payment method ID
   * @returns {Object|null} Payment method configuration
   */
  getPaymentMethod(id) {
    return this.paymentMethods.get(id) || null;
  }

  /**
   * Get all payment methods
   * @returns {Array} Array of payment method configurations
   */
  getAllPaymentMethods() {
    return Array.from(this.paymentMethods.values());
  }

  /**
   * Get payment methods by category
   * @param {string} category - Payment method category
   * @returns {Array} Array of payment method configurations
   */
  getPaymentMethodsByCategory(category) {
    return this.getAllPaymentMethods().filter(method => method.category === category);
  }

  /**
   * Get payment methods by type
   * @param {string} type - Payment method type
   * @returns {Array} Array of payment method configurations
   */
  getPaymentMethodsByType(type) {
    return this.getAllPaymentMethods().filter(method => method.type === type);
  }

  /**
   * Get payment methods supported by provider
   * @param {string} provider - Provider name
   * @returns {Array} Array of payment method IDs
   */
  getPaymentMethodsByProvider(provider) {
    return this.providerMappings.get(provider) || [];
  }

  /**
   * Get payment methods for region
   * @param {string} region - Region code
   * @returns {Array} Array of payment method IDs
   */
  getPaymentMethodsForRegion(region) {
    return this.regionalMappings.get(region) || [];
  }

  /**
   * Get payment methods for country
   * @param {string} country - Country code
   * @returns {Array} Array of payment method configurations
   */
  getPaymentMethodsForCountry(country) {
    return this.getAllPaymentMethods().filter(method => 
      method.supportedCountries.includes('GLOBAL') || 
      method.supportedCountries.includes(country)
    );
  }

  /**
   * Get payment methods for currency
   * @param {string} currency - Currency code
   * @returns {Array} Array of payment method configurations
   */
  getPaymentMethodsForCurrency(currency) {
    return this.getAllPaymentMethods().filter(method => 
      method.supportedCurrencies.includes('GLOBAL') || 
      method.supportedCurrencies.includes(currency)
    );
  }

  /**
   * Validate payment method
   * @param {string} id - Payment method ID
   * @param {Object} data - Payment data
   * @returns {Object} Validation result
   */
  validatePaymentMethod(id, data) {
    const method = this.getPaymentMethod(id);
    if (!method) {
      return { valid: false, error: 'Payment method not found' };
    }

    const errors = [];

    // Validate card number for card types
    if (method.category === 'card' && data.cardNumber) {
      if (!method.cardNumberPattern.test(data.cardNumber.replace(/\s/g, ''))) {
        errors.push('Invalid card number format');
      }
    }

    // Validate CVV for card types
    if (method.category === 'card' && data.cvv) {
      if (data.cvv.length !== method.cvvLength) {
        errors.push(`CVV must be ${method.cvvLength} digits`);
      }
    }

    // Validate amount limits
    if (method.minAmount && data.amount < method.minAmount) {
      errors.push(`Minimum amount is ${method.minAmount}`);
    }

    if (method.maxAmount && data.amount > method.maxAmount) {
      errors.push(`Maximum amount is ${method.maxAmount}`);
    }

    // Validate currency support
    if (data.currency && !method.supportedCurrencies.includes('GLOBAL') && 
        !method.supportedCurrencies.includes(data.currency)) {
      errors.push(`Currency ${data.currency} not supported`);
    }

    return {
      valid: errors.length === 0,
      errors,
      method
    };
  }

  /**
   * Get processing fees for payment method
   * @param {string} id - Payment method ID
   * @param {number} amount - Payment amount
   * @returns {Object} Fee calculation
   */
  getProcessingFees(id, amount) {
    const method = this.getPaymentMethod(id);
    if (!method || !method.processingFees) {
      return { percentage: 0, fixed: 0, total: 0 };
    }

    const percentageFee = (amount * method.processingFees.percentage) / 100;
    const totalFee = percentageFee + method.processingFees.fixed;

    return {
      percentage: method.processingFees.percentage,
      fixed: method.processingFees.fixed,
      percentageAmount: percentageFee,
      fixedAmount: method.processingFees.fixed,
      total: totalFee
    };
  }

  /**
   * Check if payment method requires redirect
   * @param {string} id - Payment method ID
   * @returns {boolean} Requires redirect
   */
  requiresRedirect(id) {
    const method = this.getPaymentMethod(id);
    return method ? method.requiresRedirect || false : false;
  }

  /**
   * Check if payment method requires specific device
   * @param {string} id - Payment method ID
   * @returns {string|null} Required device type
   */
  requiresDevice(id) {
    const method = this.getPaymentMethod(id);
    return method ? method.requiresDevice || null : null;
  }

  /**
   * Get payment method features
   * @param {string} id - Payment method ID
   * @returns {Array} Array of features
   */
  getFeatures(id) {
    const method = this.getPaymentMethod(id);
    return method ? method.features || [] : [];
  }

  /**
   * Get processing time for payment method
   * @param {string} id - Payment method ID
   * @returns {string|null} Processing time
   */
  getProcessingTime(id) {
    const method = this.getPaymentMethod(id);
    return method ? method.processingTime || null : null;
  }

  /**
   * Get payment method statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const methods = this.getAllPaymentMethods();
    const categories = {};
    const types = {};
    const regions = {};

    methods.forEach(method => {
      // Count by category
      categories[method.category] = (categories[method.category] || 0) + 1;
      
      // Count by type
      types[method.type] = (types[method.type] || 0) + 1;
    });

    // Count by region
    this.regionalMappings.forEach((methods, region) => {
      regions[region] = methods.length;
    });

    return {
      total: methods.length,
      categories,
      types,
      regions,
      globalMethods: methods.filter(m => m.supportedCountries.includes('GLOBAL')).length
    };
  }
}

module.exports = PaymentMethodRegistry;
