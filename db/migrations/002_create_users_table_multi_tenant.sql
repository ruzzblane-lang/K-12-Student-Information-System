-- Migration: Create users table with multi-tenant support
-- Description: Multi-tenant user table with enhanced security and audit features
-- Created: 2024-01-01
-- Updated: 2024-01-15 (Added best practices improvements)

-- Create users table with multi-tenant support
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Authentication
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255) NOT NULL, -- Additional salt for password security
    password_last_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Profile Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    
    -- Role & Permissions
    role VARCHAR(50) NOT NULL, -- 'super_admin', 'tenant_admin', 'principal', 'teacher', 'parent', 'student'
    permissions JSONB DEFAULT '{}', -- Additional permissions beyond role (documented below)
    
    -- Status & Security
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended', 'pending', 'locked'
    last_login TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255), -- Encrypted 2FA secret
    backup_codes TEXT[], -- Array of encrypted backup codes
    session_timeout_minutes INTEGER DEFAULT 480, -- 8 hours default
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft deletion timestamp
    created_by UUID, -- Reference to user who created this user (within same tenant)
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_role CHECK (role IN ('super_admin', 'tenant_admin', 'principal', 'teacher', 'parent', 'student')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended', 'pending', 'locked')),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_login_attempts CHECK (login_attempts >= 0),
    CONSTRAINT valid_session_timeout CHECK (session_timeout_minutes > 0 AND session_timeout_minutes <= 1440), -- Max 24 hours
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email),
    -- Ensure created_by references a user within the same tenant (enforced via trigger)
    CONSTRAINT valid_created_by CHECK (created_by IS NULL OR created_by != id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled);

-- Create GIN index for permissions JSONB column for efficient querying
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN (permissions);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Trigger to ensure created_by references a user within the same tenant
CREATE OR REPLACE FUNCTION validate_created_by_tenant()
RETURNS TRIGGER AS $$
BEGIN
    -- If created_by is set, ensure it references a user within the same tenant
    IF NEW.created_by IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE id = NEW.created_by 
            AND tenant_id = NEW.tenant_id 
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'created_by must reference a user within the same tenant';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_created_by_tenant
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_created_by_tenant();

-- Documentation for permissions JSONB column structure:
-- The permissions column stores additional permissions beyond the base role as JSONB.
-- Expected structure:
-- {
--   "modules": {
--     "students": ["create", "read", "update", "delete"],
--     "teachers": ["read", "update"],
--     "grades": ["create", "read", "update"],
--     "attendance": ["read"],
--     "reports": ["read", "export"]
--   },
--   "features": {
--     "bulk_import": true,
--     "advanced_analytics": false,
--     "custom_reports": true,
--     "api_access": false
--   },
--   "restrictions": {
--     "grade_levels": ["9", "10", "11", "12"],
--     "departments": ["Mathematics", "Science"],
--     "max_students_per_class": 30
--   },
--   "overrides": {
--     "bypass_approval_workflows": false,
--     "access_all_tenants": false,
--     "modify_system_settings": false
--   }
-- }
--
-- Example queries:
-- SELECT * FROM users WHERE permissions->'modules'->'students' ? 'delete';
-- SELECT * FROM users WHERE permissions->'features'->>'bulk_import' = 'true';
-- UPDATE users SET permissions = permissions || '{"features":{"api_access":true}}' WHERE id = 'user-id';
