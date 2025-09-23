-- Migration: Create Third-Party Integration Tables
-- Description: Creates tables for managing third-party API integrations
-- Version: 033
-- Date: 2024-01-15

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenant integration configurations
CREATE TABLE IF NOT EXISTS tenant_integration_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    config_data JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
    
    -- Ensure unique provider per tenant
    UNIQUE(tenant_id, provider)
);

-- Integration usage logs
CREATE TABLE IF NOT EXISTS integration_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    method VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    response_time INTEGER NOT NULL, -- milliseconds
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Integration permissions
CREATE TABLE IF NOT EXISTS integration_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    permission_name VARCHAR(255) NOT NULL,
    allowed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
    
    -- Ensure unique permission per user/role and provider
    UNIQUE(tenant_id, user_id, provider, permission_name),
    UNIQUE(tenant_id, role_id, provider, permission_name),
    
    -- Ensure either user_id or role_id is set, but not both
    CHECK (
        (user_id IS NOT NULL AND role_id IS NULL) OR 
        (user_id IS NULL AND role_id IS NOT NULL)
    )
);

-- Integration audit logs
CREATE TABLE IF NOT EXISTS integration_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(500),
    success BOOLEAN NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Integration data access logs (for compliance)
CREATE TABLE IF NOT EXISTS integration_data_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider VARCHAR(100) NOT NULL,
    data_type VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL, -- read, write, delete, export
    record_id VARCHAR(500),
    fields JSONB DEFAULT '[]',
    purpose TEXT,
    legal_basis VARCHAR(255), -- consent, legitimate_interest, contract, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Integration configuration changes
CREATE TABLE IF NOT EXISTS integration_config_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider VARCHAR(100) NOT NULL,
    change_type VARCHAR(255) NOT NULL, -- created, updated, deleted, enabled, disabled
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Integration security events
CREATE TABLE IF NOT EXISTS integration_security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider VARCHAR(100) NOT NULL,
    event_type VARCHAR(255) NOT NULL, -- auth_failed, rate_limit, suspicious_activity, etc.
    severity VARCHAR(50) NOT NULL, -- low, medium, high, critical
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Integration webhook logs
CREATE TABLE IF NOT EXISTS integration_webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(500),
    processed BOOLEAN NOT NULL DEFAULT false,
    processing_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Integration API keys (encrypted)
CREATE TABLE IF NOT EXISTS integration_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_type VARCHAR(100) NOT NULL, -- api_key, access_token, refresh_token, webhook_secret
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    
    -- Ensure unique key name per tenant/provider
    UNIQUE(tenant_id, provider, key_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_integration_configs_tenant_id ON tenant_integration_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_integration_configs_provider ON tenant_integration_configs(provider);
CREATE INDEX IF NOT EXISTS idx_tenant_integration_configs_enabled ON tenant_integration_configs(enabled);

CREATE INDEX IF NOT EXISTS idx_integration_usage_logs_tenant_id ON integration_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_usage_logs_provider ON integration_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_integration_usage_logs_created_at ON integration_usage_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_integration_permissions_tenant_id ON integration_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_permissions_user_id ON integration_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_permissions_role_id ON integration_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_integration_permissions_provider ON integration_permissions(provider);

CREATE INDEX IF NOT EXISTS idx_integration_audit_logs_tenant_id ON integration_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_audit_logs_user_id ON integration_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_audit_logs_provider ON integration_audit_logs(provider);
CREATE INDEX IF NOT EXISTS idx_integration_audit_logs_created_at ON integration_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_integration_audit_logs_action ON integration_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_integration_data_access_logs_tenant_id ON integration_data_access_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_data_access_logs_user_id ON integration_data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_data_access_logs_provider ON integration_data_access_logs(provider);
CREATE INDEX IF NOT EXISTS idx_integration_data_access_logs_created_at ON integration_data_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_integration_data_access_logs_data_type ON integration_data_access_logs(data_type);

CREATE INDEX IF NOT EXISTS idx_integration_config_changes_tenant_id ON integration_config_changes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_config_changes_provider ON integration_config_changes(provider);
CREATE INDEX IF NOT EXISTS idx_integration_config_changes_created_at ON integration_config_changes(created_at);

CREATE INDEX IF NOT EXISTS idx_integration_security_events_tenant_id ON integration_security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_security_events_provider ON integration_security_events(provider);
CREATE INDEX IF NOT EXISTS idx_integration_security_events_severity ON integration_security_events(severity);
CREATE INDEX IF NOT EXISTS idx_integration_security_events_created_at ON integration_security_events(created_at);

CREATE INDEX IF NOT EXISTS idx_integration_webhook_logs_tenant_id ON integration_webhook_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_logs_provider ON integration_webhook_logs(provider);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_logs_processed ON integration_webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_logs_created_at ON integration_webhook_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_integration_api_keys_tenant_id ON integration_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_api_keys_provider ON integration_api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_integration_api_keys_expires_at ON integration_api_keys(expires_at);

-- Create updated_at trigger for tenant_integration_configs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_integration_configs_updated_at 
    BEFORE UPDATE ON tenant_integration_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE tenant_integration_configs IS 'Stores tenant-specific configurations for third-party integrations';
COMMENT ON TABLE integration_usage_logs IS 'Logs API usage statistics for monitoring and billing';
COMMENT ON TABLE integration_permissions IS 'Defines user and role-based permissions for integrations';
COMMENT ON TABLE integration_audit_logs IS 'Comprehensive audit trail for all integration activities';
COMMENT ON TABLE integration_data_access_logs IS 'Logs data access for compliance (FERPA, GDPR, etc.)';
COMMENT ON TABLE integration_config_changes IS 'Tracks configuration changes for audit purposes';
COMMENT ON TABLE integration_security_events IS 'Logs security-related events and incidents';
COMMENT ON TABLE integration_webhook_logs IS 'Logs incoming webhooks from third-party services';
COMMENT ON TABLE integration_api_keys IS 'Stores encrypted API keys and tokens for integrations';
