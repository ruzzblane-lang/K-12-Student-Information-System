-- Migration: Add Encryption Support for Sensitive Data
-- Description: Add encrypted fields and security features to existing tables
-- Version: 028
-- Date: 2024-12-19

BEGIN;

-- Create encryption keys table
CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    key_id VARCHAR(100) NOT NULL UNIQUE,
    key_type VARCHAR(50) NOT NULL DEFAULT 'encryption',
    key_size INTEGER NOT NULL DEFAULT 256,
    algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    rotated_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(100),
    details JSONB,
    encrypted_data TEXT,
    key_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add encrypted fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_ssn TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ssn_key_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_tax_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_id_key_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_passport TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_key_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_drivers_license TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS drivers_license_key_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_key_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_key_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_personal_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_email_key_id VARCHAR(100);

-- Add encrypted fields to payment_methods table
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS encrypted_card_number TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS card_number_key_id VARCHAR(100);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS encrypted_cvv TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS cvv_key_id VARCHAR(100);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS encrypted_expiry_date TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS expiry_date_key_id VARCHAR(100);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS encrypted_bank_account TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS bank_account_key_id VARCHAR(100);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS encrypted_routing_number TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS routing_number_key_id VARCHAR(100);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS encrypted_iban TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS iban_key_id VARCHAR(100);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS encrypted_bic TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS bic_key_id VARCHAR(100);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS encrypted_upi_id TEXT;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS upi_id_key_id VARCHAR(100);

-- Add encrypted fields to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS encrypted_amount TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_key_id VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS encrypted_fee_amount TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fee_amount_key_id VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS encrypted_settlement_amount TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS settlement_amount_key_id VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS encrypted_refund_amount TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_amount_key_id VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS encrypted_metadata TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata_key_id VARCHAR(100);

-- Add encrypted fields to student_financial_records table
ALTER TABLE student_financial_records ADD COLUMN IF NOT EXISTS encrypted_balance TEXT;
ALTER TABLE student_financial_records ADD COLUMN IF NOT EXISTS balance_key_id VARCHAR(100);
ALTER TABLE student_financial_records ADD COLUMN IF NOT EXISTS encrypted_outstanding_amount TEXT;
ALTER TABLE student_financial_records ADD COLUMN IF NOT EXISTS outstanding_amount_key_id VARCHAR(100);
ALTER TABLE student_financial_records ADD COLUMN IF NOT EXISTS encrypted_payment_amount TEXT;
ALTER TABLE student_financial_records ADD COLUMN IF NOT EXISTS payment_amount_key_id VARCHAR(100);

-- Add encrypted fields to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS encrypted_total_amount TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount_key_id VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS encrypted_tax_amount TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount_key_id VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS encrypted_discount_amount TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount_key_id VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS encrypted_line_items TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS line_items_key_id VARCHAR(100);

-- Add encrypted fields to refunds table
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS encrypted_refund_amount TEXT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_amount_key_id VARCHAR(100);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS encrypted_processing_fee TEXT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS processing_fee_key_id VARCHAR(100);

-- Add encrypted fields to settlements table
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS encrypted_settlement_amount TEXT;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS settlement_amount_key_id VARCHAR(100);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS encrypted_net_amount TEXT;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS net_amount_key_id VARCHAR(100);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS encrypted_fee_amount TEXT;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS fee_amount_key_id VARCHAR(100);

-- Add encrypted fields to payment_providers table
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS encrypted_api_key TEXT;
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS api_key_key_id VARCHAR(100);
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS encrypted_secret_key TEXT;
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS secret_key_key_id VARCHAR(100);
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS encrypted_webhook_secret TEXT;
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS webhook_secret_key_id VARCHAR(100);
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS encrypted_config TEXT;
ALTER TABLE payment_providers ADD COLUMN IF NOT EXISTS config_key_id VARCHAR(100);

