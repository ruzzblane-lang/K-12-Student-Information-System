-- Enhanced FERPA Compliance Features
-- Implements photo consent, archive encryption, watermarking, and retention policies
-- Created: 2024-01-01
-- Updated: 2024-01-15 (Enhanced FERPA compliance features)

-- =============================================================================
-- PHOTO CONSENT MANAGEMENT TABLES
-- =============================================================================

-- Photo consents table
CREATE TABLE IF NOT EXISTS photo_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    consent_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    photo_types JSONB NOT NULL DEFAULT '[]',
    usage_types JSONB NOT NULL DEFAULT '[]',
    restrictions JSONB DEFAULT '[]',
    granted_at TIMESTAMP WITH TIME ZONE,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    denied_at TIMESTAMP WITH TIME ZONE,
    denied_by UUID REFERENCES users(id) ON DELETE SET NULL,
    denied_reason TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revocation_reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student photos table
CREATE TABLE IF NOT EXISTS student_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    photo_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(255) NOT NULL,
    photo_type VARCHAR(100) NOT NULL,
    usage_type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    consent_id UUID REFERENCES photo_consents(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Photo consent action logs
CREATE TABLE IF NOT EXISTS photo_consent_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    consent_id UUID NOT NULL,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Photo usage logs
CREATE TABLE IF NOT EXISTS photo_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    photo_type VARCHAR(100) NOT NULL,
    usage_type VARCHAR(100) NOT NULL,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Photo consent error logs
CREATE TABLE IF NOT EXISTS photo_consent_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ARCHIVE ENCRYPTION TABLES
-- =============================================================================

-- Archive encryption keys
CREATE TABLE IF NOT EXISTS archive_encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    archive_type VARCHAR(100) NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Archive records
CREATE TABLE IF NOT EXISTS archive_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    archive_type VARCHAR(100) NOT NULL,
    original_path VARCHAR(500) NOT NULL,
    archive_path VARCHAR(500) NOT NULL,
    key_id UUID REFERENCES archive_encryption_keys(id) ON DELETE SET NULL,
    file_size BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'encrypted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Archive encryption logs
CREATE TABLE IF NOT EXISTS archive_encryption_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    archive_id UUID NOT NULL,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Archive encryption error logs
CREATE TABLE IF NOT EXISTS archive_encryption_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- WATERMARKING TABLES
-- =============================================================================

-- Watermark records
CREATE TABLE IF NOT EXISTS watermark_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    original_path VARCHAR(500) NOT NULL,
    watermarked_path VARCHAR(500),
    watermark_text TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    watermark_type VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    opacity DECIMAL(3,2) DEFAULT 0.5,
    watermark_hash VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Watermark action logs
CREATE TABLE IF NOT EXISTS watermark_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    watermark_id UUID,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Watermark error logs
CREATE TABLE IF NOT EXISTS watermark_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- RETENTION POLICY TABLES
-- =============================================================================

-- Retention policies
CREATE TABLE IF NOT EXISTS retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    retention_type VARCHAR(100) NOT NULL,
    retention_period_years INTEGER NOT NULL,
    action_on_expiry VARCHAR(100) NOT NULL,
    legal_requirement VARCHAR(200) DEFAULT 'FERPA',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, retention_type)
);

