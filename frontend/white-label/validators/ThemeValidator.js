/**
 * Theme Validator for White-Label Development
 * 
 * Provides comprehensive validation for theme configurations,
 * color schemes, accessibility compliance, and tenant isolation.
 */

import { validateColorScheme, validateTypography, validateComponentStyles } from './validationRules';

export class ThemeValidator {
  constructor() {
    this.validationRules = {
      colors: validateColorScheme,
      typography: validateTypography,
      components: validateComponentStyles
    };
  }

  /**
   * Validate complete theme configuration
   */
  async validateThemeConfig(themeConfig) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Basic structure validation
      this.validateBasicStructure(themeConfig, validation);

      // Color scheme validation
      if (themeConfig.palette) {
        this.validateColors(themeConfig.palette, validation);
      }

      // Typography validation
      if (themeConfig.typography) {
        this.validateTypography(themeConfig.typography, validation);
      }

      // Component validation
      if (themeConfig.components) {
        this.validateComponents(themeConfig.components, validation);
      }

      // Accessibility validation
      if (themeConfig.accessibility) {
        this.validateAccessibility(themeConfig.accessibility, validation);
      }

      // Performance validation
      this.validatePerformance(themeConfig, validation);

      // Security validation
      this.validateSecurity(themeConfig, validation);

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate basic theme structure
   */
  validateBasicStructure(themeConfig, validation) {
    const requiredFields = ['id', 'name'];
    const missingFields = requiredFields.filter(field => !themeConfig[field]);

    if (missingFields.length > 0) {
      validation.errors.push(`Missing required fields: ${missingFields.join(', ')}`);
      validation.isValid = false;
    }

    // Validate ID format
    if (themeConfig.id && !/^[a-zA-Z0-9_-]+$/.test(themeConfig.id)) {
      validation.errors.push('Theme ID must contain only alphanumeric characters, hyphens, and underscores');
      validation.isValid = false;
    }

    // Validate name length
    if (themeConfig.name && themeConfig.name.length > 100) {
      validation.warnings.push('Theme name is longer than recommended (100 characters)');
    }

    // Validate version if present
    if (themeConfig.version && !/^\d+\.\d+\.\d+$/.test(themeConfig.version)) {
      validation.warnings.push('Theme version should follow semantic versioning (e.g., 1.0.0)');
    }
  }

  /**
   * Validate color scheme
   */
  validateColors(palette, validation) {
    const colorValidation = validateColorScheme(palette);
    
    if (!colorValidation.isValid) {
      validation.errors.push(...colorValidation.errors);
      validation.isValid = false;
    }
    
    if (colorValidation.warnings) {
      validation.warnings.push(...colorValidation.warnings);
    }

    // Check for required color keys
    const requiredColors = ['primary', 'secondary', 'background'];
    const missingColors = requiredColors.filter(color => !palette[color]);
    
    if (missingColors.length > 0) {
      validation.warnings.push(`Missing recommended colors: ${missingColors.join(', ')}`);
    }

    // Validate color contrast ratios
    this.validateColorContrast(palette, validation);

    // Check for color accessibility
    this.validateColorAccessibility(palette, validation);
  }

  /**
   * Validate color contrast ratios for accessibility
   */
  validateColorContrast(palette, validation) {
    const contrastPairs = [
      { foreground: 'primary.main', background: 'background.paper' },
      { foreground: 'text.primary', background: 'background.paper' },
      { foreground: 'text.secondary', background: 'background.paper' }
    ];

    contrastPairs.forEach(pair => {
      const foreground = this.getNestedValue(palette, pair.foreground);
      const background = this.getNestedValue(palette, pair.background);
      
      if (foreground && background) {
        const ratio = this.calculateContrastRatio(foreground, background);
        
        if (ratio < 4.5) {
          validation.warnings.push(`Low contrast ratio (${ratio.toFixed(2)}) between ${pair.foreground} and ${pair.background}. Minimum recommended: 4.5`);
        }
        
        if (ratio < 3) {
          validation.errors.push(`Very low contrast ratio (${ratio.toFixed(2)}) between ${pair.foreground} and ${pair.background}. Minimum required: 3`);
          validation.isValid = false;
        }
      }
    });
  }

