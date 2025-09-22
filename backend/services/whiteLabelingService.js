/**
 * White-Labeling Service
 * 
 * Complete implementation of white-labeling functionality including:
 * - Database integration for branding configuration
 * - Asset management and upload
 * - Dynamic CSS generation
 * - Custom domain management
 * - Theme templates
 * - Real-time preview system
 */

const { _Pool } = require('pg');
const fs = require('fs').promises;
const _path = require('_path');
const sharp = require('sharp');
const crypto = require('crypto');

class WhiteLabelingService {
  constructor(db) {
    this.db = db;
    this.uploadPath = process.env.UPLOAD_PATH || _path.join(__dirname, '../uploads');
    this.cdnBaseUrl = process.env.CDN_BASE_URL || 'http://localhost:3000/uploads';
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    this.allowedIconTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png'];
  }

  /**
   * Get complete tenant branding configuration
   */
  async getTenantBranding(tenantId, _userId = null) {
    try {
      const _query = `
        SELECT 
          t._id, t.name, t.slug, t.school_name, t.domain,
          t.logo_url, t.favicon_url, t.background_image_url,
          t.primary_color, t.secondary_color, t.header_background_color,
          t.footer_background_color, t.text_color, t.link_color,
          t.button_color, t.button_text_color, t.accent_color, t.border_color,
          t.font_family, t.font_size_base,
          t.custom_favicon_url, t.custom_apple_touch_icon_url, t.custom_manifest_url,
          t.custom_meta_tags, t.custom_footer_text, t.custom_header_text,
          t.custom_welcome_message, t.custom_login_message,
          t.custom_error_pages, t.custom_email_templates, t.custom_notification_settings,
          t.custom_dashboard_widgets, t.custom_navigation_menu, t.custom_feature_flags,
          t.custom_terms_of_service, t.custom_privacy_policy,
          t.custom_help_documentation, t.custom_api_documentation,
          t.custom_support_contact, t.custom_social_media,
          t.custom_analytics_config, t.custom_integrations,
          t.white_label_enabled, t.white_label_level,
          t.custom_domain_verified, t.ssl_certificate_status,
          t.ssl_certificate_expires_at, t.custom_css,
          t.created_at, t.updated_at
        FROM tenants t
        WHERE t._id = $1
      `;

      const result = await this.db._query(_query, [tenantId]);
      
      if (result.rows.length === 0) {
        throw new Error('Tenant not found');
      }

      const tenant = result.rows[0];
      
      // Parse JSON fields
      const customMetaTags = tenant.custom_meta_tags ? JSON.parse(tenant.custom_meta_tags) : {};
      const customErrorPages = tenant.custom_error_pages ? JSON.parse(tenant.custom_error_pages) : {};
      const customEmailTemplates = tenant.custom_email_templates ? JSON.parse(tenant.custom_email_templates) : {};
      const customNotificationSettings = tenant.custom_notification_settings ? JSON.parse(tenant.custom_notification_settings) : {};
      const customDashboardWidgets = tenant.custom_dashboard_widgets ? JSON.parse(tenant.custom_dashboard_widgets) : {};
      const customNavigationMenu = tenant.custom_navigation_menu ? JSON.parse(tenant.custom_navigation_menu) : {};
      const customFeatureFlags = tenant.custom_feature_flags ? JSON.parse(tenant.custom_feature_flags) : {};
      const customHelpDocumentation = tenant.custom_help_documentation ? JSON.parse(tenant.custom_help_documentation) : {};
      const customApiDocumentation = tenant.custom_api_documentation ? JSON.parse(tenant.custom_api_documentation) : {};
      const customSupportContact = tenant.custom_support_contact ? JSON.parse(tenant.custom_support_contact) : {};
      const customSocialMedia = tenant.custom_social_media ? JSON.parse(tenant.custom_social_media) : {};
      const customAnalyticsConfig = tenant.custom_analytics_config ? JSON.parse(tenant.custom_analytics_config) : {};
      const customIntegrations = tenant.custom_integrations ? JSON.parse(tenant.custom_integrations) : {};

      // Build comprehensive branding object
      const branding = {
        tenant_id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        school_name: tenant.school_name,
        domain: tenant.domain,
        
        // Visual Assets
        logo_url: tenant.logo_url,
        favicon_url: tenant.favicon_url,
        background_image_url: tenant.background_image_url,
        custom_favicon_url: tenant.custom_favicon_url,
        custom_apple_touch_icon_url: tenant.custom_apple_touch_icon_url,
        custom_manifest_url: tenant.custom_manifest_url,
        
        // Color Scheme
        colors: {
          primary: tenant.primary_color || '#1e40af',
          secondary: tenant.secondary_color || '#3b82f6',
          header_background: tenant.header_background_color || '#ffffff',
          footer_background: tenant.footer_background_color || '#f8fafc',
          text: tenant.text_color || '#1f2937',
          link: tenant.link_color || '#3b82f6',
          button: tenant.button_color || '#1e40af',
          button_text: tenant.button_text_color || '#ffffff',
          accent: tenant.accent_color || '#10b981',
          border: tenant.border_color || '#e5e7eb'
        },
        
        // Typography
        typography: {
          font_family: tenant.font_family || 'Inter, system-ui, sans-serif',
          font_size_base: tenant.font_size_base || '16px'
        },
        
        // Custom Content
        custom_content: {
          meta_tags: customMetaTags,
          footer_text: tenant.custom_footer_text || `© ${new Date().getFullYear()} ${tenant.school_name}. All rights reserved.`,
          header_text: tenant.custom_header_text,
          welcome_message: tenant.custom_welcome_message || `Welcome to ${tenant.school_name} Student Portal!`,
          login_message: tenant.custom_login_message || 'Please sign in to access your _student account.'
        },
        
        // Advanced Features
        advanced_features: {
          error_pages: customErrorPages,
          email_templates: customEmailTemplates,
          notification_settings: customNotificationSettings,
          dashboard_widgets: customDashboardWidgets,
          navigation_menu: customNavigationMenu,
          feature_flags: customFeatureFlags,
          help_documentation: customHelpDocumentation,
          api_documentation: customApiDocumentation,
          support_contact: customSupportContact,
          social_media: customSocialMedia,
          analytics_config: customAnalyticsConfig,
          integrations: customIntegrations
        },
        
        // Legal Documents
        legal_documents: {
          terms_of_service: tenant.custom_terms_of_service,
          privacy_policy: tenant.custom_privacy_policy
        },
        
        // White-Label Configuration
        white_label_config: {
          enabled: tenant.white_label_enabled || false,
          level: tenant.white_label_level || 'basic',
          custom_domain_verified: tenant.custom_domain_verified || false,
          ssl_certificate_status: tenant.ssl_certificate_status || 'pending',
          ssl_certificate_expires_at: tenant.ssl_certificate_expires_at
        },
        
        // Custom CSS
        custom_css: tenant.custom_css || '',
        
        // Metadata
        created_at: tenant.created_at,
        updated_at: tenant.updated_at
      };

      return branding;

    } catch (error) {
      console.error('Error getting tenant branding:', error);
      throw error;
    }
  }

