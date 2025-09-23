-- Migration: Create Payment Gateway Tables
-- Description: Creates all necessary tables for the Payment Gateway API (Fort Knox Edition)
-- Version: 024
-- Date: 2024-01-15

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create payment_attempts table
CREATE TABLE IF NOT EXISTS payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    provider_transaction_id VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'attempted',
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaction_id)
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orchestration_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    provider_transaction_id VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    fraud_risk_score INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaction_id),
    UNIQUE(provider_transaction_id)
);

-- Create refund_attempts table
CREATE TABLE IF NOT EXISTS refund_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    refund_id VARCHAR(100) NOT NULL,
    original_transaction_id VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    provider_refund_id VARCHAR(100),
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(refund_id)
);

-- Create payment_method_tokens table
CREATE TABLE IF NOT EXISTS payment_method_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    token_id VARCHAR(100) NOT NULL,
    payment_method_type VARCHAR(50) NOT NULL,
    last4 VARCHAR(4),
    expiry_month INTEGER,
    expiry_year INTEGER,
    brand VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(token_id)
);

-- Create payment_orchestration_logs table
CREATE TABLE IF NOT EXISTS payment_orchestration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orchestration_id UUID NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL,
    provider VARCHAR(50),
    transaction_id VARCHAR(100),
    refund_id VARCHAR(100),
    error_message TEXT,
    processing_time_ms INTEGER,
    type VARCHAR(50) DEFAULT 'payment',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_provider_failures table
CREATE TABLE IF NOT EXISTS payment_provider_failures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orchestration_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create webhook_events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    processing_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create fraud_assessments table
CREATE TABLE IF NOT EXISTS fraud_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100),
    risk_score INTEGER NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    risk_factors JSONB NOT NULL,
    checks_data JSONB NOT NULL,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create fraud_alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100),
    risk_score INTEGER NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    risk_factors JSONB NOT NULL,
    assessment_id UUID REFERENCES fraud_assessments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'open',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create fraud_blacklists table
CREATE TABLE IF NOT EXISTS fraud_blacklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'email', 'ip', 'card', 'phone'
    value VARCHAR(255) NOT NULL,
    reason TEXT,
    source VARCHAR(100), -- 'manual', 'automated', 'external'
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, value)
);

-- Create payment_locations table
CREATE TABLE IF NOT EXISTS payment_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country VARCHAR(2) NOT NULL,
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_devices table
CREATE TABLE IF NOT EXISTS payment_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fingerprint VARCHAR(255) NOT NULL,
    user_agent TEXT,
    is_trusted BOOLEAN DEFAULT false,
    is_vpn BOOLEAN DEFAULT false,
    is_proxy BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(20, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create currency_conversions table
CREATE TABLE IF NOT EXISTS currency_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    source_amount DECIMAL(15,2) NOT NULL,
    converted_amount DECIMAL(15,2) NOT NULL,
    exchange_rate DECIMAL(20, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_flows table
CREATE TABLE IF NOT EXISTS payment_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branding_config JSONB NOT NULL,
    payment_config JSONB NOT NULL,
    features_config JSONB,
    security_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_disputes table
CREATE TABLE IF NOT EXISTS payment_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    dispute_id VARCHAR(100) NOT NULL,
    charge_id VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    reason VARCHAR(100),
    status VARCHAR(50) DEFAULT 'open',
    evidence_due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dispute_id)
);