-- Retention notifications
CREATE TABLE IF NOT EXISTS retention_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL,
    record_type VARCHAR(100) NOT NULL,
    policy_id UUID REFERENCES retention_policies(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Retention action logs
CREATE TABLE IF NOT EXISTS retention_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    record_id UUID,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Retention error logs
CREATE TABLE IF NOT EXISTS retention_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ENHANCED EXISTING TABLES
-- =============================================================================

-- Add retention status columns to existing tables
ALTER TABLE students ADD COLUMN IF NOT EXISTS retention_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS archive_path VARCHAR(500);

ALTER TABLE educational_records ADD COLUMN IF NOT EXISTS retention_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE educational_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE educational_records ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE educational_records ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE educational_records ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE educational_records ADD COLUMN IF NOT EXISTS archive_path VARCHAR(500);

ALTER TABLE ferpa_consents ADD COLUMN IF NOT EXISTS retention_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE ferpa_consents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ferpa_consents ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ferpa_consents ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ferpa_consents ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ferpa_consents ADD COLUMN IF NOT EXISTS archive_path VARCHAR(500);

ALTER TABLE ferpa_disclosures ADD COLUMN IF NOT EXISTS retention_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE ferpa_disclosures ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ferpa_disclosures ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ferpa_disclosures ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ferpa_disclosures ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ferpa_disclosures ADD COLUMN IF NOT EXISTS archive_path VARCHAR(500);

-- Add watermarking columns to student_photos
ALTER TABLE student_photos ADD COLUMN IF NOT EXISTS watermark_id UUID;
ALTER TABLE student_photos ADD COLUMN IF NOT EXISTS watermark_hash VARCHAR(255);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Photo consent indexes
CREATE INDEX IF NOT EXISTS idx_photo_consents_student_id ON photo_consents(student_id);
CREATE INDEX IF NOT EXISTS idx_photo_consents_tenant_id ON photo_consents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_photo_consents_consent_status ON photo_consents(consent_status);
CREATE INDEX IF NOT EXISTS idx_photo_consents_expires_at ON photo_consents(expires_at);

-- Student photos indexes
CREATE INDEX IF NOT EXISTS idx_student_photos_student_id ON student_photos(student_id);
CREATE INDEX IF NOT EXISTS idx_student_photos_tenant_id ON student_photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_photos_photo_type ON student_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_student_photos_usage_type ON student_photos(usage_type);
CREATE INDEX IF NOT EXISTS idx_student_photos_consent_id ON student_photos(consent_id);
CREATE INDEX IF NOT EXISTS idx_student_photos_status ON student_photos(status);

-- Photo consent action logs indexes
CREATE INDEX IF NOT EXISTS idx_photo_consent_action_logs_consent_id ON photo_consent_action_logs(consent_id);
CREATE INDEX IF NOT EXISTS idx_photo_consent_action_logs_action ON photo_consent_action_logs(action);
CREATE INDEX IF NOT EXISTS idx_photo_consent_action_logs_created_at ON photo_consent_action_logs(created_at);

-- Photo usage logs indexes
CREATE INDEX IF NOT EXISTS idx_photo_usage_logs_student_id ON photo_usage_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_photo_usage_logs_photo_type ON photo_usage_logs(photo_type);
CREATE INDEX IF NOT EXISTS idx_photo_usage_logs_usage_type ON photo_usage_logs(usage_type);
CREATE INDEX IF NOT EXISTS idx_photo_usage_logs_created_at ON photo_usage_logs(created_at);

-- Archive encryption indexes
CREATE INDEX IF NOT EXISTS idx_archive_encryption_keys_tenant_id ON archive_encryption_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_archive_encryption_keys_archive_type ON archive_encryption_keys(archive_type);
CREATE INDEX IF NOT EXISTS idx_archive_records_tenant_id ON archive_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_archive_records_archive_type ON archive_records(archive_type);
CREATE INDEX IF NOT EXISTS idx_archive_records_key_id ON archive_records(key_id);
CREATE INDEX IF NOT EXISTS idx_archive_records_status ON archive_records(status);

-- Archive encryption logs indexes
CREATE INDEX IF NOT EXISTS idx_archive_encryption_logs_archive_id ON archive_encryption_logs(archive_id);
CREATE INDEX IF NOT EXISTS idx_archive_encryption_logs_action ON archive_encryption_logs(action);
CREATE INDEX IF NOT EXISTS idx_archive_encryption_logs_created_at ON archive_encryption_logs(created_at);

-- Watermarking indexes
CREATE INDEX IF NOT EXISTS idx_watermark_records_tenant_id ON watermark_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_watermark_records_file_type ON watermark_records(file_type);
CREATE INDEX IF NOT EXISTS idx_watermark_records_watermark_type ON watermark_records(watermark_type);
CREATE INDEX IF NOT EXISTS idx_watermark_records_status ON watermark_records(status);
CREATE INDEX IF NOT EXISTS idx_watermark_records_watermark_hash ON watermark_records(watermark_hash);

-- Watermark action logs indexes
CREATE INDEX IF NOT EXISTS idx_watermark_action_logs_watermark_id ON watermark_action_logs(watermark_id);
CREATE INDEX IF NOT EXISTS idx_watermark_action_logs_action ON watermark_action_logs(action);
CREATE INDEX IF NOT EXISTS idx_watermark_action_logs_created_at ON watermark_action_logs(created_at);

-- Retention policy indexes
CREATE INDEX IF NOT EXISTS idx_retention_policies_tenant_id ON retention_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_retention_policies_retention_type ON retention_policies(retention_type);
CREATE INDEX IF NOT EXISTS idx_retention_policies_is_active ON retention_policies(is_active);

-- Retention notifications indexes
CREATE INDEX IF NOT EXISTS idx_retention_notifications_record_id ON retention_notifications(record_id);
CREATE INDEX IF NOT EXISTS idx_retention_notifications_record_type ON retention_notifications(record_type);
CREATE INDEX IF NOT EXISTS idx_retention_notifications_policy_id ON retention_notifications(policy_id);
CREATE INDEX IF NOT EXISTS idx_retention_notifications_created_at ON retention_notifications(created_at);

-- Retention action logs indexes
CREATE INDEX IF NOT EXISTS idx_retention_action_logs_record_id ON retention_action_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_retention_action_logs_action ON retention_action_logs(action);
CREATE INDEX IF NOT EXISTS idx_retention_action_logs_created_at ON retention_action_logs(created_at);

-- Enhanced existing table indexes
CREATE INDEX IF NOT EXISTS idx_students_retention_status ON students(retention_status);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_educational_records_retention_status ON educational_records(retention_status);
CREATE INDEX IF NOT EXISTS idx_educational_records_deleted_at ON educational_records(deleted_at);
CREATE INDEX IF NOT EXISTS idx_ferpa_consents_retention_status ON ferpa_consents(retention_status);
CREATE INDEX IF NOT EXISTS idx_ferpa_consents_deleted_at ON ferpa_consents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_ferpa_disclosures_retention_status ON ferpa_disclosures(retention_status);
CREATE INDEX IF NOT EXISTS idx_ferpa_disclosures_deleted_at ON ferpa_disclosures(deleted_at);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all new compliance tables
ALTER TABLE photo_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_consent_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_consent_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_encryption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_encryption_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE watermark_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE watermark_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE watermark_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_error_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies for photo consents
CREATE POLICY photo_consents_tenant_isolation ON photo_consents
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY photo_consents_super_admin_access ON photo_consents
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Tenant isolation policies for student photos
CREATE POLICY student_photos_tenant_isolation ON student_photos
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY student_photos_super_admin_access ON student_photos
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Tenant isolation policies for archive encryption
CREATE POLICY archive_encryption_keys_tenant_isolation ON archive_encryption_keys
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY archive_encryption_keys_super_admin_access ON archive_encryption_keys
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY archive_records_tenant_isolation ON archive_records
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY archive_records_super_admin_access ON archive_records
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Tenant isolation policies for watermarking
CREATE POLICY watermark_records_tenant_isolation ON watermark_records
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY watermark_records_super_admin_access ON watermark_records
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Tenant isolation policies for retention policies
CREATE POLICY retention_policies_tenant_isolation ON retention_policies
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY retention_policies_super_admin_access ON retention_policies
    FOR ALL TO authenticated
    USING (is_super_admin());

-- Super admin access policies for all log tables
CREATE POLICY photo_consent_action_logs_super_admin_access ON photo_consent_action_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY photo_usage_logs_super_admin_access ON photo_usage_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY photo_consent_error_logs_super_admin_access ON photo_consent_error_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY archive_encryption_logs_super_admin_access ON archive_encryption_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY archive_encryption_error_logs_super_admin_access ON archive_encryption_error_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY watermark_action_logs_super_admin_access ON watermark_action_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY watermark_error_logs_super_admin_access ON watermark_error_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY retention_notifications_super_admin_access ON retention_notifications
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY retention_action_logs_super_admin_access ON retention_action_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

CREATE POLICY retention_error_logs_super_admin_access ON retention_error_logs
    FOR ALL TO authenticated
    USING (is_super_admin());

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE photo_consents IS 'Photo consent management for FERPA compliance';
COMMENT ON TABLE student_photos IS 'Student photos with consent tracking and watermarking';
COMMENT ON TABLE photo_consent_action_logs IS 'Audit trail for photo consent actions';
COMMENT ON TABLE photo_usage_logs IS 'Log of photo usage for compliance tracking';
COMMENT ON TABLE photo_consent_error_logs IS 'Error logs for photo consent operations';

COMMENT ON TABLE archive_encryption_keys IS 'Encryption keys for archived files';
COMMENT ON TABLE archive_records IS 'Records of encrypted archived files';
COMMENT ON TABLE archive_encryption_logs IS 'Audit trail for archive encryption operations';
COMMENT ON TABLE archive_encryption_error_logs IS 'Error logs for archive encryption operations';

COMMENT ON TABLE watermark_records IS 'Watermarking records for document protection';
COMMENT ON TABLE watermark_action_logs IS 'Audit trail for watermarking operations';
COMMENT ON TABLE watermark_error_logs IS 'Error logs for watermarking operations';

COMMENT ON TABLE retention_policies IS 'Data retention policies for FERPA compliance';
COMMENT ON TABLE retention_notifications IS 'Notifications for data retention events';
COMMENT ON TABLE retention_action_logs IS 'Audit trail for retention policy actions';
COMMENT ON TABLE retention_error_logs IS 'Error logs for retention policy operations';

-- =============================================================================
-- CLEANUP FUNCTIONS
-- =============================================================================

-- Function to clean up expired photo consents
CREATE OR REPLACE FUNCTION cleanup_expired_photo_consents()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE photo_consents 
    SET consent_status = 'expired', updated_at = NOW()
    WHERE consent_status = 'granted' AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old watermark records
CREATE OR REPLACE FUNCTION cleanup_old_watermark_records(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM watermark_records 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
    AND status = 'failed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old archive records
CREATE OR REPLACE FUNCTION cleanup_old_archive_records(retention_days INTEGER DEFAULT 2555)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM archive_records 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
    AND status = 'failed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old retention logs
CREATE OR REPLACE FUNCTION cleanup_old_retention_logs(retention_days INTEGER DEFAULT 2555)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM retention_action_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM retention_error_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- IMPLEMENTATION NOTES
-- =============================================================================

-- ENHANCED FERPA COMPLIANCE IMPLEMENTATION REQUIRED:
-- 1. Photo consent management with opt-in/opt-out functionality
-- 2. Archive encryption for long-term data storage
-- 3. Watermarking to prevent unauthorized duplication
-- 4. Retention policies with auto-delete after X years
-- 5. Comprehensive audit logging for all operations
-- 6. Data anonymization for expired records
-- 7. Secure key management for encryption
-- 8. Automated cleanup and maintenance procedures

-- SECURITY IMPLEMENTATION REQUIRED:
-- 1. All archived files must be encrypted at rest
-- 2. Watermarks must be tamper-resistant
-- 3. Retention policies must be enforced automatically
-- 4. Photo consent must be explicit and documented
-- 5. Access controls must be enforced at all levels
-- 6. Audit trails must be immutable

-- OPERATIONAL IMPLEMENTATION REQUIRED:
-- 1. Regular cleanup of expired consents and old records
-- 2. Automated retention policy enforcement
-- 3. Monitoring of watermarking and encryption operations
-- 4. Regular backup of encryption keys
-- 5. Staff training on new compliance features
-- 6. Incident response procedures for compliance violations