  /**
   * Update tenant branding configuration
   */
  async updateTenantBranding(tenantId, brandingData, _userId) {
    try {
      const {
        colors,
        typography,
        custom_content,
        advanced_features,
        legal_documents,
        white_label_config,
        custom_css,
        assets
      } = brandingData;

      // Build update _query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      // Update colors
      if (colors) {
        if (colors.primary) {
          updateFields.push(`primary_color = $${paramIndex++}`);
          updateValues.push(colors.primary);
        }
        if (colors.secondary) {
          updateFields.push(`secondary_color = $${paramIndex++}`);
          updateValues.push(colors.secondary);
        }
        if (colors.header_background) {
          updateFields.push(`header_background_color = $${paramIndex++}`);
          updateValues.push(colors.header_background);
        }
        if (colors.footer_background) {
          updateFields.push(`footer_background_color = $${paramIndex++}`);
          updateValues.push(colors.footer_background);
        }
        if (colors.text) {
          updateFields.push(`text_color = $${paramIndex++}`);
          updateValues.push(colors.text);
        }
        if (colors.link) {
          updateFields.push(`link_color = $${paramIndex++}`);
          updateValues.push(colors.link);
        }
        if (colors.button) {
          updateFields.push(`button_color = $${paramIndex++}`);
          updateValues.push(colors.button);
        }
        if (colors.button_text) {
          updateFields.push(`button_text_color = $${paramIndex++}`);
          updateValues.push(colors.button_text);
        }
        if (colors.accent) {
          updateFields.push(`accent_color = $${paramIndex++}`);
          updateValues.push(colors.accent);
        }
        if (colors.border) {
          updateFields.push(`border_color = $${paramIndex++}`);
          updateValues.push(colors.border);
        }
      }

      // Update typography
      if (typography) {
        if (typography.font_family) {
          updateFields.push(`font_family = $${paramIndex++}`);
          updateValues.push(typography.font_family);
        }
        if (typography.font_size_base) {
          updateFields.push(`font_size_base = $${paramIndex++}`);
          updateValues.push(typography.font_size_base);
        }
      }

      // Update custom content
      if (custom_content) {
        if (custom_content.meta_tags) {
          updateFields.push(`custom_meta_tags = $${paramIndex++}`);
          updateValues.push(JSON.stringify(custom_content.meta_tags));
        }
        if (custom_content.footer_text) {
          updateFields.push(`custom_footer_text = $${paramIndex++}`);
          updateValues.push(custom_content.footer_text);
        }
        if (custom_content.header_text) {
          updateFields.push(`custom_header_text = $${paramIndex++}`);
          updateValues.push(custom_content.header_text);
        }
        if (custom_content.welcome_message) {
          updateFields.push(`custom_welcome_message = $${paramIndex++}`);
          updateValues.push(custom_content.welcome_message);
        }
        if (custom_content.login_message) {
          updateFields.push(`custom_login_message = $${paramIndex++}`);
          updateValues.push(custom_content.login_message);
        }
      }

      // Update advanced features
      if (advanced_features) {
        if (advanced_features.error_pages) {
          updateFields.push(`custom_error_pages = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.error_pages));
        }
        if (advanced_features.email_templates) {
          updateFields.push(`custom_email_templates = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.email_templates));
        }
        if (advanced_features.notification_settings) {
          updateFields.push(`custom_notification_settings = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.notification_settings));
        }
        if (advanced_features.dashboard_widgets) {
          updateFields.push(`custom_dashboard_widgets = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.dashboard_widgets));
        }
        if (advanced_features.navigation_menu) {
          updateFields.push(`custom_navigation_menu = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.navigation_menu));
        }
        if (advanced_features.feature_flags) {
          updateFields.push(`custom_feature_flags = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.feature_flags));
        }
        if (advanced_features.help_documentation) {
          updateFields.push(`custom_help_documentation = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.help_documentation));
        }
        if (advanced_features.api_documentation) {
          updateFields.push(`custom_api_documentation = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.api_documentation));
        }
        if (advanced_features.support_contact) {
          updateFields.push(`custom_support_contact = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.support_contact));
        }
        if (advanced_features.social_media) {
          updateFields.push(`custom_social_media = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.social_media));
        }
        if (advanced_features.analytics_config) {
          updateFields.push(`custom_analytics_config = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.analytics_config));
        }
        if (advanced_features.integrations) {
          updateFields.push(`custom_integrations = $${paramIndex++}`);
          updateValues.push(JSON.stringify(advanced_features.integrations));
        }
      }

      // Update legal documents
      if (legal_documents) {
        if (legal_documents.terms_of_service) {
          updateFields.push(`custom_terms_of_service = $${paramIndex++}`);
          updateValues.push(legal_documents.terms_of_service);
        }
        if (legal_documents.privacy_policy) {
          updateFields.push(`custom_privacy_policy = $${paramIndex++}`);
          updateValues.push(legal_documents.privacy_policy);
        }
      }

      // Update white-label config
      if (white_label_config) {
        if (white_label_config.enabled !== undefined) {
          updateFields.push(`white_label_enabled = $${paramIndex++}`);
          updateValues.push(white_label_config.enabled);
        }
        if (white_label_config.level) {
          updateFields.push(`white_label_level = $${paramIndex++}`);
          updateValues.push(white_label_config.level);
        }
        if (white_label_config.custom_domain_verified !== undefined) {
          updateFields.push(`custom_domain_verified = $${paramIndex++}`);
          updateValues.push(white_label_config.custom_domain_verified);
        }
        if (white_label_config.ssl_certificate_status) {
          updateFields.push(`ssl_certificate_status = $${paramIndex++}`);
          updateValues.push(white_label_config.ssl_certificate_status);
        }
        if (white_label_config.ssl_certificate_expires_at) {
          updateFields.push(`ssl_certificate_expires_at = $${paramIndex++}`);
          updateValues.push(white_label_config.ssl_certificate_expires_at);
        }
      }

      // Update custom CSS
      if (custom_css !== undefined) {
        updateFields.push(`custom_css = $${paramIndex++}`);
        updateValues.push(custom_css);
      }

      // Update asset URLs
      if (assets) {
        if (assets.logo_url) {
          updateFields.push(`logo_url = $${paramIndex++}`);
          updateValues.push(assets.logo_url);
        }
        if (assets.favicon_url) {
          updateFields.push(`favicon_url = $${paramIndex++}`);
          updateValues.push(assets.favicon_url);
        }
        if (assets.background_image_url) {
          updateFields.push(`background_image_url = $${paramIndex++}`);
          updateValues.push(assets.background_image_url);
        }
        if (assets.custom_favicon_url) {
          updateFields.push(`custom_favicon_url = $${paramIndex++}`);
          updateValues.push(assets.custom_favicon_url);
        }
        if (assets.custom_apple_touch_icon_url) {
          updateFields.push(`custom_apple_touch_icon_url = $${paramIndex++}`);
          updateValues.push(assets.custom_apple_touch_icon_url);
        }
        if (assets.custom_manifest_url) {
          updateFields.push(`custom_manifest_url = $${paramIndex++}`);
          updateValues.push(assets.custom_manifest_url);
        }
      }

      // Add updated_at timestamp
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const _query = `
        UPDATE tenants 
        SET ${updateFields.join(', ')}
        WHERE _id = $${paramIndex}
      `;

      updateValues.push(tenantId);

      await this.db._query(_query, updateValues);

      // Log the update
      await this.logBrandingUpdate(tenantId, _userId, 'update', brandingData);

      return true;

    } catch (error) {
      console.error('Error updating tenant branding:', error);
      throw error;
    }
  }

  /**
   * Generate dynamic CSS for tenant branding
   */
  async generateTenantCSS(tenantId) {
    try {
      const branding = await this.getTenantBranding(tenantId);
      
      // Generate CSS variables
      const cssVariables = `
:root {
  /* Color Variables */
  --primary-color: ${branding.colors.primary};
  --secondary-color: ${branding.colors.secondary};
  --header-bg: ${branding.colors.header_background};
  --footer-bg: ${branding.colors.footer_background};
  --text-color: ${branding.colors.text};
  --link-color: ${branding.colors.link};
  --button-bg: ${branding.colors.button};
  --button-text: ${branding.colors.button_text};
  --accent-color: ${branding.colors.accent};
  --border-color: ${branding.colors.border};
  
  /* Typography Variables */
  --font-family: ${branding.typography.font_family};
  --font-size-base: ${branding.typography.font_size_base};
  
  /* Asset Variables */
  --logo-url: url('${branding.logo_url || ''}');
  --background-image-url: url('${branding.background_image_url || ''}');
  --favicon-url: url('${branding.favicon_url || ''}');
}`;

      // Generate base styles
      const baseStyles = `
/* Base Styles */
_body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--text-color);
  background-color: var(--header-bg);
}

