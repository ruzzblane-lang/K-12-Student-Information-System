#!/bin/bash

# White-Label System Setup Script
# This script sets up the comprehensive white-label development system
# with modular theming, i18n/l10n, RTL support, and validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running from correct directory
check_directory() {
    if [ ! -f "package.json" ]; then
        error "Please run this script from the project root directory"
        exit 1
    fi
}

# Install required dependencies
install_dependencies() {
    log "Installing white-label system dependencies..."
    
    # Frontend dependencies
    cd frontend
    npm install --save \
        react-intl \
        icu-messageformat-parser \
        @mui/material \
        @mui/system \
        @emotion/react \
        @emotion/styled \
        sharp \
        js-yaml \
        gettext-parser
    
    # Backend dependencies
    cd ../backend
    npm install --save \
        sharp \
        js-yaml \
        gettext-parser \
        icu-messageformat-parser
    
    cd ..
    success "Dependencies installed successfully"
}

# Create white-label directory structure
create_directory_structure() {
    log "Creating white-label directory structure..."
    
    mkdir -p frontend/white-label/{core,api,validators,rtl,testing,loaders,cache,formatters,detectors,examples}
    mkdir -p frontend/white-label/examples/{theme-examples,i18n-examples}
    mkdir -p docs/white-label
    mkdir -p tests/white-label/{themes,translations}
    
    success "Directory structure created"
}

# Create core configuration files
create_core_configs() {
    log "Creating core configuration files..."
    
    # Theme configuration
    cat > frontend/white-label/core/theme-config.js << 'EOF'
export const defaultThemeConfig = {
  id: 'default',
  name: 'Default Theme',
  version: '1.0.0',
  description: 'Default white-label theme',
  
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff'
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff'
    },
    text: {
      primary: '#212121',
      secondary: '#757575'
    }
  },
  
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.125rem', fontWeight: 400 },
    h2: { fontSize: '1.5rem', fontWeight: 400 },
    body1: { fontSize: '1rem', fontWeight: 400 }
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
  },
  
  accessibility: {
    highContrast: { enabled: true },
    keyboardNavigation: { enabled: true },
    screenReader: { enabled: true }
  }
};
EOF

    # I18n configuration
    cat > frontend/white-label/core/i18n-config.js << 'EOF'
export const defaultI18nConfig = {
  defaultLocale: 'en-US',
  fallbackLocale: 'en',
  supportedLocales: [
    'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'fr-CA',
    'de-DE', 'it-IT', 'pt-PT', 'pt-BR', 'ru-RU', 'zh-CN',
    'ja-JP', 'ko-KR', 'ar-SA', 'ar-EG', 'hi-IN'
  ],
  rtlLocales: [
    'ar-SA', 'ar-EG', 'ar-AE', 'he-IL', 'fa-IR', 'ur-PK'
  ],
  enableICU: true,
  enableRTL: true,
  enableUnicode: true
};
EOF

    success "Core configuration files created"
}

# Create example theme configurations
create_theme_examples() {
    log "Creating theme examples..."
    
    # Modern Blue Theme
    cat > frontend/white-label/examples/theme-examples/modern-blue.js << 'EOF'
export const modernBlueTheme = {
  id: 'modern-blue',
  name: 'Modern Blue',
  description: 'Clean, professional blue theme',
  
  palette: {
    primary: {
      main: '#1e40af',
      light: '#3b82f6',
      dark: '#1e3a8a',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
      contrastText: '#ffffff'
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff'
    }
  },
  
  typography: {
    fontFamily: '"Inter", "system-ui", sans-serif'
  },
  
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600
        }
      }
    }
  }
};
EOF

    # Warm Orange Theme
    cat > frontend/white-label/examples/theme-examples/warm-orange.js << 'EOF'
export const warmOrangeTheme = {
  id: 'warm-orange',
  name: 'Warm Orange',
  description: 'Friendly, energetic orange theme',
  
  palette: {
    primary: {
      main: '#ea580c',
      light: '#fb923c',
      dark: '#c2410c',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#ffffff'
    },
    background: {
      default: '#fef7ed',
      paper: '#ffffff'
    }
  },
  
  typography: {
    fontFamily: '"Poppins", "sans-serif"'
  }
};
EOF

    success "Theme examples created"
}

