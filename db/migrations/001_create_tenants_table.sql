-- Migration: Create tenants table for multi-tenant architecture
-- Description: Core tenant table supporting multi-tenant SaaS architecture
-- Created: 2024-01-01
-- Updated: 2024-01-15 (Added best practices improvements)

-- Create tenants table for multi-tenant architecture
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier (e.g., "springfield-high")
    domain VARCHAR(255) UNIQUE, -- Custom domain (e.g., "springfield.sisplatform.com")
    subdomain VARCHAR(100) UNIQUE, -- Subdomain (e.g., "springfield")
    
    -- School Information
    school_name VARCHAR(255) NOT NULL,
    school_type VARCHAR(50) NOT NULL, -- 'public', 'private', 'charter', 'international', 'homeschool'
    school_level VARCHAR(50) NOT NULL, -- 'elementary', 'middle', 'high', 'k12', 'preschool'
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Branding & Customization
    logo_url VARCHAR(500),
    primary_color VARCHAR(7), -- Hex color code (e.g., #1e40af)
    secondary_color VARCHAR(7), -- Hex color code (e.g., #3b82f6)
    custom_css TEXT,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    locale VARCHAR(10) DEFAULT 'en-US',
    
    -- Subscription & Billing
    subscription_plan VARCHAR(50) DEFAULT 'basic', -- 'basic', 'professional', 'enterprise', 'trial'
    subscription_status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'cancelled', 'trial', 'expired'
    max_students INTEGER DEFAULT 500,
    max_teachers INTEGER DEFAULT 50,
    billing_email VARCHAR(255),
    
    -- Feature Flags (JSONB structure documented below)
    features JSONB DEFAULT '{}', -- Feature toggles per tenant
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft deletion timestamp
    created_by UUID, -- Reference to super admin who created this tenant
    
    -- Constraints
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT valid_domain CHECK (domain IS NULL OR domain ~ '^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
    CONSTRAINT valid_subdomain CHECK (subdomain IS NULL OR subdomain ~ '^[a-z0-9-]+$'),
    CONSTRAINT valid_plan CHECK (subscription_plan IN ('basic', 'professional', 'enterprise', 'trial')),
    CONSTRAINT valid_status CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trial', 'expired')),
    CONSTRAINT valid_school_type CHECK (school_type IN ('public', 'private', 'charter', 'international', 'homeschool')),
    CONSTRAINT valid_school_level CHECK (school_level IN ('preschool', 'elementary', 'middle', 'high', 'k12')),
    CONSTRAINT valid_color_format CHECK (
        (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$') AND
        (secondary_color IS NULL OR secondary_color ~ '^#[0-9A-Fa-f]{6}$')
    ),
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_billing_email CHECK (billing_email IS NULL OR billing_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_limits CHECK (max_students > 0 AND max_teachers > 0),
    -- Ensure at least one of domain or subdomain is present
    CONSTRAINT has_domain_or_subdomain CHECK (domain IS NOT NULL OR subdomain IS NOT NULL)
);

-- Add foreign key constraint for created_by (will be added after users table is created)
-- ALTER TABLE tenants ADD CONSTRAINT fk_tenants_created_by 
--     FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_tenants_school_type ON tenants(school_type);
CREATE INDEX IF NOT EXISTS idx_tenants_school_level ON tenants(school_level);
CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at ON tenants(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at);

-- Create GIN index for features JSONB column for efficient querying
CREATE INDEX IF NOT EXISTS idx_tenants_features ON tenants USING GIN (features);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_tenants_updated_at();

-- Documentation for features JSONB column structure:
-- The features column stores tenant-specific feature flags and configuration as JSONB.
-- Expected structure:
-- {
--   "modules": {
--     "grades": true,
--     "attendance": true,
--     "communication": false,
--     "analytics": true,
--     "reports": true,
--     "bulk_import": false
--   },
--   "limits": {
--     "max_file_uploads": 1000,
--     "max_storage_gb": 10,
--     "api_calls_per_hour": 10000
--   },
--   "customizations": {
--     "allow_custom_fields": true,
--     "enable_advanced_reporting": false,
--     "show_beta_features": false
--   },
--   "integrations": {
--     "google_classroom": false,
--     "microsoft_teams": false,
--     "canvas": false,
--     "blackboard": false
--   },
--   "security": {
--     "require_2fa": false,
--     "session_timeout_minutes": 480,
--     "password_policy": "standard"
--   }
-- }
--
-- Example queries:
-- SELECT * FROM tenants WHERE features->'modules'->>'grades' = 'true';
-- SELECT * FROM tenants WHERE features->'limits'->>'max_storage_gb'::int > 5;
-- UPDATE tenants SET features = features || '{"modules":{"analytics":true}}' WHERE id = 'tenant-id';
