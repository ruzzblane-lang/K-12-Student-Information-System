# White-Labeling Developer Guide

## Complete Implementation Guide for K-12 SIS White-Labeling

This comprehensive guide provides developers with everything needed to implement, customize, and extend the white-labeling capabilities of the K-12 Student Information System.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Service Layer](#service-layer)
4. [API Endpoints](#api-endpoints)
5. [Asset Management](#asset-management)
6. [CSS Generation System](#css-generation-system)
7. [Theme Templates](#theme-templates)
8. [Custom Domain Management](#custom-domain-management)
9. [Frontend Integration](#frontend-integration)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

## Architecture Overview

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│                 │    │                 │    │                 │
│ • React/Vue     │◄──►│ • Controllers   │◄──►│ • Tenants       │
│ • CSS Variables │    │ • Services      │    │ • Branding      │
│ • Asset Loading │    │ • Routes        │    │ • Audit Log     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Asset Store   │              │
         │              │                 │              │
         └─────────────►│ • File Upload   │◄─────────────┘
                        │ • Image Proc    │
                        │ • CDN Delivery  │
                        └─────────────────┘
```

### White-Labeling Levels

#### Basic Level
- Color scheme customization
- Logo and favicon upload
- Basic typography settings
- Simple content customization

#### Advanced Level
- Custom CSS injection
- Email template customization
- Dashboard widget configuration
- Navigation menu customization
- Support contact configuration

#### Enterprise Level
- Custom domain setup
- SSL certificate management
- Advanced integrations
- Custom analytics configuration
- Legal document customization

## Database Schema

### Enhanced Tenants Table

The white-labeling system extends the existing `tenants` table with comprehensive branding fields:

```sql
-- Visual Branding
ALTER TABLE tenants ADD COLUMN logo_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN favicon_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN background_image_url VARCHAR(500);

-- Color Scheme
ALTER TABLE tenants ADD COLUMN primary_color VARCHAR(7) DEFAULT '#1e40af';
ALTER TABLE tenants ADD COLUMN secondary_color VARCHAR(7) DEFAULT '#3b82f6';
ALTER TABLE tenants ADD COLUMN header_background_color VARCHAR(7) DEFAULT '#ffffff';
ALTER TABLE tenants ADD COLUMN footer_background_color VARCHAR(7) DEFAULT '#f8fafc';
ALTER TABLE tenants ADD COLUMN text_color VARCHAR(7) DEFAULT '#1f2937';
ALTER TABLE tenants ADD COLUMN link_color VARCHAR(7) DEFAULT '#3b82f6';
ALTER TABLE tenants ADD COLUMN button_color VARCHAR(7) DEFAULT '#1e40af';
ALTER TABLE tenants ADD COLUMN button_text_color VARCHAR(7) DEFAULT '#ffffff';
ALTER TABLE tenants ADD COLUMN accent_color VARCHAR(7) DEFAULT '#10b981';
ALTER TABLE tenants ADD COLUMN border_color VARCHAR(7) DEFAULT '#e5e7eb';

-- Typography
ALTER TABLE tenants ADD COLUMN font_family VARCHAR(100) DEFAULT 'Inter, system-ui, sans-serif';
ALTER TABLE tenants ADD COLUMN font_size_base VARCHAR(10) DEFAULT '16px';

-- Custom Assets
ALTER TABLE tenants ADD COLUMN custom_favicon_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN custom_apple_touch_icon_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN custom_manifest_url VARCHAR(500);

-- Content Customization
ALTER TABLE tenants ADD COLUMN custom_meta_tags JSONB;
ALTER TABLE tenants ADD COLUMN custom_footer_text TEXT;
ALTER TABLE tenants ADD COLUMN custom_header_text TEXT;
ALTER TABLE tenants ADD COLUMN custom_welcome_message TEXT;
ALTER TABLE tenants ADD COLUMN custom_login_message TEXT;

-- Advanced Features
ALTER TABLE tenants ADD COLUMN custom_error_pages JSONB;
ALTER TABLE tenants ADD COLUMN custom_email_templates JSONB;
ALTER TABLE tenants ADD COLUMN custom_notification_settings JSONB;
ALTER TABLE tenants ADD COLUMN custom_dashboard_widgets JSONB;
ALTER TABLE tenants ADD COLUMN custom_navigation_menu JSONB;
ALTER TABLE tenants ADD COLUMN custom_feature_flags JSONB;

-- Legal Documents
ALTER TABLE tenants ADD COLUMN custom_terms_of_service TEXT;
ALTER TABLE tenants ADD COLUMN custom_privacy_policy TEXT;

-- Documentation
ALTER TABLE tenants ADD COLUMN custom_help_documentation JSONB;
ALTER TABLE tenants ADD COLUMN custom_api_documentation JSONB;

-- Support & Social
ALTER TABLE tenants ADD COLUMN custom_support_contact JSONB;
ALTER TABLE tenants ADD COLUMN custom_social_media JSONB;

-- Analytics & Integrations
ALTER TABLE tenants ADD COLUMN custom_analytics_config JSONB;
ALTER TABLE tenants ADD COLUMN custom_integrations JSONB;

-- White-Label Configuration
ALTER TABLE tenants ADD COLUMN white_label_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN white_label_level VARCHAR(20) DEFAULT 'basic';
ALTER TABLE tenants ADD COLUMN custom_domain_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN ssl_certificate_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE tenants ADD COLUMN ssl_certificate_expires_at TIMESTAMP WITH TIME ZONE;

-- Custom CSS
ALTER TABLE tenants ADD COLUMN custom_css TEXT;
```

### Branding Audit Log Table

```sql
CREATE TABLE IF NOT EXISTS branding_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branding_audit_log_tenant ON branding_audit_log(tenant_id);
CREATE INDEX idx_branding_audit_log_created_at ON branding_audit_log(created_at);
```

## Service Layer

### WhiteLabelingService

The core service handles all white-labeling business logic:

```javascript
const whiteLabelingService = new WhiteLabelingService(db);

// Get tenant branding
const branding = await whiteLabelingService.getTenantBranding(tenantId, userId);

// Update branding
await whiteLabelingService.updateTenantBranding(tenantId, brandingData, userId);

// Generate CSS
const css = await whiteLabelingService.generateTenantCSS(tenantId);

// Upload asset
const result = await whiteLabelingService.uploadAsset(
  tenantId, 'logo', fileBuffer, fileName, mimeType
);

// Apply theme template
await whiteLabelingService.applyThemeTemplate(tenantId, 'modern_blue', userId);
```

### Key Service Methods

#### `getTenantBranding(tenantId, userId)`
Returns complete branding configuration including:
- Color scheme
- Typography settings
- Custom content
- Advanced features
- Asset URLs
- White-label configuration

#### `updateTenantBranding(tenantId, brandingData, userId)`
Updates branding configuration with:
- Validation of input data
- Dynamic query building
- Audit logging
- Cache invalidation

#### `generateTenantCSS(tenantId)`
Generates dynamic CSS with:
- CSS variables from branding data
- Base component styles
- Custom CSS injection
- Caching for performance

#### `uploadAsset(tenantId, assetType, fileData, fileName, mimeType)`
Handles asset upload with:
- File type validation
- Image processing with Sharp
- Optimization for different asset types
- Secure file storage

## API Endpoints

### Branding Configuration

```http
# Get branding configuration
GET /api/white-labeling/branding
Authorization: Bearer <jwt_token>

# Update branding configuration
PUT /api/white-labeling/branding
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "colors": {
    "primary": "#dc2626",
    "secondary": "#ef4444"
  },
  "typography": {
    "font_family": "Georgia, serif"
  },
  "custom_content": {
    "welcome_message": "Welcome to our portal!"
  }
}
```

### CSS Generation

```http
# Get generated CSS
GET /api/white-labeling/css
GET /api/white-labeling/css/{tenantId}

# Response: CSS content with custom variables and styles
```

### Asset Management

```http
# Upload branding asset
POST /api/white-labeling/upload-asset
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

asset_type: logo
asset: <file>
```

### Theme Templates

```http
# Get available themes
GET /api/white-labeling/themes

# Apply theme template
POST /api/white-labeling/themes/apply
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "template_id": "modern_blue"
}
```

### Custom Domain Setup

```http
# Validate domain
POST /api/white-labeling/validate-domain
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "domain": "portal.springfield.edu"
}

# Setup custom domain
POST /api/white-labeling/setup-custom-domain
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "domain": "portal.springfield.edu",
  "verification_code": "abc123def456"
}
```

### Configuration Management

```http
# Export configuration
GET /api/white-labeling/export-config
Authorization: Bearer <jwt_token>

# Import configuration
POST /api/white-labeling/import-config
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "config": { ... },
  "overwriteExisting": false
}
```

## Asset Management

### Supported Asset Types

#### Logo
- **Formats**: PNG, JPG, SVG, WebP
- **Processing**: Resized to 200x200px (fit inside, no enlargement)
- **Usage**: Header, login page, emails

#### Favicon
- **Formats**: ICO, PNG
- **Processing**: Resized to 32x32px
- **Usage**: Browser tab, bookmarks

#### Apple Touch Icon
- **Formats**: PNG, JPG, WebP
- **Processing**: Resized to 180x180px
- **Usage**: iOS home screen

#### Background Image
- **Formats**: PNG, JPG, WebP
- **Processing**: Resized to 1920x1080px, JPEG quality 80%
- **Usage**: Login page background, dashboard

### Asset Processing Pipeline

```javascript
// 1. Validation
if (!isValidAssetType(assetType, mimeType)) {
  throw new Error('Invalid file type');
}

// 2. Processing with Sharp
const processedBuffer = await sharp(fileBuffer)
  .resize(dimensions.width, dimensions.height, options)
  .format(outputFormat)
  .toBuffer();

// 3. Storage
const filePath = path.join(tenantUploadDir, uniqueFileName);
await fs.writeFile(filePath, processedBuffer);

// 4. Database Update
await updateTenantAsset(tenantId, assetType, assetUrl);
```

### Asset Optimization

- **Automatic compression**: Images are optimized for web delivery
- **Format conversion**: WebP conversion for better performance
- **CDN integration**: Assets served through CDN for fast delivery
- **Lazy loading**: Background images loaded on demand

## CSS Generation System

### Generated CSS Structure

```css
:root {
  /* Color Variables */
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
  
  /* Typography Variables */
  --font-family: Inter, system-ui, sans-serif;
  --font-size-base: 16px;
  
  /* Asset Variables */
  --logo-url: url('https://cdn.example.com/logo.png');
  --background-image-url: url('https://cdn.example.com/bg.jpg');
}

/* Base Component Styles */
.header {
  background-color: var(--header-bg);
  color: var(--text-color);
}

.button {
  background-color: var(--button-bg);
  color: var(--button-text);
  transition: all 0.3s ease;
}

.button:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

/* Custom CSS Injection */
.custom-class {
  /* Tenant-specific custom styles */
}
```

### CSS Caching Strategy

- **Browser Cache**: 1 hour for CSS files
- **CDN Cache**: 24 hours for CSS files
- **Cache Invalidation**: Automatic on branding updates
- **Versioning**: CSS URLs include version parameters

## Theme Templates

### Pre-built Templates

#### Modern Blue
```javascript
{
  id: 'modern_blue',
  name: 'Modern Blue',
  description: 'Clean, professional blue theme',
  colors: {
    primary: '#1e40af',
    secondary: '#3b82f6',
    accent: '#10b981'
  }
}
```

#### Warm Orange
```javascript
{
  id: 'warm_orange',
  name: 'Warm Orange',
  description: 'Friendly, energetic orange theme',
  colors: {
    primary: '#ea580c',
    secondary: '#fb923c',
    accent: '#f59e0b'
  }
}
```

#### Elegant Purple
```javascript
{
  id: 'elegant_purple',
  name: 'Elegant Purple',
  description: 'Sophisticated purple theme',
  colors: {
    primary: '#7c3aed',
    secondary: '#a855f7',
    accent: '#ec4899'
  }
}
```

### Custom Theme Creation

```javascript
// Create custom theme
const customTheme = {
  id: 'school_custom',
  name: 'School Custom',
  description: 'Custom theme for our school',
  colors: {
    primary: '#2d5016',    // School green
    secondary: '#4a7c59',  // Light green
    accent: '#f4a261'      // Accent orange
  }
};

// Apply custom theme
await whiteLabelingService.applyThemeTemplate(
  tenantId, 'school_custom', userId
);
```

## Custom Domain Management

### Domain Validation Process

1. **Domain Validation**
   ```javascript
   const verificationCode = generateVerificationCode();
   await storeVerificationCode(tenantId, domain, verificationCode);
   ```

2. **DNS Configuration**
   ```
   # TXT record for verification
   _sis-verify.portal.springfield.edu. TXT "abc123def456"
   
   # CNAME record for routing
   portal.springfield.edu. CNAME sisplatform.com.
   ```

3. **SSL Certificate Management**
   - Automatic Let's Encrypt certificate generation
   - Certificate renewal monitoring
   - Status tracking and notifications

### Domain Setup Workflow

```javascript
// 1. Validate domain
const validation = await whiteLabelingService.validateDomain(
  tenantId, 'portal.springfield.edu'
);

// 2. Configure DNS (manual step)
// Add TXT record: _sis-verify.portal.springfield.edu = verificationCode

// 3. Setup domain
const setup = await whiteLabelingService.setupCustomDomain(
  tenantId, 'portal.springfield.edu', verificationCode
);

// 4. Monitor SSL status
const status = await whiteLabelingService.getDomainStatus(tenantId);
```

## Frontend Integration

### React Integration

```jsx
import React, { useState, useEffect } from 'react';

const BrandedApp = ({ tenantId }) => {
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

  useEffect(() => {
    const loadCSS = async () => {
      try {
        const response = await fetch(`/api/white-labeling/css/${tenantId}`);
        const css = await response.text();
        
        let styleElement = document.getElementById('tenant-css');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'tenant-css';
          document.head.appendChild(styleElement);
        }
        
        styleElement.textContent = css;
      } catch (error) {
        console.error('Failed to load CSS:', error);
      }
    };

    if (tenantId) {
      loadCSS();
    }
  }, [tenantId]);

  if (!branding) return <div>Loading...</div>;

  return (
    <div className="app" style={{
      '--primary-color': branding.colors.primary,
      '--secondary-color': branding.colors.secondary,
      '--font-family': branding.typography.font_family
    }}>
      <header className="header">
        {branding.logo_url && (
          <img 
            src={branding.logo_url} 
            alt={branding.school_name}
            className="logo"
          />
        )}
        <h1>{branding.custom_content.header_text || branding.school_name}</h1>
      </header>
      
      <main className="main-content">
        <div className="welcome-message">
          {branding.custom_content.welcome_message}
        </div>
      </main>
      
      <footer className="footer">
        {branding.custom_content.footer_text}
      </footer>
    </div>
  );
};
```

### Vue.js Integration

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
        '--font-family': this.branding.typography.font_family
      };
    }
  },
  
  async mounted() {
    await this.loadBranding();
    await this.loadCSS();
  },
  
  methods: {
    async loadBranding() {
      try {
        const response = await this.$http.get('/api/white-labeling/branding');
        this.branding = response.data.data;
      } catch (error) {
        console.error('Failed to load branding:', error);
      }
    },
    
    async loadCSS() {
      try {
        const response = await this.$http.get('/api/white-labeling/css');
        const css = response.data;
        
        let styleElement = document.getElementById('tenant-css');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'tenant-css';
          document.head.appendChild(styleElement);
        }
        
        styleElement.textContent = css;
      } catch (error) {
        console.error('Failed to load CSS:', error);
      }
    }
  }
};
</script>
```

### CSS Variables Usage

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

.button:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.link {
  color: var(--link-color, #3b82f6);
}

.accent {
  color: var(--accent-color, #10b981);
}

/* Logo background */
.logo {
  background-image: var(--logo-url);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
```

## Testing

### Unit Tests

```javascript
describe('WhiteLabelingService', () => {
  let service;
  let mockDb;

  beforeEach(() => {
    mockDb = { query: jest.fn() };
    service = new WhiteLabelingService(mockDb);
  });

  describe('getTenantBranding', () => {
    it('should return complete branding configuration', async () => {
      const mockTenant = {
        id: 'test-tenant-id',
        primary_color: '#1e40af',
        logo_url: 'https://example.com/logo.png'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockTenant] });

      const result = await service.getTenantBranding('test-tenant-id');

      expect(result.tenant_id).toBe('test-tenant-id');
      expect(result.colors.primary).toBe('#1e40af');
      expect(result.logo_url).toBe('https://example.com/logo.png');
    });
  });

  describe('generateTenantCSS', () => {
    it('should generate CSS with tenant variables', async () => {
      const mockBranding = {
        colors: { primary: '#dc2626' },
        typography: { font_family: 'Georgia' }
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockBranding] });

      const css = await service.generateTenantCSS('test-tenant-id');

      expect(css).toContain('--primary-color: #dc2626');
      expect(css).toContain('--font-family: Georgia');
      expect(css).toContain('.header {');
      expect(css).toContain('.button {');
    });
  });
});
```

### Integration Tests

```javascript
describe('White-Labeling API', () => {
  let adminToken;

  beforeAll(() => {
    adminToken = generateToken('admin-user-id', 'test-tenant-id', 'admin');
  });

  describe('GET /api/white-labeling/branding', () => {
    it('should return branding configuration', async () => {
      const response = await request(app)
        .get('/api/white-labeling/branding')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('colors');
      expect(response.body.data).toHaveProperty('typography');
      expect(response.body.data).toHaveProperty('white_label_config');
    });
  });

  describe('PUT /api/white-labeling/branding', () => {
    it('should update branding configuration', async () => {
      const brandingData = {
        colors: { primary: '#dc2626' },
        typography: { font_family: 'Georgia, serif' }
      };

      const response = await request(app)
        .put('/api/white-labeling/branding')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(brandingData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Branding configuration updated successfully');
    });
  });
});
```

### Demo Client

```javascript
// Run the white-labeling demo
const client = new WhiteLabelDemoClient({
  baseUrl: 'http://localhost:3000/api',
  tenantSlug: 'springfield',
  email: 'admin@springfield.edu',
  password: 'secure-password'
});

await client.runDemo();
```

## Deployment

### Environment Variables

```bash
# Asset Management
UPLOAD_PATH=/var/www/uploads
CDN_BASE_URL=https://cdn.example.com

# Domain Management
APP_URL=https://sisplatform.com
SSL_CERT_PATH=/etc/ssl/certs
SSL_KEY_PATH=/etc/ssl/private

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/school_sis

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
```

### Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create upload directories
RUN mkdir -p /app/uploads/branding /app/uploads/css/cache

EXPOSE 3000

CMD ["npm", "start"]
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name sisplatform.com *.sisplatform.com;

    # Asset serving
    location /uploads/ {
        alias /var/www/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # CSS serving with caching
    location /api/white-labeling/css {
        proxy_pass http://backend;
        proxy_cache_valid 200 1h;
        add_header X-Cache-Status $upstream_cache_status;
    }

    # API routing
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Common Issues

#### CSS Not Loading
```javascript
// Check tenant ID and network connectivity
const response = await fetch(`/api/white-labeling/css/${tenantId}`);
if (!response.ok) {
  console.error('CSS loading failed:', response.status);
}
```

#### Assets Not Displaying
```javascript
// Verify asset URLs and permissions
const branding = await getTenantBranding(tenantId);
console.log('Logo URL:', branding.logo_url);

// Check if asset exists
const assetResponse = await fetch(branding.logo_url);
if (!assetResponse.ok) {
  console.error('Asset not accessible:', assetResponse.status);
}
```

#### Custom Domain Issues
```bash
# Check DNS configuration
dig TXT _sis-verify.portal.springfield.edu
dig CNAME portal.springfield.edu

# Check SSL certificate
openssl s_client -connect portal.springfield.edu:443 -servername portal.springfield.edu
```

#### Performance Issues
```javascript
// Optimize images before upload
const optimizedBuffer = await sharp(fileBuffer)
  .resize(200, 200, { fit: 'inside' })
  .jpeg({ quality: 80 })
  .toBuffer();

// Enable CSS caching
app.use('/api/white-labeling/css', express.static('css-cache', {
  maxAge: '1h'
}));
```

### Debug Tools

#### Branding Inspector
```javascript
// Browser console tool for debugging
window.inspectBranding = async () => {
  const branding = await fetch('/api/white-labeling/branding').then(r => r.json());
  console.table(branding.data.colors);
  console.log('CSS Variables:', branding.data.css_variables);
};
```

#### CSS Validator
```javascript
// Validate generated CSS
const validateCSS = (css) => {
  const parser = new CSSParser();
  try {
    const stylesheet = parser.parse(css);
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
};
```

## Conclusion

This comprehensive white-labeling system provides:

- **Complete Visual Customization**: Colors, fonts, logos, and layouts
- **Asset Management**: Upload, processing, and optimization
- **Theme Templates**: Pre-built and custom themes
- **Custom Domains**: Full domain setup with SSL
- **Advanced Features**: Email templates, widgets, navigation
- **Audit Trail**: Complete change tracking
- **Performance**: Caching and optimization
- **Security**: Validation and sanitization

The system is designed to be scalable, maintainable, and user-friendly, providing both basic customization options for simple use cases and advanced features for enterprise-level requirements.

For additional support or customization needs, refer to the API documentation and test suites provided in the codebase.