-- Add encrypted fields to api_keys table
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS encrypted_key_value TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_value_key_id VARCHAR(100);
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS encrypted_secret TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS secret_key_id VARCHAR(100);

-- Add encrypted fields to webhooks table
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS encrypted_secret TEXT;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS secret_key_id VARCHAR(100);
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS encrypted_payload TEXT;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS payload_key_id VARCHAR(100);

-- Add encrypted fields to audit_logs table
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS encrypted_details TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details_key_id VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS encrypted_metadata TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata_key_id VARCHAR(100);

-- Create indexes for encrypted fields
CREATE INDEX IF NOT EXISTS idx_encryption_keys_key_id ON encryption_keys (key_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_status ON encryption_keys (status);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_expires_at ON encryption_keys (expires_at);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_category ON security_audit_log (event_category);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_severity ON security_audit_log (severity);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_key_id ON security_audit_log (key_id);

-- Create indexes for key_id columns
CREATE INDEX IF NOT EXISTS idx_users_ssn_key_id ON users (ssn_key_id);
CREATE INDEX IF NOT EXISTS idx_users_tax_id_key_id ON users (tax_id_key_id);
CREATE INDEX IF NOT EXISTS idx_users_passport_key_id ON users (passport_key_id);
CREATE INDEX IF NOT EXISTS idx_users_drivers_license_key_id ON users (drivers_license_key_id);
CREATE INDEX IF NOT EXISTS idx_users_address_key_id ON users (address_key_id);
CREATE INDEX IF NOT EXISTS idx_users_phone_key_id ON users (phone_key_id);
CREATE INDEX IF NOT EXISTS idx_users_personal_email_key_id ON users (personal_email_key_id);

CREATE INDEX IF NOT EXISTS idx_payment_methods_card_number_key_id ON payment_methods (card_number_key_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_cvv_key_id ON payment_methods (cvv_key_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_expiry_date_key_id ON payment_methods (expiry_date_key_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_bank_account_key_id ON payment_methods (bank_account_key_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_routing_number_key_id ON payment_methods (routing_number_key_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_iban_key_id ON payment_methods (iban_key_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_bic_key_id ON payment_methods (bic_key_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_upi_id_key_id ON payment_methods (upi_id_key_id);

CREATE INDEX IF NOT EXISTS idx_transactions_amount_key_id ON transactions (amount_key_id);
CREATE INDEX IF NOT EXISTS idx_transactions_fee_amount_key_id ON transactions (fee_amount_key_id);
CREATE INDEX IF NOT EXISTS idx_transactions_settlement_amount_key_id ON transactions (settlement_amount_key_id);
CREATE INDEX IF NOT EXISTS idx_transactions_refund_amount_key_id ON transactions (refund_amount_key_id);
CREATE INDEX IF NOT EXISTS idx_transactions_metadata_key_id ON transactions (metadata_key_id);

-- Add foreign key constraints for key_id columns
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_ssn_key_id 
    FOREIGN KEY (ssn_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_tax_id_key_id 
    FOREIGN KEY (tax_id_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_passport_key_id 
    FOREIGN KEY (passport_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_drivers_license_key_id 
    FOREIGN KEY (drivers_license_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_address_key_id 
    FOREIGN KEY (address_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_phone_key_id 
    FOREIGN KEY (phone_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_personal_email_key_id 
    FOREIGN KEY (personal_email_key_id) REFERENCES encryption_keys(key_id);

ALTER TABLE payment_methods ADD CONSTRAINT IF NOT EXISTS fk_payment_methods_card_number_key_id 
    FOREIGN KEY (card_number_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE payment_methods ADD CONSTRAINT IF NOT EXISTS fk_payment_methods_cvv_key_id 
    FOREIGN KEY (cvv_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE payment_methods ADD CONSTRAINT IF NOT EXISTS fk_payment_methods_expiry_date_key_id 
    FOREIGN KEY (expiry_date_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE payment_methods ADD CONSTRAINT IF NOT EXISTS fk_payment_methods_bank_account_key_id 
    FOREIGN KEY (bank_account_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE payment_methods ADD CONSTRAINT IF NOT EXISTS fk_payment_methods_routing_number_key_id 
    FOREIGN KEY (routing_number_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE payment_methods ADD CONSTRAINT IF NOT EXISTS fk_payment_methods_iban_key_id 
    FOREIGN KEY (iban_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE payment_methods ADD CONSTRAINT IF NOT EXISTS fk_payment_methods_bic_key_id 
    FOREIGN KEY (bic_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE payment_methods ADD CONSTRAINT IF NOT EXISTS fk_payment_methods_upi_id_key_id 
    FOREIGN KEY (upi_id_key_id) REFERENCES encryption_keys(key_id);

ALTER TABLE transactions ADD CONSTRAINT IF NOT EXISTS fk_transactions_amount_key_id 
    FOREIGN KEY (amount_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE transactions ADD CONSTRAINT IF NOT EXISTS fk_transactions_fee_amount_key_id 
    FOREIGN KEY (fee_amount_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE transactions ADD CONSTRAINT IF NOT EXISTS fk_transactions_settlement_amount_key_id 
    FOREIGN KEY (settlement_amount_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE transactions ADD CONSTRAINT IF NOT EXISTS fk_transactions_refund_amount_key_id 
    FOREIGN KEY (refund_amount_key_id) REFERENCES encryption_keys(key_id);
ALTER TABLE transactions ADD CONSTRAINT IF NOT EXISTS fk_transactions_metadata_key_id 
    FOREIGN KEY (metadata_key_id) REFERENCES encryption_keys(key_id);

-- Create triggers for automatic key rotation
CREATE OR REPLACE FUNCTION check_encryption_key_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the key_id being used is expired
    IF NEW.key_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM encryption_keys 
            WHERE key_id = NEW.key_id 
            AND status = 'expired'
        ) THEN
            RAISE EXCEPTION 'Cannot use expired encryption key: %', NEW.key_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with encrypted fields
CREATE TRIGGER IF NOT EXISTS trigger_check_users_encryption_keys
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_encryption_key_expiry();

CREATE TRIGGER IF NOT EXISTS trigger_check_payment_methods_encryption_keys
    BEFORE INSERT OR UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION check_encryption_key_expiry();

CREATE TRIGGER IF NOT EXISTS trigger_check_transactions_encryption_keys
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_encryption_key_expiry();

-- Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type VARCHAR(100),
    p_event_category VARCHAR(50),
    p_severity VARCHAR(20),
    p_user_id INTEGER,
    p_session_id VARCHAR(255),
    p_ip_address INET,
    p_user_agent TEXT,
    p_resource_type VARCHAR(100),
    p_resource_id VARCHAR(255),
    p_action VARCHAR(100),
    p_details JSONB,
    p_encrypted_data TEXT,
    p_key_id VARCHAR(100)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO security_audit_log (
        event_type, event_category, severity, user_id, session_id,
        ip_address, user_agent, resource_type, resource_id, action,
        details, encrypted_data, key_id
    ) VALUES (
        p_event_type, p_event_category, p_severity, p_user_id, p_session_id,
        p_ip_address, p_user_agent, p_resource_type, p_resource_id, p_action,
        p_details, p_encrypted_data, p_key_id
    );
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE encryption_keys IS 'Encryption keys for sensitive data protection';
COMMENT ON TABLE security_audit_log IS 'Security audit log for encryption and security events';
COMMENT ON FUNCTION check_encryption_key_expiry() IS 'Trigger function to prevent use of expired encryption keys';
COMMENT ON FUNCTION log_security_event(VARCHAR, VARCHAR, VARCHAR, INTEGER, VARCHAR, INET, TEXT, VARCHAR, VARCHAR, VARCHAR, JSONB, TEXT, VARCHAR) IS 'Function to log security events';

COMMIT;
