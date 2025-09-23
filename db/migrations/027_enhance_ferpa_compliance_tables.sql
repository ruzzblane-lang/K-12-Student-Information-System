-- Enhanced FERPA Compliance Tables
-- Implements comprehensive FERPA compliance with data classification, consent management, and audit logging
-- Created: 2024-01-01
-- Updated: 2024-01-15 (Enhanced FERPA compliance)

-- =============================================================================
-- DATA CLASSIFICATION TABLES
-- =============================================================================

-- Tenant data classification policy
CREATE TABLE IF NOT EXISTS tenant_data_classification_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    directory_information_opt_out BOOLEAN DEFAULT false,
    require_explicit_consent BOOLEAN DEFAULT true,
    data_retention_days INTEGER DEFAULT 2555, -- 7 years
    allow_third_party_sharing BOOLEAN DEFAULT false,
    require_parental_consent BOOLEAN DEFAULT true,
    audit_all_access BOOLEAN DEFAULT true,
    encrypt_sensitive_data BOOLEAN DEFAULT true,
    anonymize_for_research BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data classification logs
CREATE TABLE IF NOT EXISTS data_classification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    data_type VARCHAR(100) NOT NULL,
    sensitivity_level INTEGER NOT NULL,
    ferpa_status VARCHAR(100) NOT NULL,
    requires_consent BOOLEAN NOT NULL,
    can_disclose BOOLEAN NOT NULL,
    restrictions JSONB DEFAULT '[]',
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ENHANCED FERPA CONSENT TABLES
-- =============================================================================

-- Enhanced FERPA consents table
CREATE TABLE IF NOT EXISTS ferpa_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    consent_type VARCHAR(100) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    consent_method VARCHAR(100) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    denied_at TIMESTAMP WITH TIME ZONE,
    denied_by UUID REFERENCES users(id) ON DELETE SET NULL,
    denial_reason TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revocation_reason TEXT,
    expired_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    restrictions JSONB DEFAULT '[]',
    data_types JSONB DEFAULT '[]',
    purpose TEXT,
    legal_basis VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Directory information opt-outs
CREATE TABLE IF NOT EXISTS directory_information_opt_outs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    opt_out_items JSONB NOT NULL,
    reason TEXT,
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ENHANCED FERPA DISCLOSURE TABLES
-- =============================================================================

-- Enhanced FERPA disclosures table
CREATE TABLE IF NOT EXISTS ferpa_disclosures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    disclosed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    disclosure_type VARCHAR(100) DEFAULT 'educational_record',
    consent_method VARCHAR(100) DEFAULT 'written_consent',
    legal_basis VARCHAR(200) DEFAULT 'parent_consent',
    data_types JSONB DEFAULT '[]',
    retention_period VARCHAR(100) DEFAULT '7_years',
    additional_info JSONB DEFAULT '{}'
);

-- FERPA disclosure audit
CREATE TABLE IF NOT EXISTS ferpa_disclosure_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    record_id UUID NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    disclosure_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- FERPA NOTIFICATION TABLES
-- =============================================================================

-- FERPA notifications
CREATE TABLE IF NOT EXISTS ferpa_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notification_type VARCHAR(100) NOT NULL,
    content JSONB NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'sent'
);

-- FERPA annual notification log
CREATE TABLE IF NOT EXISTS ferpa_annual_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- FERPA ACCESS CONTROL TABLES
-- =============================================================================

-- Parent verification codes
CREATE TABLE IF NOT EXISTS parent_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Parent verification documents
CREATE TABLE IF NOT EXISTS parent_verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_hash VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Parent verification logs
CREATE TABLE IF NOT EXISTS parent_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- FERPA access logs
CREATE TABLE IF NOT EXISTS ferpa_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    requester_id UUID REFERENCES users(id) ON DELETE SET NULL,
    record_count INTEGER NOT NULL,
    access_context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- CONSENT MANAGEMENT TABLES
-- =============================================================================

-- Consent action logs
CREATE TABLE IF NOT EXISTS consent_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    consent_id UUID NOT NULL,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Consent error logs
CREATE TABLE IF NOT EXISTS consent_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- FERPA ERROR LOGGING TABLES
-- =============================================================================

