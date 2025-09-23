/**
 * Enhanced I18n Manager for White-Label Development
 * 
 * Provides robust internationalization and localization with ICU MessageFormat,
 * RTL support, Unicode handling, and comprehensive translation management.
 */

import { IntlProvider, FormattedMessage, useIntl } from 'react-intl';
import ICU from 'icu-messageformat-parser';
import { TranslationLoader } from './loaders/TranslationLoader';
import { TranslationCache } from './cache/TranslationCache';
import { TranslationValidator } from './validators/TranslationValidator';
import { LocaleDetector } from './detectors/LocaleDetector';
import { FormatManager } from './formatters/FormatManager';
import { RTLManager } from './rtl/RTLManager';

class I18nManager {
  constructor(tenantId, options = {}) {
    this.tenantId = tenantId;
    this.options = {
      defaultLocale: 'en-US',
      fallbackLocale: 'en',
      enableCaching: true,
      enableValidation: true,
      enableICU: true,
      enableRTL: true,
      enableUnicode: true,
      cacheExpiry: 3600000, // 1 hour
      supportedLocales: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-PT', 'ru-RU', 'zh-CN', 'ja-JP', 'ko-KR', 'ar-SA', 'hi-IN'],
      rtlLocales: ['ar-SA', 'he-IL', 'fa-IR', 'ur-PK'],
      ...options
    };
    
    this.currentLocale = this.options.defaultLocale;
    this.currentMessages = {};
    this.currentFormats = {};
    this.loader = new TranslationLoader(tenantId, this.options);
    this.cache = new TranslationCache(tenantId, this.options);
    this.validator = new TranslationValidator();
    this.detector = new LocaleDetector();
    this.formatManager = new FormatManager();
    this.rtlManager = new RTLManager();
    this.messageCache = new Map();
    
    this.initializeI18nManager();
  }

  async initializeI18nManager() {
    try {
      // Initialize cache
      if (this.options.enableCaching) {
        await this.cache.initialize();
      }

      // Detect initial locale
      this.currentLocale = await this.detector.detectLocale(this.options);
      
      // Load initial messages and formats
      await this.loadLocale(this.currentLocale);
      
      console.log(`I18nManager initialized for tenant: ${this.tenantId}, locale: ${this.currentLocale}`);
    } catch (error) {
      console.error('Failed to initialize I18nManager:', error);
      throw new Error(`I18nManager initialization failed: ${error.message}`);
    }
  }

  /**
   * Load locale-specific translations and formats
   */
  async loadLocale(locale, options = {}) {
    try {
      const {
        validate = this.options.enableValidation,
        cache = this.options.enableCaching,
        forceReload = false
      } = options;

      // Check cache first
      if (cache && !forceReload) {
        const cachedData = await this.cache.getLocale(locale);
        if (cachedData) {
          this.currentLocale = locale;
          this.currentMessages = cachedData.messages;
          this.currentFormats = cachedData.formats;
          this.updateRTLSupport(locale);
          return;
        }
      }

      // Load from source
      const localeData = await this.loader.loadLocale(locale);
      
      // Validate translations
      if (validate) {
        const validation = await this.validator.validateLocale(localeData);
        if (!validation.isValid) {
          console.warn(`Locale validation warnings for ${locale}:`, validation.warnings);
          if (validation.errors.length > 0) {
            throw new Error(`Locale validation failed: ${validation.errors.join(', ')}`);
          }
        }
      }

      // Cache the data
      if (cache) {
        await this.cache.setLocale(locale, localeData);
      }

      // Update current locale data
      this.currentLocale = locale;
      this.currentMessages = localeData.messages;
      this.currentFormats = localeData.formats;
      
      // Update RTL support
      this.updateRTLSupport(locale);
      
      // Initialize format manager
      this.formatManager.setFormats(this.currentFormats);
      
      return localeData;
    } catch (error) {
      console.error(`Failed to load locale ${locale}:`, error);
      
      // Fallback to default locale if not already
      if (locale !== this.options.fallbackLocale) {
        console.log(`Falling back to ${this.options.fallbackLocale}`);
        return await this.loadLocale(this.options.fallbackLocale, options);
      }
      
      throw new Error(`Locale loading failed: ${error.message}`);
    }
  }