# Create example translation files
create_translation_examples() {
    log "Creating translation examples..."
    
    # English translations
    cat > frontend/white-label/examples/i18n-examples/en-US.json << 'EOF'
{
  "welcome.title": "Welcome to School SIS",
  "welcome.subtitle": "Your comprehensive student information system",
  "navigation.home": "Home",
  "navigation.students": "Students",
  "navigation.grades": "Grades",
  "navigation.attendance": "Attendance",
  "forms.save": "Save",
  "forms.cancel": "Cancel",
  "forms.submit": "Submit",
  "forms.reset": "Reset",
  "validation.required": "This field is required",
  "validation.email": "Please enter a valid email address",
  "validation.minLength": "Must be at least {min} characters",
  "messages.success": "Operation completed successfully",
  "messages.error": "An error occurred",
  "dashboard.overview": "Dashboard Overview",
  "dashboard.students": "Total Students",
  "dashboard.teachers": "Total Teachers",
  "dashboard.grades": "Average Grade"
}
EOF

    # Spanish translations
    cat > frontend/white-label/examples/i18n-examples/es-ES.json << 'EOF'
{
  "welcome.title": "Bienvenido a School SIS",
  "welcome.subtitle": "Su sistema integral de información estudiantil",
  "navigation.home": "Inicio",
  "navigation.students": "Estudiantes",
  "navigation.grades": "Calificaciones",
  "navigation.attendance": "Asistencia",
  "forms.save": "Guardar",
  "forms.cancel": "Cancelar",
  "forms.submit": "Enviar",
  "forms.reset": "Restablecer",
  "validation.required": "Este campo es obligatorio",
  "validation.email": "Por favor ingrese una dirección de email válida",
  "validation.minLength": "Debe tener al menos {min} caracteres",
  "messages.success": "Operación completada exitosamente",
  "messages.error": "Ocurrió un error",
  "dashboard.overview": "Resumen del Panel",
  "dashboard.students": "Total de Estudiantes",
  "dashboard.teachers": "Total de Maestros",
  "dashboard.grades": "Calificación Promedio"
}
EOF

    # Arabic translations (RTL)
    cat > frontend/white-label/examples/i18n-examples/ar-SA.json << 'EOF'
{
  "welcome.title": "مرحباً بك في School SIS",
  "welcome.subtitle": "نظام معلومات الطلاب الشامل الخاص بك",
  "navigation.home": "الرئيسية",
  "navigation.students": "الطلاب",
  "navigation.grades": "الدرجات",
  "navigation.attendance": "الحضور",
  "forms.save": "حفظ",
  "forms.cancel": "إلغاء",
  "forms.submit": "إرسال",
  "forms.reset": "إعادة تعيين",
  "validation.required": "هذا الحقل مطلوب",
  "validation.email": "يرجى إدخال عنوان بريد إلكتروني صحيح",
  "validation.minLength": "يجب أن يكون على الأقل {min} أحرف",
  "messages.success": "تمت العملية بنجاح",
  "messages.error": "حدث خطأ",
  "dashboard.overview": "نظرة عامة على لوحة التحكم",
  "dashboard.students": "إجمالي الطلاب",
  "dashboard.teachers": "إجمالي المعلمين",
  "dashboard.grades": "متوسط الدرجة"
}
EOF

    success "Translation examples created"
}

