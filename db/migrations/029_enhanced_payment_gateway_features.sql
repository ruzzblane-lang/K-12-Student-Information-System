-- Migration: Enhanced Payment Gateway Features
-- Description: Creates tables for enhanced payment orchestration, compliance automation, performance monitoring, and audit trails
-- Version: 029
-- Date: 2024-12-19

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create provider performance metrics table
CREATE TABLE IF NOT EXISTS provider_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    success_rate DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    average_response_time INTEGER NOT NULL DEFAULT 0,
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    last_health_check TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    circuit_breaker_state VARCHAR(20) DEFAULT 'closed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create compliance checks table
CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    check_type VARCHAR(100) NOT NULL,
    data_hash VARCHAR(64) NOT NULL,
    passed BOOLEAN NOT NULL,
    violations JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    required_actions JSONB DEFAULT '[]',
    audit_events JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create compliance audit events table
CREATE TABLE IF NOT EXISTS compliance_audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    context_data JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create performance transactions table
CREATE TABLE IF NOT EXISTS performance_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    transaction_type VARCHAR(100) NOT NULL,
    duration_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    memory_usage JSONB,
    cpu_usage JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create load test results table
CREATE TABLE IF NOT EXISTS load_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config JSONB NOT NULL,
    results JSONB NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit trail events table
CREATE TABLE IF NOT EXISTS audit_trail_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    security_level VARCHAR(20) NOT NULL,
    event_data JSONB NOT NULL,
    context_data JSONB DEFAULT '{}',
    hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    correlation_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit chain integrity table
CREATE TABLE IF NOT EXISTS audit_chain_integrity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_hash VARCHAR(64) NOT NULL,
    chain_position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    event_id UUID REFERENCES audit_trail_events(id) ON DELETE SET NULL,
    ip_address INET,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create digital archive tables
CREATE TABLE IF NOT EXISTS digital_archives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    archive_type VARCHAR(50) NOT NULL, -- 'media', 'documents', 'records'
    storage_config JSONB NOT NULL,
    access_config JSONB NOT NULL,
    retention_policy JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create archive items table
