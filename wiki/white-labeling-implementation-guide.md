<!-- Migrated from: docs/White-Labeling-Implementation-Guide.md -->

# White-Labeling Implementation Guide

## Overview

This guide provides comprehensive documentation for implementing white-labeling capabilities in the K-12 Student Information System. White-labeling allows each tenant (school/district) to customize the appearance, branding, and functionality of their instance to match their own brand identity.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Implementation Examples](#implementation-examples)
5. [Frontend Integration](#frontend-integration)
6. [Custom Domain Setup](#custom-domain-setup)
7. [Asset Management](#asset-management)
8. [CSS Generation](#css-generation)
9. [Configuration Management](#configuration-management)
10. [Best Practices](#best-practices)

## Architecture Overview

### White-Labeling Levels

The system supports three levels of white-labeling:

- **Basic**: Logo, colors, and basic customization
- **Advanced**: Custom pages, email templates, navigation menus
- **Enterprise**: Full customization including custom domains, integrations, and advanced features

### Core Components

1. **Database Functions**: PostgreSQL functions for branding operations
2. **API Layer**: RESTful endpoints for white-labeling management
3. **Service Layer**: Business logic for branding operations
4. **Asset Management**: File upload and management system
5. **CSS Generation**: Dynamic CSS generation based on tenant configuration
6. **Domain Management**: Custom domain setup and SSL certificate management

## Database Schema

### Enhanced Tenants Table

The `tenants` table has been extended with comprehensive white-labeling fields:

```sql
-- Visual Branding
logo_url VARCHAR(500)
favicon_url VARCHAR(500)
background_image_url VARCHAR(500)

-- Color Scheme
primary_color VARCHAR(7)
secondary_color VARCHAR(7)
header_background_color VARCHAR(7)
footer_background_color VARCHAR(7)
text_color VARCHAR(7)
link_color VARCHAR(7)
button_color VARCHAR(7)
button_text_color VARCHAR(7)
accent_color VARCHAR(7)
border_color VARCHAR(7)

-- Typography
font_family VARCHAR(100)
font_size_base VARCHAR(10)

-- Custom Assets
custom_favicon_url VARCHAR(500)
custom_apple_touch_icon_url VARCHAR(500)
custom_manifest_url VARCHAR(500)

-- Content Customization
custom_meta_tags JSONB
custom_footer_text TEXT
custom_header_text TEXT
custom_welcome_message TEXT
custom_login_message TEXT

-- Advanced Features
custom_error_pages JSONB
custom_email_templates JSONB
custom_notification_settings JSONB
custom_dashboard_widgets JSONB
custom_navigation_menu JSONB
custom_feature_flags JSONB

-- Legal Documents
custom_terms_of_service TEXT
custom_privacy_policy TEXT

-- Documentation
custom_help_documentation JSONB
custom_api_documentation JSONB

-- Support & Social
custom_support_contact JSONB
custom_social_media JSONB

-- Analytics & Integrations
custom_analytics_config JSONB
custom_integrations JSONB

-- White-Label Configuration
white_label_enabled BOOLEAN
white_label_level VARCHAR(20)
custom_domain_verified BOOLEAN
ssl_certificate_status VARCHAR(20)
ssl_certificate_expires_at TIMESTAMP WITH TIME ZONE

-- Custom CSS
custom_css TEXT
```

### Database Functions

#### `get_tenant_branding(tenant_uuid UUID)`
Returns complete branding configuration for a tenant.

#### `update_tenant_branding(tenant_uuid UUID, branding_data JSONB, updated_by_uuid UUID)`
Updates tenant branding configuration with audit logging.

#### `generate_white_label_css(tenant_uuid UUID)`
Generates CSS variables and custom styles for tenant branding.

#### `validate_custom_domain(tenant_uuid UUID, domain_name TEXT)`
Validates custom domain availability and generates verification code.

## API Endpoints

### Base URL: `/api/white-labeling`

#### Get Branding Configuration
```http
GET /api/white-labeling/branding
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant_id": "uuid",
    "name": "Springfield High School",
    "school_name": "Springfield High School",
    "domain": "springfield.sisplatform.com",
    "subdomain": "springfield",
    "logo_url": "https://cdn.example.com/springfield-logo.png",
    "colors": {
      "primary": "#1e40af",
      "secondary": "#3b82f6",
      "header_background": "#ffffff",
      "footer_background": "#f8fafc",
      "text": "#1f2937",
      "link": "#3b82f6",
      "button": "#1e40af",
      "button_text": "#ffffff",
      "accent": "#10b981",
      "border": "#e5e7eb"
    },
    "typography": {
      "font_family": "Inter, system-ui, sans-serif",
      "font_size_base": "16px"
    },
    "custom_content": {
      "footer_text": "© 2024 Springfield High School. All rights reserved.",
      "welcome_message": "Welcome to Springfield High School Portal!",
      "login_message": "Please sign in to access your student account."
    },
    "white_label_config": {
      "enabled": true,
      "level": "advanced",
      "custom_domain_verified": true,
      "ssl_certificate_status": "active"
    }
  }
}
```

#### Update Branding Configuration
```http
PUT /api/white-labeling/branding
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "colors": {
    "primary": "#dc2626",
    "secondary": "#ef4444",
    "button": "#dc2626",
    "button_text": "#ffffff"
  },
  "logo_url": "https://cdn.example.com/new-logo.png",
  "custom_content": {
    "welcome_message": "Welcome to our updated portal!"
  }
}
```

#### Get Generated CSS
```http
GET /api/white-labeling/css/{tenantId}
```

**Response:** CSS content with custom variables and styles.

#### Upload Branding Asset
```http
POST /api/white-labeling/upload-asset
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "asset_type": "logo",
  "file_data": "base64_encoded_file_data"
}
```

#### Validate Custom Domain
```http
POST /api/white-labeling/validate-domain
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "domain": "portal.springfield.edu"
}
```

#### Setup Custom Domain
```http
POST /api/white-labeling/setup-custom-domain
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "domain": "portal.springfield.edu",
  "verification_code": "abc123def456"
}
```

## Implementation Examples

### Frontend CSS Integration

#### 1. Load Tenant CSS
```javascript
// Load tenant-specific CSS
const loadTenantCSS = async (tenantId) => {
  try {
    const response = await fetch(`/api/white-labeling/css/${tenantId}`);
    const css = await response.text();
    
    // Create or update style element
    let styleElement = document.getElementById('tenant-css');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'tenant-css';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = css;
  } catch (error) {
    console.error('Failed to load tenant CSS:', error);
  }
};
```

#### 2. Use CSS Variables
```css
/* Use CSS variables in your styles */
.header {
  background-color: var(--header-bg, #ffffff);
  color: var(--text-color, #1f2937);
}

.button {
  background-color: var(--button-bg, #1e40af);
  color: var(--button-text, #ffffff);
  border: 1px solid var(--border-color, #e5e7eb);
}

.link {
  color: var(--link-color, #3b82f6);
}

.accent {
  color: var(--accent-color, #10b981);
}
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const BrandedHeader = ({ tenantId }) => {
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await fetch('/api/white-labeling/branding', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setBranding(data.data);
      } catch (error) {
        console.error('Failed to load branding:', error);
      }
    };

    loadBranding();
  }, [tenantId]);

  if (!branding) return <div>Loading...</div>;

  return (
    <header 
      className="header"
      style={{
        backgroundColor: branding.colors.header_background,
        color: branding.colors.text
      }}
    >
      {branding.logo_url && (
        <img 
          src={branding.logo_url} 
          alt={branding.school_name}
          className="logo"
        />
      )}
      <h1>{branding.custom_content.header_text || branding.school_name}</h1>
    </header>
  );
};
```

### Vue.js Component Example

```vue
<template>
  <div class="branded-app" :style="brandingStyles">
    <header class="header">
      <img 
        v-if="branding.logo_url" 
        :src="branding.logo_url" 
        :alt="branding.school_name"
        class="logo"
      />
      <h1>{{ branding.custom_content.header_text || branding.school_name }}</h1>
    </header>
    
    <main class="main-content">
      <div class="welcome-message">
        {{ branding.custom_content.welcome_message }}
      </div>
    </main>
    
    <footer class="footer">
      {{ branding.custom_content.footer_text }}
    </footer>
  </div>
</template>

<script>
export default {
  data() {
    return {
      branding: null
    };
  },
  
  computed: {
    brandingStyles() {
      if (!this.branding) return {};
      
      return {
        '--primary-color': this.branding.colors.primary,
        '--secondary-color': this.branding.colors.secondary,
        '--text-color': this.branding.colors.text,
        '--button-bg': this.branding.colors.button,
        '--button-text': this.branding.colors.button_text
      };
    }
  },
  
  async mounted() {
    await this.loadBranding();
  },
  
  methods: {
    async loadBranding() {
      try {
        const response = await this.$http.get('/api/white-labeling/branding');
        this.branding = response.data.data;
      } catch (error) {
        console.error('Failed to load branding:', error);
      }
    }
  }
};
</script>
```

## Custom Domain Setup

### 1. Domain Validation Process

```javascript
// Validate domain availability
const validateDomain = async (domain) => {
  const response = await fetch('/api/white-labeling/validate-domain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ domain })
  });
  
  const result = await response.json();
  return result.data;
};

// Setup custom domain
const setupCustomDomain = async (domain, verificationCode) => {
  const response = await fetch('/api/white-labeling/setup-custom-domain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ domain, verification_code: verificationCode })
  });
  
  return response.json();
};
```

### 2. DNS Configuration

For custom domains, tenants need to configure DNS records:

```
# CNAME record pointing to your platform
portal.springfield.edu. CNAME sisplatform.com.

# Or A record pointing to your server IP
portal.springfield.edu. A 192.168.1.100
```

### 3. SSL Certificate Management

The system automatically manages SSL certificates for custom domains:

- **Let's Encrypt** integration for automatic certificate generation
- Certificate renewal monitoring
- Status tracking and notifications

## Asset Management

### Supported Asset Types

- **Logo**: Main school logo (PNG, JPG, SVG)
- **Favicon**: Browser favicon (ICO, PNG)
- **Background Image**: Login/background images (PNG, JPG)
- **Apple Touch Icon**: iOS home screen icon (PNG)
- **Manifest**: PWA manifest file (JSON)

### Asset Upload Process

```javascript
const uploadAsset = async (assetType, file) => {
  const formData = new FormData();
  formData.append('asset_type', assetType);
  formData.append('file', file);
  
  const response = await fetch('/api/white-labeling/upload-asset', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

### Asset Optimization

- Automatic image optimization and resizing
- WebP conversion for better performance
- CDN integration for fast delivery
- Lazy loading for background images

## CSS Generation

### Generated CSS Structure

```css
:root {
  --primary-color: #1e40af;
  --secondary-color: #3b82f6;
  --header-bg: #ffffff;
  --footer-bg: #f8fafc;
  --text-color: #1f2937;
  --link-color: #3b82f6;
  --button-bg: #1e40af;
  --button-text: #ffffff;
  --accent-color: #10b981;
  --border-color: #e5e7eb;
  --font-family: 'Inter', system-ui, sans-serif;
  --font-size-base: 16px;
}

/* Custom CSS */
.custom-header {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
}

.custom-button {
  background-color: var(--button-bg);
  color: var(--button-text);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.custom-button:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}
```

### CSS Caching Strategy

- **Browser Cache**: 1 hour for CSS files
- **CDN Cache**: 24 hours for CSS files
- **Cache Invalidation**: Automatic on branding updates
- **Versioning**: CSS URLs include version parameters

## Configuration Management

### Export Configuration

```javascript
const exportConfig = async () => {
  const response = await fetch('/api/white-labeling/export-config', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'branding-config.json';
  a.click();
};
```

### Import Configuration

```javascript
const importConfig = async (configFile, overwriteExisting = false) => {
  const formData = new FormData();
  formData.append('config', configFile);
  formData.append('overwrite_existing', overwriteExisting);
  
  const response = await fetch('/api/white-labeling/import-config', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

## Best Practices

### 1. Performance Optimization

- **Lazy Load Assets**: Load branding assets only when needed
- **CSS Optimization**: Minify generated CSS
- **Image Optimization**: Compress and optimize uploaded images
- **CDN Usage**: Use CDN for asset delivery

### 2. Security Considerations

- **Asset Validation**: Validate uploaded file types and sizes
- **XSS Prevention**: Sanitize custom content and CSS
- **Domain Validation**: Verify domain ownership before setup
- **SSL Enforcement**: Require HTTPS for custom domains

### 3. User Experience

- **Preview Mode**: Allow real-time preview of changes
- **Undo/Redo**: Provide ability to revert changes
- **Templates**: Offer pre-designed branding templates
- **Guidance**: Provide clear instructions and examples

### 4. Maintenance

- **Backup Configurations**: Regular backup of branding configurations
- **Version Control**: Track changes to branding configurations
- **Monitoring**: Monitor custom domain SSL certificate status
- **Cleanup**: Remove unused assets and configurations

### 5. Accessibility

- **Color Contrast**: Ensure sufficient color contrast ratios
- **Font Readability**: Use readable font sizes and families
- **Alt Text**: Provide alt text for custom images
- **Keyboard Navigation**: Ensure custom elements are keyboard accessible

## Troubleshooting

### Common Issues

1. **CSS Not Loading**: Check tenant ID and network connectivity
2. **Assets Not Displaying**: Verify asset URLs and permissions
3. **Custom Domain Issues**: Check DNS configuration and SSL status
4. **Performance Issues**: Optimize images and enable caching

### Debug Tools

- **Branding Inspector**: Browser extension for debugging branding
- **CSS Validator**: Validate generated CSS
- **Asset Analyzer**: Analyze asset sizes and formats
- **Domain Checker**: Verify domain configuration

## Conclusion

This white-labeling implementation provides comprehensive customization capabilities for the K-12 Student Information System. By following this guide, developers can implement a robust white-labeling system that allows each tenant to create a unique, branded experience while maintaining system performance and security.

The system is designed to be scalable, maintainable, and user-friendly, providing both basic customization options for simple use cases and advanced features for enterprise-level requirements.