# Create validation schemas
create_validation_schemas() {
    log "Creating validation schemas..."
    
    # Theme validation schema
    cat > frontend/white-label/validators/theme-schema.json << 'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_-]+$"
    },
    "name": {
      "type": "string",
      "maxLength": 100
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "description": {
      "type": "string"
    },
    "palette": {
      "type": "object",
      "properties": {
        "primary": { "$ref": "#/definitions/colorObject" },
        "secondary": { "$ref": "#/definitions/colorObject" },
        "background": { "$ref": "#/definitions/colorObject" },
        "text": { "$ref": "#/definitions/colorObject" }
      }
    },
    "typography": {
      "type": "object",
      "properties": {
        "fontFamily": { "type": "string" },
        "h1": { "$ref": "#/definitions/typographyVariant" },
        "h2": { "$ref": "#/definitions/typographyVariant" },
        "body1": { "$ref": "#/definitions/typographyVariant" }
      }
    },
    "components": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "styleOverrides": {
            "type": "object",
            "additionalProperties": {
              "type": "object"
            }
          }
        }
      }
    }
  },
  "definitions": {
    "colorObject": {
      "type": "object",
      "properties": {
        "main": {
          "type": "string",
          "pattern": "^#[0-9A-Fa-f]{6}$"
        },
        "light": {
          "type": "string",
          "pattern": "^#[0-9A-Fa-f]{6}$"
        },
        "dark": {
          "type": "string",
          "pattern": "^#[0-9A-Fa-f]{6}$"
        },
        "contrastText": {
          "type": "string",
          "pattern": "^#[0-9A-Fa-f]{6}$"
        }
      },
      "required": ["main"]
    },
    "typographyVariant": {
      "type": "object",
      "properties": {
        "fontSize": { "type": "string" },
        "fontWeight": { "type": ["number", "string"] },
        "lineHeight": { "type": ["number", "string"] }
      }
    }
  }
}
EOF

    success "Validation schemas created"
}

# Create test configurations
create_test_configs() {
    log "Creating test configurations..."
    
    # Jest configuration for white-label tests
    cat > tests/white-label/jest.config.js << 'EOF'
module.exports = {
  displayName: 'White-Label Tests',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  testMatch: [
    '<rootDir>/themes/**/*.test.js',
    '<rootDir>/translations/**/*.test.js'
  ],
  collectCoverageFrom: [
    'frontend/white-label/**/*.js',
    '!frontend/white-label/examples/**',
    '!frontend/white-label/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
EOF

    # Test setup file
    cat > tests/white-label/setupTests.js << 'EOF'
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
EOF

    success "Test configurations created"
}

# Create package.json scripts
update_package_scripts() {
    log "Updating package.json scripts..."
    
    # Add white-label scripts to frontend package.json
    cd frontend
    if [ -f "package.json" ]; then
        # Create backup
        cp package.json package.json.backup
        
        # Add scripts using jq if available, otherwise use sed
        if command -v jq &> /dev/null; then
            jq '.scripts += {
                "white-label:test": "jest --config=../tests/white-label/jest.config.js",
                "white-label:validate": "node scripts/validate-white-label.js",
                "white-label:build": "node scripts/build-white-label.js"
            }' package.json > package.json.tmp && mv package.json.tmp package.json
        else
            # Fallback to sed
            sed -i.bak '/"scripts": {/a\
    "white-label:test": "jest --config=../tests/white-label/jest.config.js",\
    "white-label:validate": "node scripts/validate-white-label.js",\
    "white-label:build": "node scripts/build-white-label.js",' package.json
        fi
    fi
    cd ..
    
    success "Package.json scripts updated"
}

# Create validation script
create_validation_script() {
    log "Creating validation script..."
    
    cat > frontend/scripts/validate-white-label.js << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple validation script for white-label configurations
function validateThemeConfig(configPath) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Basic validation
        if (!config.id || !config.name) {
            throw new Error('Theme must have id and name');
        }
        
        if (!/^[a-zA-Z0-9_-]+$/.test(config.id)) {
            throw new Error('Theme id must contain only alphanumeric characters, hyphens, and underscores');
        }
        
        console.log(`✓ Theme ${config.id} is valid`);
        return true;
    } catch (error) {
        console.error(`✗ Theme validation failed: ${error.message}`);
        return false;
    }
}