CREATE TABLE IF NOT EXISTS archive_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    archive_id UUID NOT NULL REFERENCES digital_archives(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    is_public BOOLEAN DEFAULT FALSE,
    access_level VARCHAR(50) DEFAULT 'private',
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create archive access logs table
CREATE TABLE IF NOT EXISTS archive_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    archive_id UUID NOT NULL REFERENCES digital_archives(id) ON DELETE CASCADE,
    item_id UUID REFERENCES archive_items(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    access_type VARCHAR(50) NOT NULL, -- 'view', 'download', 'upload', 'delete'
    ip_address INET,
    user_agent TEXT,
    access_granted BOOLEAN NOT NULL,
    access_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create white-label frontend configurations table
CREATE TABLE IF NOT EXISTS white_label_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    config_name VARCHAR(255) NOT NULL,
    config_type VARCHAR(50) NOT NULL, -- 'archive', 'payment', 'general'
    branding_config JSONB NOT NULL,
    layout_config JSONB DEFAULT '{}',
    feature_config JSONB DEFAULT '{}',
    custom_css TEXT,
    custom_js TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create fraud detection rules table
CREATE TABLE IF NOT EXISTS fraud_detection_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'amount', 'frequency', 'location', 'device', 'behavior'
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL, -- 'block', 'review', 'flag', 'allow'
    risk_score INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create anomaly detection events table
CREATE TABLE IF NOT EXISTS anomaly_detection_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    anomaly_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    detection_data JSONB NOT NULL,
    baseline_data JSONB,
    confidence_score DECIMAL(5,2) NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_performance_metrics_provider_name ON provider_performance_metrics(provider_name);
CREATE INDEX IF NOT EXISTS idx_provider_performance_metrics_success_rate ON provider_performance_metrics(success_rate);
CREATE INDEX IF NOT EXISTS idx_provider_performance_metrics_last_health_check ON provider_performance_metrics(last_health_check);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_tenant_id ON compliance_checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_check_type ON compliance_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_passed ON compliance_checks(passed);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_created_at ON compliance_checks(created_at);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_events_tenant_id ON compliance_audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_events_event_type ON compliance_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_events_user_id ON compliance_audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_events_created_at ON compliance_audit_events(created_at);

CREATE INDEX IF NOT EXISTS idx_performance_transactions_tenant_id ON performance_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_transactions_transaction_type ON performance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_performance_transactions_success ON performance_transactions(success);
CREATE INDEX IF NOT EXISTS idx_performance_transactions_created_at ON performance_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_load_test_results_status ON load_test_results(status);
CREATE INDEX IF NOT EXISTS idx_load_test_results_start_time ON load_test_results(start_time);
CREATE INDEX IF NOT EXISTS idx_load_test_results_created_at ON load_test_results(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_trail_events_tenant_id ON audit_trail_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_events_event_type ON audit_trail_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_events_security_level ON audit_trail_events(security_level);
CREATE INDEX IF NOT EXISTS idx_audit_trail_events_user_id ON audit_trail_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_events_hash ON audit_trail_events(hash);
CREATE INDEX IF NOT EXISTS idx_audit_trail_events_created_at ON audit_trail_events(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_chain_integrity_tenant_id ON audit_chain_integrity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_chain_integrity_chain_position ON audit_chain_integrity(chain_position);

CREATE INDEX IF NOT EXISTS idx_security_alerts_tenant_id ON security_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_alert_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_is_resolved ON security_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_digital_archives_tenant_id ON digital_archives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_digital_archives_archive_type ON digital_archives(archive_type);
CREATE INDEX IF NOT EXISTS idx_digital_archives_is_active ON digital_archives(is_active);
CREATE INDEX IF NOT EXISTS idx_digital_archives_created_at ON digital_archives(created_at);

CREATE INDEX IF NOT EXISTS idx_archive_items_tenant_id ON archive_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_archive_items_archive_id ON archive_items(archive_id);
CREATE INDEX IF NOT EXISTS idx_archive_items_item_type ON archive_items(item_type);
CREATE INDEX IF NOT EXISTS idx_archive_items_is_public ON archive_items(is_public);
CREATE INDEX IF NOT EXISTS idx_archive_items_access_level ON archive_items(access_level);
CREATE INDEX IF NOT EXISTS idx_archive_items_created_at ON archive_items(created_at);

CREATE INDEX IF NOT EXISTS idx_archive_access_logs_tenant_id ON archive_access_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_archive_access_logs_archive_id ON archive_access_logs(archive_id);
CREATE INDEX IF NOT EXISTS idx_archive_access_logs_item_id ON archive_access_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_archive_access_logs_user_id ON archive_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_archive_access_logs_access_type ON archive_access_logs(access_type);
CREATE INDEX IF NOT EXISTS idx_archive_access_logs_access_granted ON archive_access_logs(access_granted);
CREATE INDEX IF NOT EXISTS idx_archive_access_logs_created_at ON archive_access_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_white_label_configurations_tenant_id ON white_label_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_white_label_configurations_config_type ON white_label_configurations(config_type);
CREATE INDEX IF NOT EXISTS idx_white_label_configurations_is_active ON white_label_configurations(is_active);

CREATE INDEX IF NOT EXISTS idx_fraud_detection_rules_tenant_id ON fraud_detection_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_rules_rule_type ON fraud_detection_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_rules_is_active ON fraud_detection_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_anomaly_detection_events_tenant_id ON anomaly_detection_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_events_event_type ON anomaly_detection_events(event_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_events_anomaly_type ON anomaly_detection_events(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_events_severity ON anomaly_detection_events(severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_events_is_resolved ON anomaly_detection_events(is_resolved);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_events_created_at ON anomaly_detection_events(created_at);

-- Add check constraints
ALTER TABLE provider_performance_metrics 
ADD CONSTRAINT chk_provider_performance_metrics_success_rate_range 
CHECK (success_rate >= 0 AND success_rate <= 100);

ALTER TABLE provider_performance_metrics 
ADD CONSTRAINT chk_provider_performance_metrics_average_response_time_positive 
CHECK (average_response_time >= 0);

ALTER TABLE provider_performance_metrics 
ADD CONSTRAINT chk_provider_performance_metrics_total_requests_positive 
CHECK (total_requests >= 0);

ALTER TABLE performance_transactions 
ADD CONSTRAINT chk_performance_transactions_duration_positive 
CHECK (duration_ms >= 0);

ALTER TABLE fraud_detection_rules 
ADD CONSTRAINT chk_fraud_detection_rules_risk_score_range 
CHECK (risk_score >= 0 AND risk_score <= 100);

ALTER TABLE anomaly_detection_events 
ADD CONSTRAINT chk_anomaly_detection_events_confidence_score_range 
CHECK (confidence_score >= 0 AND confidence_score <= 100);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_provider_performance_metrics_updated_at 
    BEFORE UPDATE ON provider_performance_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_digital_archives_updated_at 
    BEFORE UPDATE ON digital_archives 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_archive_items_updated_at 
    BEFORE UPDATE ON archive_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_white_label_configurations_updated_at 
    BEFORE UPDATE ON white_label_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fraud_detection_rules_updated_at 
    BEFORE UPDATE ON fraud_detection_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE provider_performance_metrics IS 'Performance metrics for payment providers including success rates and response times';
COMMENT ON TABLE compliance_checks IS 'Records of compliance validation checks performed on payments and transactions';
COMMENT ON TABLE compliance_audit_events IS 'Audit events related to compliance validation and regulatory requirements';
COMMENT ON TABLE performance_transactions IS 'Performance monitoring data for individual transactions';
COMMENT ON TABLE load_test_results IS 'Results from load testing and performance validation';
COMMENT ON TABLE audit_trail_events IS 'Immutable audit trail for all system events with cryptographic integrity';
COMMENT ON TABLE audit_chain_integrity IS 'Maintains cryptographic chain of integrity for audit trail events';
COMMENT ON TABLE security_alerts IS 'Security alerts and notifications generated by the system';
COMMENT ON TABLE digital_archives IS 'Configuration for digital archives and media storage';
COMMENT ON TABLE archive_items IS 'Individual items stored in digital archives';
COMMENT ON TABLE archive_access_logs IS 'Access logs for digital archive items';
COMMENT ON TABLE white_label_configurations IS 'White-label frontend configurations for tenants';
COMMENT ON TABLE fraud_detection_rules IS 'Configurable fraud detection rules and thresholds';
COMMENT ON TABLE anomaly_detection_events IS 'Anomaly detection events and alerts';

COMMIT;
