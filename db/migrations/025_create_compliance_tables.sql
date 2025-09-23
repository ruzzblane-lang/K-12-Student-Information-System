-- Migration: Create compliance tables for comprehensive compliance framework
-- Description: Implements data vault, tokenization, audit enhancements, and compliance tracking
-- Created: 2024-01-01
-- Updated: 2024-01-15 (Added comprehensive compliance features)

-- =============================================================================
-- DATA VAULT TABLES
-- =============================================================================

-- Data vault for encrypted sensitive data storage
CREATE TABLE IF NOT EXISTS data_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    encrypted_data JSONB NOT NULL,
    data_type VARCHAR(100) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Tokenization audit logs
CREATE TABLE IF NOT EXISTS tokenization_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) NOT NULL,
    data_type VARCHAR(100) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'tokenize', 'detokenize', 'delete'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Encryption vault for double-encrypted data
CREATE TABLE IF NOT EXISTS encryption_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id VARCHAR(255) UNIQUE NOT NULL,
    data_key VARCHAR(255) NOT NULL,
    encrypted_data JSONB NOT NULL,
    integrity_hash VARCHAR(255) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(data_key, tenant_id)
);

-- Vault access logs
CREATE TABLE IF NOT EXISTS vault_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id VARCHAR(255) NOT NULL,
    data_key VARCHAR(255) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'store', 'retrieve', 'update', 'delete'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- AUDIT TRAIL ENHANCEMENTS
-- =============================================================================

-- Add integrity and chain hash columns to existing audit_logs table
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS integrity_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS chain_hash VARCHAR(255);