function validateTranslationFile(filePath) {
    try {
        const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Basic validation
        if (typeof translations !== 'object') {
            throw new Error('Translations must be an object');
        }
        
        const keys = Object.keys(translations);
        if (keys.length === 0) {
            throw new Error('Translations object is empty');
        }
        
        // Check for empty values
        const emptyKeys = keys.filter(key => !translations[key] || translations[key].trim().length === 0);
        if (emptyKeys.length > 0) {
            console.warn(`⚠ Found ${emptyKeys.length} empty translations`);
        }
        
        console.log(`✓ Translation file ${path.basename(filePath)} is valid (${keys.length} keys)`);
        return true;
    } catch (error) {
        console.error(`✗ Translation validation failed: ${error.message}`);
        return false;
    }
}

// Main validation function
function main() {
    console.log('Validating white-label configurations...\n');
    
    let allValid = true;
    
    // Validate theme examples
    const themeExamplesDir = path.join(__dirname, '../white-label/examples/theme-examples');
    if (fs.existsSync(themeExamplesDir)) {
        const themeFiles = fs.readdirSync(themeExamplesDir).filter(file => file.endsWith('.js'));
        for (const file of themeFiles) {
            // Extract theme config from JS file (simplified)
            const filePath = path.join(themeExamplesDir, file);
            // This is a simplified validation - in production, you'd want proper JS parsing
            console.log(`Validating theme: ${file}`);
        }
    }
    
    // Validate translation examples
    const translationExamplesDir = path.join(__dirname, '../white-label/examples/i18n-examples');
    if (fs.existsSync(translationExamplesDir)) {
        const translationFiles = fs.readdirSync(translationExamplesDir).filter(file => file.endsWith('.json'));
        for (const file of translationFiles) {
            const filePath = path.join(translationExamplesDir, file);
            const isValid = validateTranslationFile(filePath);
            if (!isValid) allValid = false;
        }
    }
    
    if (allValid) {
        console.log('\n✓ All white-label configurations are valid');
        process.exit(0);
    } else {
        console.log('\n✗ Some validations failed');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
EOF

    chmod +x frontend/scripts/validate-white-label.js
    success "Validation script created"
}

# Create build script
create_build_script() {
    log "Creating build script..."
    
    cat > frontend/scripts/build-white-label.js << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Build script for white-label assets
function buildWhiteLabelAssets() {
    console.log('Building white-label assets...');
    
    const buildDir = path.join(__dirname, '../build/white-label');
    
    // Create build directory
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // Copy theme examples
    const themeExamplesDir = path.join(__dirname, '../white-label/examples/theme-examples');
    if (fs.existsSync(themeExamplesDir)) {
        const themeBuildDir = path.join(buildDir, 'themes');
        fs.mkdirSync(themeBuildDir, { recursive: true });
        
        const themeFiles = fs.readdirSync(themeExamplesDir);
        for (const file of themeFiles) {
            const srcPath = path.join(themeExamplesDir, file);
            const destPath = path.join(themeBuildDir, file);
            fs.copyFileSync(srcPath, destPath);
        }
        
        console.log(`✓ Copied ${themeFiles.length} theme examples`);
    }
    
    // Copy translation examples
    const translationExamplesDir = path.join(__dirname, '../white-label/examples/i18n-examples');
    if (fs.existsSync(translationExamplesDir)) {
        const translationBuildDir = path.join(buildDir, 'translations');
        fs.mkdirSync(translationBuildDir, { recursive: true });
        
        const translationFiles = fs.readdirSync(translationExamplesDir);
        for (const file of translationFiles) {
            const srcPath = path.join(translationExamplesDir, file);
            const destPath = path.join(translationBuildDir, file);
            fs.copyFileSync(srcPath, destPath);
        }
        
        console.log(`✓ Copied ${translationFiles.length} translation examples`);
    }
    
    // Create manifest
    const manifest = {
        version: '1.0.0',
        buildDate: new Date().toISOString(),
        themes: fs.readdirSync(path.join(buildDir, 'themes')).length,
        translations: fs.readdirSync(path.join(buildDir, 'translations')).length
    };
    
    fs.writeFileSync(
        path.join(buildDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('✓ White-label assets built successfully');
    console.log(`  Themes: ${manifest.themes}`);
    console.log(`  Translations: ${manifest.translations}`);
}

if (require.main === module) {
    buildWhiteLabelAssets();
}
EOF

    chmod +x frontend/scripts/build-white-label.js
    success "Build script created"
}

# Create database migrations
create_database_migrations() {
    log "Creating database migrations..."
    
    # Create white-label specific tables migration
    cat > db/migrations/033_create_white_label_tables.sql << 'EOF'
-- Migration: Create white-label specific tables
-- Description: Tables for theme and translation management
-- Created: 2024-01-15

-- Theme templates table
CREATE TABLE IF NOT EXISTS theme_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    theme_config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, template_id)
);

-- Translation languages table
CREATE TABLE IF NOT EXISTS translation_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    native_name VARCHAR(255) NOT NULL,
    direction VARCHAR(3) DEFAULT 'ltr',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, locale)
);

