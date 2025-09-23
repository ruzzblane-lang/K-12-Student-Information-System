-- Missing Compliance Tables
-- FERPA, COPPA, and PCI DSS requirements

-- FERPA Disclosures Table
CREATE TABLE IF NOT EXISTS ferpa_disclosures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    disclosed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- COPPA Parental Consent Table
CREATE TABLE IF NOT EXISTS coppa_parental_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL,
    consent_method VARCHAR(100) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
);

-- Student Access Rights Table
CREATE TABLE IF NOT EXISTS student_access_rights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    requester_id UUID NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Educational Records Table
CREATE TABLE IF NOT EXISTS educational_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    record_type VARCHAR(100) NOT NULL,
    record_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PCI DSS Compliance Table
CREATE TABLE IF NOT EXISTS pci_dss_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    requirement_number INTEGER NOT NULL,
    requirement_status BOOLEAN NOT NULL,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ferpa_disclosures_tenant_id ON ferpa_disclosures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coppa_consent_child_id ON coppa_parental_consent(child_id);
CREATE INDEX IF NOT EXISTS idx_student_access_student_id ON student_access_rights(student_id);
CREATE INDEX IF NOT EXISTS idx_educational_records_student_id ON educational_records(student_id);
CREATE INDEX IF NOT EXISTS idx_pci_compliance_tenant_id ON pci_dss_compliance(tenant_id);
