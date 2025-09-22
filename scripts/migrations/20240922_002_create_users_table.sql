-- Migration: Create users table with multi-tenant support
-- Description: User accounts with role-based access control
-- Compliance: US (FERPA), EU (GDPR), Indonesia (UU No. 19 Tahun 2016)
-- Created: 2024-09-22
-- Idempotent: Yes (uses IF NOT EXISTS)

-- Create users table with multi-tenant support
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Authentication
    email VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255), -- NULL for OAuth-only users
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Profile Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    preferred_name VARCHAR(100),
    title VARCHAR(100), -- Mr., Ms., Dr., etc.
    avatar_url TEXT,
    
    -- Contact Information
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    
    -- Role and Permissions
    role VARCHAR(50) NOT NULL DEFAULT 'student', -- 'admin', 'principal', 'teacher', 'staff', 'student', 'parent'
    permissions JSONB DEFAULT '{}', -- Granular permissions
    
    -- Status and Security
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended', 'pending'
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    last_login_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Preferences
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    notifications JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- Create unique constraint for email per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON COLUMN users.role IS 'User role: admin, principal, teacher, staff, student, parent';
COMMENT ON COLUMN users.permissions IS 'Granular permissions in JSON format';
COMMENT ON COLUMN users.notifications IS 'Notification preferences in JSON format';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret for two-factor authentication';
