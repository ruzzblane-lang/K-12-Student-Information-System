-- Migration: Create Manual Payment Request Tables
-- Description: Creates tables for manual payment request submission and approval workflow
-- Version: 027
-- Date: 2024-01-20

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create payment_request_types table for different payment types
CREATE TABLE IF NOT EXISTS payment_request_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    required_fields JSONB NOT NULL DEFAULT '[]',
    validation_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create manual_payment_requests table
CREATE TABLE IF NOT EXISTS manual_payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    payment_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,
    payment_details JSONB NOT NULL DEFAULT '{}',
    supporting_documents JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',
    fraud_risk_score INTEGER DEFAULT 0,
    fraud_risk_level VARCHAR(20) DEFAULT 'low',
    fraud_flags JSONB DEFAULT '[]',
    admin_notes TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_manual_payment_requests_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_manual_payment_requests_fraud_risk_score_range CHECK (fraud_risk_score >= 0 AND fraud_risk_score <= 100)
);

-- Create payment_approval_tickets table
CREATE TABLE IF NOT EXISTS payment_approval_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_request_id UUID NOT NULL REFERENCES manual_payment_requests(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    due_date TIMESTAMP WITH TIME ZONE,
    escalation_level INTEGER DEFAULT 1,
    notes TEXT,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_approval_workflow_logs table
CREATE TABLE IF NOT EXISTS payment_approval_workflow_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_request_id UUID NOT NULL REFERENCES manual_payment_requests(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES payment_approval_tickets(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_request_fraud_assessments table
CREATE TABLE IF NOT EXISTS payment_request_fraud_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_request_id UUID NOT NULL REFERENCES manual_payment_requests(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    risk_factors JSONB NOT NULL DEFAULT '[]',
    assessment_details JSONB NOT NULL DEFAULT '{}',
    flagged_fields JSONB DEFAULT '[]',
    recommendation VARCHAR(50) NOT NULL, -- 'approve', 'review', 'reject'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payment_request_fraud_assessments_risk_score_range CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- Create payment_request_documents table
CREATE TABLE IF NOT EXISTS payment_request_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_request_id UUID NOT NULL REFERENCES manual_payment_requests(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_request_notifications table
CREATE TABLE IF NOT EXISTS payment_request_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_request_id UUID NOT NULL REFERENCES manual_payment_requests(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create payment_request_escalation_rules table
CREATE TABLE IF NOT EXISTS payment_request_escalation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    conditions JSONB NOT NULL DEFAULT '{}',
    escalation_level INTEGER NOT NULL,
    assign_to_role VARCHAR(50),
    assign_to_user UUID REFERENCES users(id) ON DELETE SET NULL,
    time_limit_hours INTEGER DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default payment request types
INSERT INTO payment_request_types (name, display_name, description, required_fields, validation_rules) VALUES
('bank_transfer', 'Bank Transfer', 'Direct bank transfer payment', 
 '["account_holder_name", "bank_name", "account_number", "routing_number"]',
 '{"account_number": {"min_length": 8, "max_length": 20}, "routing_number": {"pattern": "^[0-9]{9}$"}}'),
('card_payment', 'Credit/Debit Card', 'Credit or debit card payment', 
 '["card_holder_name", "card_number", "expiry_month", "expiry_year", "cvv"]',
 '{"card_number": {"pattern": "^[0-9]{13,19}$"}, "cvv": {"pattern": "^[0-9]{3,4}$"}}'),
('e_wallet', 'E-Wallet', 'Electronic wallet payment', 
 '["wallet_provider", "wallet_id", "account_holder_name"]',
 '{"wallet_id": {"min_length": 5, "max_length": 50}}'),
('cryptocurrency', 'Cryptocurrency', 'Cryptocurrency payment', 
 '["currency_type", "wallet_address", "amount"]',
 '{"wallet_address": {"min_length": 26, "max_length": 62}}'),
('check', 'Check', 'Check payment', 
 '["check_number", "bank_name", "account_holder_name"]',
 '{"check_number": {"pattern": "^[0-9]+$"}}'),
('cash', 'Cash', 'Cash payment', 
 '["payment_location", "receipt_number"]',
 '{"receipt_number": {"min_length": 1}}'),
('other', 'Other', 'Other payment method', 
 '["payment_method_name", "payment_details"]',
 '{}')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_tenant_id ON manual_payment_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_user_id ON manual_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_student_id ON manual_payment_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_payment_type ON manual_payment_requests(payment_type);
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_status ON manual_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_fraud_risk_level ON manual_payment_requests(fraud_risk_level);
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_created_at ON manual_payment_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_approved_by ON manual_payment_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_approved_at ON manual_payment_requests(approved_at);

CREATE INDEX IF NOT EXISTS idx_payment_approval_tickets_tenant_id ON payment_approval_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_approval_tickets_payment_request_id ON payment_approval_tickets(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_approval_tickets_assigned_to ON payment_approval_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_payment_approval_tickets_status ON payment_approval_tickets(status);
CREATE INDEX IF NOT EXISTS idx_payment_approval_tickets_priority ON payment_approval_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_payment_approval_tickets_due_date ON payment_approval_tickets(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_approval_tickets_created_at ON payment_approval_tickets(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_approval_workflow_logs_tenant_id ON payment_approval_workflow_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_approval_workflow_logs_payment_request_id ON payment_approval_workflow_logs(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_approval_workflow_logs_ticket_id ON payment_approval_workflow_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_payment_approval_workflow_logs_performed_by ON payment_approval_workflow_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_payment_approval_workflow_logs_action ON payment_approval_workflow_logs(action);
CREATE INDEX IF NOT EXISTS idx_payment_approval_workflow_logs_created_at ON payment_approval_workflow_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_request_fraud_assessments_tenant_id ON payment_request_fraud_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_fraud_assessments_payment_request_id ON payment_request_fraud_assessments(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_fraud_assessments_risk_level ON payment_request_fraud_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_payment_request_fraud_assessments_recommendation ON payment_request_fraud_assessments(recommendation);
CREATE INDEX IF NOT EXISTS idx_payment_request_fraud_assessments_created_at ON payment_request_fraud_assessments(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_request_documents_tenant_id ON payment_request_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_documents_payment_request_id ON payment_request_documents(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_documents_document_type ON payment_request_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_payment_request_documents_uploaded_by ON payment_request_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_payment_request_documents_is_verified ON payment_request_documents(is_verified);

CREATE INDEX IF NOT EXISTS idx_payment_request_notifications_tenant_id ON payment_request_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_notifications_payment_request_id ON payment_request_notifications(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_notifications_recipient_id ON payment_request_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_notifications_notification_type ON payment_request_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_payment_request_notifications_is_read ON payment_request_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_payment_request_notifications_sent_at ON payment_request_notifications(sent_at);

CREATE INDEX IF NOT EXISTS idx_payment_request_escalation_rules_tenant_id ON payment_request_escalation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_escalation_rules_escalation_level ON payment_request_escalation_rules(escalation_level);
CREATE INDEX IF NOT EXISTS idx_payment_request_escalation_rules_is_active ON payment_request_escalation_rules(is_active);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_payment_request_types_updated_at 
    BEFORE UPDATE ON payment_request_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_payment_requests_updated_at 
    BEFORE UPDATE ON manual_payment_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_approval_tickets_updated_at 
    BEFORE UPDATE ON payment_approval_tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_request_escalation_rules_updated_at 
    BEFORE UPDATE ON payment_request_escalation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE payment_request_types IS 'Defines available payment request types and their validation rules';
COMMENT ON TABLE manual_payment_requests IS 'Stores manual payment requests submitted by users';
COMMENT ON TABLE payment_approval_tickets IS 'Tracks approval tickets for manual payment requests';
COMMENT ON TABLE payment_approval_workflow_logs IS 'Audit log for all payment approval workflow actions';
COMMENT ON TABLE payment_request_fraud_assessments IS 'Fraud risk assessments for manual payment requests';
COMMENT ON TABLE payment_request_documents IS 'Supporting documents attached to payment requests';
COMMENT ON TABLE payment_request_notifications IS 'Notifications sent to users about payment request status';
COMMENT ON TABLE payment_request_escalation_rules IS 'Rules for escalating payment requests based on conditions';
