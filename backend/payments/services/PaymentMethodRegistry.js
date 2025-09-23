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

    // US/Canada Regional Payment Methods
    this.registerPaymentMethod('interac_e_transfer', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'Interac e-Transfer',
      description: 'Interac e-Transfer for Canada',
      icon: 'interac',
      supportedCountries: ['CA'],
      supportedCurrencies: ['CAD'],
      processingFees: { percentage: 0.5, fixed: 0.15 },
      features: ['instant_transfer', 'email_payment', 'secure'],
      providers: ['interac'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('interac_online', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'Interac Online',
      description: 'Interac Online banking for Canada',
      icon: 'interac_online',
      supportedCountries: ['CA'],
      supportedCurrencies: ['CAD'],
      processingFees: { percentage: 0.3, fixed: 0.10 },
      features: ['online_banking', 'secure', 'instant'],
      providers: ['interac'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('ach_direct_debit', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'ACH Direct Debit',
      description: 'ACH Direct Debit for US',
      icon: 'ach',
      supportedCountries: ['US'],
      supportedCurrencies: ['USD'],
      processingFees: { percentage: 0.8, fixed: 0.20 },
      features: ['recurring', 'low_cost', 'domestic'],
      providers: ['ach_direct_debit'],
      processingTime: '1-2 business days',
      minAmount: 1.00,
      maxAmount: 25000.00
    });

    this.registerPaymentMethod('ach_credit', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'ACH Credit',
      description: 'ACH Credit transfer for US',
      icon: 'ach_credit',
      supportedCountries: ['US'],
      supportedCurrencies: ['USD'],
      processingFees: { percentage: 0.5, fixed: 0.15 },
      features: ['credit_transfer', 'low_cost', 'domestic'],
      providers: ['ach_direct_debit'],
      processingTime: '1-2 business days',
      minAmount: 1.00,
      maxAmount: 25000.00
    });

    this.registerPaymentMethod('ach_web_debit', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'ACH Web Debit',
      description: 'ACH Web Debit for US',
      icon: 'ach_web',
      supportedCountries: ['US'],
      supportedCurrencies: ['USD'],
      processingFees: { percentage: 0.9, fixed: 0.25 },
      features: ['web_based', 'instant_setup', 'domestic'],
      providers: ['ach_direct_debit'],
      processingTime: '1-2 business days',
      requiresRedirect: true
    });

    // EU/UK Regional Payment Methods
    this.registerPaymentMethod('sepa_direct_debit', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'SEPA Direct Debit',
      description: 'SEPA Direct Debit for EU',
      icon: 'sepa',
      supportedCountries: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI', 'NO', 'CH', 'MC', 'SM', 'VA'],
      supportedCurrencies: ['EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK'],
      processingFees: { percentage: 0.4, fixed: 0.15 },
      features: ['recurring', 'mandate_based', 'pan_european'],
      providers: ['sepa'],
      processingTime: '1-2 business days',
      minAmount: 0.01,
      maxAmount: 15000.00
    });

    this.registerPaymentMethod('sepa_credit_transfer', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'SEPA Credit Transfer',
      description: 'SEPA Credit Transfer for EU',
      icon: 'sepa_credit',
      supportedCountries: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI', 'NO', 'CH', 'MC', 'SM', 'VA'],
      supportedCurrencies: ['EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK'],
      processingFees: { percentage: 0.3, fixed: 0.10 },
      features: ['credit_transfer', 'pan_european', 'low_cost'],
      providers: ['sepa'],
      processingTime: '1-2 business days',
      minAmount: 0.01,
      maxAmount: 15000.00
    });

    this.registerPaymentMethod('sepa_instant_credit', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'SEPA Instant Credit',
      description: 'SEPA Instant Credit for EU',
      icon: 'sepa_instant',
      supportedCountries: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI', 'NO', 'CH', 'MC', 'SM', 'VA'],
      supportedCurrencies: ['EUR'],
      processingFees: { percentage: 0.5, fixed: 0.20 },
      features: ['instant', 'pan_european', 'real_time'],
      providers: ['sepa'],
      processingTime: 'instant',
      minAmount: 0.01,
      maxAmount: 15000.00
    });

    this.registerPaymentMethod('ideal', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'iDEAL',
      description: 'iDEAL online banking for Netherlands',
      icon: 'ideal',
      supportedCountries: ['NL'],
      supportedCurrencies: ['EUR'],
      processingFees: { percentage: 0.35, fixed: 0.25 },
      features: ['online_banking', 'secure', 'instant'],
      providers: ['ideal'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('giropay', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'Giropay',
      description: 'Giropay online banking for Germany',
      icon: 'giropay',
      supportedCountries: ['DE', 'AT'],
      supportedCurrencies: ['EUR'],
      processingFees: { percentage: 0.3, fixed: 0.20 },
      features: ['online_banking', 'secure', 'instant'],
      providers: ['giropay'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('bancontact', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'Bancontact',
      description: 'Bancontact payment for Belgium',
      icon: 'bancontact',
      supportedCountries: ['BE'],
      supportedCurrencies: ['EUR'],
      processingFees: { percentage: 0.4, fixed: 0.25 },
      features: ['online_banking', 'secure', 'instant'],
      providers: ['bancontact'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('sofort', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'Sofort',
      description: 'Sofort online banking for EU',
      icon: 'sofort',
      supportedCountries: ['DE', 'AT', 'BE', 'NL', 'IT', 'ES', 'FR', 'PL', 'CH'],
      supportedCurrencies: ['EUR', 'CHF'],
      processingFees: { percentage: 0.9, fixed: 0.30 },
      features: ['online_banking', 'multi_country', 'instant'],
      providers: ['sofort'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    // Australia/NZ Regional Payment Methods
    this.registerPaymentMethod('poli', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'POLi',
      description: 'POLi online banking for Australia/NZ',
      icon: 'poli',
      supportedCountries: ['AU', 'NZ'],
      supportedCurrencies: ['AUD', 'NZD'],
      processingFees: { percentage: 0.75, fixed: 0.30 },
      features: ['online_banking', 'secure', 'instant'],
      providers: ['poli'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('payid', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'PayID',
      description: 'PayID instant payments for Australia',
      icon: 'payid',
      supportedCountries: ['AU'],
      supportedCurrencies: ['AUD'],
      processingFees: { percentage: 0.2, fixed: 0.10 },
      features: ['instant', 'email_phone_abn', 'npp'],
      providers: ['payid'],
      processingTime: 'instant',
      minAmount: 0.01,
      maxAmount: 10000.00
    });

    this.registerPaymentMethod('npp_instant', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'NPP Instant',
      description: 'NPP Instant payments for Australia',
      icon: 'npp',
      supportedCountries: ['AU'],
      supportedCurrencies: ['AUD'],
      processingFees: { percentage: 0.3, fixed: 0.15 },
      features: ['instant', 'bsb_account', 'npp'],
      providers: ['payid'],
      processingTime: 'instant',
      minAmount: 0.01,
      maxAmount: 10000.00
    });

    this.registerPaymentMethod('bpay', {
      type: 'bill_payment',
      category: 'bill',
      name: 'BPAY',
      description: 'BPAY bill payments for Australia',
      icon: 'bpay',
      supportedCountries: ['AU'],
      supportedCurrencies: ['AUD'],
      processingFees: { percentage: 0.4, fixed: 0.25 },
      features: ['bill_payment', 'recurring', 'biller_code'],
      providers: ['bpay'],
      processingTime: '1-2 business days',
      minAmount: 1.00,
      maxAmount: 50000.00
    });

    this.registerPaymentMethod('bpay_recurring', {
      type: 'bill_payment',
      category: 'bill',
      name: 'BPAY Recurring',
      description: 'BPAY recurring payments for Australia',
      icon: 'bpay_recurring',
      supportedCountries: ['AU'],
      supportedCurrencies: ['AUD'],
      processingFees: { percentage: 0.3, fixed: 0.20 },
      features: ['recurring', 'automated', 'biller_code'],
      providers: ['bpay'],
      processingTime: '1-2 business days',
      minAmount: 1.00,
      maxAmount: 50000.00
    });

    // Asia-Pacific Regional Payment Methods
    this.registerPaymentMethod('grabpay', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'GrabPay',
      description: 'GrabPay digital wallet for Southeast Asia',
      icon: 'grabpay',
      supportedCountries: ['SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'KH', 'MM'],
      supportedCurrencies: ['SGD', 'MYR', 'THB', 'IDR', 'PHP', 'VND', 'KHR', 'MMK'],
      processingFees: { percentage: 2.5, fixed: 0.20 },
      features: ['mobile_wallet', 'qr_code', 'instant'],
      providers: ['grabpay'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('grabpay_qr', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'GrabPay QR',
      description: 'GrabPay QR code payments',
      icon: 'grabpay_qr',
      supportedCountries: ['SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'KH', 'MM'],
      supportedCurrencies: ['SGD', 'MYR', 'THB', 'IDR', 'PHP', 'VND', 'KHR', 'MMK'],
      processingFees: { percentage: 2.0, fixed: 0.15 },
      features: ['qr_code', 'instant', 'mobile_wallet'],
      providers: ['grabpay'],
      processingTime: 'instant'
    });

    this.registerPaymentMethod('gopay', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'GoPay',
      description: 'GoPay digital wallet for Indonesia',
      icon: 'gopay',
      supportedCountries: ['ID'],
      supportedCurrencies: ['IDR'],
      processingFees: { percentage: 2.5, fixed: 0.25 },
      features: ['mobile_wallet', 'qr_code', 'instant'],
      providers: ['gopay'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('gopay_qr', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'GoPay QR',
      description: 'GoPay QR code payments',
      icon: 'gopay_qr',
      supportedCountries: ['ID'],
      supportedCurrencies: ['IDR'],
      processingFees: { percentage: 2.0, fixed: 0.20 },
      features: ['qr_code', 'instant', 'mobile_wallet'],
      providers: ['gopay'],
      processingTime: 'instant'
    });

    this.registerPaymentMethod('ovo', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'OVO',
      description: 'OVO digital wallet for Indonesia',
      icon: 'ovo',
      supportedCountries: ['ID'],
      supportedCurrencies: ['IDR'],
      processingFees: { percentage: 2.5, fixed: 0.25 },
      features: ['mobile_wallet', 'qr_code', 'instant'],
      providers: ['ovo'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('ovo_qr', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'OVO QR',
      description: 'OVO QR code payments',
      icon: 'ovo_qr',
      supportedCountries: ['ID'],
      supportedCurrencies: ['IDR'],
      processingFees: { percentage: 2.0, fixed: 0.20 },
      features: ['qr_code', 'instant', 'mobile_wallet'],
      providers: ['ovo'],
      processingTime: 'instant'
    });

    this.registerPaymentMethod('dana', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'DANA',
      description: 'DANA digital wallet for Indonesia',
      icon: 'dana',
      supportedCountries: ['ID'],
      supportedCurrencies: ['IDR'],
      processingFees: { percentage: 2.5, fixed: 0.25 },
      features: ['mobile_wallet', 'qr_code', 'instant'],
      providers: ['dana'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('dana_qr', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'DANA QR',
      description: 'DANA QR code payments',
      icon: 'dana_qr',
      supportedCountries: ['ID'],
      supportedCurrencies: ['IDR'],
      processingFees: { percentage: 2.0, fixed: 0.20 },
      features: ['qr_code', 'instant', 'mobile_wallet'],
      providers: ['dana'],
      processingTime: 'instant'
    });

    // India Regional Payment Methods
    this.registerPaymentMethod('upi', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'UPI',
      description: 'Unified Payments Interface for India',
      icon: 'upi',
      supportedCountries: ['IN'],
      supportedCurrencies: ['INR'],
      processingFees: { percentage: 0.5, fixed: 0.00 },
      features: ['instant', 'mobile_payment', 'qr_code'],
      providers: ['upi'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('upi_qr', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'UPI QR',
      description: 'UPI QR code payments',
      icon: 'upi_qr',
      supportedCountries: ['IN'],
      supportedCurrencies: ['INR'],
      processingFees: { percentage: 0.4, fixed: 0.00 },
      features: ['qr_code', 'instant', 'mobile_payment'],
      providers: ['upi'],
      processingTime: 'instant'
    });

    this.registerPaymentMethod('upi_vpa', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'UPI VPA',
      description: 'UPI Virtual Payment Address',
      icon: 'upi_vpa',
      supportedCountries: ['IN'],
      supportedCurrencies: ['INR'],
      processingFees: { percentage: 0.3, fixed: 0.00 },
      features: ['vpa', 'instant', 'email_phone'],
      providers: ['upi'],
      processingTime: 'instant',
      minAmount: 1.00,
      maxAmount: 100000.00
    });

    this.registerPaymentMethod('paytm_wallet', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'Paytm Wallet',
      description: 'Paytm digital wallet for India',
      icon: 'paytm',
      supportedCountries: ['IN'],
      supportedCurrencies: ['INR'],
      processingFees: { percentage: 2.0, fixed: 0.20 },
      features: ['mobile_wallet', 'instant', 'recharge'],
      providers: ['paytm'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('paytm_upi', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'Paytm UPI',
      description: 'Paytm UPI payments for India',
      icon: 'paytm_upi',
      supportedCountries: ['IN'],
      supportedCurrencies: ['INR'],
      processingFees: { percentage: 0.5, fixed: 0.00 },
      features: ['upi', 'instant', 'mobile_payment'],
      providers: ['paytm'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('paytm_qr', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'Paytm QR',
      description: 'Paytm QR code payments',
      icon: 'paytm_qr',
      supportedCountries: ['IN'],
      supportedCurrencies: ['INR'],
      processingFees: { percentage: 1.5, fixed: 0.15 },
      features: ['qr_code', 'instant', 'mobile_payment'],
      providers: ['paytm'],
      processingTime: 'instant'
    });

    this.registerPaymentMethod('phonepe_upi', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'PhonePe UPI',
      description: 'PhonePe UPI payments for India',
      icon: 'phonepe',
      supportedCountries: ['IN'],
      supportedCurrencies: ['INR'],
      processingFees: { percentage: 0.5, fixed: 0.00 },
      features: ['upi', 'instant', 'mobile_payment'],
      providers: ['phonepe'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('phonepe_wallet', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'PhonePe Wallet',
      description: 'PhonePe digital wallet for India',
      icon: 'phonepe_wallet',
      supportedCountries: ['IN'],
      supportedCurrencies: ['INR'],
      processingFees: { percentage: 2.0, fixed: 0.20 },
      features: ['mobile_wallet', 'instant', 'recharge'],
      providers: ['phonepe'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('phonepe_qr', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'PhonePe QR',
      description: 'PhonePe QR code payments',
      icon: 'phonepe_qr',
      supportedCountries: ['IN'],
      supportedCurrencies: ['INR'],
      processingFees: { percentage: 1.5, fixed: 0.15 },
      features: ['qr_code', 'instant', 'mobile_payment'],
      providers: ['phonepe'],
      processingTime: 'instant'
    });

    // Latin America Regional Payment Methods
    this.registerPaymentMethod('boleto_bancario', {
      type: 'bill_payment',
      category: 'bill',
      name: 'Boleto Bancário',
      description: 'Boleto Bancário for Brazil',
      icon: 'boleto',
      supportedCountries: ['BR'],
      supportedCurrencies: ['BRL'],
      processingFees: { percentage: 1.5, fixed: 2.00 },
      features: ['bill_payment', 'bank_slip', 'cash_payment'],
      providers: ['boleto_bancario'],
      processingTime: '3-5 business days',
      minAmount: 1.00,
      maxAmount: 50000.00
    });

    this.registerPaymentMethod('boleto_express', {
      type: 'bill_payment',
      category: 'bill',
      name: 'Boleto Express',
      description: 'Boleto Express for Brazil',
      icon: 'boleto_express',
      supportedCountries: ['BR'],
      supportedCurrencies: ['BRL'],
      processingFees: { percentage: 2.0, fixed: 3.00 },
      features: ['express', 'bill_payment', 'bank_slip'],
      providers: ['boleto_bancario'],
      processingTime: '1-2 business days',
      minAmount: 1.00,
      maxAmount: 50000.00
    });

    this.registerPaymentMethod('oxxo', {
      type: 'cash_payment',
      category: 'cash',
      name: 'OXXO',
      description: 'OXXO convenience store payments for Mexico',
      icon: 'oxxo',
      supportedCountries: ['MX'],
      supportedCurrencies: ['MXN'],
      processingFees: { percentage: 3.5, fixed: 5.00 },
      features: ['cash_payment', 'convenience_store', 'offline'],
      providers: ['oxxo'],
      processingTime: '1-7 days',
      minAmount: 10.00,
      maxAmount: 10000.00
    });

    this.registerPaymentMethod('oxxo_pay', {
      type: 'cash_payment',
      category: 'cash',
      name: 'OXXO Pay',
      description: 'OXXO Pay digital payments for Mexico',
      icon: 'oxxo_pay',
      supportedCountries: ['MX'],
      supportedCurrencies: ['MXN'],
      processingFees: { percentage: 2.9, fixed: 3.00 },
      features: ['digital_payment', 'convenience_store', 'mobile'],
      providers: ['oxxo'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('pix', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'PIX',
      description: 'PIX instant payments for Brazil',
      icon: 'pix',
      supportedCountries: ['BR'],
      supportedCurrencies: ['BRL'],
      processingFees: { percentage: 0.5, fixed: 0.00 },
      features: ['instant', 'pix_key', 'qr_code'],
      providers: ['pix'],
      processingTime: 'instant',
      minAmount: 0.01,
      maxAmount: 500000.00
    });

    this.registerPaymentMethod('pix_qr', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'PIX QR',
      description: 'PIX QR code payments',
      icon: 'pix_qr',
      supportedCountries: ['BR'],
      supportedCurrencies: ['BRL'],
      processingFees: { percentage: 0.4, fixed: 0.00 },
      features: ['qr_code', 'instant', 'mobile_payment'],
      providers: ['pix'],
      processingTime: 'instant'
    });

    this.registerPaymentMethod('pix_copy_paste', {
      type: 'bank_transfer',
      category: 'bank',
      name: 'PIX Copy & Paste',
      description: 'PIX Copy & Paste code payments',
      icon: 'pix_copy_paste',
      supportedCountries: ['BR'],
      supportedCurrencies: ['BRL'],
      processingFees: { percentage: 0.3, fixed: 0.00 },
      features: ['copy_paste', 'instant', 'manual_entry'],
      providers: ['pix'],
      processingTime: 'instant'
    });

    // Middle East Regional Payment Methods
    this.registerPaymentMethod('mada', {
      type: 'card_payment',
      category: 'card',
      name: 'Mada',
      description: 'Mada card payments for Saudi Arabia',
      icon: 'mada',
      supportedCountries: ['SA'],
      supportedCurrencies: ['SAR'],
      processingFees: { percentage: 1.5, fixed: 0.50 },
      features: ['local_card', 'secure', 'instant'],
      providers: ['mada'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('mada_digital', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'Mada Digital',
      description: 'Mada digital wallet for Saudi Arabia',
      icon: 'mada_digital',
      supportedCountries: ['SA'],
      supportedCurrencies: ['SAR'],
      processingFees: { percentage: 2.0, fixed: 0.75 },
      features: ['digital_wallet', 'mobile_payment', 'instant'],
      providers: ['mada'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('fawry', {
      type: 'cash_payment',
      category: 'cash',
      name: 'Fawry',
      description: 'Fawry bill payments for Egypt',
      icon: 'fawry',
      supportedCountries: ['EG'],
      supportedCurrencies: ['EGP'],
      processingFees: { percentage: 2.5, fixed: 2.00 },
      features: ['bill_payment', 'cash_payment', 'outlets'],
      providers: ['fawry'],
      processingTime: '1-3 days',
      minAmount: 1.00,
      maxAmount: 50000.00
    });

    this.registerPaymentMethod('fawry_wallet', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'Fawry Wallet',
      description: 'Fawry digital wallet for Egypt',
      icon: 'fawry_wallet',
      supportedCountries: ['EG'],
      supportedCurrencies: ['EGP'],
      processingFees: { percentage: 1.8, fixed: 1.50 },
      features: ['digital_wallet', 'mobile_payment', 'instant'],
      providers: ['fawry'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('stc_pay', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'STC Pay',
      description: 'STC Pay digital wallet for Saudi Arabia',
      icon: 'stc_pay',
      supportedCountries: ['SA'],
      supportedCurrencies: ['SAR'],
      processingFees: { percentage: 2.0, fixed: 0.50 },
      features: ['digital_wallet', 'mobile_payment', 'instant'],
      providers: ['stc_pay'],
      processingTime: 'instant',
      requiresRedirect: true
    });

    this.registerPaymentMethod('stc_pay_qr', {
      type: 'e_wallet',
      category: 'wallet',
      name: 'STC Pay QR',
      description: 'STC Pay QR code payments',
      icon: 'stc_pay_qr',
      supportedCountries: ['SA'],
      supportedCurrencies: ['SAR'],
      processingFees: { percentage: 1.5, fixed: 0.25 },
      features: ['qr_code', 'instant', 'mobile_wallet'],
      providers: ['stc_pay'],
      processingTime: 'instant'
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

    // Regional Provider Mappings
    // US/Canada
    this.providerMappings.set('interac', [
      'interac_e_transfer', 'interac_online'
    ]);

    this.providerMappings.set('ach_direct_debit', [
      'ach_direct_debit', 'ach_credit', 'ach_web_debit'
    ]);

    // EU/UK
    this.providerMappings.set('sepa', [
      'sepa_direct_debit', 'sepa_credit_transfer', 'sepa_instant_credit'
    ]);

    this.providerMappings.set('ideal', [
      'ideal'
    ]);

    this.providerMappings.set('giropay', [
      'giropay'
    ]);

    this.providerMappings.set('bancontact', [
      'bancontact'
    ]);

    this.providerMappings.set('sofort', [
      'sofort'
    ]);

    // Australia/NZ
    this.providerMappings.set('poli', [
      'poli'
    ]);

    this.providerMappings.set('payid', [
      'payid', 'npp_instant'
    ]);

    this.providerMappings.set('bpay', [
      'bpay', 'bpay_recurring'
    ]);

    // Asia-Pacific
    this.providerMappings.set('grabpay', [
      'grabpay', 'grabpay_qr'
    ]);

    this.providerMappings.set('gopay', [
      'gopay', 'gopay_qr'
    ]);

    this.providerMappings.set('ovo', [
      'ovo', 'ovo_qr'
    ]);

    this.providerMappings.set('dana', [
      'dana', 'dana_qr'
    ]);

    // India
    this.providerMappings.set('upi', [
      'upi', 'upi_qr', 'upi_vpa'
    ]);

    this.providerMappings.set('paytm', [
      'paytm_wallet', 'paytm_upi', 'paytm_qr'
    ]);

    this.providerMappings.set('phonepe', [
      'phonepe_upi', 'phonepe_wallet', 'phonepe_qr'
    ]);

    // Latin America
    this.providerMappings.set('boleto_bancario', [
      'boleto_bancario', 'boleto_express'
    ]);

    this.providerMappings.set('oxxo', [
      'oxxo', 'oxxo_pay'
    ]);

    this.providerMappings.set('pix', [
      'pix', 'pix_qr', 'pix_copy_paste'
    ]);

    // Middle East
    this.providerMappings.set('mada', [
      'mada', 'mada_digital'
    ]);

    this.providerMappings.set('fawry', [
      'fawry', 'fawry_wallet'
    ]);

    this.providerMappings.set('stc_pay', [
      'stc_pay', 'stc_pay_qr'
    ]);
  }

  /**
   * Initialize regional mappings
   */
  initializeRegionalMappings() {
    // North America
    this.regionalMappings.set('NA', [
      'visa', 'mastercard', 'amex', 'discover', 'ach',
      'paypal', 'apple_pay', 'google_pay', 'venmo', 'cash_app',
      'interac_e_transfer', 'interac_online', 'ach_direct_debit', 'ach_credit', 'ach_web_debit'
    ]);

    // Europe
    this.regionalMappings.set('EU', [
      'visa', 'mastercard', 'amex', 'jcb', 'maestro',
      'paypal', 'apple_pay', 'google_pay', 'swift',
      'sepa_direct_debit', 'sepa_credit_transfer', 'sepa_instant_credit',
      'ideal', 'giropay', 'bancontact', 'sofort'
    ]);

    // Asia Pacific
    this.regionalMappings.set('APAC', [
      'visa', 'mastercard', 'amex', 'jcb', 'unionpay',
      'paypal', 'apple_pay', 'google_pay', 'alipay', 'wechat_pay', 'swift',
      'grabpay', 'grabpay_qr', 'gopay', 'gopay_qr', 'ovo', 'ovo_qr', 'dana', 'dana_qr'
    ]);

    // Australia/NZ
    this.regionalMappings.set('AU_NZ', [
      'visa', 'mastercard', 'amex', 'jcb', 'maestro',
      'paypal', 'apple_pay', 'google_pay', 'swift',
      'poli', 'payid', 'npp_instant', 'bpay', 'bpay_recurring'
    ]);

    // China
    this.regionalMappings.set('CN', [
      'visa', 'mastercard', 'amex', 'unionpay',
      'alipay', 'wechat_pay', 'swift'
    ]);

    // India
    this.regionalMappings.set('IN', [
      'visa', 'mastercard', 'amex', 'jcb',
      'paypal', 'apple_pay', 'google_pay', 'swift',
      'upi', 'upi_qr', 'upi_vpa', 'paytm_wallet', 'paytm_upi', 'paytm_qr',
      'phonepe_upi', 'phonepe_wallet', 'phonepe_qr'
    ]);

    // Latin America
    this.regionalMappings.set('LATAM', [
      'visa', 'mastercard', 'amex', 'jcb',
      'paypal', 'apple_pay', 'google_pay', 'swift',
      'boleto_bancario', 'boleto_express', 'oxxo', 'oxxo_pay', 'pix', 'pix_qr', 'pix_copy_paste'
    ]);

    // Middle East & Africa
    this.regionalMappings.set('MEA', [
      'visa', 'mastercard', 'amex', 'jcb',
      'paypal', 'apple_pay', 'google_pay', 'swift',
      'mada', 'mada_digital', 'fawry', 'fawry_wallet', 'stc_pay', 'stc_pay_qr'
    ]);

    // Country-specific mappings
    // US
    this.regionalMappings.set('US', [
      'visa', 'mastercard', 'amex', 'discover', 'ach',
      'paypal', 'apple_pay', 'google_pay', 'venmo', 'cash_app',
      'ach_direct_debit', 'ach_credit', 'ach_web_debit'
    ]);

    // Canada
    this.regionalMappings.set('CA', [
      'visa', 'mastercard', 'amex', 'discover',
      'paypal', 'apple_pay', 'google_pay',
      'interac_e_transfer', 'interac_online'
    ]);

    // Australia
    this.regionalMappings.set('AU', [
      'visa', 'mastercard', 'amex', 'jcb', 'maestro',
      'paypal', 'apple_pay', 'google_pay',
      'poli', 'payid', 'npp_instant', 'bpay', 'bpay_recurring'
    ]);

    // New Zealand
    this.regionalMappings.set('NZ', [
      'visa', 'mastercard', 'amex', 'jcb', 'maestro',
      'paypal', 'apple_pay', 'google_pay',
      'poli'
    ]);

    // Netherlands
    this.regionalMappings.set('NL', [
      'visa', 'mastercard', 'amex', 'jcb', 'maestro',
      'paypal', 'apple_pay', 'google_pay',
      'sepa_direct_debit', 'sepa_credit_transfer', 'sepa_instant_credit', 'ideal'
    ]);

    // Germany
    this.regionalMappings.set('DE', [
      'visa', 'mastercard', 'amex', 'jcb', 'maestro',
      'paypal', 'apple_pay', 'google_pay',
      'sepa_direct_debit', 'sepa_credit_transfer', 'sepa_instant_credit', 'giropay', 'sofort'
    ]);

    // Belgium
    this.regionalMappings.set('BE', [
      'visa', 'mastercard', 'amex', 'jcb', 'maestro',
      'paypal', 'apple_pay', 'google_pay',
      'sepa_direct_debit', 'sepa_credit_transfer', 'sepa_instant_credit', 'bancontact', 'sofort'
    ]);

    // Singapore
    this.regionalMappings.set('SG', [
      'visa', 'mastercard', 'amex', 'jcb', 'unionpay',
      'paypal', 'apple_pay', 'google_pay', 'alipay', 'wechat_pay',
      'grabpay', 'grabpay_qr'
    ]);

    // Indonesia
    this.regionalMappings.set('ID', [
      'visa', 'mastercard', 'amex', 'jcb', 'unionpay',
      'paypal', 'apple_pay', 'google_pay', 'alipay', 'wechat_pay',
      'grabpay', 'grabpay_qr', 'gopay', 'gopay_qr', 'ovo', 'ovo_qr', 'dana', 'dana_qr'
    ]);

    // Brazil
    this.regionalMappings.set('BR', [
      'visa', 'mastercard', 'amex', 'jcb',
      'paypal', 'apple_pay', 'google_pay',
      'boleto_bancario', 'boleto_express', 'pix', 'pix_qr', 'pix_copy_paste'
    ]);

    // Mexico
    this.regionalMappings.set('MX', [
      'visa', 'mastercard', 'amex', 'jcb',
      'paypal', 'apple_pay', 'google_pay',
      'oxxo', 'oxxo_pay'
    ]);

    // Saudi Arabia
    this.regionalMappings.set('SA', [
      'visa', 'mastercard', 'amex', 'jcb',
      'paypal', 'apple_pay', 'google_pay',
      'mada', 'mada_digital', 'stc_pay', 'stc_pay_qr'
    ]);

    // Egypt
    this.regionalMappings.set('EG', [
      'visa', 'mastercard', 'amex', 'jcb',
      'paypal', 'apple_pay', 'google_pay',
      'fawry', 'fawry_wallet'
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
