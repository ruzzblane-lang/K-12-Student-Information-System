/**
 * Translation API for White-Label Development
 * 
 * Provides comprehensive API layer for translation management,
 * allowing white-label developers to register languages, update
 * translation keys, and override defaults without altering core code.
 */

import { TranslationValidator } from '../validators/TranslationValidator';
import { TranslationCache } from '../cache/TranslationCache';
import { TranslationLoader } from '../loaders/TranslationLoader';
import { FormatManager } from '../formatters/FormatManager';

export class TranslationAPI {
  constructor(tenantId, options = {}) {
    this.tenantId = tenantId;
    this.options = {
      enableValidation: true,
      enableCaching: true,
      enableOverrides: true,
      enableFallbacks: true,
      cacheExpiry: 3600000, // 1 hour
      supportedFormats: ['json', 'yaml', 'po', 'xlf'],
      ...options
    };
    
    this.validator = new TranslationValidator();
    this.cache = new TranslationCache(tenantId, this.options);
    this.loader = new TranslationLoader(tenantId, this.options);
    this.formatManager = new FormatManager();
    this.translationOverrides = new Map();
    this.registeredLanguages = new Set();
    
    this.initializeTranslationAPI();
  }

  async initializeTranslationAPI() {
    try {
      // Initialize cache
      if (this.options.enableCaching) {
        await this.cache.initialize();
      }

      // Load existing language registrations
      await this.loadRegisteredLanguages();
      
      console.log(`TranslationAPI initialized for tenant: ${this.tenantId}`);
    } catch (error) {
      console.error('Failed to initialize TranslationAPI:', error);
      throw new Error(`TranslationAPI initialization failed: ${error.message}`);
    }
  }

  /**
   * Register a new language for the tenant
   */
  async registerLanguage(languageConfig, options = {}) {
    try {
      const {
        validate = this.options.enableValidation,
        createDefaults = true,
        overwrite = false
      } = options;

      // Validate language configuration
      if (validate) {
        const validation = await this.validator.validateLocale(languageConfig);
        if (!validation.isValid) {
          throw new Error(`Language registration validation failed: ${validation.errors.join(', ')}`);
        }
      }

      const { locale, name, nativeName, direction = 'ltr' } = languageConfig;

      // Check if language already exists
      if (this.registeredLanguages.has(locale) && !overwrite) {
        throw new Error(`Language ${locale} is already registered`);
      }

      // Register the language
      this.registeredLanguages.add(locale);
      
      // Store language metadata
      const languageMetadata = {
        locale,
        name,
        nativeName,
        direction,
        registeredAt: new Date().toISOString(),
        tenantId: this.tenantId,
        status: 'registered'
      };

      // Create default translations if requested
      if (createDefaults) {
        const defaultTranslations = await this.generateDefaultTranslations(locale);
        languageMetadata.messages = defaultTranslations;
      }

      // Save to storage
      await this.saveLanguageMetadata(languageMetadata);

      // Cache the language
      if (this.options.enableCaching) {
        await this.cache.setLanguageMetadata(locale, languageMetadata);
      }

      return {
        success: true,
        locale,
        message: `Language ${locale} registered successfully`,
        metadata: languageMetadata
      };
    } catch (error) {
      console.error('Failed to register language:', error);
      throw new Error(`Language registration failed: ${error.message}`);
    }
  }

