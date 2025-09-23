-- PostgreSQL Initialization Script
-- Creates database, users, and initial configuration

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE school_sis'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'school_sis')\gexec

-- Connect to the school_sis database
\c school_sis;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application user with limited privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'school_sis_app') THEN
        CREATE ROLE school_sis_app WITH LOGIN PASSWORD '${POSTGRES_APP_PASSWORD}';
    END IF;
END
$$;

-- Grant necessary privileges to application user
GRANT CONNECT ON DATABASE school_sis TO school_sis_app;
GRANT USAGE ON SCHEMA public TO school_sis_app;
GRANT CREATE ON SCHEMA public TO school_sis_app;

-- Create read-only user for reporting
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'school_sis_readonly') THEN
        CREATE ROLE school_sis_readonly WITH LOGIN PASSWORD '${POSTGRES_READONLY_PASSWORD}';
    END IF;
END
$$;

-- Grant read-only privileges
GRANT CONNECT ON DATABASE school_sis TO school_sis_readonly;
GRANT USAGE ON SCHEMA public TO school_sis_readonly;

-- Set up row-level security (RLS) for multi-tenancy
ALTER DATABASE school_sis SET row_security = on;

-- Create audit schema for compliance
CREATE SCHEMA IF NOT EXISTS audit;
GRANT USAGE ON SCHEMA audit TO school_sis_app;
GRANT CREATE ON SCHEMA audit TO school_sis_app;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit.audit_log (
            table_name,
            operation,
            old_data,
            changed_by,
            changed_at
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            row_to_json(OLD),
            current_user,
            now()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.audit_log (
            table_name,
            operation,
            old_data,
            new_data,
            changed_by,
            changed_at
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            row_to_json(OLD),
            row_to_json(NEW),
            current_user,
            now()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit.audit_log (
            table_name,
            operation,
            new_data,
            changed_by,
            changed_at
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            row_to_json(NEW),
            current_user,
            now()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit.audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit.audit_log(changed_by);

-- Grant permissions on audit schema
GRANT SELECT ON audit.audit_log TO school_sis_readonly;
GRANT INSERT ON audit.audit_log TO school_sis_app;

-- Set up connection limits and timeouts
ALTER ROLE school_sis_app SET statement_timeout = '30s';
ALTER ROLE school_sis_app SET lock_timeout = '10s';
ALTER ROLE school_sis_app SET idle_in_transaction_session_timeout = '60s';

-- Create initial configuration table
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT INTO system_config (key, value, description) VALUES
('system_version', '"1.0.0"', 'Current system version'),
('maintenance_mode', 'false', 'System maintenance mode flag'),
('max_file_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('session_timeout', '3600', 'Session timeout in seconds (1 hour)'),
('password_policy', '{"min_length": 8, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_special": true}', 'Password policy configuration')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON system_config TO school_sis_app;
GRANT SELECT ON system_config TO school_sis_readonly;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to system_config
CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set up logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';

-- Reload configuration
SELECT pg_reload_conf();

-- Display initialization completion
SELECT 'PostgreSQL initialization completed successfully' AS status;
