/**
 * Payment Method Validation Service
 * 
 * Comprehensive validation service for all payment methods with
 * global coverage including credit cards, debit cards, digital wallets,
 * bank transfers, and e-wallets.
 */

const PaymentMethodRegistry = require('./PaymentMethodRegistry');

class PaymentMethodValidationService {
  constructor(db) {
    this.db = db;
    this.registry = new PaymentMethodRegistry();
    this.validationRules = new Map();
    
    this.initializeValidationRules();
  }

  /**
   * Initialize validation rules for all payment methods
   */
  initializeValidationRules() {
    // Credit Card Validation Rules
    this.validationRules.set('credit_card', {
      required: ['cardNumber', 'expiryMonth', 'expiryYear', 'cvv'],
      optional: ['cardholderName', 'billingAddress'],
      validators: {
        cardNumber: this.validateCardNumber.bind(this),
        expiryMonth: this.validateExpiryMonth.bind(this),
        expiryYear: this.validateExpiryYear.bind(this),
        cvv: this.validateCVV.bind(this),
        cardholderName: this.validateCardholderName.bind(this),
        billingAddress: this.validateBillingAddress.bind(this)
      }
    });

    // Debit Card Validation Rules
    this.validationRules.set('debit_card', {
      required: ['cardNumber', 'expiryMonth', 'expiryYear', 'cvv'],
      optional: ['cardholderName', 'billingAddress'],
      validators: {
        cardNumber: this.validateCardNumber.bind(this),
        expiryMonth: this.validateExpiryMonth.bind(this),
        expiryYear: this.validateExpiryYear.bind(this),
        cvv: this.validateCVV.bind(this),
        cardholderName: this.validateCardholderName.bind(this),
        billingAddress: this.validateBillingAddress.bind(this)
      }
    });

    // Digital Wallet Validation Rules
    this.validationRules.set('digital_wallet', {
      required: ['walletType', 'walletId'],
      optional: ['deviceInfo', 'biometricData'],
      validators: {
        walletType: this.validateWalletType.bind(this),
        walletId: this.validateWalletId.bind(this),
        deviceInfo: this.validateDeviceInfo.bind(this),
        biometricData: this.validateBiometricData.bind(this)
      }
    });

    // Bank Transfer Validation Rules
    this.validationRules.set('bank_transfer', {
      required: ['accountNumber', 'routingNumber', 'accountType'],
      optional: ['bankName', 'accountHolderName', 'swiftCode', 'iban'],
      validators: {
        accountNumber: this.validateAccountNumber.bind(this),
        routingNumber: this.validateRoutingNumber.bind(this),
        accountType: this.validateAccountType.bind(this),
        bankName: this.validateBankName.bind(this),
        accountHolderName: this.validateAccountHolderName.bind(this),
        swiftCode: this.validateSwiftCode.bind(this),
        iban: this.validateIBAN.bind(this)
      }
    });

    // E-Wallet Validation Rules
    this.validationRules.set('e_wallet', {
      required: ['walletType', 'walletId'],
      optional: ['phoneNumber', 'email', 'verificationCode'],
      validators: {
        walletType: this.validateEWalletType.bind(this),
        walletId: this.validateEWalletId.bind(this),
        phoneNumber: this.validatePhoneNumber.bind(this),
        email: this.validateEmail.bind(this),
        verificationCode: this.validateVerificationCode.bind(this)
      }
    });
  }

