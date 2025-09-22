-- Create tenants table for multi-tenant architecture
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier (e.g., "springfield-high")
    domain VARCHAR(255) UNIQUE, -- Custom domain (e.g., "springfield.sisplatform.com")
    subdomain VARCHAR(100) UNIQUE, -- Subdomain (e.g., "springfield")
    
    -- School Information
    school_name VARCHAR(255) NOT NULL,
    school_type VARCHAR(50) NOT NULL, -- 'public', 'private', 'charter', 'international'
    school_level VARCHAR(50) NOT NULL, -- 'elementary', 'middle', 'high', 'k12'
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Branding & Customization
    logo_url VARCHAR(500),
    primary_color VARCHAR(7), -- Hex color code
    secondary_color VARCHAR(7),
    custom_css TEXT,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    locale VARCHAR(10) DEFAULT 'en-US',
    
    -- Subscription & Billing
    subscription_plan VARCHAR(50) DEFAULT 'basic', -- 'basic', 'professional', 'enterprise'
    subscription_status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
    max_students INTEGER DEFAULT 500,
    max_teachers INTEGER DEFAULT 50,
    billing_email VARCHAR(255),
    
    -- Feature Flags
    features JSONB DEFAULT '{}', -- Feature toggles per tenant
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- Reference to super admin who created this tenant
    
    -- Constraints
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT valid_domain CHECK (domain IS NULL OR domain ~ '^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
    CONSTRAINT valid_subdomain CHECK (subdomain IS NULL OR subdomain ~ '^[a-z0-9-]+$'),
    CONSTRAINT valid_plan CHECK (subscription_plan IN ('basic', 'professional', 'enterprise')),
    CONSTRAINT valid_status CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trial'))
);

-- Create indexes for performance
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_plan ON tenants(subscription_plan);

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