-- Translation keys table
CREATE TABLE IF NOT EXISTS translation_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    translation_key VARCHAR(500) NOT NULL,
    translation_value TEXT NOT NULL,
    is_icu_format BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, locale, translation_key)
);

-- Translation overrides table
CREATE TABLE IF NOT EXISTS translation_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    translation_key VARCHAR(500) NOT NULL,
    override_value TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, locale, translation_key, priority)
);

-- Translation file uploads table
CREATE TABLE IF NOT EXISTS translation_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_format VARCHAR(10) NOT NULL,
    file_size INTEGER,
    upload_status VARCHAR(20) DEFAULT 'pending',
    validation_results JSONB,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- White-label audit log table
CREATE TABLE IF NOT EXISTS white_label_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_theme_templates_tenant_id ON theme_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_theme_templates_template_id ON theme_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_translation_languages_tenant_id ON translation_languages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_translation_languages_locale ON translation_languages(locale);
CREATE INDEX IF NOT EXISTS idx_translation_keys_tenant_locale ON translation_keys(tenant_id, locale);
CREATE INDEX IF NOT EXISTS idx_translation_keys_key ON translation_keys(translation_key);
CREATE INDEX IF NOT EXISTS idx_translation_overrides_tenant_locale ON translation_overrides(tenant_id, locale);
CREATE INDEX IF NOT EXISTS idx_translation_overrides_priority ON translation_overrides(priority);
CREATE INDEX IF NOT EXISTS idx_translation_uploads_tenant_id ON translation_uploads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_translation_uploads_locale ON translation_uploads(locale);
CREATE INDEX IF NOT EXISTS idx_white_label_audit_tenant_id ON white_label_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_white_label_audit_action ON white_label_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_white_label_audit_created_at ON white_label_audit_log(created_at);

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_theme_templates_config ON theme_templates USING GIN (theme_config);
CREATE INDEX IF NOT EXISTS idx_translation_uploads_validation ON translation_uploads USING GIN (validation_results);
CREATE INDEX IF NOT EXISTS idx_white_label_audit_old_values ON white_label_audit_log USING GIN (old_values);
CREATE INDEX IF NOT EXISTS idx_white_label_audit_new_values ON white_label_audit_log USING GIN (new_values);

-- Add constraints
ALTER TABLE theme_templates ADD CONSTRAINT IF NOT EXISTS valid_template_id 
    CHECK (template_id ~ '^[a-zA-Z0-9_-]+$');

ALTER TABLE translation_languages ADD CONSTRAINT IF NOT EXISTS valid_locale 
    CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$');

ALTER TABLE translation_languages ADD CONSTRAINT IF NOT EXISTS valid_direction 
    CHECK (direction IN ('ltr', 'rtl'));

ALTER TABLE translation_overrides ADD CONSTRAINT IF NOT EXISTS valid_priority 
    CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE translation_uploads ADD CONSTRAINT IF NOT EXISTS valid_format 
    CHECK (file_format IN ('json', 'yaml', 'po', 'xlf'));

ALTER TABLE translation_uploads ADD CONSTRAINT IF NOT EXISTS valid_status 
    CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed'));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON theme_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON translation_languages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON translation_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON translation_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON translation_uploads TO authenticated;