  /**
   * Validate color accessibility
   */
  validateColorAccessibility(palette, validation) {
    // Check for colorblind-friendly combinations
    const colorKeys = Object.keys(palette);
    
    colorKeys.forEach(colorKey => {
      const color = palette[colorKey];
      if (typeof color === 'object' && color.main) {
        // Check if color is too light or too dark
        const luminance = this.getLuminance(color.main);
        
        if (luminance > 0.9) {
          validation.warnings.push(`${colorKey}.main is very light and may not be visible on white backgrounds`);
        }
        
        if (luminance < 0.1) {
          validation.warnings.push(`${colorKey}.main is very dark and may not be visible on dark backgrounds`);
        }
      }
    });
  }

  /**
   * Validate typography
   */
  validateTypography(typography, validation) {
    const typographyValidation = validateTypography(typography);
    
    if (!typographyValidation.isValid) {
      validation.errors.push(...typographyValidation.errors);
      validation.isValid = false;
    }
    
    if (typographyValidation.warnings) {
      validation.warnings.push(...typographyValidation.warnings);
    }

    // Validate font family
    if (typography.fontFamily) {
      this.validateFontFamily(typography.fontFamily, validation);
    }

    // Validate font sizes
    this.validateFontSizes(typography, validation);
  }

  /**
   * Validate font family
   */
  validateFontFamily(fontFamily, validation) {
    // Check if font family is web-safe or has fallbacks
    const webSafeFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
      'Georgia', 'Verdana', 'Geneva', 'serif', 'sans-serif', 'monospace'
    ];
    
    const hasWebSafeFallback = webSafeFonts.some(font => 
      fontFamily.toLowerCase().includes(font.toLowerCase())
    );
    