/* Header Styles */
.header {
  background-color: var(--header-bg);
  color: var(--text-color);
  border-bottom: 1px solid var(--border-color);
}

.header .logo {
  background-image: var(--logo-url);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

/* Button Styles */
.button {
  background-color: var(--button-bg);
  color: var(--button-text);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px 24px;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  transition: all 0.3s ease;
  cursor: pointer;
}

.button:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.button:active {
  transform: translateY(0);
}

.button.secondary {
  background-color: var(--secondary-color);
}

.button.accent {
  background-color: var(--accent-color);
}

/* Link Styles */
a, .link {
  color: var(--link-color);
  text-decoration: none;
  transition: color 0.3s ease;
}

a:hover, .link:hover {
  opacity: 0.8;
}

/* Footer Styles */
.footer {
  background-color: var(--footer-bg);
  color: var(--text-color);
  border-top: 1px solid var(--border-color);
}

/* Navigation Styles */
.nav {
  background-color: var(--header-bg);
}

.nav-item {
  color: var(--text-color);
  transition: color 0.3s ease;
}

.nav-item:hover {
  color: var(--accent-color);
}

.nav-item.active {
  color: var(--primary-color);
  font-weight: 600;
}

/* Form Styles */
.form-input {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--text-color);
  background-color: var(--header-bg);
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
}