  /**
   * Validate payment method data
   * @param {string} paymentMethod - Payment method ID
   * @param {Object} data - Payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validatePaymentMethod(paymentMethod, data, options = {}) {
    try {
      const method = this.registry.getPaymentMethod(paymentMethod);
      if (!method) {
        return {
          valid: false,
          errors: ['Payment method not found'],
          warnings: []
        };
      }

      const validationResult = this.registry.validatePaymentMethod(paymentMethod, data);
      if (!validationResult.valid) {
        return {
          valid: false,
          errors: validationResult.errors,
          warnings: []
        };
      }

      // Get validation rules for the payment method type
      const rules = this.validationRules.get(method.type);
      if (!rules) {
        return {
          valid: false,
          errors: ['No validation rules found for payment method type'],
          warnings: []
        };
      }

      const errors = [];
      const warnings = [];

      // Validate required fields
      for (const field of rules.required) {
        if (!data[field]) {
          errors.push(`Required field '${field}' is missing`);
        }
      }

      // Validate each field
      for (const [field, validator] of Object.entries(rules.validators)) {
        if (data[field]) {
          const fieldResult = await validator(field, data[field], data, options);
          if (!fieldResult.valid) {
            errors.push(...fieldResult.errors);
          }
          if (fieldResult.warnings) {
            warnings.push(...fieldResult.warnings);
          }
        }
      }

      // Additional business logic validation
      const businessValidation = await this.validateBusinessRules(paymentMethod, data, options);
      if (!businessValidation.valid) {
        errors.push(...businessValidation.errors);
      }
      if (businessValidation.warnings) {
        warnings.push(...businessValidation.warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        method,
        validatedData: this.sanitizeData(data, method.type)
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate card number
   * @param {string} field - Field name
   * @param {string} value - Card number
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateCardNumber(field, value, data, options) {
    const errors = [];
    const warnings = [];

    // Remove spaces and dashes
    const cleanNumber = value.replace(/[\s-]/g, '');

    // Check if it's all digits
    if (!/^\d+$/.test(cleanNumber)) {
      errors.push('Card number must contain only digits');
      return { valid: false, errors, warnings };
    }

    // Check length
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      errors.push('Card number must be between 13 and 19 digits');
      return { valid: false, errors, warnings };
    }

    // Luhn algorithm validation
    if (!this.validateLuhn(cleanNumber)) {
      errors.push('Invalid card number (failed Luhn check)');
      return { valid: false, errors, warnings };
    }

    // Detect card brand and validate against method
    const detectedBrand = this.detectCardBrand(cleanNumber);
    if (data.paymentMethod && !this.isCardBrandSupported(data.paymentMethod, detectedBrand)) {
      errors.push(`Card brand ${detectedBrand} not supported for payment method ${data.paymentMethod}`);
    }

    // Check for test card numbers in production
    if (!options.sandbox && this.isTestCardNumber(cleanNumber)) {
      warnings.push('Test card number detected in production environment');
    }

    return { valid: true, errors, warnings };
  }

  /**
   * Validate expiry month
   * @param {string} field - Field name
   * @param {string|number} value - Expiry month
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateExpiryMonth(field, value, data, options) {
    const errors = [];
    const warnings = [];

    const month = parseInt(value);
    if (isNaN(month) || month < 1 || month > 12) {
      errors.push('Expiry month must be between 1 and 12');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate expiry year
   * @param {string} field - Field name
   * @param {string|number} value - Expiry year
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateExpiryYear(field, value, data, options) {
    const errors = [];
    const warnings = [];

    const year = parseInt(value);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (isNaN(year)) {
      errors.push('Expiry year must be a valid number');
    } else if (year < currentYear) {
      errors.push('Card has expired');
    } else if (year === currentYear && data.expiryMonth && parseInt(data.expiryMonth) < currentMonth) {
      errors.push('Card has expired');
    } else if (year > currentYear + 20) {
      warnings.push('Expiry year seems unusually far in the future');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate CVV
   * @param {string} field - Field name
   * @param {string} value - CVV
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateCVV(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (!/^\d{3,4}$/.test(value)) {
      errors.push('CVV must be 3 or 4 digits');
    }

    // Check CVV length based on card brand
    const cardNumber = data.cardNumber?.replace(/[\s-]/g, '');
    if (cardNumber) {
      const brand = this.detectCardBrand(cardNumber);
      const expectedLength = brand === 'amex' ? 4 : 3;
      if (value.length !== expectedLength) {
        errors.push(`CVV must be ${expectedLength} digits for ${brand} cards`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate cardholder name
   * @param {string} field - Field name
   * @param {string} value - Cardholder name
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateCardholderName(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (typeof value !== 'string' || value.trim().length < 2) {
      errors.push('Cardholder name must be at least 2 characters');
    }

    if (value.length > 50) {
      warnings.push('Cardholder name is unusually long');
    }

    if (!/^[a-zA-Z\s\-'\.]+$/.test(value)) {
      errors.push('Cardholder name contains invalid characters');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate billing address
   * @param {string} field - Field name
   * @param {Object} value - Billing address
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateBillingAddress(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (typeof value !== 'object' || value === null) {
      errors.push('Billing address must be an object');
      return { valid: false, errors, warnings };
    }

    const requiredFields = ['line1', 'city', 'country'];
    for (const requiredField of requiredFields) {
      if (!value[requiredField]) {
        errors.push(`Billing address ${requiredField} is required`);
      }
    }

    if (value.postalCode && !/^[a-zA-Z0-9\s\-]{3,10}$/.test(value.postalCode)) {
      errors.push('Invalid postal code format');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate wallet type
   * @param {string} field - Field name
   * @param {string} value - Wallet type
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateWalletType(field, value, data, options) {
    const errors = [];
    const warnings = [];

    const validTypes = ['apple_pay', 'google_pay', 'samsung_pay'];
    if (!validTypes.includes(value)) {
      errors.push(`Invalid wallet type: ${value}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate wallet ID
   * @param {string} field - Field name
   * @param {string} value - Wallet ID
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateWalletId(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      errors.push('Wallet ID is required');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate device info
   * @param {string} field - Field name
   * @param {Object} value - Device info
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateDeviceInfo(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (typeof value !== 'object' || value === null) {
      errors.push('Device info must be an object');
      return { valid: false, errors, warnings };
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate biometric data
   * @param {string} field - Field name
   * @param {Object} value - Biometric data
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateBiometricData(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (typeof value !== 'object' || value === null) {
      errors.push('Biometric data must be an object');
      return { valid: false, errors, warnings };
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate account number
   * @param {string} field - Field name
   * @param {string} value - Account number
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateAccountNumber(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (!/^\d{4,17}$/.test(value)) {
      errors.push('Account number must be 4-17 digits');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate routing number
   * @param {string} field - Field name
   * @param {string} value - Routing number
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateRoutingNumber(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (!/^\d{9}$/.test(value)) {
      errors.push('Routing number must be 9 digits');
    } else if (!this.validateRoutingNumberChecksum(value)) {
      errors.push('Invalid routing number checksum');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate account type
   * @param {string} field - Field name
   * @param {string} value - Account type
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateAccountType(field, value, data, options) {
    const errors = [];
    const warnings = [];

    const validTypes = ['checking', 'savings', 'business_checking', 'business_savings'];
    if (!validTypes.includes(value)) {
      errors.push(`Invalid account type: ${value}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate bank name
   * @param {string} field - Field name
   * @param {string} value - Bank name
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateBankName(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (typeof value !== 'string' || value.trim().length < 2) {
      errors.push('Bank name must be at least 2 characters');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate account holder name
   * @param {string} field - Field name
   * @param {string} value - Account holder name
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateAccountHolderName(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (typeof value !== 'string' || value.trim().length < 2) {
      errors.push('Account holder name must be at least 2 characters');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate SWIFT code
   * @param {string} field - Field name
   * @param {string} value - SWIFT code
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateSwiftCode(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value)) {
      errors.push('Invalid SWIFT code format');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate IBAN
   * @param {string} field - Field name
   * @param {string} value - IBAN
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateIBAN(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(value)) {
      errors.push('Invalid IBAN format');
    } else if (!this.validateIBANChecksum(value)) {
      errors.push('Invalid IBAN checksum');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate e-wallet type
   * @param {string} field - Field name
   * @param {string} value - E-wallet type
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateEWalletType(field, value, data, options) {
    const errors = [];
    const warnings = [];

    const validTypes = ['alipay', 'wechat_pay', 'venmo', 'cash_app', 'payoneer'];
    if (!validTypes.includes(value)) {
      errors.push(`Invalid e-wallet type: ${value}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate e-wallet ID
   * @param {string} field - Field name
   * @param {string} value - E-wallet ID
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateEWalletId(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      errors.push('E-wallet ID is required');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate phone number
   * @param {string} field - Field name
   * @param {string} value - Phone number
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validatePhoneNumber(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (!/^\+?[1-9]\d{1,14}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
      errors.push('Invalid phone number format');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate email
   * @param {string} field - Field name
   * @param {string} value - Email
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateEmail(field, value, data, options) {
    const errors = [];
    const warnings = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      errors.push('Invalid email format');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate verification code
   * @param {string} field - Field name
   * @param {string} value - Verification code
   * @param {Object} data - Full payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateVerificationCode(field, value, data, options) {
    const errors = [];
    const warnings = [];

    if (!/^\d{4,8}$/.test(value)) {
      errors.push('Verification code must be 4-8 digits');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate business rules
   * @param {string} paymentMethod - Payment method
   * @param {Object} data - Payment data
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateBusinessRules(paymentMethod, data, options) {
    const errors = [];
    const warnings = [];

    // Check amount limits
    if (data.amount) {
      const method = this.registry.getPaymentMethod(paymentMethod);
      if (method) {
        if (method.minAmount && data.amount < method.minAmount) {
          errors.push(`Amount below minimum: ${method.minAmount}`);
        }
        if (method.maxAmount && data.amount > method.maxAmount) {
          errors.push(`Amount above maximum: ${method.maxAmount}`);
        }
      }
    }

    // Check currency support
    if (data.currency) {
      const method = this.registry.getPaymentMethod(paymentMethod);
      if (method && !method.supportedCurrencies.includes('GLOBAL') && 
          !method.supportedCurrencies.includes(data.currency)) {
        errors.push(`Currency ${data.currency} not supported`);
      }
    }

    // Check country restrictions
    if (data.country) {
      const method = this.registry.getPaymentMethod(paymentMethod);
      if (method && !method.supportedCountries.includes('GLOBAL') && 
          !method.supportedCountries.includes(data.country)) {
        errors.push(`Country ${data.country} not supported`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Sanitize payment data
   * @param {Object} data - Payment data
   * @param {string} type - Payment method type
   * @returns {Object} Sanitized data
   */
  sanitizeData(data, type) {
    const sanitized = { ...data };

    // Remove sensitive data that shouldn't be stored
    if (type === 'credit_card' || type === 'debit_card') {
      if (sanitized.cardNumber) {
        sanitized.cardNumber = sanitized.cardNumber.replace(/\s/g, '');
      }
      if (sanitized.cvv) {
        delete sanitized.cvv; // Never store CVV
      }
    }

    // Sanitize other sensitive fields
    if (sanitized.password) delete sanitized.password;
    if (sanitized.pin) delete sanitized.pin;
    if (sanitized.ssn) delete sanitized.ssn;

    return sanitized;
  }

