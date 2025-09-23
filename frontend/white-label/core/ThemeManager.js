/**
 * Enhanced Theme Manager for White-Label Development
 * 
 * Provides modular theming with tenant isolation, theme validation,
 * and comprehensive customization support.
 */

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { validateThemeConfig, validateColorScheme } from './validators/ThemeValidator';
import { ThemeCache } from './cache/ThemeCache';
import { ThemeLoader } from './loaders/ThemeLoader';
import { ThemeCompiler } from './compilers/ThemeCompiler';

class ThemeManager {
  constructor(tenantId, options = {}) {
    this.tenantId = tenantId;
    this.options = {
      enableCaching: true,
      enableValidation: true,
      enableCompilation: true,
      cacheExpiry: 3600000, // 1 hour
      fallbackTheme: 'default',
      ...options
    };
    
    this.cache = new ThemeCache(tenantId, this.options);
    this.loader = new ThemeLoader(tenantId);
    this.compiler = new ThemeCompiler();
    this.activeTheme = null;
    this.themeStack = [];
    
    this.initializeThemeManager();
  }

  async initializeThemeManager() {
    try {
      // Load default theme configuration
      await this.loadDefaultTheme();
      
      // Initialize cache
      if (this.options.enableCaching) {
        await this.cache.initialize();
      }
      
      console.log(`ThemeManager initialized for tenant: ${this.tenantId}`);
    } catch (error) {
      console.error('Failed to initialize ThemeManager:', error);
      throw new Error(`ThemeManager initialization failed: ${error.message}`);
    }
  }