-- FERPA error logs
CREATE TABLE IF NOT EXISTS ferpa_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- FERPA notification logs
CREATE TABLE IF NOT EXISTS ferpa_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_message TEXT NOT NULL,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Data classification indexes
CREATE INDEX IF NOT EXISTS idx_tenant_data_classification_policy_tenant_id ON tenant_data_classification_policy(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_classification_logs_tenant_id ON data_classification_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_classification_logs_user_id ON data_classification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_classification_logs_created_at ON data_classification_logs(created_at);

-- FERPA consent indexes
CREATE INDEX IF NOT EXISTS idx_ferpa_consents_student_id ON ferpa_consents(student_id);
CREATE INDEX IF NOT EXISTS idx_ferpa_consents_parent_id ON ferpa_consents(parent_id);
CREATE INDEX IF NOT EXISTS idx_ferpa_consents_tenant_id ON ferpa_consents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ferpa_consents_consent_type ON ferpa_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_ferpa_consents_status ON ferpa_consents(status);
CREATE INDEX IF NOT EXISTS idx_ferpa_consents_expires_at ON ferpa_consents(expires_at);

-- Directory opt-out indexes
CREATE INDEX IF NOT EXISTS idx_directory_opt_outs_student_id ON directory_information_opt_outs(student_id);
CREATE INDEX IF NOT EXISTS idx_directory_opt_outs_tenant_id ON directory_information_opt_outs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_directory_opt_outs_effective_date ON directory_information_opt_outs(effective_date);

-- FERPA disclosure indexes
CREATE INDEX IF NOT EXISTS idx_ferpa_disclosures_tenant_id ON ferpa_disclosures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ferpa_disclosures_record_id ON ferpa_disclosures(record_id);
CREATE INDEX IF NOT EXISTS idx_ferpa_disclosures_disclosed_at ON ferpa_disclosures(disclosed_at);
CREATE INDEX IF NOT EXISTS idx_ferpa_disclosure_audit_tenant_id ON ferpa_disclosure_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ferpa_disclosure_audit_disclosure_id ON ferpa_disclosure_audit(disclosure_id);

-- FERPA notification indexes
CREATE INDEX IF NOT EXISTS idx_ferpa_notifications_tenant_id ON ferpa_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ferpa_notifications_parent_id ON ferpa_notifications(parent_id);
CREATE INDEX IF NOT EXISTS idx_ferpa_notifications_sent_at ON ferpa_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_ferpa_annual_notification_log_tenant_id ON ferpa_annual_notification_log(tenant_id);

-- Parent verification indexes
CREATE INDEX IF NOT EXISTS idx_parent_verification_codes_parent_id ON parent_verification_codes(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_verification_codes_student_id ON parent_verification_codes(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_verification_codes_code ON parent_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_parent_verification_codes_expires_at ON parent_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_parent_verification_documents_parent_id ON parent_verification_documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_verification_documents_hash ON parent_verification_documents(document_hash);
CREATE INDEX IF NOT EXISTS idx_parent_verification_logs_parent_id ON parent_verification_logs(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_verification_logs_student_id ON parent_verification_logs(student_id);

-- FERPA access log indexes
CREATE INDEX IF NOT EXISTS idx_ferpa_access_logs_student_id ON ferpa_access_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_ferpa_access_logs_requester_id ON ferpa_access_logs(requester_id);
CREATE INDEX IF NOT EXISTS idx_ferpa_access_logs_created_at ON ferpa_access_logs(created_at);

-- Consent management indexes
CREATE INDEX IF NOT EXISTS idx_consent_action_logs_consent_id ON consent_action_logs(consent_id);
CREATE INDEX IF NOT EXISTS idx_consent_action_logs_action ON consent_action_logs(action);
CREATE INDEX IF NOT EXISTS idx_consent_action_logs_created_at ON consent_action_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_consent_error_logs_created_at ON consent_error_logs(created_at);

-- FERPA error logging indexes
CREATE INDEX IF NOT EXISTS idx_ferpa_error_logs_created_at ON ferpa_error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ferpa_notification_logs_created_at ON ferpa_notification_logs(created_at);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all FERPA compliance tables
ALTER TABLE tenant_data_classification_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_classification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferpa_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_information_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferpa_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferpa_disclosure_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferpa_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferpa_annual_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferpa_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferpa_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferpa_notification_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_data_classification_policy_tenant_isolation ON tenant_data_classification_policy
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY data_classification_logs_tenant_isolation ON data_classification_logs
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY ferpa_consents_tenant_isolation ON ferpa_consents
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY directory_opt_outs_tenant_isolation ON directory_information_opt_outs
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY ferpa_disclosures_tenant_isolation ON ferpa_disclosures
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY ferpa_disclosure_audit_tenant_isolation ON ferpa_disclosure_audit
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY ferpa_notifications_tenant_isolation ON ferpa_notifications
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY ferpa_annual_notification_log_tenant_isolation ON ferpa_annual_notification_log
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY parent_verification_codes_tenant_isolation ON parent_verification_codes
    FOR ALL TO authenticated
    USING (parent_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));

CREATE POLICY parent_verification_documents_tenant_isolation ON parent_verification_documents
    FOR ALL TO authenticated
    USING (parent_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));

CREATE POLICY parent_verification_logs_tenant_isolation ON parent_verification_logs
    FOR ALL TO authenticated
    USING (parent_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));

CREATE POLICY ferpa_access_logs_tenant_isolation ON ferpa_access_logs
    FOR ALL TO authenticated
    USING (requester_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));