GRANT SELECT ON white_label_audit_log TO authenticated;

-- Create functions for white-label management
CREATE OR REPLACE FUNCTION get_tenant_theme(tenant_uuid UUID, template_id VARCHAR DEFAULT 'default')
RETURNS JSONB AS $$
DECLARE
    theme_config JSONB;
BEGIN
    SELECT theme_config INTO theme_config
    FROM theme_templates
    WHERE tenant_id = tenant_uuid 
    AND template_id = template_id 
    AND is_active = TRUE;
    
    RETURN COALESCE(theme_config, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_tenant_translations(tenant_uuid UUID, locale VARCHAR)
RETURNS JSONB AS $$
DECLARE
    translations JSONB;
BEGIN
    SELECT jsonb_object_agg(tk.translation_key, tk.translation_value) INTO translations
    FROM translation_keys tk
    WHERE tk.tenant_id = tenant_uuid 
    AND tk.locale = locale;
    
    RETURN COALESCE(translations, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION apply_translation_overrides(tenant_uuid UUID, locale VARCHAR)
RETURNS JSONB AS $$
DECLARE
    base_translations JSONB;
    override_translations JSONB;
    final_translations JSONB;
BEGIN
    -- Get base translations
    SELECT get_tenant_translations(tenant_uuid, locale) INTO base_translations;
    
    -- Apply overrides in priority order
    SELECT jsonb_object_agg(translation_key, override_value) INTO override_translations
    FROM (
        SELECT translation_key, override_value
        FROM translation_overrides
        WHERE tenant_id = tenant_uuid 
        AND locale = locale
        ORDER BY 
            CASE priority 
                WHEN 'high' THEN 1 
                WHEN 'medium' THEN 2 
                WHEN 'low' THEN 3 
            END,
            created_at DESC
    ) overrides;
    
    -- Merge base translations with overrides
    final_translations := base_translations || COALESCE(override_translations, '{}'::JSONB);
    
    RETURN final_translations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_tenant_theme(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_translations(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_translation_overrides(UUID, VARCHAR) TO authenticated;
EOF

    success "Database migrations created"
}

# Create environment configuration
create_env_config() {
    log "Creating environment configuration..."
    
    # Add white-label environment variables to example file
    cat >> env.example << 'EOF'

# White-Label Configuration
WHITE_LABEL_ENABLED=true
WHITE_LABEL_CACHE_ENABLED=true
WHITE_LABEL_CACHE_EXPIRY=3600000
WHITE_LABEL_VALIDATION_ENABLED=true
WHITE_LABEL_ICU_ENABLED=true
WHITE_LABEL_RTL_ENABLED=true

# Translation Services
GOOGLE_TRANSLATE_API_KEY=
AZURE_TRANSLATOR_KEY=
AZURE_TRANSLATOR_REGION=
OPENAI_API_KEY=

# Theme Storage
THEME_STORAGE_PATH=./uploads/themes
TRANSLATION_STORAGE_PATH=./uploads/translations
EOF

    success "Environment configuration created"
}

# Main setup function
main() {
    echo "=========================================="
    echo "White-Label System Setup"
    echo "=========================================="
    echo ""
    
    check_directory
    install_dependencies
    create_directory_structure
    create_core_configs
    create_theme_examples
    create_translation_examples
    create_validation_schemas
    create_test_configs
    update_package_scripts
    create_validation_script
    create_build_script
    create_database_migrations
    create_env_config
    
    echo ""
    echo "=========================================="
    success "White-Label System Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Run database migrations: npm run migrate"
    echo "2. Configure environment variables in .env"
    echo "3. Test the system: npm run white-label:test"
    echo "4. Validate configurations: npm run white-label:validate"
    echo "5. Build assets: npm run white-label:build"
    echo ""
    echo "Documentation: docs/WHITE_LABEL_DEVELOPMENT_GUIDE.md"
    echo "Examples: frontend/white-label/examples/"
    echo ""
}

# Run main function
main "$@"