  /**
   * Load and apply theme configuration
   */
  async loadTheme(themeConfig, options = {}) {
    try {
      const {
        validate = this.options.enableValidation,
        compile = this.options.enableCompilation,
        cache = this.options.enableCaching,
        mergeWithDefault = true
      } = options;

      // Validate theme configuration
      if (validate) {
        const validation = await this.validateTheme(themeConfig);
        if (!validation.isValid) {
          throw new Error(`Theme validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Load base theme if merging
      let baseTheme = null;
      if (mergeWithDefault && themeConfig.extends) {
        baseTheme = await this.loadBaseTheme(themeConfig.extends);
      }

      // Merge themes
      const mergedConfig = baseTheme 
        ? this.mergeThemes(baseTheme, themeConfig)
        : themeConfig;

      // Compile theme if enabled
      let compiledTheme = mergedConfig;
      if (compile) {
        compiledTheme = await this.compiler.compileTheme(mergedConfig, this.tenantId);
      }

      // Create Material-UI theme
      const muiTheme = this.createMuiTheme(compiledTheme);

      // Cache theme if enabled
      if (cache) {
        await this.cache.setTheme(themeConfig.id || 'custom', muiTheme);
      }

      // Set as active theme
      this.activeTheme = muiTheme;
      
      return muiTheme;
    } catch (error) {
      console.error('Failed to load theme:', error);
      throw new Error(`Theme loading failed: ${error.message}`);
    }
  }

  /**
   * Load theme from configuration file or API
   */
  async loadThemeFromSource(source, options = {}) {
    try {
      const themeConfig = await this.loader.loadTheme(source);
      return await this.loadTheme(themeConfig, options);
    } catch (error) {
      console.error('Failed to load theme from source:', error);
      throw new Error(`Theme source loading failed: ${error.message}`);
    }
  }

  /**
   * Create custom theme with tenant-specific overrides
   */
  async createCustomTheme(baseThemeId, customizations = {}) {
    try {
      // Load base theme
      const baseTheme = await this.loadBaseTheme(baseThemeId);
      
      // Apply customizations
      const customTheme = this.applyCustomizations(baseTheme, customizations);
      
      // Load the customized theme
      return await this.loadTheme(customTheme, { mergeWithDefault: false });
    } catch (error) {
      console.error('Failed to create custom theme:', error);
      throw new Error(`Custom theme creation failed: ${error.message}`);
    }
  }

  /**
   * Apply tenant-specific theme overrides
   */
  async applyTenantOverrides(tenantBranding) {
    try {
      if (!this.activeTheme) {
        throw new Error('No active theme to apply overrides to');
      }

      const overrides = this.extractTenantOverrides(tenantBranding);
      const overriddenTheme = this.applyCustomizations(this.activeTheme, overrides);
      
      // Update active theme
      this.activeTheme = overriddenTheme;
      
      return overriddenTheme;
    } catch (error) {
      console.error('Failed to apply tenant overrides:', error);
      throw new Error(`Tenant override application failed: ${error.message}`);
    }
  }

  /**
   * Switch to a different theme
   */
  async switchTheme(themeId, options = {}) {
    try {
      // Push current theme to stack
      if (this.activeTheme) {
        this.themeStack.push(this.activeTheme);
      }

      // Load new theme
      const newTheme = await this.loadThemeFromSource(themeId, options);
      
      return newTheme;
    } catch (error) {
      // Restore previous theme on error
      if (this.themeStack.length > 0) {
        this.activeTheme = this.themeStack.pop();
      }
      
      console.error('Failed to switch theme:', error);
      throw new Error(`Theme switching failed: ${error.message}`);
    }
  }

  /**
   * Restore previous theme from stack
   */
  async restorePreviousTheme() {
    if (this.themeStack.length === 0) {
      throw new Error('No previous theme to restore');
    }

    this.activeTheme = this.themeStack.pop();
    return this.activeTheme;
  }

  /**
   * Get theme configuration for export
   */
  async exportTheme(themeId = null) {
    try {
      const theme = themeId 
        ? await this.cache.getTheme(themeId)
        : this.activeTheme;

      if (!theme) {
        throw new Error('Theme not found');
      }

      return this.compiler.exportTheme(theme);
    } catch (error) {
      console.error('Failed to export theme:', error);
      throw new Error(`Theme export failed: ${error.message}`);
    }
  }

  /**
   * Validate theme configuration
   */
  async validateTheme(themeConfig) {
    try {
      const validation = await validateThemeConfig(themeConfig);
      
      // Additional tenant-specific validation
      if (this.tenantId) {
        validation.tenantSpecific = await this.validateTenantSpecific(themeConfig);
      }

      return validation;
    } catch (error) {
      console.error('Theme validation error:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Get available themes
   */
  async getAvailableThemes() {
    try {
      return await this.loader.getAvailableThemes();
    } catch (error) {
      console.error('Failed to get available themes:', error);
      throw new Error(`Failed to retrieve themes: ${error.message}`);
    }
  }

  /**
   * Create Material-UI theme from configuration
   */
  createMuiTheme(themeConfig) {
    try {
      const muiConfig = this.compiler.convertToMuiConfig(themeConfig);
      return createTheme(muiConfig);
    } catch (error) {
      console.error('Failed to create MUI theme:', error);
      throw new Error(`MUI theme creation failed: ${error.message}`);
    }
  }

  /**
   * Merge two theme configurations
   */
  mergeThemes(baseTheme, overrideTheme) {
    return {
      ...baseTheme,
      ...overrideTheme,
      palette: {
        ...baseTheme.palette,
        ...overrideTheme.palette,
        primary: {
          ...baseTheme.palette?.primary,
          ...overrideTheme.palette?.primary
        },
        secondary: {
          ...baseTheme.palette?.secondary,
          ...overrideTheme.palette?.secondary
        }
      },
      typography: {
        ...baseTheme.typography,
        ...overrideTheme.typography
      },
      components: {
        ...baseTheme.components,
        ...overrideTheme.components
      },
      custom: {
        ...baseTheme.custom,
        ...overrideTheme.custom
      }
    };
  }

  /**
   * Apply customizations to theme
   */
  applyCustomizations(theme, customizations) {
    const customTheme = { ...theme };

    // Apply color customizations
    if (customizations.colors) {
      customTheme.palette = {
        ...customTheme.palette,
        ...this.applyColorCustomizations(customTheme.palette, customizations.colors)
      };
    }

    // Apply typography customizations
    if (customizations.typography) {
      customTheme.typography = {
        ...customTheme.typography,
        ...customizations.typography
      };
    }

    // Apply component customizations
    if (customizations.components) {
      customTheme.components = {
        ...customTheme.components,
        ...customizations.components
      };
    }

    // Apply custom properties
    if (customizations.custom) {
      customTheme.custom = {
        ...customTheme.custom,
        ...customizations.custom
      };
    }

    return customTheme;
  }

  /**
   * Apply color customizations
   */
  applyColorCustomizations(palette, colorCustomizations) {
    const newPalette = { ...palette };

    Object.keys(colorCustomizations).forEach(colorKey => {
      if (newPalette[colorKey]) {
        newPalette[colorKey] = {
          ...newPalette[colorKey],
          ...colorCustomizations[colorKey]
        };
      } else {
        newPalette[colorKey] = colorCustomizations[colorKey];
      }
    });

    return newPalette;
  }

  /**
   * Extract tenant-specific overrides from branding
   */
  extractTenantOverrides(tenantBranding) {
    const overrides = {};

    if (tenantBranding.colors) {
      overrides.colors = tenantBranding.colors;
    }

    if (tenantBranding.typography) {
      overrides.typography = tenantBranding.typography;
    }

    if (tenantBranding.components) {
      overrides.components = tenantBranding.components;
    }

    if (tenantBranding.custom) {
      overrides.custom = tenantBranding.custom;
    }

    return overrides;
  }

  /**
   * Load default theme
   */
  async loadDefaultTheme() {
    const defaultTheme = {
      id: 'default',
      name: 'Default Theme',
      palette: {
        primary: {
          main: '#1976d2',
          light: '#42a5f5',
          dark: '#1565c0'
        },
        secondary: {
          main: '#dc004e',
          light: '#ff5983',
          dark: '#9a0036'
        },
        background: {
          default: '#f5f5f5',
          paper: '#ffffff'
        }
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
          fontSize: '2.125rem',
          fontWeight: 400
        },
        h2: {
          fontSize: '1.5rem',
          fontWeight: 400
        }
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 4,
              textTransform: 'none'
            }
          }
        }
      }
    };

    this.defaultTheme = defaultTheme;
  }

  /**
   * Load base theme by ID
   */
  async loadBaseTheme(themeId) {
    // Check cache first
    if (this.options.enableCaching) {
      const cachedTheme = await this.cache.getTheme(themeId);
      if (cachedTheme) {
        return cachedTheme;
      }
    }

    // Load from source
    const theme = await this.loader.loadTheme(themeId);
    
    // Cache the theme
    if (this.options.enableCaching) {
      await this.cache.setTheme(themeId, theme);
    }

    return theme;
  }

  /**
   * Validate tenant-specific theme requirements
   */
  async validateTenantSpecific(themeConfig) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check for required tenant branding elements
    if (this.tenantId) {
      // Validate accessibility compliance
      if (!themeConfig.accessibility?.compliant) {
        validation.warnings.push('Theme may not be fully accessible');
      }

      // Validate color contrast
      if (themeConfig.palette) {
        const contrastValidation = validateColorScheme(themeConfig.palette);
        if (!contrastValidation.isValid) {
          validation.errors.push(...contrastValidation.errors);
          validation.isValid = false;
        }
      }
    }

    return validation;
  }

  /**
   * Get current active theme
   */
  getActiveTheme() {
    return this.activeTheme;
  }

  /**
   * Clear theme cache
   */
  async clearCache() {
    if (this.options.enableCaching) {
      await this.cache.clear();
    }
  }

  /**
   * Get theme statistics
   */
  async getThemeStats() {
    const stats = {
      activeTheme: this.activeTheme?.id || 'none',
      cachedThemes: 0,
      themeStackSize: this.themeStack.length,
      lastUpdated: new Date().toISOString()
    };

    if (this.options.enableCaching) {
      stats.cachedThemes = await this.cache.getCacheSize();
    }

    return stats;
  }
}

export default ThemeManager;