  /**
   * Validate Luhn algorithm
   * @param {string} cardNumber - Card number
   * @returns {boolean} Is valid
   */
  validateLuhn(cardNumber) {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Detect card brand from number
   * @param {string} cardNumber - Card number
   * @returns {string} Card brand
   */
  detectCardBrand(cardNumber) {
    const number = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(number)) return 'visa';
    if (/^5[1-5]/.test(number)) return 'mastercard';
    if (/^3[47]/.test(number)) return 'amex';
    if (/^6(?:011|5[0-9]{2})/.test(number)) return 'discover';
    if (/^3[0689]/.test(number)) return 'diners';
    if (/^(?:2131|1800|35\d{3})/.test(number)) return 'jcb';
    if (/^62/.test(number)) return 'unionpay';
    if (/^(5[0678]|6[0-9])/.test(number)) return 'maestro';
    
    return 'unknown';
  }

  /**
   * Check if card brand is supported for payment method
   * @param {string} paymentMethod - Payment method
   * @param {string} brand - Card brand
   * @returns {boolean} Is supported
   */
  isCardBrandSupported(paymentMethod, brand) {
    const method = this.registry.getPaymentMethod(paymentMethod);
    if (!method) return false;

    const supportedBrands = {
      'visa': ['visa'],
      'mastercard': ['mastercard'],
      'amex': ['amex'],
      'discover': ['discover'],
      'jcb': ['jcb'],
      'unionpay': ['unionpay'],
      'maestro': ['maestro']
    };

    return supportedBrands[paymentMethod]?.includes(brand) || false;
  }