/* Card Styles */
.card {
  background-color: var(--header-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* Background Styles */
.background-image {
  background-image: var(--background-image-url);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* Utility Classes */
.text-primary { color: var(--primary-color); }
.text-secondary { color: var(--secondary-color); }
.text-accent { color: var(--accent-color); }
.bg-primary { background-color: var(--primary-color); }
.bg-secondary { background-color: var(--secondary-color); }
.bg-accent { background-color: var(--accent-color); }
.border-primary { border-color: var(--primary-color); }
.border-secondary { border-color: var(--secondary-color); }
.border-accent { border-color: var(--accent-color); }`;

      // Add custom CSS if provided
      const customCSS = branding.custom_css || '';

      // Combine all CSS
      const finalCSS = `${cssVariables}\n\n${baseStyles}\n\n${customCSS}`;

      // Cache the CSS
      await this.cacheGeneratedCSS(tenantId, finalCSS);

      return finalCSS;

    } catch (error) {
      console.error('Error generating tenant CSS:', error);
      throw error;
    }
  }

  /**
   * Upload and process branding asset
   */
  async uploadAsset(tenantId, assetType, fileData, fileName, mimeType) {
    try {
      // Validate file type
      if (!this.isValidAssetType(assetType, mimeType)) {
        throw new Error(`Invalid file type for ${assetType}: ${mimeType}`);
      }

      // Validate file size
      if (fileData.length > this.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      // Create upload directory for tenant
      const tenantUploadDir = _path.join(this.uploadPath, 'branding', tenantId);
      await fs.mkdir(tenantUploadDir, { recursive: true });

      // Generate unique filename
      const fileExtension = _path.extname(fileName);
      const uniqueFileName = `${assetType}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
      const filePath = _path.join(tenantUploadDir, uniqueFileName);

      // Process and save file based on type
      let processedBuffer = fileData;
      
      if (this.allowedImageTypes.includes(mimeType)) {
        // Process images with Sharp
        processedBuffer = await this.processImage(fileData, assetType);
      }

      // Save file
      await fs.writeFile(filePath, processedBuffer);

      // Generate URL
      const assetUrl = `${this.cdnBaseUrl}/branding/${tenantId}/${uniqueFileName}`;

      // Update tenant record with asset URL
      await this.updateTenantAsset(tenantId, assetType, assetUrl);

      return {
        success: true,
        asset_url: assetUrl,
        file_name: uniqueFileName,
        file_size: processedBuffer.length,
        asset_type: assetType
      };

    } catch (error) {
      console.error('Error uploading asset:', error);
      throw error;
    }
  }

  /**
   * Process image with Sharp based on asset type
   */
  async processImage(imageBuffer, assetType) {
    const sharpInstance = sharp(imageBuffer);

    switch (assetType) {
    case 'logo':
      return await sharpInstance
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();

    case 'favicon':
      return await sharpInstance
        .resize(32, 32, { fit: 'cover' })
        .png()
        .toBuffer();

    case 'apple_touch_icon':
      return await sharpInstance
        .resize(180, 180, { fit: 'cover' })
        .png()
        .toBuffer();

    case 'background_image':
      return await sharpInstance
        .resize(1920, 1080, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

    default:
      return await sharpInstance
        .png()
        .toBuffer();
    }
  }

  /**
   * Validate asset type and MIME type combination
   */
  isValidAssetType(assetType, mimeType) {
    const validCombinations = {
      logo: this.allowedImageTypes,
      favicon: this.allowedIconTypes,
      apple_touch_icon: this.allowedImageTypes,
      background_image: this.allowedImageTypes
    };

    return validCombinations[assetType]?.includes(mimeType) || false;
  }

  /**
   * Update tenant asset URL in database
   */
  async updateTenantAsset(tenantId, assetType, assetUrl) {
    const assetFieldMap = {
      logo: 'logo_url',
      favicon: 'favicon_url',
      apple_touch_icon: 'custom_apple_touch_icon_url',
      background_image: 'background_image_url'
    };

    const fieldName = assetFieldMap[assetType];
    if (!fieldName) {
      throw new Error(`Unknown asset type: ${assetType}`);
    }

    const _query = `
      UPDATE tenants 
      SET ${fieldName} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE _id = $2
    `;

    await this.db._query(_query, [assetUrl, tenantId]);
  }

  /**
   * Get available theme templates
   */
  async getThemeTemplates() {
    return [
      {
        _id: 'modern_blue',
        name: 'Modern Blue',
        description: 'Clean, professional blue theme',
        preview_url: '/themes/modern_blue/preview.png',
        colors: {
          primary: '#1e40af',
          secondary: '#3b82f6',
          accent: '#10b981'
        }
      },
      {
        _id: 'warm_orange',
        name: 'Warm Orange',
        description: 'Friendly, energetic orange theme',
        preview_url: '/themes/warm_orange/preview.png',
        colors: {
          primary: '#ea580c',
          secondary: '#fb923c',
          accent: '#f59e0b'
        }
      },
      {
        _id: 'elegant_purple',
        name: 'Elegant Purple',
        description: 'Sophisticated purple theme',
        preview_url: '/themes/elegant_purple/preview.png',
        colors: {
          primary: '#7c3aed',
          secondary: '#a855f7',
          accent: '#ec4899'
        }
      },
      {
        _id: 'forest_green',
        name: 'Forest Green',
        description: 'Natural, calming green theme',
        preview_url: '/themes/forest_green/preview.png',
        colors: {
          primary: '#059669',
          secondary: '#10b981',
          accent: '#84cc16'
        }
      },
      {
        _id: 'corporate_gray',
        name: 'Corporate Gray',
        description: 'Professional, neutral gray theme',
        preview_url: '/themes/corporate_gray/preview.png',
        colors: {
          primary: '#374151',
          secondary: '#6b7280',
          accent: '#f59e0b'
        }
      }
    ];
  }

  /**
   * Apply theme template to tenant
   */
  async applyThemeTemplate(tenantId, templateId, _userId) {
    try {
      const templates = await this.getThemeTemplates();
      const template = templates.find(t => t._id === templateId);

      if (!template) {
        throw new Error(`Theme template not found: ${templateId}`);
      }

      const brandingData = {
        colors: template.colors,
        white_label_config: {
          level: 'basic'
        }
      };

      await this.updateTenantBranding(tenantId, brandingData, _userId);

      return {
        success: true,
        template_applied: templateId,
        template_name: template.name
      };

    } catch (error) {
      console.error('Error applying theme template:', error);
      throw error;
    }
  }

  /**
   * Generate branding preview
   */
  async getBrandingPreview(tenantId) {
    try {
      const branding = await this.getTenantBranding(tenantId);
      const css = await this.generateTenantCSS(tenantId);

      return {
        branding,
        css,
        preview_url: `${process.env.APP_URL || 'http://localhost:3000'}/preview/${tenantId}`,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting branding preview:', error);
      throw error;
    }
  }

  /**
   * Reset branding to defaults
   */
  async resetToDefaults(tenantId, _userId) {
    try {
      const defaultBranding = {
        colors: {
          primary: '#1e40af',
          secondary: '#3b82f6',
          header_background: '#ffffff',
          footer_background: '#f8fafc',
          text: '#1f2937',
          link: '#3b82f6',
          button: '#1e40af',
          button_text: '#ffffff',
          accent: '#10b981',
          border: '#e5e7eb'
        },
        typography: {
          font_family: 'Inter, system-ui, sans-serif',
          font_size_base: '16px'
        },
        white_label_config: {
          enabled: false,
          level: 'basic',
          custom_domain_verified: false,
          ssl_certificate_status: 'pending'
        },
        custom_css: ''
      };

      await this.updateTenantBranding(tenantId, defaultBranding, _userId);

      return true;

    } catch (error) {
      console.error('Error resetting to defaults:', error);
      throw error;
    }
  }

  /**
   * Export branding configuration
   */
  async exportBrandingConfig(tenantId) {
    try {
      const branding = await this.getTenantBranding(tenantId);
      
      return {
        version: '1.0',
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        branding_config: branding
      };

    } catch (error) {
      console.error('Error exporting config:', error);
      throw error;
    }
  }

  /**
   * Import branding configuration
   */
  async importBrandingConfig(tenantId, config, overwriteExisting = false, _userId) {
    try {
      if (!config.branding_config) {
        throw new Error('Invalid configuration format');
      }

      const brandingData = config.branding_config;

      await this.updateTenantBranding(tenantId, brandingData, _userId);

      return {
        success: true,
        imported_at: new Date().toISOString(),
        overwrite_existing: overwriteExisting
      };

    } catch (error) {
      console.error('Error importing config:', error);
      throw error;
    }
  }

  /**
   * Cache generated CSS
   */
  async cacheGeneratedCSS(tenantId, css) {
    try {
      const cacheDir = _path.join(this.uploadPath, 'css', 'cache');
      await fs.mkdir(cacheDir, { recursive: true });

      const cacheFile = _path.join(cacheDir, `${tenantId}.css`);
      await fs.writeFile(cacheFile, css);

      // Set cache expiry (1 hour)
      const expiryFile = _path.join(cacheDir, `${tenantId}.expiry`);
      await fs.writeFile(expiryFile, (Date.now() + 3600000).toString());

    } catch (error) {
      console.error('Error caching CSS:', error);
      // Don't throw error for cache failures
    }
  }

  /**
   * Log branding updates for audit trail
   */
  async logBrandingUpdate(tenantId, _userId, action, data) {
    try {
      const _query = `
        INSERT INTO branding_audit_log (
          tenant_id, user_id, action, data, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;

      await this.db._query(_query, [
        tenantId,
        _userId,
        action,
        JSON.stringify(data)
      ]);

    } catch (error) {
      console.error('Error logging branding update:', error);
      // Don't throw error for logging failures
    }
  }
}

module.exports = WhiteLabelingService;