-- Super admin access policies
CREATE POLICY tenant_data_classification_policy_super_admin_access ON tenant_data_classification_policy
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY data_classification_logs_super_admin_access ON data_classification_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY ferpa_consents_super_admin_access ON ferpa_consents
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY directory_opt_outs_super_admin_access ON directory_information_opt_outs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY ferpa_disclosures_super_admin_access ON ferpa_disclosures
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY ferpa_disclosure_audit_super_admin_access ON ferpa_disclosure_audit
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY ferpa_notifications_super_admin_access ON ferpa_notifications
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY ferpa_annual_notification_log_super_admin_access ON ferpa_annual_notification_log
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY parent_verification_codes_super_admin_access ON parent_verification_codes
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY parent_verification_documents_super_admin_access ON parent_verification_documents
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY parent_verification_logs_super_admin_access ON parent_verification_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY ferpa_access_logs_super_admin_access ON ferpa_access_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY consent_action_logs_super_admin_access ON consent_action_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY consent_error_logs_super_admin_access ON consent_error_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY ferpa_error_logs_super_admin_access ON ferpa_error_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY ferpa_notification_logs_super_admin_access ON ferpa_notification_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE tenant_data_classification_policy IS 'Data classification policy configuration per tenant';
COMMENT ON TABLE data_classification_logs IS 'Audit trail for data classification decisions';
COMMENT ON TABLE ferpa_consents IS 'FERPA consent records with comprehensive tracking';
COMMENT ON TABLE directory_information_opt_outs IS 'Directory information opt-out preferences';
COMMENT ON TABLE ferpa_disclosures IS 'Enhanced FERPA disclosure tracking with detailed metadata';
COMMENT ON TABLE ferpa_disclosure_audit IS 'Audit trail for FERPA disclosures';
COMMENT ON TABLE ferpa_notifications IS 'FERPA notification records';
COMMENT ON TABLE ferpa_annual_notification_log IS 'Annual FERPA notification tracking';
COMMENT ON TABLE parent_verification_codes IS 'Parent verification codes for identity verification';
COMMENT ON TABLE parent_verification_documents IS 'Parent verification documents';
COMMENT ON TABLE parent_verification_logs IS 'Parent verification attempt logs';
COMMENT ON TABLE ferpa_access_logs IS 'FERPA educational records access logs';
COMMENT ON TABLE consent_action_logs IS 'Consent management action audit trail';
COMMENT ON TABLE consent_error_logs IS 'Consent management error logs';
COMMENT ON TABLE ferpa_error_logs IS 'FERPA service error logs';
COMMENT ON TABLE ferpa_notification_logs IS 'FERPA notification event logs';

-- =============================================================================
-- CLEANUP FUNCTIONS
-- =============================================================================

-- Function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM parent_verification_codes 
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old error logs
CREATE OR REPLACE FUNCTION cleanup_old_error_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ferpa_error_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM consent_error_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notification logs
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ferpa_notification_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM consent_action_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- IMPLEMENTATION NOTES
-- =============================================================================

-- FERPA COMPLIANCE IMPLEMENTATION REQUIRED:
-- 1. All educational records must be classified and protected
-- 2. Directory information opt-outs must be respected
-- 3. Parent consent must be obtained before disclosure
-- 4. All disclosures must be tracked and audited
-- 5. Annual notifications must be sent to parents
-- 6. Access to records must be logged and monitored
-- 7. Consent can be revoked at any time
-- 8. Data must be deleted when consent is revoked

-- SECURITY IMPLEMENTATION REQUIRED:
-- 1. All sensitive data must be encrypted
-- 2. Access controls must be enforced at all levels
-- 3. Audit trails must be immutable
-- 4. Parent identity must be verified
-- 5. Consent must be explicit and documented
-- 6. Data sharing must be limited to authorized purposes

-- OPERATIONAL IMPLEMENTATION REQUIRED:
-- 1. Regular cleanup of expired codes and old logs
-- 2. Monitoring of consent expiration dates
-- 3. Automated annual notification sending
-- 4. Regular compliance audits
-- 5. Staff training on FERPA requirements
-- 6. Incident response procedures for violations
