/**
 * Translation Validator for White-Label Development
 * 
 * Provides comprehensive validation for translation files,
 * ICU MessageFormat syntax, and localization quality.
 */

export class TranslationValidator {
  constructor() {
    this.validationRules = {
      json: this.validateJSONFormat,
      yaml: this.validateYAMLFormat,
      po: this.validatePOFormat,
      icu: this.validateICUFormat
    };
    
    this.icuPatterns = {
      simple: /\{[^}]+\}/g,
      plural: /\{([^,}]+),\s*plural[^}]*\}/g,
      select: /\{([^,}]+),\s*select[^}]*\}/g,
      selectOrdinal: /\{([^,}]+),\s*selectordinal[^}]*\}/g
    };
  }

  /**
   * Validate complete locale data
   */
  async validateLocale(localeData) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Basic structure validation
      this.validateBasicStructure(localeData, validation);

      // Validate messages
      if (localeData.messages) {
        await this.validateMessages(localeData.messages, validation);
      }

      // Validate formats
      if (localeData.formats) {
        this.validateFormats(localeData.formats, validation);
      }

      // Validate metadata
      if (localeData.metadata) {
        this.validateMetadata(localeData.metadata, validation);
      }

      // Validate locale-specific rules
      if (localeData.locale) {
        this.validateLocaleSpecific(localeData.locale, validation);
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate translations object
   */
  async validateTranslations(translations) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      if (!translations || typeof translations !== 'object') {
        validation.errors.push('Translations must be an object');
        validation.isValid = false;
        return validation;
      }

      // Validate each translation
      for (const [key, value] of Object.entries(translations)) {
        await this.validateTranslation(key, value, validation);
      }

      // Check for common issues
      this.checkCommonIssues(translations, validation);

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Translation validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate basic locale data structure
   */
  validateBasicStructure(localeData, validation) {
    if (!localeData || typeof localeData !== 'object') {
      validation.errors.push('Locale data must be an object');
      validation.isValid = false;
      return;
    }

    // Check for required fields
    if (!localeData.messages && !localeData.formats) {
      validation.errors.push('Locale data must contain either messages or formats');
      validation.isValid = false;
    }

    // Validate locale field if present
    if (localeData.locale && typeof localeData.locale !== 'string') {
      validation.errors.push('Locale field must be a string');
      validation.isValid = false;
    }
  }

  /**
   * Validate individual translation
   */
  async validateTranslation(key, value, validation) {
    // Validate key format
    if (!this.isValidTranslationKey(key)) {
      validation.errors.push(`Invalid translation key format: ${key}`);
      validation.isValid = false;
    }

    // Validate value
    if (typeof value !== 'string') {
      validation.errors.push(`Translation value for "${key}" must be a string`);
      validation.isValid = false;
      return;
    }

    // Check for empty values
    if (value.trim().length === 0) {
      validation.warnings.push(`Empty translation for key: ${key}`);
    }

    // Validate ICU MessageFormat syntax
    if (this.containsICUFormat(value)) {
      const icuValidation = this.validateICUFormat(value);
      if (!icuValidation.isValid) {
        validation.errors.push(`ICU format error in "${key}": ${icuValidation.errors.join(', ')}`);
        validation.isValid = false;
      }
    }

    // Check for placeholder consistency
    this.validatePlaceholders(key, value, validation);

    // Check for length appropriateness
    this.validateTranslationLength(key, value, validation);
  }

  /**
   * Validate ICU MessageFormat syntax
   */
  validateICUFormat(message) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check for balanced braces
      if (!this.hasBalancedBraces(message)) {
        validation.errors.push('Unbalanced braces in ICU format');
        validation.isValid = false;
      }

      // Check for valid variable names
      const variables = this.extractVariables(message);
      variables.forEach(variable => {
        if (!this.isValidVariableName(variable)) {
          validation.errors.push(`Invalid variable name: ${variable}`);
          validation.isValid = false;
        }
      });

      // Validate plural forms
      const pluralMatches = message.match(this.icuPatterns.plural);
      if (pluralMatches) {
        pluralMatches.forEach(match => {
          const pluralValidation = this.validatePluralFormat(match);
          if (!pluralValidation.isValid) {
            validation.errors.push(...pluralValidation.errors);
            validation.isValid = false;
          }
        });
      }

      // Validate select forms
      const selectMatches = message.match(this.icuPatterns.select);
      if (selectMatches) {
        selectMatches.forEach(match => {
          const selectValidation = this.validateSelectFormat(match);
          if (!selectValidation.isValid) {
            validation.errors.push(...selectValidation.errors);
            validation.isValid = false;
          }
        });
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`ICU validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate plural format
   */
  validatePluralFormat(pluralString) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Extract the plural format content
      const match = pluralString.match(/\{([^,}]+),\s*plural[^}]*\}/);
      if (!match) {
        validation.errors.push('Invalid plural format structure');
        validation.isValid = false;
        return validation;
      }

      const content = match[1];
      
      // Check for required plural forms
      const requiredForms = ['zero', 'one', 'other'];
      const hasRequiredForms = requiredForms.some(form => content.includes(form));
      
      if (!hasRequiredForms) {
        validation.warnings.push('Plural format should include at least one of: zero, one, other');
      }

      // Validate plural syntax
      if (!content.includes('{') || !content.includes('}')) {
        validation.errors.push('Plural format must contain valid syntax');
        validation.isValid = false;
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Plural validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate select format
   */
  validateSelectFormat(selectString) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Extract the select format content
      const match = selectString.match(/\{([^,}]+),\s*select[^}]*\}/);
      if (!match) {
        validation.errors.push('Invalid select format structure');
        validation.isValid = false;
        return validation;
      }

      const content = match[1];
      
      // Check for select options
      if (!content.includes('{') || !content.includes('}')) {
        validation.errors.push('Select format must contain valid syntax');
        validation.isValid = false;
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Select validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate formats configuration
   */
  validateFormats(formats, validation) {
    if (!formats || typeof formats !== 'object') {
      validation.errors.push('Formats must be an object');
      validation.isValid = false;
      return;
    }

    // Validate date formats
    if (formats.date) {
      this.validateDateFormats(formats.date, validation);
    }

    // Validate number formats
    if (formats.number) {
      this.validateNumberFormats(formats.number, validation);
    }

    // Validate relative time formats
    if (formats.relativeTime) {
      this.validateRelativeTimeFormats(formats.relativeTime, validation);
    }
  }

  /**
   * Validate date formats
   */
  validateDateFormats(dateFormats, validation) {
    const validFormats = ['short', 'medium', 'long', 'full'];
    const validTimeFormats = ['short', 'medium', 'long', 'full'];
    
    Object.keys(dateFormats).forEach(key => {
      const format = dateFormats[key];
      
      if (typeof format === 'object') {
        // Validate format object
        if (format.date && !validFormats.includes(format.date)) {
          validation.warnings.push(`Invalid date format: ${format.date}`);
        }
        
        if (format.time && !validTimeFormats.includes(format.time)) {
          validation.warnings.push(`Invalid time format: ${format.time}`);
        }
      } else if (typeof format === 'string') {
        // Validate format string
        if (!this.isValidDateFormat(format)) {
          validation.warnings.push(`Invalid date format string: ${format}`);
        }
      }
    });
  }

  /**
   * Validate number formats
   */
  validateNumberFormats(numberFormats, validation) {
    const validFormats = ['decimal', 'currency', 'percent', 'scientific'];
    
    Object.keys(numberFormats).forEach(key => {
      const format = numberFormats[key];
      
      if (typeof format === 'object') {
        if (format.style && !validFormats.includes(format.style)) {
          validation.warnings.push(`Invalid number format style: ${format.style}`);
        }
      }
    });
  }

  /**
   * Validate relative time formats
   */
  validateRelativeTimeFormats(relativeTimeFormats, validation) {
    const validUnits = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];
    
    Object.keys(relativeTimeFormats).forEach(key => {
      const format = relativeTimeFormats[key];
      
      if (typeof format === 'object') {
        if (format.unit && !validUnits.includes(format.unit)) {
          validation.warnings.push(`Invalid relative time unit: ${format.unit}`);
        }
      }
    });
  }

  /**
   * Validate metadata
   */
  validateMetadata(metadata, validation) {
    if (typeof metadata !== 'object') {
      validation.errors.push('Metadata must be an object');
      validation.isValid = false;
      return;
    }

    // Validate version if present
    if (metadata.version && typeof metadata.version !== 'string') {
      validation.errors.push('Metadata version must be a string');
      validation.isValid = false;
    }

    // Validate author if present
    if (metadata.author && typeof metadata.author !== 'string') {
      validation.errors.push('Metadata author must be a string');
      validation.isValid = false;
    }

    // Validate lastModified if present
    if (metadata.lastModified && !this.isValidDate(metadata.lastModified)) {
      validation.warnings.push('Invalid lastModified date format');
    }
  }

  /**
   * Validate locale-specific rules
   */
  validateLocaleSpecific(locale, validation) {
    // Validate locale format
    if (!this.isValidLocale(locale)) {
      validation.errors.push(`Invalid locale format: ${locale}`);
      validation.isValid = false;
    }

    // Check for locale-specific requirements
    if (locale.startsWith('ar-') || locale.startsWith('he-') || locale.startsWith('fa-')) {
      // RTL locale specific checks
      validation.warnings.push('RTL locale detected - ensure proper RTL support in UI');
    }
  }

  /**
   * Check for common translation issues
   */
  checkCommonIssues(translations, validation) {
    const issues = [];

    // Check for duplicate keys
    const keys = Object.keys(translations);
    const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
    if (duplicateKeys.length > 0) {
      issues.push(`Duplicate keys found: ${duplicateKeys.join(', ')}`);
    }

    // Check for inconsistent placeholders
    this.checkPlaceholderConsistency(translations, issues);

    // Check for missing translations (empty strings)
    const emptyTranslations = Object.entries(translations)
      .filter(([key, value]) => !value || value.trim().length === 0)
      .map(([key]) => key);
    
    if (emptyTranslations.length > 0) {
      issues.push(`Empty translations: ${emptyTranslations.join(', ')}`);
    }

    // Check for overly long translations
    const longTranslations = Object.entries(translations)
      .filter(([key, value]) => value && value.length > 500)
      .map(([key]) => key);
    
    if (longTranslations.length > 0) {
      issues.push(`Very long translations (may cause UI issues): ${longTranslations.join(', ')}`);
    }

    if (issues.length > 0) {
      validation.warnings.push(...issues);
    }
  }

  /**
   * Check placeholder consistency across translations
   */
  checkPlaceholderConsistency(translations, issues) {
    const placeholderPattern = /\{(\w+)\}/g;
    const placeholderMap = new Map();

    // Collect placeholders for each key
    Object.entries(translations).forEach(([key, value]) => {
      const placeholders = [...value.matchAll(placeholderPattern)].map(match => match[1]);
      placeholderMap.set(key, placeholders);
    });

    // Check for inconsistent placeholder usage
    const allPlaceholders = new Set();
    placeholderMap.forEach(placeholders => {
      placeholders.forEach(placeholder => allPlaceholders.add(placeholder));
    });

    allPlaceholders.forEach(placeholder => {
      const usingKeys = Array.from(placeholderMap.entries())
        .filter(([key, placeholders]) => placeholders.includes(placeholder))
        .map(([key]) => key);
      
      if (usingKeys.length > 1) {
        // Check if all translations use the same placeholder
        const firstPlaceholders = placeholderMap.get(usingKeys[0]);
        const isConsistent = usingKeys.every(key => {
          const placeholders = placeholderMap.get(key);
          return placeholders.includes(placeholder);
        });
        
        if (!isConsistent) {
          issues.push(`Inconsistent placeholder usage for {${placeholder}} in keys: ${usingKeys.join(', ')}`);
        }
      }
    });
  }

  /**
   * Validate translation key format
   */
  isValidTranslationKey(key) {
    // Keys should be alphanumeric with dots, hyphens, and underscores
    return /^[a-zA-Z0-9._-]+$/.test(key);
  }

  /**
   * Check if message contains ICU format
   */
  containsICUFormat(message) {
    return this.icuPatterns.simple.test(message) ||
           this.icuPatterns.plural.test(message) ||
           this.icuPatterns.select.test(message) ||
           this.icuPatterns.selectOrdinal.test(message);
  }

  /**
   * Check for balanced braces
   */
  hasBalancedBraces(message) {
    let count = 0;
    for (const char of message) {
      if (char === '{') count++;
      if (char === '}') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  /**
   * Extract variables from ICU message
   */
  extractVariables(message) {
    const variables = new Set();
    const matches = message.matchAll(/\{(\w+)/g);
    
    for (const match of matches) {
      variables.add(match[1]);
    }
    
    return Array.from(variables);
  }

  /**
   * Validate variable name
   */
  isValidVariableName(variable) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable);
  }

  /**
   * Validate date format string
   */
  isValidDateFormat(format) {
    // Basic date format validation
    const validTokens = ['YYYY', 'MM', 'DD', 'HH', 'mm', 'ss', 'A', 'a'];
    const tokens = format.match(/[A-Za-z]+/g) || [];
    return tokens.every(token => validTokens.includes(token));
  }

  /**
   * Validate date string
   */
  isValidDate(dateString) {
    return !isNaN(Date.parse(dateString));
  }

  /**
   * Validate locale format
   */
  isValidLocale(locale) {
    // Basic locale format validation (language-country)
    return /^[a-z]{2}(-[A-Z]{2})?$/.test(locale);
  }

  /**
   * Validate placeholder usage
   */
  validatePlaceholders(key, value, validation) {
    const placeholderPattern = /\{(\w+)\}/g;
    const placeholders = [...value.matchAll(placeholderPattern)].map(match => match[1]);
    
    // Check for invalid placeholder names
    placeholders.forEach(placeholder => {
      if (!this.isValidVariableName(placeholder)) {
        validation.errors.push(`Invalid placeholder name in "${key}": ${placeholder}`);
        validation.isValid = false;
      }
    });

    // Check for placeholder consistency with key
    if (key.includes('.')) {
      const keyParts = key.split('.');
      const expectedPlaceholders = keyParts.filter(part => part.includes('_'));
      
      expectedPlaceholders.forEach(expected => {
        if (!placeholders.includes(expected.replace('_', ''))) {
          validation.warnings.push(`Expected placeholder for "${expected}" in key "${key}"`);
        }
      });
    }
  }

  /**
   * Validate translation length
   */
  validateTranslationLength(key, value, validation) {
    const length = value.length;
    
    // Check for very short translations
    if (length < 2) {
      validation.warnings.push(`Very short translation for "${key}" (${length} characters)`);
    }
    
    // Check for very long translations
    if (length > 1000) {
      validation.warnings.push(`Very long translation for "${key}" (${length} characters) - may cause UI issues`);
    }
    
    // Check for key-specific length expectations
    if (key.includes('title') && length > 100) {
      validation.warnings.push(`Long title translation for "${key}" (${length} characters)`);
    }
    
    if (key.includes('description') && length < 10) {
      validation.warnings.push(`Short description translation for "${key}" (${length} characters)`);
    }
  }
}

export default TranslationValidator;