  /**
   * Check if card number is a test number
   * @param {string} cardNumber - Card number
   * @returns {boolean} Is test number
   */
  isTestCardNumber(cardNumber) {
    const testNumbers = [
      '4242424242424242', // Visa test
      '5555555555554444', // Mastercard test
      '378282246310005',  // Amex test
      '6011111111111117', // Discover test
      '4000000000000002', // Visa declined
      '4000000000000069', // Visa expired
      '4000000000000119'  // Visa processing error
    ];

    return testNumbers.includes(cardNumber);
  }

  /**
   * Validate routing number checksum
   * @param {string} routingNumber - Routing number
   * @returns {boolean} Is valid
   */
  validateRoutingNumberChecksum(routingNumber) {
    const digits = routingNumber.split('').map(Number);
    const checksum = (3 * (digits[0] + digits[3] + digits[6]) +
                      7 * (digits[1] + digits[4] + digits[7]) +
                      1 * (digits[2] + digits[5] + digits[8])) % 10;
    
    return checksum === 0;
  }

  /**
   * Validate IBAN checksum
   * @param {string} iban - IBAN
   * @returns {boolean} Is valid
   */
  validateIBANChecksum(iban) {
    // Move first 4 characters to end
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    
    // Replace letters with numbers (A=10, B=11, etc.)
    const numeric = rearranged.replace(/[A-Z]/g, (char) => 
      (char.charCodeAt(0) - 55).toString()
    );
    
    // Calculate mod 97
    let remainder = 0;
    for (let i = 0; i < numeric.length; i++) {
      remainder = (remainder * 10 + parseInt(numeric[i])) % 97;
    }
    
    return remainder === 1;
  }

  /**
   * Get validation statistics
   * @returns {Object} Statistics
   */
  getValidationStatistics() {
    return {
      totalRules: this.validationRules.size,
      supportedTypes: Array.from(this.validationRules.keys()),
      registryStats: this.registry.getStatistics()
    };
  }
}

module.exports = PaymentMethodValidationService;