  /**
   * Get translated message with ICU MessageFormat support
   */
  t(messageId, values = {}, options = {}) {
    try {
      const {
        defaultMessage = '',
        description = '',
        locale = this.currentLocale,
        escapeValue = true
      } = options;

      // Get message from current locale or fallback
      let message = this.currentMessages[messageId];
      if (!message && locale !== this.options.fallbackLocale) {
        // Try fallback locale
        const fallbackMessages = this.cache.getCachedMessages(this.options.fallbackLocale);
        message = fallbackMessages?.[messageId];
      }
      
      // Use default message if not found
      if (!message) {
        message = defaultMessage;
        console.warn(`Translation missing for key: ${messageId}`);
      }

      // Parse ICU MessageFormat if enabled
      if (this.options.enableICU && this.isICUFormat(message)) {
        return this.formatICU(message, values, locale);
      }

      // Simple string interpolation
      return this.interpolateString(message, values, escapeValue);
    } catch (error) {
      console.error(`Translation error for ${messageId}:`, error);
      return defaultMessage || messageId;
    }
  }

  /**
   * Format ICU MessageFormat string
   */
  formatICU(message, values, locale) {
    try {
      const cacheKey = `${message}_${locale}_${JSON.stringify(values)}`;
      
      if (this.messageCache.has(cacheKey)) {
        return this.messageCache.get(cacheKey);
      }

      const parser = new ICU.MessageFormat(message, locale);
      const formatted = parser.format(values);
      
      // Cache the result
      this.messageCache.set(cacheKey, formatted);
      
      return formatted;
    } catch (error) {
      console.error('ICU formatting error:', error);
      return message;
    }
  }

  /**
   * Check if message is ICU format
   */
  isICUFormat(message) {
    return typeof message === 'string' && (
      message.includes('{') || 
      message.includes('{') ||
      message.includes('select') ||
      message.includes('plural')
    );
  }

