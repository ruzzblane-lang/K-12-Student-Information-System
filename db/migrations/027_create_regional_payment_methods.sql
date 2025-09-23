-- Migration: Create Regional Payment Methods Configuration
-- Description: Add support for region-specific payment methods and their configurations
-- Version: 027
-- Date: 2024-12-19

BEGIN;

-- Create table for regional payment method configurations
CREATE TABLE IF NOT EXISTS regional_payment_methods (
    id SERIAL PRIMARY KEY,
    method_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    supported_countries TEXT[],
    supported_currencies TEXT[],
    processing_fees JSONB,
    features TEXT[],
    processing_time VARCHAR(50),
    requires_redirect BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for payment method provider mappings
CREATE TABLE IF NOT EXISTS payment_method_providers (
    id SERIAL PRIMARY KEY,
    method_key VARCHAR(100) NOT NULL,
    provider_key VARCHAR(100) NOT NULL,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (method_key) REFERENCES regional_payment_methods(method_key) ON DELETE CASCADE
);

-- Create table for regional payment method mappings
CREATE TABLE IF NOT EXISTS regional_payment_mappings (
    id SERIAL PRIMARY KEY,
    region_code VARCHAR(10) NOT NULL,
    method_key VARCHAR(100) NOT NULL,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (method_key) REFERENCES regional_payment_methods(method_key) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_regional_payment_methods_countries 
    ON regional_payment_methods USING GIN (supported_countries);

CREATE INDEX IF NOT EXISTS idx_regional_payment_methods_currencies 
    ON regional_payment_methods USING GIN (supported_currencies);

CREATE INDEX IF NOT EXISTS idx_payment_method_providers_method 
    ON payment_method_providers (method_key);

CREATE INDEX IF NOT EXISTS idx_payment_method_providers_provider 
    ON payment_method_providers (provider_key);

CREATE INDEX IF NOT EXISTS idx_regional_payment_mappings_region 
    ON regional_payment_mappings (region_code);

CREATE INDEX IF NOT EXISTS idx_regional_payment_mappings_method 
    ON regional_payment_mappings (method_key);

-- Insert US/Canada payment methods
INSERT INTO regional_payment_methods (method_key, name, description, type, category, supported_countries, supported_currencies, processing_fees, features, processing_time, requires_redirect) VALUES
('interac_e_transfer', 'Interac e-Transfer', 'Interac e-Transfer for Canada', 'bank_transfer', 'bank', ARRAY['CA'], ARRAY['CAD'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['instant_transfer', 'email_payment', 'secure'], 'instant', true),
('interac_online', 'Interac Online', 'Interac Online for Canada', 'bank_transfer', 'bank', ARRAY['CA'], ARRAY['CAD'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['instant_transfer', 'secure'], 'instant', true),
('ach_direct_debit', 'ACH Direct Debit', 'ACH Direct Debit for US', 'bank_transfer', 'bank', ARRAY['US'], ARRAY['USD'], '{"percentage": 0.8, "fixed": 0.25}', ARRAY['recurring', 'secure'], '1-3 days', false),
('ach_credit', 'ACH Credit', 'ACH Credit for US', 'bank_transfer', 'bank', ARRAY['US'], ARRAY['USD'], '{"percentage": 0.8, "fixed": 0.25}', ARRAY['secure'], '1-3 days', false),
('ach_web_debit', 'ACH Web Debit', 'ACH Web Debit for US', 'bank_transfer', 'bank', ARRAY['US'], ARRAY['USD'], '{"percentage": 0.8, "fixed": 0.25}', ARRAY['web_payment', 'secure'], '1-3 days', false);

-- Insert EU/UK payment methods
INSERT INTO regional_payment_methods (method_key, name, description, type, category, supported_countries, supported_currencies, processing_fees, features, processing_time, requires_redirect) VALUES
('sepa_direct_debit', 'SEPA Direct Debit', 'SEPA Direct Debit for EU', 'bank_transfer', 'bank', ARRAY['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'LU', 'MT', 'CY', 'SK', 'SI', 'EE', 'LV', 'LT'], ARRAY['EUR'], '{"percentage": 0.15, "fixed": 0.08}', ARRAY['recurring', 'secure'], '1-3 days', false),
('sepa_credit_transfer', 'SEPA Credit Transfer', 'SEPA Credit Transfer for EU', 'bank_transfer', 'bank', ARRAY['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'LU', 'MT', 'CY', 'SK', 'SI', 'EE', 'LV', 'LT'], ARRAY['EUR'], '{"percentage": 0.15, "fixed": 0.08}', ARRAY['secure'], '1-3 days', false),
('sepa_instant_credit', 'SEPA Instant Credit', 'SEPA Instant Credit for EU', 'bank_transfer', 'bank', ARRAY['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'LU', 'MT', 'CY', 'SK', 'SI', 'EE', 'LV', 'LT'], ARRAY['EUR'], '{"percentage": 0.15, "fixed": 0.08}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('ideal', 'iDEAL', 'iDEAL for Netherlands', 'bank_transfer', 'bank', ARRAY['NL'], ARRAY['EUR'], '{"percentage": 0.29, "fixed": 0.25}', ARRAY['instant_transfer', 'secure'], 'instant', true),
('giropay', 'Giropay', 'Giropay for Germany', 'bank_transfer', 'bank', ARRAY['DE'], ARRAY['EUR'], '{"percentage": 0.29, "fixed": 0.25}', ARRAY['instant_transfer', 'secure'], 'instant', true),
('bancontact', 'Bancontact', 'Bancontact for Belgium', 'bank_transfer', 'bank', ARRAY['BE'], ARRAY['EUR'], '{"percentage": 0.29, "fixed": 0.25}', ARRAY['instant_transfer', 'secure'], 'instant', true),
('sofort', 'Sofort', 'Sofort for Germany', 'bank_transfer', 'bank', ARRAY['DE', 'AT'], ARRAY['EUR'], '{"percentage": 0.29, "fixed": 0.25}', ARRAY['instant_transfer', 'secure'], 'instant', true);

-- Insert Australia/NZ payment methods
INSERT INTO regional_payment_methods (method_key, name, description, type, category, supported_countries, supported_currencies, processing_fees, features, processing_time, requires_redirect) VALUES
('poli', 'POLi', 'POLi for Australia and New Zealand', 'bank_transfer', 'bank', ARRAY['AU', 'NZ'], ARRAY['AUD', 'NZD'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', true),
('payid', 'PayID', 'PayID for Australia', 'bank_transfer', 'bank', ARRAY['AU'], ARRAY['AUD'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('npp_instant', 'NPP Instant', 'NPP Instant for Australia', 'bank_transfer', 'bank', ARRAY['AU'], ARRAY['AUD'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('bpay', 'BPAY', 'BPAY for Australia', 'bill_payment', 'bank', ARRAY['AU'], ARRAY['AUD'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['bill_payment', 'secure'], '1-3 days', false),
('bpay_recurring', 'BPAY Recurring', 'BPAY Recurring for Australia', 'bill_payment', 'bank', ARRAY['AU'], ARRAY['AUD'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['recurring', 'secure'], '1-3 days', false);

-- Insert Asia-Pacific payment methods
INSERT INTO regional_payment_methods (method_key, name, description, type, category, supported_countries, supported_currencies, processing_fees, features, processing_time, requires_redirect) VALUES
('grabpay', 'GrabPay', 'GrabPay for Southeast Asia', 'digital_wallet', 'wallet', ARRAY['SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'KH', 'MM'], ARRAY['SGD', 'MYR', 'THB', 'IDR', 'PHP', 'VND', 'KHR', 'MMK'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('grabpay_qr', 'GrabPay QR', 'GrabPay QR for Southeast Asia', 'digital_wallet', 'wallet', ARRAY['SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'KH', 'MM'], ARRAY['SGD', 'MYR', 'THB', 'IDR', 'PHP', 'VND', 'KHR', 'MMK'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['qr_payment', 'instant_transfer', 'secure'], 'instant', false),
('gopay', 'GoPay', 'GoPay for Indonesia', 'digital_wallet', 'wallet', ARRAY['ID'], ARRAY['IDR'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('gopay_qr', 'GoPay QR', 'GoPay QR for Indonesia', 'digital_wallet', 'wallet', ARRAY['ID'], ARRAY['IDR'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['qr_payment', 'instant_transfer', 'secure'], 'instant', false),
('ovo', 'OVO', 'OVO for Indonesia', 'digital_wallet', 'wallet', ARRAY['ID'], ARRAY['IDR'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('ovo_qr', 'OVO QR', 'OVO QR for Indonesia', 'digital_wallet', 'wallet', ARRAY['ID'], ARRAY['IDR'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['qr_payment', 'instant_transfer', 'secure'], 'instant', false),
('dana', 'DANA', 'DANA for Indonesia', 'digital_wallet', 'wallet', ARRAY['ID'], ARRAY['IDR'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('dana_qr', 'DANA QR', 'DANA QR for Indonesia', 'digital_wallet', 'wallet', ARRAY['ID'], ARRAY['IDR'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['qr_payment', 'instant_transfer', 'secure'], 'instant', false);

-- Insert India payment methods
INSERT INTO regional_payment_methods (method_key, name, description, type, category, supported_countries, supported_currencies, processing_fees, features, processing_time, requires_redirect) VALUES
('upi', 'UPI', 'Unified Payments Interface for India', 'bank_transfer', 'bank', ARRAY['IN'], ARRAY['INR'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('upi_qr', 'UPI QR', 'UPI QR for India', 'bank_transfer', 'bank', ARRAY['IN'], ARRAY['INR'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['qr_payment', 'instant_transfer', 'secure'], 'instant', false),
('upi_vpa', 'UPI VPA', 'UPI VPA for India', 'bank_transfer', 'bank', ARRAY['IN'], ARRAY['INR'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['vpa_payment', 'instant_transfer', 'secure'], 'instant', false),
('paytm_wallet', 'Paytm Wallet', 'Paytm Wallet for India', 'digital_wallet', 'wallet', ARRAY['IN'], ARRAY['INR'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('paytm_upi', 'Paytm UPI', 'Paytm UPI for India', 'bank_transfer', 'bank', ARRAY['IN'], ARRAY['INR'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('paytm_qr', 'Paytm QR', 'Paytm QR for India', 'bank_transfer', 'bank', ARRAY['IN'], ARRAY['INR'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['qr_payment', 'instant_transfer', 'secure'], 'instant', false),
('phonepe_upi', 'PhonePe UPI', 'PhonePe UPI for India', 'bank_transfer', 'bank', ARRAY['IN'], ARRAY['INR'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('phonepe_wallet', 'PhonePe Wallet', 'PhonePe Wallet for India', 'digital_wallet', 'wallet', ARRAY['IN'], ARRAY['INR'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('phonepe_qr', 'PhonePe QR', 'PhonePe QR for India', 'bank_transfer', 'bank', ARRAY['IN'], ARRAY['INR'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['qr_payment', 'instant_transfer', 'secure'], 'instant', false);

-- Insert Latin America payment methods
INSERT INTO regional_payment_methods (method_key, name, description, type, category, supported_countries, supported_currencies, processing_fees, features, processing_time, requires_redirect) VALUES
('boleto_bancario', 'Boleto Bancário', 'Boleto Bancário for Brazil', 'voucher', 'bank', ARRAY['BR'], ARRAY['BRL'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['voucher_payment', 'secure'], '1-3 days', false),
('boleto_express', 'Boleto Express', 'Boleto Express for Brazil', 'voucher', 'bank', ARRAY['BR'], ARRAY['BRL'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['voucher_payment', 'secure'], '1-3 days', false),
('oxxo', 'OXXO', 'OXXO for Mexico', 'voucher', 'retail', ARRAY['MX'], ARRAY['MXN'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['voucher_payment', 'secure'], '1-3 days', false),
('oxxo_pay', 'OXXO Pay', 'OXXO Pay for Mexico', 'voucher', 'retail', ARRAY['MX'], ARRAY['MXN'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['voucher_payment', 'secure'], '1-3 days', false),
('pix', 'PIX', 'PIX for Brazil', 'bank_transfer', 'bank', ARRAY['BR'], ARRAY['BRL'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('pix_qr', 'PIX QR', 'PIX QR for Brazil', 'bank_transfer', 'bank', ARRAY['BR'], ARRAY['BRL'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['qr_payment', 'instant_transfer', 'secure'], 'instant', false),
('pix_copy_paste', 'PIX Copy & Paste', 'PIX Copy & Paste for Brazil', 'bank_transfer', 'bank', ARRAY['BR'], ARRAY['BRL'], '{"percentage": 0.5, "fixed": 0.15}', ARRAY['copy_paste', 'instant_transfer', 'secure'], 'instant', false);

-- Insert Middle East payment methods
INSERT INTO regional_payment_methods (method_key, name, description, type, category, supported_countries, supported_currencies, processing_fees, features, processing_time, requires_redirect) VALUES
('mada', 'Mada', 'Mada for Saudi Arabia', 'bank_transfer', 'bank', ARRAY['SA'], ARRAY['SAR'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('mada_digital', 'Mada Digital', 'Mada Digital for Saudi Arabia', 'bank_transfer', 'bank', ARRAY['SA'], ARRAY['SAR'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['digital_payment', 'instant_transfer', 'secure'], 'instant', false),
('fawry', 'Fawry', 'Fawry for Egypt', 'voucher', 'retail', ARRAY['EG'], ARRAY['EGP'], '{"percentage": 0.5, "fixed": 0.30}', ARRAY['voucher_payment', 'secure'], '1-3 days', false),
('fawry_wallet', 'Fawry Wallet', 'Fawry Wallet for Egypt', 'digital_wallet', 'wallet', ARRAY['EG'], ARRAY['EGP'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('stc_pay', 'STC Pay', 'STC Pay for Saudi Arabia', 'digital_wallet', 'wallet', ARRAY['SA'], ARRAY['SAR'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['instant_transfer', 'secure'], 'instant', false),
('stc_pay_qr', 'STC Pay QR', 'STC Pay QR for Saudi Arabia', 'digital_wallet', 'wallet', ARRAY['SA'], ARRAY['SAR'], '{"percentage": 2.9, "fixed": 0.30}', ARRAY['qr_payment', 'instant_transfer', 'secure'], 'instant', false);

-- Insert provider mappings
INSERT INTO payment_method_providers (method_key, provider_key, priority) VALUES
-- US/Canada
('interac_e_transfer', 'interac', 1),
('interac_online', 'interac', 1),
('ach_direct_debit', 'ach_direct_debit', 1),
('ach_credit', 'ach_direct_debit', 1),
('ach_web_debit', 'ach_direct_debit', 1),

-- EU/UK
('sepa_direct_debit', 'sepa', 1),
('sepa_credit_transfer', 'sepa', 1),
('sepa_instant_credit', 'sepa', 1),
('ideal', 'ideal', 1),
('giropay', 'giropay', 1),
('bancontact', 'bancontact', 1),
('sofort', 'sofort', 1),

-- Australia/NZ
('poli', 'poli', 1),
('payid', 'payid', 1),
('npp_instant', 'payid', 1),
('bpay', 'bpay', 1),
('bpay_recurring', 'bpay', 1),

-- Asia-Pacific
('grabpay', 'grabpay', 1),
('grabpay_qr', 'grabpay', 1),
('gopay', 'gopay', 1),
('gopay_qr', 'gopay', 1),
('ovo', 'ovo', 1),
('ovo_qr', 'ovo', 1),
('dana', 'dana', 1),
('dana_qr', 'dana', 1),

-- India
('upi', 'upi', 1),
('upi_qr', 'upi', 1),
('upi_vpa', 'upi', 1),
('paytm_wallet', 'paytm', 1),
('paytm_upi', 'paytm', 1),
('paytm_qr', 'paytm', 1),
('phonepe_upi', 'phonepe', 1),
('phonepe_wallet', 'phonepe', 1),
('phonepe_qr', 'phonepe', 1),

-- Latin America
('boleto_bancario', 'boleto_bancario', 1),
('boleto_express', 'boleto_bancario', 1),
('oxxo', 'oxxo', 1),
('oxxo_pay', 'oxxo', 1),
('pix', 'pix', 1),
('pix_qr', 'pix', 1),
('pix_copy_paste', 'pix', 1),

-- Middle East
('mada', 'mada', 1),
('mada_digital', 'mada', 1),
('fawry', 'fawry', 1),
('fawry_wallet', 'fawry', 1),
('stc_pay', 'stc_pay', 1),
('stc_pay_qr', 'stc_pay', 1);

-- Insert regional mappings
INSERT INTO regional_payment_mappings (region_code, method_key, priority) VALUES
-- North America
('NA', 'interac_e_transfer', 1),
('NA', 'interac_online', 2),
('NA', 'ach_direct_debit', 3),
('NA', 'ach_credit', 4),
('NA', 'ach_web_debit', 5),

-- Europe
('EU', 'sepa_direct_debit', 1),
('EU', 'sepa_credit_transfer', 2),
('EU', 'sepa_instant_credit', 3),
('EU', 'ideal', 4),
('EU', 'giropay', 5),
('EU', 'bancontact', 6),
('EU', 'sofort', 7),

-- Australia/New Zealand
('AU_NZ', 'poli', 1),
('AU_NZ', 'payid', 2),
('AU_NZ', 'npp_instant', 3),
('AU_NZ', 'bpay', 4),
('AU_NZ', 'bpay_recurring', 5),

-- Asia-Pacific
('APAC', 'grabpay', 1),
('APAC', 'grabpay_qr', 2),
('APAC', 'gopay', 3),
('APAC', 'gopay_qr', 4),
('APAC', 'ovo', 5),
('APAC', 'ovo_qr', 6),
('APAC', 'dana', 7),
('APAC', 'dana_qr', 8),

-- India
('IN', 'upi', 1),
('IN', 'upi_qr', 2),
('IN', 'upi_vpa', 3),
('IN', 'paytm_wallet', 4),
('IN', 'paytm_upi', 5),
('IN', 'paytm_qr', 6),
('IN', 'phonepe_upi', 7),
('IN', 'phonepe_wallet', 8),
('IN', 'phonepe_qr', 9),

-- Latin America
('LATAM', 'boleto_bancario', 1),
('LATAM', 'boleto_express', 2),
('LATAM', 'oxxo', 3),
('LATAM', 'oxxo_pay', 4),
('LATAM', 'pix', 5),
('LATAM', 'pix_qr', 6),
('LATAM', 'pix_copy_paste', 7),

-- Middle East/Africa
('MEA', 'mada', 1),
('MEA', 'mada_digital', 2),
('MEA', 'fawry', 3),
('MEA', 'fawry_wallet', 4),
('MEA', 'stc_pay', 5),
('MEA', 'stc_pay_qr', 6);

-- Add comments for documentation
COMMENT ON TABLE regional_payment_methods IS 'Regional payment methods configuration';
COMMENT ON TABLE payment_method_providers IS 'Mapping between payment methods and their providers';
COMMENT ON TABLE regional_payment_mappings IS 'Mapping between regions and their supported payment methods';

COMMIT;