  /**
   * Update translation keys for a language
   */
  async updateTranslationKeys(locale, translations, options = {}) {
    try {
      const {
        validate = this.options.enableValidation,
        merge = true,
        createMissing = false
      } = options;

      // Validate language is registered
      if (!this.registeredLanguages.has(locale)) {
        if (createMissing) {
          await this.registerLanguage({
            locale,
            name: locale,
            nativeName: locale
          }, { validate: false });
        } else {
          throw new Error(`Language ${locale} is not registered`);
        }
      }

      // Validate translations
      if (validate) {
        const validation = await this.validator.validateTranslations(translations);
        if (!validation.isValid) {
          throw new Error(`Translation validation failed: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
          console.warn(`Translation warnings for ${locale}:`, validation.warnings);
        }
      }

      // Get existing translations
      let existingTranslations = {};
      if (merge) {
        existingTranslations = await this.getTranslations(locale);
      }

      // Merge translations
      const updatedTranslations = {
        ...existingTranslations,
        ...translations
      };

      // Store updated translations
      await this.saveTranslations(locale, updatedTranslations);

      // Update cache
      if (this.options.enableCaching) {
        await this.cache.setTranslations(locale, updatedTranslations);
      }

      // Log the update
      await this.logTranslationUpdate(locale, Object.keys(translations), 'update');

      return {
        success: true,
        locale,
        updatedKeys: Object.keys(translations),
        totalKeys: Object.keys(updatedTranslations).length,
        message: `Updated ${Object.keys(translations).length} translation keys for ${locale}`
      };
    } catch (error) {
      console.error('Failed to update translation keys:', error);
      throw new Error(`Translation key update failed: ${error.message}`);
    }
  }

  /**
   * Add translation key overrides
   */
  async addTranslationOverrides(locale, overrides, options = {}) {
    try {
      const {
        validate = this.options.enableValidation,
        priority = 'high'
      } = options;

      if (!this.options.enableOverrides) {
        throw new Error('Translation overrides are disabled');
      }

      // Validate overrides
      if (validate) {
        const validation = await this.validator.validateTranslations(overrides);
        if (!validation.isValid) {
          throw new Error(`Override validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Store overrides
      const overrideKey = `${locale}_${priority}`;
      this.translationOverrides.set(overrideKey, {
        locale,
        overrides,
        priority,
        createdAt: new Date().toISOString(),
        tenantId: this.tenantId
      });

      // Save overrides to storage
      await this.saveTranslationOverrides(overrideKey, this.translationOverrides.get(overrideKey));

      return {
        success: true,
        locale,
        overrideCount: Object.keys(overrides).length,
        priority,
        message: `Added ${Object.keys(overrides).length} translation overrides for ${locale}`
      };
    } catch (error) {
      console.error('Failed to add translation overrides:', error);
      throw new Error(`Translation override addition failed: ${error.message}`);
    }
  }

  /**
   * Remove translation overrides
   */
  async removeTranslationOverrides(locale, overrideKeys = null, options = {}) {
    try {
      const { priority = 'all' } = options;

      if (!this.options.enableOverrides) {
        throw new Error('Translation overrides are disabled');
      }

      let removedCount = 0;

      if (overrideKeys && Array.isArray(overrideKeys)) {
        // Remove specific keys
        for (const key of overrideKeys) {
          const overrideKey = `${locale}_${priority}`;
          const override = this.translationOverrides.get(overrideKey);
          if (override && override.overrides[key]) {
            delete override.overrides[key];
            removedCount++;
          }
        }
      } else {
        // Remove all overrides for locale
        const keysToRemove = [];
        this.translationOverrides.forEach((override, key) => {
          if (override.locale === locale && (priority === 'all' || override.priority === priority)) {
            keysToRemove.push(key);
          }
        });
        
        keysToRemove.forEach(key => {
          this.translationOverrides.delete(key);
          removedCount++;
        });
      }

      return {
        success: true,
        locale,
        removedCount,
        message: `Removed ${removedCount} translation overrides for ${locale}`
      };
    } catch (error) {
      console.error('Failed to remove translation overrides:', error);
      throw new Error(`Translation override removal failed: ${error.message}`);
    }
  }

  /**
   * Get translations for a language with overrides applied
   */
  async getTranslations(locale, options = {}) {
    try {
      const {
        includeOverrides = true,
        includeFallbacks = this.options.enableFallbacks,
        cache = this.options.enableCaching
      } = options;

      let translations = {};

      // Try cache first
      if (cache) {
        const cachedTranslations = await this.cache.getTranslations(locale);
        if (cachedTranslations) {
          translations = cachedTranslations;
        }
      }

      // Load from storage if not cached
      if (Object.keys(translations).length === 0) {
        translations = await this.loader.loadTranslations(locale);
      }

      // Apply overrides if enabled
      if (includeOverrides && this.options.enableOverrides) {
        translations = this.applyTranslationOverrides(locale, translations);
      }

      // Apply fallbacks if enabled
      if (includeFallbacks && this.options.enableFallbacks) {
        translations = await this.applyTranslationFallbacks(locale, translations);
      }

      return translations;
    } catch (error) {
      console.error(`Failed to get translations for ${locale}:`, error);
      throw new Error(`Translation retrieval failed: ${error.message}`);
    }
  }

  /**
   * Upload translation file
   */
  async uploadTranslationFile(locale, fileContent, format, options = {}) {
    try {
      const {
        validate = this.options.enableValidation,
        merge = true,
        overwriteExisting = false
      } = options;

      // Validate format
      if (!this.options.supportedFormats.includes(format.toLowerCase())) {
        throw new Error(`Unsupported format: ${format}. Supported formats: ${this.options.supportedFormats.join(', ')}`);
      }

      // Parse file content
      const parsedTranslations = await this.parseTranslationFile(fileContent, format);

      // Validate parsed translations
      if (validate) {
        const validation = await this.validator.validateTranslations(parsedTranslations);
        if (!validation.isValid) {
          throw new Error(`Upload validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Get existing translations
      let existingTranslations = {};
      if (merge) {
        try {
          existingTranslations = await this.getTranslations(locale, { includeOverrides: false });
        } catch (error) {
          // Language doesn't exist yet, will be created
        }
      }

      // Merge or replace translations
      const finalTranslations = merge 
        ? { ...existingTranslations, ...parsedTranslations }
        : parsedTranslations;

      // Save translations
      await this.saveTranslations(locale, finalTranslations);

      // Update cache
      if (this.options.enableCaching) {
        await this.cache.setTranslations(locale, finalTranslations);
      }

      // Log the upload
      await this.logTranslationUpdate(locale, Object.keys(parsedTranslations), 'upload');

      return {
        success: true,
        locale,
        uploadedKeys: Object.keys(parsedTranslations),
        totalKeys: Object.keys(finalTranslations).length,
        format,
        message: `Successfully uploaded ${Object.keys(parsedTranslations).length} translations for ${locale}`
      };
    } catch (error) {
      console.error('Failed to upload translation file:', error);
      throw new Error(`Translation file upload failed: ${error.message}`);
    }
  }

  /**
   * Download translation file
   */
  async downloadTranslationFile(locale, format, options = {}) {
    try {
      const {
        includeMetadata = true,
        includeOverrides = true
      } = options;

      // Get translations
      const translations = await this.getTranslations(locale, { includeOverrides });

      // Add metadata if requested
      const exportData = {
        messages: translations,
        ...(includeMetadata && {
          metadata: {
            locale,
            tenantId: this.tenantId,
            exportedAt: new Date().toISOString(),
            format,
            version: '1.0'
          }
        })
      };

      // Generate file content
      const fileContent = await this.generateTranslationFile(exportData, format);

      return {
        success: true,
        locale,
        format,
        content: fileContent,
        size: fileContent.length,
        keyCount: Object.keys(translations).length,
        message: `Generated ${format.toUpperCase()} file for ${locale}`
      };
    } catch (error) {
      console.error('Failed to download translation file:', error);
      throw new Error(`Translation file download failed: ${error.message}`);
    }
  }

  /**
   * Get missing translations
   */
  async getMissingTranslations(locale, referenceLocale = 'en-US') {
    try {
      const referenceTranslations = await this.getTranslations(referenceLocale, { includeOverrides: false });
      const currentTranslations = await this.getTranslations(locale, { includeOverrides: false });

      const missing = [];
      Object.keys(referenceTranslations).forEach(key => {
        if (!currentTranslations[key]) {
          missing.push({
            key,
            referenceMessage: referenceTranslations[key],
            suggestedTranslation: await this.generateSuggestedTranslation(key, referenceTranslations[key], locale)
          });
        }
      });

      return {
        success: true,
        locale,
        referenceLocale,
        missingCount: missing.length,
        missingTranslations: missing,
        message: `Found ${missing.length} missing translations for ${locale}`
      };
    } catch (error) {
      console.error('Failed to get missing translations:', error);
      throw new Error(`Missing translation detection failed: ${error.message}`);
    }
  }

  /**
   * Get translation statistics
   */
  async getTranslationStats(locale = null) {
    try {
      const stats = {
        tenantId: this.tenantId,
        registeredLanguages: this.registeredLanguages.size,
        totalOverrides: this.translationOverrides.size,
        generatedAt: new Date().toISOString()
      };

      if (locale) {
        // Single locale stats
        const translations = await this.getTranslations(locale);
        stats.locale = {
          [locale]: {
            totalKeys: Object.keys(translations).length,
            emptyKeys: Object.values(translations).filter(v => !v || v.trim().length === 0).length,
            icuKeys: Object.values(translations).filter(v => this.containsICUFormat(v)).length,
            overrideCount: this.getOverrideCount(locale)
          }
        };
      } else {
        // All locales stats
        stats.locales = {};
        for (const lang of this.registeredLanguages) {
          try {
            const translations = await this.getTranslations(lang);
            stats.locales[lang] = {
              totalKeys: Object.keys(translations).length,
              emptyKeys: Object.values(translations).filter(v => !v || v.trim().length === 0).length,
              icuKeys: Object.values(translations).filter(v => this.containsICUFormat(v)).length,
              overrideCount: this.getOverrideCount(lang)
            };
          } catch (error) {
            stats.locales[lang] = { error: error.message };
          }
        }
      }

      return stats;
    } catch (error) {
      console.error('Failed to get translation stats:', error);
      throw new Error(`Translation stats retrieval failed: ${error.message}`);
    }
  }

  /**
   * Apply translation overrides
   */
  applyTranslationOverrides(locale, translations) {
    const overriddenTranslations = { ...translations };

    // Apply overrides in priority order
    const priorities = ['high', 'medium', 'low'];
    
    priorities.forEach(priority => {
      const overrideKey = `${locale}_${priority}`;
      const override = this.translationOverrides.get(overrideKey);
      
      if (override && override.overrides) {
        Object.assign(overriddenTranslations, override.overrides);
      }
    });

    return overriddenTranslations;
  }

  /**
   * Apply translation fallbacks
   */
  async applyTranslationFallbacks(locale, translations) {
    const fallbackChain = this.getFallbackChain(locale);
    const finalTranslations = { ...translations };

    for (const fallbackLocale of fallbackChain) {
      if (fallbackLocale !== locale) {
        try {
          const fallbackTranslations = await this.getTranslations(fallbackLocale, { includeOverrides: false });
          
          // Add missing translations from fallback
          Object.keys(fallbackTranslations).forEach(key => {
            if (!finalTranslations[key]) {
              finalTranslations[key] = fallbackTranslations[key];
            }
          });
        } catch (error) {
          // Fallback locale not available, continue
        }
      }
    }

    return finalTranslations;
  }

  /**
   * Get fallback chain for locale
   */
  getFallbackChain(locale) {
    const chain = [locale];
    
    // Add language fallback (e.g., en-US -> en)
    const language = locale.split('-')[0];
    if (language !== locale) {
      chain.push(language);
    }
    
    // Add default fallback
    if (locale !== 'en') {
      chain.push('en');
    }
    
    return chain;
  }

  /**
   * Generate default translations for new language
   */
  async generateDefaultTranslations(locale) {
    const defaultKeys = [
      'common.save',
      'common.cancel',
      'common.delete',
      'common.edit',
      'common.close',
      'common.submit',
      'common.loading',
      'common.error',
      'common.success',
      'common.confirm',
      'navigation.home',
      'navigation.back',
      'navigation.next',
      'navigation.previous',
      'forms.required',
      'forms.invalid',
      'forms.submit',
      'forms.reset'
    ];

    const defaultTranslations = {};
    defaultKeys.forEach(key => {
      defaultTranslations[key] = key; // Use key as default value
    });

    return defaultTranslations;
  }

  /**
   * Parse translation file based on format
   */
  async parseTranslationFile(content, format) {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.parse(content);
      case 'yaml':
        return this.parseYAML(content);
      case 'po':
        return this.parsePO(content);
      case 'xlf':
        return this.parseXLF(content);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate translation file based on format
   */
  async generateTranslationFile(data, format) {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'yaml':
        return this.generateYAML(data);
      case 'po':
        return this.generatePO(data);
      case 'xlf':
        return this.generateXLF(data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Check if translation contains ICU format
   */
  containsICUFormat(translation) {
    return /\{[^}]+\}/.test(translation);
  }

  /**
   * Get override count for locale
   */
  getOverrideCount(locale) {
    let count = 0;
    this.translationOverrides.forEach(override => {
      if (override.locale === locale) {
        count += Object.keys(override.overrides).length;
      }
    });
    return count;
  }

  /**
   * Generate suggested translation using AI or translation service
   */
  async generateSuggestedTranslation(key, referenceMessage, targetLocale) {
    // This would integrate with translation services like Google Translate, Azure Translator, etc.
    // For now, return the reference message as a placeholder
    return referenceMessage;
  }

  /**
   * Load registered languages from storage
   */
  async loadRegisteredLanguages() {
    try {
      const languages = await this.loader.getRegisteredLanguages();
      languages.forEach(lang => this.registeredLanguages.add(lang.locale));
    } catch (error) {
      console.warn('Failed to load registered languages:', error);
    }
  }

  /**
   * Save language metadata
   */
  async saveLanguageMetadata(metadata) {
    // Implementation would save to database or file system
    console.log('Saving language metadata:', metadata);
  }

  /**
   * Save translations
   */
  async saveTranslations(locale, translations) {
    // Implementation would save to database or file system
    console.log(`Saving translations for ${locale}:`, Object.keys(translations).length, 'keys');
  }

  /**
   * Save translation overrides
   */
  async saveTranslationOverrides(key, override) {
    // Implementation would save to database or file system
    console.log('Saving translation override:', key);
  }

  /**
   * Log translation update
   */
  async logTranslationUpdate(locale, keys, action) {
    // Implementation would log to audit system
    console.log(`Translation ${action} for ${locale}:`, keys.length, 'keys');
  }

  // Format-specific parsing methods
  parseYAML(content) {
    // Simple YAML parsing (in production, use a proper YAML library)
    return JSON.parse(content);
  }

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
    
    return messages;
  }

  parseXLF(content) {
    // XLF parsing implementation
    const messages = {};
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    
    const transUnits = doc.querySelectorAll('trans-unit');
    transUnits.forEach(unit => {
      const id = unit.getAttribute('id');
      const target = unit.querySelector('target');
      if (id && target) {
        messages[id] = target.textContent;
      }
    });
    
    return messages;
  }

  // Format-specific generation methods
  generateYAML(data) {
    // Simple YAML generation (in production, use a proper YAML library)
    return JSON.stringify(data, null, 2);
  }

  generatePO(data) {
    let poContent = `# Language: ${data.metadata?.locale || 'unknown'}\n`;
    poContent += `# Content-Type: text/plain; charset=UTF-8\n\n`;
    
    Object.keys(data.messages).forEach(key => {
      poContent += `msgid "${key}"\n`;
      poContent += `msgstr "${data.messages[key]}"\n\n`;
    });
    
    return poContent;
  }

  generateXLF(data) {
    // XLF generation implementation
    let xlfContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xlfContent += `<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n`;
    xlfContent += `  <file source-language="en" target-language="${data.metadata?.locale || 'unknown'}" datatype="plaintext">\n`;
    xlfContent += `    <body>\n`;
    
    Object.keys(data.messages).forEach(key => {
      xlfContent += `      <trans-unit id="${key}">\n`;
      xlfContent += `        <target>${data.messages[key]}</target>\n`;
      xlfContent += `      </trans-unit>\n`;
    });
    
    xlfContent += `    </body>\n`;
    xlfContent += `  </file>\n`;
    xlfContent += `</xliff>`;
    
    return xlfContent;
  }
}

export default TranslationAPI;