    if (!hasWebSafeFallback) {
      validation.warnings.push('Font family should include web-safe fallbacks (e.g., "Custom Font", Arial, sans-serif)');
    }
  }

  /**
   * Validate font sizes
   */
  validateFontSizes(typography, validation) {
    const fontSizeKeys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body1', 'body2', 'caption'];
    
    fontSizeKeys.forEach(key => {
      if (typography[key] && typography[key].fontSize) {
        const fontSize = parseFloat(typography[key].fontSize);
        
        if (fontSize < 12) {
          validation.warnings.push(`${key} fontSize (${fontSize}px) may be too small for accessibility`);
        }
        
        if (fontSize > 48) {
          validation.warnings.push(`${key} fontSize (${fontSize}px) may be too large for mobile devices`);
        }
      }
    });
  }

  /**
   * Validate components
   */
  validateComponents(components, validation) {
    const componentValidation = validateComponentStyles(components);
    
    if (!componentValidation.isValid) {
      validation.errors.push(...componentValidation.errors);
      validation.isValid = false;
    }
    
    if (componentValidation.warnings) {
      validation.warnings.push(...componentValidation.warnings);
    }

    // Validate component-specific rules
    Object.keys(components).forEach(componentName => {
      this.validateComponentSpecific(componentName, components[componentName], validation);
    });
  }

  /**
   * Validate component-specific rules
   */
  validateComponentSpecific(componentName, componentConfig, validation) {
    switch (componentName) {
      case 'MuiButton':
        this.validateButtonComponent(componentConfig, validation);
        break;
      case 'MuiTextField':
        this.validateTextFieldComponent(componentConfig, validation);
        break;
      case 'MuiCard':
        this.validateCardComponent(componentConfig, validation);
        break;
      default:
        // Generic component validation
        this.validateGenericComponent(componentConfig, validation);
    }
  }

  /**
   * Validate button component
   */
  validateButtonComponent(componentConfig, validation) {
    if (componentConfig.styleOverrides?.root) {
      const rootStyles = componentConfig.styleOverrides.root;
      
      // Check for minimum touch target size
      if (rootStyles.minHeight && parseFloat(rootStyles.minHeight) < 44) {
        validation.warnings.push('Button minimum height should be at least 44px for touch accessibility');
      }
      
      if (rootStyles.minWidth && parseFloat(rootStyles.minWidth) < 44) {
        validation.warnings.push('Button minimum width should be at least 44px for touch accessibility');
      }
    }
  }

  /**
   * Validate text field component
   */
  validateTextFieldComponent(componentConfig, validation) {
    if (componentConfig.styleOverrides?.root) {
      const rootStyles = componentConfig.styleOverrides.root;
      
      // Check for sufficient padding
      if (rootStyles.padding && parseFloat(rootStyles.padding) < 12) {
        validation.warnings.push('TextField padding should be at least 12px for usability');
      }
    }
  }

  /**
   * Validate card component
   */
  validateCardComponent(componentConfig, validation) {
    if (componentConfig.styleOverrides?.root) {
      const rootStyles = componentConfig.styleOverrides.root;
      
      // Check for shadow/elevation
      if (!rootStyles.boxShadow && !rootStyles.elevation) {
        validation.warnings.push('Card component should have shadow or elevation for visual hierarchy');
      }
    }
  }

  /**
   * Validate generic component
   */
  validateGenericComponent(componentConfig, validation) {
    // Check for potentially problematic CSS
    if (componentConfig.styleOverrides?.root) {
      const rootStyles = componentConfig.styleOverrides.root;
      
      // Check for fixed dimensions that might break responsive design
      if (rootStyles.width && !rootStyles.maxWidth && !rootStyles.minWidth) {
        if (typeof rootStyles.width === 'string' && !rootStyles.width.includes('%') && !rootStyles.width.includes('vw')) {
          validation.warnings.push('Fixed width without max/min constraints may break responsive design');
        }
      }
    }
  }

  /**
   * Validate accessibility features
   */
  validateAccessibility(accessibility, validation) {
    const requiredFeatures = ['highContrast', 'keyboardNavigation', 'screenReader'];
    const missingFeatures = requiredFeatures.filter(feature => !accessibility[feature]);
    
    if (missingFeatures.length > 0) {
      validation.warnings.push(`Missing accessibility features: ${missingFeatures.join(', ')}`);
    }

    // Validate high contrast mode
    if (accessibility.highContrast) {
      this.validateHighContrastMode(accessibility.highContrast, validation);
    }

    // Validate keyboard navigation
    if (accessibility.keyboardNavigation) {
      this.validateKeyboardNavigation(accessibility.keyboardNavigation, validation);
    }
  }

  /**
   * Validate high contrast mode
   */
  validateHighContrastMode(highContrast, validation) {
    if (!highContrast.enabled) {
      validation.warnings.push('High contrast mode should be enabled for accessibility');
    }

    if (highContrast.colors) {
      const contrastValidation = this.validateColorContrast(highContrast.colors, validation);
      if (!contrastValidation.isValid) {
        validation.errors.push('High contrast mode colors do not meet accessibility standards');
        validation.isValid = false;
      }
    }
  }

  /**
   * Validate keyboard navigation
   */
  validateKeyboardNavigation(keyboardNav, validation) {
    if (!keyboardNav.enabled) {
      validation.warnings.push('Keyboard navigation should be enabled for accessibility');
    }

    if (keyboardNav.focusIndicator && !keyboardNav.focusIndicator.visible) {
      validation.warnings.push('Focus indicators should be visible for keyboard navigation');
    }
  }

  /**
   * Validate performance considerations
   */
  validatePerformance(themeConfig, validation) {
    // Check for large CSS bundles
    const cssSize = this.estimateCSSSize(themeConfig);
    if (cssSize > 100000) { // 100KB
      validation.warnings.push(`Large CSS bundle estimated at ${(cssSize / 1024).toFixed(1)}KB may impact performance`);
    }

    // Check for complex animations
    if (themeConfig.animations) {
      const complexAnimations = Object.values(themeConfig.animations).filter(
        animation => animation.duration > 1000 || animation.delay > 500
      );
      
      if (complexAnimations.length > 0) {
        validation.warnings.push('Complex animations may impact performance on low-end devices');
      }
    }
  }

  /**
   * Validate security considerations
   */
  validateSecurity(themeConfig, validation) {
    // Check for potentially dangerous CSS
    if (themeConfig.customCSS) {
      const dangerousPatterns = [
        /expression\s*\(/i,
        /javascript:/i,
        /data:text\/html/i,
        /@import\s+url/i
      ];

      dangerousPatterns.forEach(pattern => {
        if (pattern.test(themeConfig.customCSS)) {
          validation.errors.push('Custom CSS contains potentially dangerous patterns');
          validation.isValid = false;
        }
      });
    }

    // Check for external resources
    if (themeConfig.externalResources) {
      const httpResources = themeConfig.externalResources.filter(
        resource => resource.startsWith('http://')
      );
      
      if (httpResources.length > 0) {
        validation.warnings.push('External resources should use HTTPS for security');
      }
    }
  }

  /**
   * Calculate color contrast ratio
   */
  calculateContrastRatio(color1, color2) {
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);
    
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get luminance of a color
   */
  getLuminance(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Estimate CSS bundle size
   */
  estimateCSSSize(themeConfig) {
    let size = 0;
    
    // Estimate size based on configuration complexity
    if (themeConfig.palette) size += 1000;
    if (themeConfig.typography) size += 2000;
    if (themeConfig.components) size += Object.keys(themeConfig.components).length * 500;
    if (themeConfig.customCSS) size += themeConfig.customCSS.length;
    
    return size;
  }
}

/**
 * Validate color scheme
 */
export function validateColorScheme(palette) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!palette) {
    validation.errors.push('Palette configuration is required');
    validation.isValid = false;
    return validation;
  }

  // Validate color format
  Object.keys(palette).forEach(colorKey => {
    const color = palette[colorKey];
    
    if (typeof color === 'string') {
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        validation.errors.push(`${colorKey} must be a valid hex color (e.g., #FF0000)`);
        validation.isValid = false;
      }
    } else if (typeof color === 'object' && color !== null) {
      // Validate color object with variants
      Object.keys(color).forEach(variant => {
        if (typeof color[variant] === 'string' && !/^#[0-9A-Fa-f]{6}$/.test(color[variant])) {
          validation.errors.push(`${colorKey}.${variant} must be a valid hex color`);
          validation.isValid = false;
        }
      });
    }
  });

  return validation;
}