-- Create index for chain hash for integrity verification
CREATE INDEX IF NOT EXISTS idx_audit_logs_chain_hash ON audit_logs(chain_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_integrity_hash ON audit_logs(integrity_hash);

-- =============================================================================
-- DATA RESIDENCY TABLES
-- =============================================================================

-- Data residency requirements per tenant
CREATE TABLE IF NOT EXISTS data_residency_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    primary_region VARCHAR(50) NOT NULL,
    allowed_regions JSONB NOT NULL,
    restricted_regions JSONB NOT NULL,
    rules_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data residency logs
CREATE TABLE IF NOT EXISTS data_residency_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    data_type VARCHAR(100) NOT NULL,
    target_region VARCHAR(50) NOT NULL,
    validation_result BOOLEAN NOT NULL,
    operation_context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data routing logs
CREATE TABLE IF NOT EXISTS data_routing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    data_type VARCHAR(100) NOT NULL,
    target_region VARCHAR(50) NOT NULL,
    processing_request JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- KYC/AML TABLES
-- =============================================================================

-- KYC verification results
CREATE TABLE IF NOT EXISTS kyc_verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verification_level VARCHAR(50) NOT NULL,
    verification_results JSONB NOT NULL,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    overall_status VARCHAR(50) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AML screening results
CREATE TABLE IF NOT EXISTS aml_screening_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    screening_results JSONB NOT NULL,
    aml_risk_score INTEGER NOT NULL CHECK (aml_risk_score >= 0 AND aml_risk_score <= 100),
    aml_risk_level VARCHAR(20) NOT NULL CHECK (aml_risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    screening_status VARCHAR(50) NOT NULL,
    screened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- COMPLIANCE TRACKING TABLES
-- =============================================================================

-- Tenant compliance settings
CREATE TABLE IF NOT EXISTS tenant_compliance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    compliance_requirements TEXT[] DEFAULT '{}',
    data_protection_laws TEXT[] DEFAULT '{}',
    industry_regulations TEXT[] DEFAULT '{}',
    primary_region VARCHAR(50),
    data_residency_enabled BOOLEAN DEFAULT true,
    audit_retention_days INTEGER DEFAULT 2555, -- 7 years
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compliance check results
CREATE TABLE IF NOT EXISTS compliance_check_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    standard VARCHAR(50) NOT NULL,
    requirement VARCHAR(100) NOT NULL,
    compliant BOOLEAN NOT NULL,
    issue TEXT,
    severity VARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    details JSONB DEFAULT '{}',
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Data vault indexes
CREATE INDEX IF NOT EXISTS idx_data_vault_tenant_id ON data_vault(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_vault_data_type ON data_vault(data_type);
CREATE INDEX IF NOT EXISTS idx_data_vault_created_at ON data_vault(created_at);
CREATE INDEX IF NOT EXISTS idx_data_vault_deleted_at ON data_vault(deleted_at);

-- Tokenization audit indexes
CREATE INDEX IF NOT EXISTS idx_tokenization_audit_tenant_id ON tokenization_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tokenization_audit_token ON tokenization_audit_logs(token);
CREATE INDEX IF NOT EXISTS idx_tokenization_audit_action ON tokenization_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_tokenization_audit_created_at ON tokenization_audit_logs(created_at);

-- Encryption vault indexes
CREATE INDEX IF NOT EXISTS idx_encryption_vault_tenant_id ON encryption_vault(tenant_id);
CREATE INDEX IF NOT EXISTS idx_encryption_vault_data_key ON encryption_vault(data_key);
CREATE INDEX IF NOT EXISTS idx_encryption_vault_created_at ON encryption_vault(created_at);
CREATE INDEX IF NOT EXISTS idx_encryption_vault_deleted_at ON encryption_vault(deleted_at);

-- Vault access logs indexes
CREATE INDEX IF NOT EXISTS idx_vault_access_tenant_id ON vault_access_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vault_access_vault_id ON vault_access_logs(vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_access_action ON vault_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_vault_access_created_at ON vault_access_logs(created_at);

-- Data residency indexes
CREATE INDEX IF NOT EXISTS idx_data_residency_logs_tenant_id ON data_residency_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_residency_logs_target_region ON data_residency_logs(target_region);
CREATE INDEX IF NOT EXISTS idx_data_residency_logs_created_at ON data_residency_logs(created_at);

-- Data routing indexes
CREATE INDEX IF NOT EXISTS idx_data_routing_logs_tenant_id ON data_routing_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_routing_logs_target_region ON data_routing_logs(target_region);
CREATE INDEX IF NOT EXISTS idx_data_routing_logs_created_at ON data_routing_logs(created_at);

-- KYC/AML indexes
CREATE INDEX IF NOT EXISTS idx_kyc_verification_tenant_id ON kyc_verification_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verification_user_id ON kyc_verification_results(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verification_risk_level ON kyc_verification_results(risk_level);
CREATE INDEX IF NOT EXISTS idx_kyc_verification_verified_at ON kyc_verification_results(verified_at);

CREATE INDEX IF NOT EXISTS idx_aml_screening_tenant_id ON aml_screening_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aml_screening_user_id ON aml_screening_results(user_id);
CREATE INDEX IF NOT EXISTS idx_aml_screening_aml_risk_level ON aml_screening_results(aml_risk_level);
CREATE INDEX IF NOT EXISTS idx_aml_screening_screened_at ON aml_screening_results(screened_at);

-- Compliance indexes
CREATE INDEX IF NOT EXISTS idx_compliance_check_tenant_id ON compliance_check_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_check_standard ON compliance_check_results(standard);
CREATE INDEX IF NOT EXISTS idx_compliance_check_requirement ON compliance_check_results(requirement);
CREATE INDEX IF NOT EXISTS idx_compliance_check_compliant ON compliance_check_results(compliant);
CREATE INDEX IF NOT EXISTS idx_compliance_check_checked_at ON compliance_check_results(checked_at);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all compliance tables
ALTER TABLE data_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokenization_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_residency_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_residency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_routing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_screening_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_compliance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_check_results ENABLE ROW LEVEL SECURITY;

-- Data vault RLS policies
CREATE POLICY data_vault_tenant_isolation ON data_vault
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY data_vault_super_admin_access ON data_vault
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Tokenization audit logs RLS policies
CREATE POLICY tokenization_audit_tenant_isolation ON tokenization_audit_logs
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY tokenization_audit_super_admin_access ON tokenization_audit_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Encryption vault RLS policies
CREATE POLICY encryption_vault_tenant_isolation ON encryption_vault
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY encryption_vault_super_admin_access ON encryption_vault
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Vault access logs RLS policies
CREATE POLICY vault_access_tenant_isolation ON vault_access_logs
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY vault_access_super_admin_access ON vault_access_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Data residency requirements RLS policies
CREATE POLICY data_residency_requirements_tenant_isolation ON data_residency_requirements
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY data_residency_requirements_super_admin_access ON data_residency_requirements
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Data residency logs RLS policies
CREATE POLICY data_residency_logs_tenant_isolation ON data_residency_logs
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY data_residency_logs_super_admin_access ON data_residency_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Data routing logs RLS policies
CREATE POLICY data_routing_logs_tenant_isolation ON data_routing_logs
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY data_routing_logs_super_admin_access ON data_routing_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

-- KYC verification results RLS policies
CREATE POLICY kyc_verification_tenant_isolation ON kyc_verification_results
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY kyc_verification_super_admin_access ON kyc_verification_results
    FOR ALL TO authenticated
    USING (is_super_admin());

-- AML screening results RLS policies
CREATE POLICY aml_screening_tenant_isolation ON aml_screening_results
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY aml_screening_super_admin_access ON aml_screening_results
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Tenant compliance settings RLS policies
CREATE POLICY tenant_compliance_settings_tenant_isolation ON tenant_compliance_settings
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_compliance_settings_super_admin_access ON tenant_compliance_settings
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Compliance check results RLS policies
CREATE POLICY compliance_check_results_tenant_isolation ON compliance_check_results
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY compliance_check_results_super_admin_access ON compliance_check_results
    FOR ALL TO authenticated
    USING (is_super_admin());

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE data_vault IS 'Encrypted storage for sensitive data with tokenization';
COMMENT ON TABLE tokenization_audit_logs IS 'Audit trail for all tokenization operations';
COMMENT ON TABLE encryption_vault IS 'Double-encrypted vault for transaction metadata';
COMMENT ON TABLE vault_access_logs IS 'Audit trail for vault access operations';
COMMENT ON TABLE data_residency_requirements IS 'Data residency rules per tenant';
COMMENT ON TABLE data_residency_logs IS 'Audit trail for data residency checks';
COMMENT ON TABLE data_routing_logs IS 'Audit trail for data routing decisions';
COMMENT ON TABLE kyc_verification_results IS 'KYC verification results with risk assessment';
COMMENT ON TABLE aml_screening_results IS 'AML screening results with risk scoring';
COMMENT ON TABLE tenant_compliance_settings IS 'Compliance configuration per tenant';
COMMENT ON TABLE compliance_check_results IS 'Results of compliance requirement checks';

COMMENT ON COLUMN data_vault.encrypted_data IS 'Double-encrypted sensitive data';
COMMENT ON COLUMN data_vault.data_type IS 'Type of sensitive data (card_number, ssn, etc.)';
COMMENT ON COLUMN encryption_vault.integrity_hash IS 'SHA-256 hash for data integrity verification';
COMMENT ON COLUMN kyc_verification_results.risk_score IS 'Overall risk score (0-100)';
COMMENT ON COLUMN aml_screening_results.aml_risk_score IS 'AML-specific risk score (0-100)';
COMMENT ON COLUMN audit_logs.integrity_hash IS 'SHA-256 hash for audit log integrity';
COMMENT ON COLUMN audit_logs.chain_hash IS 'Blockchain-style hash for audit chain integrity';

-- =============================================================================
-- CLEANUP FUNCTIONS
-- =============================================================================

-- Function to clean up old deleted vault entries
CREATE OR REPLACE FUNCTION cleanup_deleted_vault_entries(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM data_vault 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM encryption_vault 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 2555)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- IMPLEMENTATION NOTES
-- =============================================================================

-- COMPLIANCE IMPLEMENTATION REQUIRED:
-- 1. All sensitive data must be tokenized before storage
-- 2. Double encryption required for all vault entries
-- 3. Audit trail must be maintained for all operations
-- 4. Data residency must be enforced at application level
-- 5. KYC/AML checks required for financial transactions
-- 6. Regular compliance audits must be performed
-- 7. Data retention policies must be enforced
-- 8. Access controls must be implemented at all levels

-- SECURITY IMPLEMENTATION REQUIRED:
-- 1. Encryption keys must be stored securely (HSM recommended)
-- 2. All API endpoints must validate data residency
-- 3. Audit logs must be immutable and tamper-proof
-- 4. Regular security assessments must be performed
-- 5. Incident response procedures must be in place
-- 6. Data breach notification procedures must be implemented

-- OPERATIONAL IMPLEMENTATION REQUIRED:
-- 1. Regular cleanup of old audit logs and deleted entries
-- 2. Monitoring of compliance metrics and alerts
-- 3. Regular testing of data residency controls
-- 4. Backup and recovery procedures for compliance data
-- 5. Training for staff on compliance requirements
-- 6. Regular updates to compliance policies and procedures
