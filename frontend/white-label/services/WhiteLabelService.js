/**
 * White-Label Service
 * 
 * Manages white-label configurations, branding, and customization
 * for embeddable frontend components.
 */

class WhiteLabelService {
  constructor(tenantId, config = {}) {
    this.tenantId = tenantId;
    this.config = config;
    this.baseUrl = config.baseUrl || '/api/white-label';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load tenant configuration
   * @returns {Object} Tenant configuration
   */
  async loadConfiguration() {
    try {
      // Check cache first
      const cached = this.getCachedConfig();
      if (cached) {
        return cached;
      }

      // Fetch from API
      const response = await fetch(`${this.baseUrl}/config/${this.tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.statusText}`);
      }

      const config = await response.json();
      
      // Cache the configuration
      this.setCachedConfig(config);
      
      return config;

    } catch (error) {
      console.error('Failed to load white-label configuration:', error);
      
      // Return default configuration
      return this.getDefaultConfiguration();
    }
  }

  /**
   * Update tenant configuration
   * @param {Object} configData - Configuration data
   * @param {string} userId - User ID making the update
   * @returns {Object} Updated configuration
   */
  async updateConfiguration(configData, userId) {
    try {
      const response = await fetch(`${this.baseUrl}/config/${this.tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          ...configData,
          updatedBy: userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update configuration: ${response.statusText}`);
      }

      const updatedConfig = await response.json();
      
      // Update cache
      this.setCachedConfig(updatedConfig);
      
      return updatedConfig;

    } catch (error) {
      console.error('Failed to update white-label configuration:', error);
      throw error;
    }
  }

  /**
   * Get branding configuration
   * @returns {Object} Branding configuration
   */
  async getBrandingConfig() {
    const config = await this.loadConfiguration();
    return config.branding || this.getDefaultBranding();
  }

  /**
   * Update branding configuration
   * @param {Object} brandingData - Branding data
   * @param {string} userId - User ID making the update
   * @returns {Object} Updated branding configuration
   */
  async updateBrandingConfig(brandingData, userId) {
    const currentConfig = await this.loadConfiguration();
    
    const updatedConfig = {
      ...currentConfig,
      branding: {
        ...currentConfig.branding,
        ...brandingData,
      },
    };

    return await this.updateConfiguration(updatedConfig, userId);
  }

  /**
   * Get layout configuration
   * @returns {Object} Layout configuration
   */
  async getLayoutConfig() {
    const config = await this.loadConfiguration();
    return config.layout || this.getDefaultLayout();
  }

  /**
   * Update layout configuration
   * @param {Object} layoutData - Layout data
   * @param {string} userId - User ID making the update
   * @returns {Object} Updated layout configuration
   */
  async updateLayoutConfig(layoutData, userId) {
    const currentConfig = await this.loadConfiguration();
    
    const updatedConfig = {
      ...currentConfig,
      layout: {
        ...currentConfig.layout,
        ...layoutData,
      },
    };

    return await this.updateConfiguration(updatedConfig, userId);
  }

  /**
   * Get feature configuration
   * @returns {Object} Feature configuration
   */
  async getFeatureConfig() {
    const config = await this.loadConfiguration();
    return config.features || this.getDefaultFeatures();
  }

  /**
   * Update feature configuration
   * @param {Object} featureData - Feature data
   * @param {string} userId - User ID making the update
   * @returns {Object} Updated feature configuration
   */
  async updateFeatureConfig(featureData, userId) {
    const currentConfig = await this.loadConfiguration();
    
    const updatedConfig = {
      ...currentConfig,
      features: {
        ...currentConfig.features,
        ...featureData,
      },
    };

    return await this.updateConfiguration(updatedConfig, userId);
  }

  /**
   * Get custom CSS
   * @returns {string} Custom CSS
   */
  async getCustomCSS() {
    const config = await this.loadConfiguration();
    return config.customCSS || '';
  }

  /**
   * Update custom CSS
   * @param {string} css - Custom CSS
   * @param {string} userId - User ID making the update
   * @returns {Object} Updated configuration
   */
  async updateCustomCSS(css, userId) {
    const currentConfig = await this.loadConfiguration();
    
    const updatedConfig = {
      ...currentConfig,
      customCSS: css,
    };

    return await this.updateConfiguration(updatedConfig, userId);
  }

  /**
   * Get custom JavaScript
   * @returns {string} Custom JavaScript
   */
  async getCustomJS() {
    const config = await this.loadConfiguration();
    return config.customJS || '';
  }

  /**
   * Update custom JavaScript
   * @param {string} js - Custom JavaScript
   * @param {string} userId - User ID making the update
   * @returns {Object} Updated configuration
   */
  async updateCustomJS(js, userId) {
    const currentConfig = await this.loadConfiguration();
    
    const updatedConfig = {
      ...currentConfig,
      customJS: js,
    };

    return await this.updateConfiguration(updatedConfig, userId);
  }

  /**
   * Generate embed code
   * @param {Object} options - Embed options
   * @returns {string} Embed code
   */
  async generateEmbedCode(options = {}) {
    const config = await this.loadConfiguration();
    const embedUrl = `${this.config.embedBaseUrl || window.location.origin}/embed/${this.tenantId}`;
    
    const embedOptions = {
      width: options.width || '100%',
      height: options.height || '600px',
      theme: options.theme || 'light',
      features: options.features || config.features,
      ...options,
    };

    const embedCode = `
<!-- School SIS Digital Archive Embed -->
<div id="school-sis-archive-${this.tenantId}" 
     style="width: ${embedOptions.width}; height: ${embedOptions.height}; border: 1px solid #ddd; border-radius: 8px;">
  <iframe src="${embedUrl}?theme=${embedOptions.theme}&features=${encodeURIComponent(JSON.stringify(embedOptions.features))}"
          width="100%" 
          height="100%" 
          frameborder="0"
          allowfullscreen>
  </iframe>
</div>
<script>
  // Optional: Custom event handlers
  window.addEventListener('message', function(event) {
    if (event.origin !== '${window.location.origin}') return;
    
    if (event.data.type === 'archive-item-selected') {
      console.log('Archive item selected:', event.data.item);
    }
    
    if (event.data.type === 'archive-item-downloaded') {
      console.log('Archive item downloaded:', event.data.item);
    }
  });
</script>
<!-- End School SIS Digital Archive Embed -->`;

    return embedCode;
  }

  /**
   * Get preview URL
   * @param {Object} options - Preview options
   * @returns {string} Preview URL
   */
  getPreviewURL(options = {}) {
    const baseUrl = this.config.previewBaseUrl || window.location.origin;
    const params = new URLSearchParams();
    
    if (options.theme) params.append('theme', options.theme);
    if (options.features) params.append('features', JSON.stringify(options.features));
    if (options.layout) params.append('layout', JSON.stringify(options.layout));
    
    return `${baseUrl}/preview/${this.tenantId}?${params.toString()}`;
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfiguration(config) {
    const errors = [];
    const warnings = [];

    // Validate branding
    if (config.branding) {
      if (config.branding.primaryColor && !this.isValidColor(config.branding.primaryColor)) {
        errors.push('Invalid primary color format');
      }
      
      if (config.branding.secondaryColor && !this.isValidColor(config.branding.secondaryColor)) {
        errors.push('Invalid secondary color format');
      }
      
      if (config.branding.logo && !this.isValidURL(config.branding.logo)) {
        errors.push('Invalid logo URL');
      }
    }

    // Validate layout
    if (config.layout) {
      if (config.layout.maxWidth && (config.layout.maxWidth < 320 || config.layout.maxWidth > 1920)) {
        warnings.push('Max width should be between 320px and 1920px');
      }
    }

    // Validate features
    if (config.features) {
      const validFeatures = ['search', 'download', 'preview', 'sharing', 'comments', 'ratings'];
      for (const feature of Object.keys(config.features)) {
        if (!validFeatures.includes(feature)) {
          warnings.push(`Unknown feature: ${feature}`);
        }
      }
    }

    // Validate custom CSS
    if (config.customCSS && config.customCSS.length > 10000) {
      warnings.push('Custom CSS is quite large and may affect performance');
    }

    // Validate custom JavaScript
    if (config.customJS && config.customJS.length > 5000) {
      warnings.push('Custom JavaScript is quite large and may affect performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Export configuration
   * @returns {Object} Exported configuration
   */
  async exportConfiguration() {
    const config = await this.loadConfiguration();
    
    return {
      version: '1.0.0',
      tenantId: this.tenantId,
      exportedAt: new Date().toISOString(),
      configuration: config,
    };
  }

  /**
   * Import configuration
   * @param {Object} exportedConfig - Exported configuration
   * @param {string} userId - User ID making the import
   * @returns {Object} Import result
   */
  async importConfiguration(exportedConfig, userId) {
    try {
      // Validate the exported configuration
      if (!exportedConfig.version || !exportedConfig.configuration) {
        throw new Error('Invalid configuration format');
      }

      // Validate the configuration
      const validation = this.validateConfiguration(exportedConfig.configuration);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Update the configuration
      const updatedConfig = await this.updateConfiguration(exportedConfig.configuration, userId);
      
      return {
        success: true,
        warnings: validation.warnings,
        configuration: updatedConfig,
      };

    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw error;
    }
  }

  // Helper methods
  getCachedConfig() {
    const cached = this.cache.get('config');
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedConfig(config) {
    this.cache.set('config', {
      data: config,
      timestamp: Date.now(),
    });
  }

  getDefaultConfiguration() {
    return {
      branding: this.getDefaultBranding(),
      layout: this.getDefaultLayout(),
      features: this.getDefaultFeatures(),
      customCSS: '',
      customJS: '',
    };
  }

  getDefaultBranding() {
    return {
      title: 'Digital Archive',
      subtitle: 'Browse and access your school\'s digital resources',
      logo: null,
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      backgroundColor: '#f5f5f5',
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      buttonRadius: 4,
    };
  }

  getDefaultLayout() {
    return {
      maxWidth: 1200,
      showHeader: true,
      showFooter: true,
      showSidebar: true,
      gridColumns: 3,
      itemsPerPage: 24,
    };
  }

  getDefaultFeatures() {
    return {
      search: true,
      download: true,
      preview: true,
      sharing: true,
      comments: false,
      ratings: false,
      advancedSearch: false,
      bulkDownload: false,
    };
  }

  isValidColor(color) {
    // Basic color validation (hex, rgb, rgba, named colors)
    const colorRegex = /^(#[0-9A-Fa-f]{3,6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|[a-zA-Z]+)$/;
    return colorRegex.test(color);
  }

  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  getAuthToken() {
    // This would typically get the auth token from localStorage or a secure store
    return localStorage.getItem('authToken') || '';
  }
}

export { WhiteLabelService };