/**
 * Validate typography configuration
 */
export function validateTypography(typography) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!typography) {
    validation.errors.push('Typography configuration is required');
    validation.isValid = false;
    return validation;
  }

  // Validate font family
  if (typography.fontFamily && typeof typography.fontFamily !== 'string') {
    validation.errors.push('Font family must be a string');
    validation.isValid = false;
  }

  // Validate font sizes
  const fontSizeKeys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body1', 'body2', 'caption'];
  fontSizeKeys.forEach(key => {
    if (typography[key] && typography[key].fontSize) {
      const fontSize = parseFloat(typography[key].fontSize);
      if (isNaN(fontSize) || fontSize <= 0) {
        validation.errors.push(`${key} fontSize must be a positive number`);
        validation.isValid = false;
      }
    }
  });

  return validation;
}

/**
 * Validate component styles
 */
export function validateComponentStyles(components) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!components || typeof components !== 'object') {
    validation.errors.push('Components configuration must be an object');
    validation.isValid = false;
    return validation;
  }

  // Validate component structure
  Object.keys(components).forEach(componentName => {
    const component = components[componentName];
    
    if (typeof component !== 'object' || component === null) {
      validation.errors.push(`${componentName} configuration must be an object`);
      validation.isValid = false;
    }
  });

  return validation;
}

export { validateThemeConfig };
