-- Migration: Create tenants table for multi-tenant architecture
-- Description: Core tenant table supporting multi-tenant SaaS architecture
-- Compliance: US (FERPA), EU (GDPR), Indonesia (UU No. 19 Tahun 2016)
-- Created: 2024-09-22
-- Idempotent: Yes (uses IF NOT EXISTS)

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
    
    -- Compliance and Legal
    country_code VARCHAR(3) NOT NULL DEFAULT 'USA', -- ISO 3166-1 alpha-3
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    locale VARCHAR(10) NOT NULL DEFAULT 'en-US',
    
    -- Academic Calendar
    academic_year VARCHAR(20), -- e.g., "2024-2025"
    semester_count INTEGER DEFAULT 2, -- Number of semesters per year
    quarter_count INTEGER DEFAULT 4, -- Number of quarters per year
    
    -- Status and Settings
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'inactive'
    settings JSONB DEFAULT '{}', -- Flexible settings storage
    
    -- White Labeling
    logo_url TEXT,
    primary_color VARCHAR(7), -- Hex color code
    secondary_color VARCHAR(7), -- Hex color code
    custom_css TEXT,
    
    -- Subscription and Billing
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(20) DEFAULT 'active',
    billing_email VARCHAR(255),
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_country ON tenants(country_code);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tenants_updated_at ON tenants;
CREATE TRIGGER trigger_update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_tenants_updated_at();

-- Add comments for documentation
COMMENT ON TABLE tenants IS 'Core tenant table for multi-tenant SaaS architecture';
COMMENT ON COLUMN tenants.slug IS 'URL-friendly identifier for tenant';
COMMENT ON COLUMN tenants.domain IS 'Custom domain for tenant';
COMMENT ON COLUMN tenants.country_code IS 'ISO 3166-1 alpha-3 country code for compliance';
COMMENT ON COLUMN tenants.settings IS 'Flexible JSON settings storage';
COMMENT ON COLUMN tenants.subscription_plan IS 'Current subscription plan (basic, premium, enterprise)';