  /**
   * Simple string interpolation
   */
  interpolateString(message, values, escapeValue) {
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      const value = values[key];
      if (value === undefined || value === null) {
        return match;
      }
      
      return escapeValue ? this.escapeHtml(String(value)) : String(value);
    });
  }

  /**
   * Escape HTML characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format date according to locale
   */
  formatDate(date, options = {}) {
    try {
      const {
        format = 'short',
        timeZone = 'UTC',
        locale = this.currentLocale
      } = options;

      return this.formatManager.formatDate(date, {
        locale,
        format,
        timeZone
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return date.toString();
    }
  }

  /**
   * Format number according to locale
   */
  formatNumber(number, options = {}) {
    try {
      const {
        format = 'decimal',
        locale = this.currentLocale,
        currency = null,
        minimumFractionDigits = null,
        maximumFractionDigits = null
      } = options;

      return this.formatManager.formatNumber(number, {
        locale,
        format,
        currency,
        minimumFractionDigits,
        maximumFractionDigits
      });
    } catch (error) {
      console.error('Number formatting error:', error);
      return number.toString();
    }
  }

  /**
   * Format currency according to locale
   */
  formatCurrency(amount, options = {}) {
    try {
      const {
        currency = 'USD',
        locale = this.currentLocale,
        format = 'currency'
      } = options;

      return this.formatManager.formatCurrency(amount, {
        locale,
        currency,
        format
      });
    } catch (error) {
      console.error('Currency formatting error:', error);
      return amount.toString();
    }
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  formatRelativeTime(value, unit, options = {}) {
    try {
      const {
        locale = this.currentLocale,
        numeric = 'auto'
      } = options;

      return this.formatManager.formatRelativeTime(value, unit, {
        locale,
        numeric
      });
    } catch (error) {
      console.error('Relative time formatting error:', error);
      return value.toString();
    }
  }

  /**
   * Get list of available locales
   */
  async getAvailableLocales() {
    try {
      return await this.loader.getAvailableLocales();
    } catch (error) {
      console.error('Failed to get available locales:', error);
      return this.options.supportedLocales;
    }
  }

  /**
   * Check if locale is RTL
   */
  isRTL(locale = this.currentLocale) {
    return this.options.rtlLocales.includes(locale);
  }

  /**
   * Update RTL support for current locale
   */
  updateRTLSupport(locale) {
    if (this.options.enableRTL) {
      this.rtlManager.setLocale(locale);
      this.rtlManager.applyRTLStyles();
    }
  }

  /**
   * Switch to different locale
   */
  async switchLocale(locale, options = {}) {
    try {
      if (!this.options.supportedLocales.includes(locale)) {
        throw new Error(`Unsupported locale: ${locale}`);
      }

      await this.loadLocale(locale, options);
      
      // Update document direction for RTL
      if (this.options.enableRTL) {
        document.documentElement.dir = this.isRTL(locale) ? 'rtl' : 'ltr';
        document.documentElement.lang = locale;
      }

      // Clear message cache for new locale
      this.messageCache.clear();
      
      return true;
    } catch (error) {
      console.error(`Failed to switch to locale ${locale}:`, error);
      throw new Error(`Locale switching failed: ${error.message}`);
    }
  }

  /**
   * Add custom translations
   */
  async addTranslations(locale, translations, options = {}) {
    try {
      const {
        merge = true,
        validate = this.options.enableValidation
      } = options;

      // Validate translations
      if (validate) {
        const validation = await this.validator.validateTranslations(translations);
        if (!validation.isValid) {
          throw new Error(`Translation validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Merge or replace translations
      if (merge) {
        this.currentMessages = {
          ...this.currentMessages,
          ...translations
        };
      } else {
        this.currentMessages = translations;
      }

      // Update cache
      if (this.options.enableCaching) {
        await this.cache.updateLocale(locale, { messages: this.currentMessages });
      }

      return true;
    } catch (error) {
      console.error('Failed to add translations:', error);
      throw new Error(`Translation addition failed: ${error.message}`);
    }
  }

  /**
   * Remove translations
   */
  async removeTranslations(messageIds, options = {}) {
    try {
      const { locale = this.currentLocale } = options;

      messageIds.forEach(id => {
        delete this.currentMessages[id];
      });

      // Update cache
      if (this.options.enableCaching) {
        await this.cache.updateLocale(locale, { messages: this.currentMessages });
      }

      return true;
    } catch (error) {
      console.error('Failed to remove translations:', error);
      throw new Error(`Translation removal failed: ${error.message}`);
    }
  }

  /**
   * Get missing translations for a locale
   */
  async getMissingTranslations(locale, referenceLocale = this.options.defaultLocale) {
    try {
      const referenceMessages = await this.loader.loadLocale(referenceLocale);
      const currentMessages = await this.loader.loadLocale(locale);
      
      const missing = [];
      
      Object.keys(referenceMessages.messages).forEach(key => {
        if (!currentMessages.messages[key]) {
          missing.push({
            key,
            referenceMessage: referenceMessages.messages[key]
          });
        }
      });

      return missing;
    } catch (error) {
      console.error('Failed to get missing translations:', error);
      throw new Error(`Missing translation detection failed: ${error.message}`);
    }
  }

  /**
   * Export translations for a locale
   */
  async exportTranslations(locale, options = {}) {
    try {
      const {
        format = 'json',
        includeFormats = true,
        includeMetadata = true
      } = options;

      const localeData = {
        locale,
        messages: this.currentMessages,
        ...(includeFormats && { formats: this.currentFormats }),
        ...(includeMetadata && {
          metadata: {
            exportedAt: new Date().toISOString(),
            tenantId: this.tenantId,
            version: '1.0'
          }
        })
      };

      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(localeData, null, 2);
        case 'yaml':
          return this.convertToYAML(localeData);
        case 'po':
          return this.convertToPO(localeData);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Failed to export translations:', error);
      throw new Error(`Translation export failed: ${error.message}`);
    }
  }

  /**
   * Import translations from file
   */
  async importTranslations(fileContent, options = {}) {
    try {
      const {
        format = 'json',
        locale = this.currentLocale,
        merge = true,
        validate = this.options.enableValidation
      } = options;

      let localeData;
      
      switch (format.toLowerCase()) {
        case 'json':
          localeData = JSON.parse(fileContent);
          break;
        case 'yaml':
          localeData = this.parseYAML(fileContent);
          break;
        case 'po':
          localeData = this.parsePO(fileContent);
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Validate imported data
      if (validate) {
        const validation = await this.validator.validateLocale(localeData);
        if (!validation.isValid) {
          throw new Error(`Import validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Add translations
      await this.addTranslations(locale, localeData.messages, { merge, validate: false });
      
      // Update formats if provided
      if (localeData.formats) {
        this.currentFormats = {
          ...this.currentFormats,
          ...localeData.formats
        };
        this.formatManager.setFormats(this.currentFormats);
      }

      return true;
    } catch (error) {
      console.error('Failed to import translations:', error);
      throw new Error(`Translation import failed: ${error.message}`);
    }
  }

  /**
   * Get current locale information
   */
  getCurrentLocale() {
    return {
      locale: this.currentLocale,
      isRTL: this.isRTL(),
      messagesCount: Object.keys(this.currentMessages).length,
      formatsCount: Object.keys(this.currentFormats).length
    };
  }

  /**
   * Clear translation cache
   */
  async clearCache() {
    if (this.options.enableCaching) {
      await this.cache.clear();
    }
    this.messageCache.clear();
  }

  /**
   * Get translation statistics
   */
  async getStats() {
    const stats = {
      currentLocale: this.currentLocale,
      supportedLocales: this.options.supportedLocales.length,
      rtlLocales: this.options.rtlLocales.length,
      messagesCount: Object.keys(this.currentMessages).length,
      formatsCount: Object.keys(this.currentFormats).length,
      cacheSize: 0,
      lastUpdated: new Date().toISOString()
    };

    if (this.options.enableCaching) {
      stats.cacheSize = await this.cache.getCacheSize();
    }

    return stats;
  }

  /**
   * Convert to YAML format
   */
  convertToYAML(data) {
    // Simple YAML conversion (in production, use a proper YAML library)
    return JSON.stringify(data, null, 2).replace(/"/g, '').replace(/: /g, ': ');
  }

  /**
   * Parse YAML format
   */
  parseYAML(content) {
    // Simple YAML parsing (in production, use a proper YAML library)
    return JSON.parse(content);
  }

  /**
   * Convert to PO format
   */
  convertToPO(data) {
    let poContent = `# Language: ${data.locale}\n`;
    poContent += `# Content-Type: text/plain; charset=UTF-8\n\n`;
    
    Object.keys(data.messages).forEach(key => {
      poContent += `msgid "${key}"\n`;
      poContent += `msgstr "${data.messages[key]}"\n\n`;
    });
    
    return poContent;
  }

  /**
   * Parse PO format
   */
  parsePO(content) {
    const messages = {};
    const lines = content.split('\n');
    let currentKey = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('msgid ')) {
        currentKey = line.substring(7, line.length - 1);
      } else if (line.startsWith('msgstr ') && currentKey) {
        const value = line.substring(8, line.length - 1);
        messages[currentKey] = value;
        currentKey = null;
      }
    }
    
    return { messages };
  }
}

export default I18nManager;
