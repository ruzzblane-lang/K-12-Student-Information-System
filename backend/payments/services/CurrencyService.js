/**
 * Currency Service
 * 
 * Handles multi-currency transactions with real-time exchange rates,
 * currency conversion, and regional payment method support.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class CurrencyService {
  constructor(db) {
    this.db = db;
    
    // Exchange rate cache (in-memory for now, should use Redis in production)
    this.exchangeRateCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    // Supported currencies with their properties
    this.supportedCurrencies = {
      'USD': { symbol: '$', decimals: 2, name: 'US Dollar' },
      'EUR': { symbol: '€', decimals: 2, name: 'Euro' },
      'GBP': { symbol: '£', decimals: 2, name: 'British Pound' },
      'CAD': { symbol: 'C$', decimals: 2, name: 'Canadian Dollar' },
      'AUD': { symbol: 'A$', decimals: 2, name: 'Australian Dollar' },
      'JPY': { symbol: '¥', decimals: 0, name: 'Japanese Yen' },
      'CHF': { symbol: 'CHF', decimals: 2, name: 'Swiss Franc' },
      'SEK': { symbol: 'kr', decimals: 2, name: 'Swedish Krona' },
      'NOK': { symbol: 'kr', decimals: 2, name: 'Norwegian Krone' },
      'DKK': { symbol: 'kr', decimals: 2, name: 'Danish Krone' },
      'PLN': { symbol: 'zł', decimals: 2, name: 'Polish Zloty' },
      'CZK': { symbol: 'Kč', decimals: 2, name: 'Czech Koruna' },
      'HUF': { symbol: 'Ft', decimals: 2, name: 'Hungarian Forint' },
      'BGN': { symbol: 'лв', decimals: 2, name: 'Bulgarian Lev' },
      'RON': { symbol: 'lei', decimals: 2, name: 'Romanian Leu' },
      'HRK': { symbol: 'kn', decimals: 2, name: 'Croatian Kuna' },
      'RUB': { symbol: '₽', decimals: 2, name: 'Russian Ruble' },
      'TRY': { symbol: '₺', decimals: 2, name: 'Turkish Lira' },
      'BRL': { symbol: 'R$', decimals: 2, name: 'Brazilian Real' },
      'MXN': { symbol: '$', decimals: 2, name: 'Mexican Peso' },
      'ARS': { symbol: '$', decimals: 2, name: 'Argentine Peso' },
      'CLP': { symbol: '$', decimals: 0, name: 'Chilean Peso' },
      'COP': { symbol: '$', decimals: 2, name: 'Colombian Peso' },
      'PEN': { symbol: 'S/', decimals: 2, name: 'Peruvian Sol' },
      'UYU': { symbol: '$U', decimals: 2, name: 'Uruguayan Peso' },
      'VEF': { symbol: 'Bs', decimals: 2, name: 'Venezuelan Bolivar' },
      'INR': { symbol: '₹', decimals: 2, name: 'Indian Rupee' },
      'SGD': { symbol: 'S$', decimals: 2, name: 'Singapore Dollar' },
      'HKD': { symbol: 'HK$', decimals: 2, name: 'Hong Kong Dollar' },
      'TWD': { symbol: 'NT$', decimals: 2, name: 'Taiwan Dollar' },
      'MYR': { symbol: 'RM', decimals: 2, name: 'Malaysian Ringgit' },
      'THB': { symbol: '฿', decimals: 2, name: 'Thai Baht' },
      'PHP': { symbol: '₱', decimals: 2, name: 'Philippine Peso' },
      'IDR': { symbol: 'Rp', decimals: 2, name: 'Indonesian Rupiah' },
      'KRW': { symbol: '₩', decimals: 0, name: 'South Korean Won' },
      'CNY': { symbol: '¥', decimals: 2, name: 'Chinese Yuan' },
      'AED': { symbol: 'د.إ', decimals: 2, name: 'UAE Dirham' },
      'SAR': { symbol: '﷼', decimals: 2, name: 'Saudi Riyal' },
      'QAR': { symbol: '﷼', decimals: 2, name: 'Qatari Riyal' },
      'KWD': { symbol: 'د.ك', decimals: 3, name: 'Kuwaiti Dinar' },
      'BHD': { symbol: 'د.ب', decimals: 3, name: 'Bahraini Dinar' },
      'OMR': { symbol: '﷼', decimals: 3, name: 'Omani Rial' },
      'JOD': { symbol: 'د.ا', decimals: 3, name: 'Jordanian Dinar' },
      'LBP': { symbol: 'ل.ل', decimals: 2, name: 'Lebanese Pound' },
      'EGP': { symbol: '£', decimals: 2, name: 'Egyptian Pound' },
      'MAD': { symbol: 'د.م.', decimals: 2, name: 'Moroccan Dirham' },
      'TND': { symbol: 'د.ت', decimals: 3, name: 'Tunisian Dinar' },
      'ZAR': { symbol: 'R', decimals: 2, name: 'South African Rand' },
      'NGN': { symbol: '₦', decimals: 2, name: 'Nigerian Naira' },
      'KES': { symbol: 'KSh', decimals: 2, name: 'Kenyan Shilling' },
      'GHS': { symbol: '₵', decimals: 2, name: 'Ghanaian Cedi' },
      'UGX': { symbol: 'USh', decimals: 0, name: 'Ugandan Shilling' },
      'TZS': { symbol: 'TSh', decimals: 2, name: 'Tanzanian Shilling' },
      'ETB': { symbol: 'Br', decimals: 2, name: 'Ethiopian Birr' },
      'MWK': { symbol: 'MK', decimals: 2, name: 'Malawian Kwacha' },
      'ZMW': { symbol: 'ZK', decimals: 2, name: 'Zambian Kwacha' },
      'BWP': { symbol: 'P', decimals: 2, name: 'Botswana Pula' },
      'SZL': { symbol: 'L', decimals: 2, name: 'Swazi Lilangeni' },
      'LSL': { symbol: 'L', decimals: 2, name: 'Lesotho Loti' },
      'NAD': { symbol: 'N$', decimals: 2, name: 'Namibian Dollar' }
    };

    // Regional payment methods by currency/region
    this.regionalPaymentMethods = {
      'USD': ['card', 'paypal', 'apple_pay', 'google_pay', 'ach', 'wire'],
      'EUR': ['card', 'paypal', 'sepa_debit', 'ideal', 'bancontact', 'eps', 'giropay', 'sofort'],
      'GBP': ['card', 'paypal', 'bacs'],
      'CAD': ['card', 'paypal', 'interac'],
      'AUD': ['card', 'paypal', 'bpay', 'poli'],
      'JPY': ['card', 'paypal', 'konbini'],
      'BRL': ['card', 'paypal', 'boleto', 'pix'],
      'MXN': ['card', 'paypal', 'oxxo', 'spei'],
      'INR': ['card', 'paypal', 'upi', 'netbanking', 'wallet'],
      'CNY': ['card', 'alipay', 'wechat_pay', 'unionpay'],
      'KRW': ['card', 'kakaopay', 'toss'],
      'THB': ['card', 'paypal', 'promptpay'],
      'IDR': ['card', 'paypal', 'dana', 'ovo', 'gopay'],
      'MYR': ['card', 'paypal', 'fpx', 'grabpay'],
      'PHP': ['card', 'paypal', 'gcash', 'paymaya'],
      'SGD': ['card', 'paypal', 'paynow', 'grabpay'],
      'HKD': ['card', 'paypal', 'fps'],
      'TWD': ['card', 'paypal', 'line_pay'],
      'AED': ['card', 'paypal', 'mada', 'fawry'],
      'SAR': ['card', 'paypal', 'mada'],
      'ZAR': ['card', 'paypal', 'eft'],
      'NGN': ['card', 'paypal', 'bank_transfer', 'ussd'],
      'KES': ['card', 'paypal', 'mpesa', 'airtel_money'],
      'GHS': ['card', 'paypal', 'mtn_momo', 'vodafone_cash'],
      'UGX': ['card', 'paypal', 'mtn_momo', 'airtel_money'],
      'TZS': ['card', 'paypal', 'mpesa', 'tigo_pesa'],
      'ETB': ['card', 'paypal', 'cbe_birr', 'telebirr'],
      'MWK': ['card', 'paypal', 'airtel_money', 'tnm_mpamba'],
      'ZMW': ['card', 'paypal', 'mtn_momo', 'airtel_money'],
      'BWP': ['card', 'paypal', 'orange_money'],
      'SZL': ['card', 'paypal', 'mtn_momo'],
      'LSL': ['card', 'paypal', 'ecocash'],
      'NAD': ['card', 'paypal', 'eft']
    };
  }

  /**
   * Convert currency amount
   * @param {Object} paymentData - Payment data with conversion info
   * @returns {Object} Updated payment data with converted amount
   */
  async convertCurrency(paymentData) {
    const { amount, currency, targetCurrency } = paymentData;

    try {
      // Validate currencies
      if (!this.isCurrencySupported(currency)) {
        throw new Error(`Unsupported source currency: ${currency}`);
      }

      if (!this.isCurrencySupported(targetCurrency)) {
        throw new Error(`Unsupported target currency: ${targetCurrency}`);
      }

      // Get exchange rate
      const exchangeRate = await this.getExchangeRate(currency, targetCurrency);
      
      // Convert amount
      const convertedAmount = this.convertAmount(amount, exchangeRate, targetCurrency);

      // Log conversion
      await this.logCurrencyConversion({
        sourceCurrency: currency,
        targetCurrency,
        sourceAmount: amount,
        convertedAmount,
        exchangeRate,
        tenantId: paymentData.tenantId
      });

      return {
        ...paymentData,
        originalAmount: amount,
        originalCurrency: currency,
        amount: convertedAmount,
        currency: targetCurrency,
        exchangeRate,
        conversionTimestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Currency conversion failed: ${error.message}`);
    }
  }

  /**
   * Get exchange rate between two currencies
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {number} Exchange rate
   */
  async getExchangeRate(fromCurrency, toCurrency) {
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    
    // Check cache first
    const cached = this.exchangeRateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.rate;
    }

    try {
      // Fetch from external API
      const rate = await this.fetchExchangeRate(fromCurrency, toCurrency);
      
      // Cache the rate
      this.exchangeRateCache.set(cacheKey, {
        rate,
        timestamp: Date.now()
      });

      return rate;

    } catch (error) {
      // Try to get from database as fallback
      const fallbackRate = await this.getStoredExchangeRate(fromCurrency, toCurrency);
      if (fallbackRate) {
        return fallbackRate;
      }

      throw new Error(`Failed to get exchange rate: ${error.message}`);
    }
  }

  /**
   * Fetch exchange rate from external API
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {number} Exchange rate
   */
  async fetchExchangeRate(fromCurrency, toCurrency) {
    try {
      // Use exchangerate-api.com (free tier available)
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`, {
        timeout: 5000
      });

      const rates = response.data.rates;
      if (!rates[toCurrency]) {
        throw new Error(`Exchange rate not available for ${toCurrency}`);
      }

      const rate = rates[toCurrency];
      
      // Store in database for future use
      await this.storeExchangeRate(fromCurrency, toCurrency, rate);

      return rate;

    } catch (error) {
      console.error('Exchange rate API error:', error.message);
      throw error;
    }
  }

  /**
   * Convert amount using exchange rate
   * @param {number} amount - Amount to convert
   * @param {number} exchangeRate - Exchange rate
   * @param {string} targetCurrency - Target currency
   * @returns {number} Converted amount
   */
  convertAmount(amount, exchangeRate, targetCurrency) {
    const converted = amount * exchangeRate;
    
    // Round to appropriate decimal places
    const decimals = this.supportedCurrencies[targetCurrency]?.decimals || 2;
    const multiplier = Math.pow(10, decimals);
    
    return Math.round(converted * multiplier) / multiplier;
  }

  /**
   * Get supported currencies
   * @returns {Object} Supported currencies
   */
  getSupportedCurrencies() {
    return this.supportedCurrencies;
  }

  /**
   * Get regional payment methods for currency
   * @param {string} currency - Currency code
   * @returns {Array} Payment methods
   */
  getRegionalPaymentMethods(currency) {
    return this.regionalPaymentMethods[currency] || ['card', 'paypal'];
  }

  /**
   * Check if currency is supported
   * @param {string} currency - Currency code
   * @returns {boolean} Is supported
   */
  isCurrencySupported(currency) {
    return currency in this.supportedCurrencies;
  }

  /**
   * Format currency amount
   * @param {number} amount - Amount
   * @param {string} currency - Currency code
   * @param {string} locale - Locale (optional)
   * @returns {string} Formatted amount
   */
  formatCurrency(amount, currency, locale = 'en-US') {
    const currencyInfo = this.supportedCurrencies[currency];
    if (!currencyInfo) {
      return `${amount} ${currency}`;
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: currencyInfo.decimals,
        maximumFractionDigits: currencyInfo.decimals
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${currencyInfo.symbol}${amount.toFixed(currencyInfo.decimals)}`;
    }
  }

  /**
   * Get currency information
   * @param {string} currency - Currency code
   * @returns {Object} Currency information
   */
  getCurrencyInfo(currency) {
    return this.supportedCurrencies[currency] || null;
  }

  /**
   * Get exchange rate from database
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {number|null} Exchange rate
   */
  async getStoredExchangeRate(fromCurrency, toCurrency) {
    const query = `
      SELECT rate FROM exchange_rates 
      WHERE from_currency = $1 AND to_currency = $2 
      AND created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const result = await this.db.query(query, [fromCurrency, toCurrency]);
    return result.rows[0]?.rate || null;
  }

  /**
   * Store exchange rate in database
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {number} rate - Exchange rate
   */
  async storeExchangeRate(fromCurrency, toCurrency, rate) {
    const query = `
      INSERT INTO exchange_rates (
        id, from_currency, to_currency, rate, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [uuidv4(), fromCurrency, toCurrency, rate]);
  }

  /**
   * Log currency conversion
   * @param {Object} conversionData - Conversion data
   */
  async logCurrencyConversion(conversionData) {
    const query = `
      INSERT INTO currency_conversions (
        id, tenant_id, source_currency, target_currency, 
        source_amount, converted_amount, exchange_rate, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      uuidv4(),
      conversionData.tenantId,
      conversionData.sourceCurrency,
      conversionData.targetCurrency,
      conversionData.sourceAmount,
      conversionData.convertedAmount,
      conversionData.exchangeRate
    ]);
  }

  /**
   * Get conversion history
   * @param {string} tenantId - Tenant ID
   * @param {number} limit - Limit
   * @returns {Array} Conversion history
   */
  async getConversionHistory(tenantId, limit = 50) {
    const query = `
      SELECT * FROM currency_conversions 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;

    const result = await this.db.query(query, [tenantId, limit]);
    return result.rows;
  }

  /**
   * Get exchange rate statistics
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {number} days - Number of days
   * @returns {Object} Statistics
   */
  async getExchangeRateStats(fromCurrency, toCurrency, days = 30) {
    const query = `
      SELECT 
        AVG(rate) as avg_rate,
        MIN(rate) as min_rate,
        MAX(rate) as max_rate,
        STDDEV(rate) as stddev_rate,
        COUNT(*) as data_points
      FROM exchange_rates 
      WHERE from_currency = $1 AND to_currency = $2 
      AND created_at > NOW() - INTERVAL '${days} days'
    `;

    const result = await this.db.query(query, [fromCurrency, toCurrency]);
    return result.rows[0];
  }

  /**
   * Update exchange rates for all supported currencies
   * This should be called periodically (e.g., every hour)
   */
  async updateAllExchangeRates() {
    const currencies = Object.keys(this.supportedCurrencies);
    const baseCurrency = 'USD';
    
    console.log('Updating exchange rates...');
    
    try {
      // Get rates from USD to all other currencies
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`, {
        timeout: 10000
      });

      const rates = response.data.rates;
      const updatePromises = [];

      for (const currency of currencies) {
        if (currency !== baseCurrency && rates[currency]) {
          updatePromises.push(
            this.storeExchangeRate(baseCurrency, currency, rates[currency])
          );
        }
      }

      await Promise.all(updatePromises);
      console.log(`Updated exchange rates for ${updatePromises.length} currencies`);

    } catch (error) {
      console.error('Failed to update exchange rates:', error.message);
      throw error;
    }
  }

  /**
   * Get currency conversion cost
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {number} amount - Amount
   * @returns {Object} Conversion cost information
   */
  async getConversionCost(fromCurrency, toCurrency, amount) {
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = this.convertAmount(amount, exchangeRate, toCurrency);
    
    // Calculate conversion fee (typically 0.5-2% for most providers)
    const conversionFeeRate = 0.01; // 1%
    const conversionFee = convertedAmount * conversionFeeRate;
    const totalAmount = convertedAmount + conversionFee;

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      targetCurrency: toCurrency,
      exchangeRate,
      conversionFee,
      conversionFeeRate,
      totalAmount,
      breakdown: {
        amount: convertedAmount,
        fee: conversionFee,
        total: totalAmount
      }
    };
  }

  /**
   * Validate currency pair for conversion
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Object} Validation result
   */
  validateCurrencyPair(fromCurrency, toCurrency) {
    const errors = [];

    if (!this.isCurrencySupported(fromCurrency)) {
      errors.push(`Unsupported source currency: ${fromCurrency}`);
    }

    if (!this.isCurrencySupported(toCurrency)) {
      errors.push(`Unsupported target currency: ${toCurrency}`);
    }

    if (fromCurrency === toCurrency) {
      errors.push('Source and target currencies cannot be the same');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = CurrencyService;