-- Create refund_events table
CREATE TABLE IF NOT EXISTS refund_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    transaction_id VARCHAR(100),
    refund_id VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50),
    error_message TEXT NOT NULL,
    error_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_attempts_tenant_id ON payment_attempts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_provider ON payment_attempts(provider);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_created_at ON payment_attempts(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_refund_attempts_tenant_id ON refund_attempts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refund_attempts_provider ON refund_attempts(provider);
CREATE INDEX IF NOT EXISTS idx_refund_attempts_status ON refund_attempts(status);
CREATE INDEX IF NOT EXISTS idx_refund_attempts_created_at ON refund_attempts(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_method_tokens_tenant_id ON payment_method_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_tokens_user_id ON payment_method_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_tokens_provider ON payment_method_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_payment_method_tokens_active ON payment_method_tokens(is_active);

CREATE INDEX IF NOT EXISTS idx_payment_orchestration_logs_orchestration_id ON payment_orchestration_logs(orchestration_id);
CREATE INDEX IF NOT EXISTS idx_payment_orchestration_logs_tenant_id ON payment_orchestration_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_orchestration_logs_success ON payment_orchestration_logs(success);
CREATE INDEX IF NOT EXISTS idx_payment_orchestration_logs_created_at ON payment_orchestration_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_id ON webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

CREATE INDEX IF NOT EXISTS idx_fraud_assessments_tenant_id ON fraud_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_transaction_id ON fraud_assessments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_risk_level ON fraud_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_created_at ON fraud_assessments(created_at);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_tenant_id ON fraud_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_transaction_id ON fraud_alerts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_risk_level ON fraud_alerts(risk_level);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_created_at ON fraud_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_fraud_blacklists_type ON fraud_blacklists(type);
CREATE INDEX IF NOT EXISTS idx_fraud_blacklists_value ON fraud_blacklists(value);
CREATE INDEX IF NOT EXISTS idx_fraud_blacklists_active ON fraud_blacklists(active);

CREATE INDEX IF NOT EXISTS idx_payment_locations_tenant_id ON payment_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_locations_user_id ON payment_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_locations_country ON payment_locations(country);

CREATE INDEX IF NOT EXISTS idx_payment_devices_tenant_id ON payment_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_devices_user_id ON payment_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_devices_fingerprint ON payment_devices(fingerprint);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_currency ON exchange_rates(from_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_to_currency ON exchange_rates(to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_created_at ON exchange_rates(created_at);

CREATE INDEX IF NOT EXISTS idx_currency_conversions_tenant_id ON currency_conversions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_source_currency ON currency_conversions(source_currency);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_target_currency ON currency_conversions(target_currency);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_created_at ON currency_conversions(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_flows_tenant_id ON payment_flows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_flows_active ON payment_flows(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_flows_created_at ON payment_flows(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_disputes_tenant_id ON payment_disputes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_provider ON payment_disputes(provider);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON payment_disputes(status);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_created_at ON payment_disputes(created_at);

CREATE INDEX IF NOT EXISTS idx_refund_events_tenant_id ON refund_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refund_events_provider ON refund_events(provider);
CREATE INDEX IF NOT EXISTS idx_refund_events_event_type ON refund_events(event_type);
CREATE INDEX IF NOT EXISTS idx_refund_events_created_at ON refund_events(created_at);

CREATE INDEX IF NOT EXISTS idx_error_logs_provider ON error_logs(provider);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

-- Add foreign key constraints
ALTER TABLE payment_transactions 
ADD CONSTRAINT fk_payment_transactions_orchestration_id 
FOREIGN KEY (orchestration_id) REFERENCES payment_orchestration_logs(orchestration_id) ON DELETE CASCADE;

-- Add check constraints
ALTER TABLE payment_attempts 
ADD CONSTRAINT chk_payment_attempts_amount_positive 
CHECK (amount > 0);

ALTER TABLE payment_transactions 
ADD CONSTRAINT chk_payment_transactions_amount_positive 
CHECK (amount > 0);

ALTER TABLE refund_attempts 
ADD CONSTRAINT chk_refund_attempts_amount_positive 
CHECK (amount > 0);

ALTER TABLE fraud_assessments 
ADD CONSTRAINT chk_fraud_assessments_risk_score_range 
CHECK (risk_score >= 0 AND risk_score <= 100);

ALTER TABLE fraud_alerts 
ADD CONSTRAINT chk_fraud_alerts_risk_score_range 
CHECK (risk_score >= 0 AND risk_score <= 100);

ALTER TABLE exchange_rates 
ADD CONSTRAINT chk_exchange_rates_rate_positive 
CHECK (rate > 0);

ALTER TABLE currency_conversions 
ADD CONSTRAINT chk_currency_conversions_amounts_positive 
CHECK (source_amount > 0 AND converted_amount > 0);

ALTER TABLE payment_disputes 
ADD CONSTRAINT chk_payment_disputes_amount_positive 
CHECK (amount > 0);

ALTER TABLE refund_events 
ADD CONSTRAINT chk_refund_events_amount_positive 
CHECK (amount > 0);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_attempts_updated_at 
    BEFORE UPDATE ON payment_attempts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at 
    BEFORE UPDATE ON payment_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_method_tokens_updated_at 
    BEFORE UPDATE ON payment_method_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_events_updated_at 
    BEFORE UPDATE ON webhook_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fraud_assessments_updated_at 
    BEFORE UPDATE ON fraud_assessments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fraud_alerts_updated_at 
    BEFORE UPDATE ON fraud_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fraud_blacklists_updated_at 
    BEFORE UPDATE ON fraud_blacklists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_devices_updated_at 
    BEFORE UPDATE ON payment_devices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_flows_updated_at 
    BEFORE UPDATE ON payment_flows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_disputes_updated_at 
    BEFORE UPDATE ON payment_disputes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE payment_attempts IS 'Records all payment attempts with their status and processing details';
COMMENT ON TABLE payment_transactions IS 'Stores successful payment transactions with orchestration details';
COMMENT ON TABLE refund_attempts IS 'Tracks all refund attempts and their outcomes';
COMMENT ON TABLE payment_method_tokens IS 'Stores tokenized payment methods for future use';
COMMENT ON TABLE payment_orchestration_logs IS 'Logs orchestration decisions and outcomes';
COMMENT ON TABLE payment_provider_failures IS 'Records provider failures for analysis';
COMMENT ON TABLE webhook_events IS 'Stores webhook events from payment providers';
COMMENT ON TABLE fraud_assessments IS 'Records fraud risk assessments for payments';
COMMENT ON TABLE fraud_alerts IS 'High-risk transactions requiring manual review';
COMMENT ON TABLE fraud_blacklists IS 'Blacklisted entities (emails, IPs, cards, etc.)';
COMMENT ON TABLE payment_locations IS 'User payment location history for fraud detection';
COMMENT ON TABLE payment_devices IS 'User device history for fraud detection';
COMMENT ON TABLE exchange_rates IS 'Currency exchange rates for multi-currency support';
COMMENT ON TABLE currency_conversions IS 'Records of currency conversions performed';
COMMENT ON TABLE payment_flows IS 'White-label payment flow configurations';
COMMENT ON TABLE payment_disputes IS 'Payment disputes and chargebacks';
COMMENT ON TABLE refund_events IS 'Refund-related events and notifications';
COMMENT ON TABLE error_logs IS 'System error logs for debugging and monitoring';
